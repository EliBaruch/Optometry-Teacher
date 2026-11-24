import type { ComponentChild } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, SfxId } from '@core';
import { Button, CountUp, Icon, RARITY_COLOR, RARITY_LABEL, useFocusTrap, useReducedMotion, useSignal } from '@ui-kit';
import { CRATES, KIND_LABEL, PITY_LIMIT, itemById, type Rarity } from '../catalog';
import { formatCoins, type CrateDrop } from '../logic';
import type { Economy, StoredCrate } from '../store';
import { CoinGlyph } from './CoinGlyph';
import { CrateArt } from './CrateArt';
import { ItemArt } from './ItemArt';

type Phase = 'ready' | 'shaking' | 'burst' | 'reveal';
const SHAKE_MS = 1500;
const BURST_MS = 480;
const RARITY_SFX: Record<Rarity, SfxId> = { common: 'sparkle', rare: 'rare', epic: 'rare', legendary: 'legendary' };

export interface CrateOpeningProps {
  services: GameServices;
  store: Economy;
  /** Crate to open first (defaults to the oldest unopened). */
  crateId?: string;
  onClose: () => void;
}

/** Full-screen crate-opening theatre: shake → light leaks → burst → reveal. */
export function CrateOpening({ services, store, crateId, onClose }: CrateOpeningProps) {
  const state = useSignal(store.state);
  const reduced = useReducedMotion();
  const [crate, setCrate] = useState<StoredCrate | undefined>(() => state.crates.find((c) => c.id === crateId) ?? state.crates[0]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [drop, setDrop] = useState<CrateDrop | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const root = useRef<HTMLDivElement>(null);
  const crateRef = useRef<HTMLDivElement>(null);
  useFocusTrap(root, true, '[data-autofocus]');

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  const center = () => {
    const r = crateRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.42 } : { x: innerWidth / 2, y: innerHeight / 2 };
  };

  const burst = (d: CrateDrop) => {
    clear();
    setPhase('burst');
    const color = RARITY_COLOR[d.rarity];
    const { x, y } = center();
    services.audio.play('chest-open');
    services.fx.flash(color, d.rarity === 'legendary' ? 420 : 240);
    if (d.rarity === 'epic' || d.rarity === 'legendary') services.fx.shake(d.rarity === 'legendary' ? 10 : 6, 380);
    const kind = d.content.type === 'coins' ? 'coins' : d.rarity === 'legendary' ? 'stars' : 'sparks';
    services.fx.burst(x, y, { kind, count: { common: 26, rare: 40, epic: 60, legendary: 90 }[d.rarity], color });
    later(BURST_MS, () => reveal(d));
  };

  const reveal = (d: CrateDrop) => {
    clear();
    setPhase('reveal');
    services.audio.play(RARITY_SFX[d.rarity], { volume: 0.9 });
    if (d.rarity === 'legendary' && !reduced) {
      const { x, y } = center();
      later(260, () => services.fx.burst(x, y - 40, { kind: 'confetti', count: 80 }));
    }
  };

  const open = () => {
    if (!crate || phase !== 'ready') return;
    const res = store.openCrate(crate.id);
    if (!res) return;
    setDrop(res.drop);
    if (reduced) {
      reveal(res.drop);
      return;
    }
    setPhase('shaking');
    services.audio.play('drumroll', { volume: 0.8 });
    later(SHAKE_MS, () => burst(res.drop));
  };

  const next = () => {
    const n = store.state.get().crates[0];
    clear();
    setDrop(null);
    setCrate(n);
    setPhase('ready');
    services.audio.play('whoosh', { volume: 0.5 });
  };

  const skip = () => {
    if (phase === 'shaking' && drop) burst(drop);
    else if (phase === 'burst' && drop) reveal(drop);
  };

  const close = () => {
    if (phase === 'shaking' || phase === 'burst') return skip();
    services.audio.play('back');
    onClose();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      close();
    } else if ((e.key === ' ' || e.key === 'Enter') && (phase === 'shaking' || phase === 'burst')) {
      e.preventDefault();
      skip();
    }
  };

  const spec = crate ? CRATES[crate.kind] : CRATES.case;
  const rarity = drop?.rarity;
  const remaining = state.crates.length;
  const pityLeft = Math.max(1, PITY_LIMIT - state.pity);

  return createPortal(
    <div
      ref={root}
      class={`eco-open eco-open--${phase}${rarity ? ` eco-open--${rarity}` : ''}${reduced ? ' is-reduced' : ''}`}
      style={{ '--rc': rarity ? RARITY_COLOR[rarity] : spec.trim, '--trim': spec.trim }}
      role="dialog"
      aria-modal="true"
      aria-label={`${spec.name}`}
      tabIndex={-1}
      onKeyDown={onKey}
    >
      <div class="eco-open__scrim" onClick={phase === 'reveal' || phase === 'ready' ? close : skip} aria-hidden="true" />
      <div class="eco-open__rays" aria-hidden="true" />
      <div class="eco-open__stage">
        <p class="eco-open__eyebrow lm-eyebrow">{spec.name}</p>

        {crate && phase !== 'reveal' && (
          <div class="eco-open__crate" ref={crateRef} onClick={phase === 'ready' ? open : skip}>
            <CrateArt kind={crate.kind} size="min(62vw, 260px)" />
          </div>
        )}

        {phase === 'reveal' && drop && <Prize drop={drop} store={store} services={services} />}

        <div class="eco-open__actions" aria-live="polite">
          {phase === 'ready' && crate && (
            <>
              <Button variant="primary" size="lg" icon="crate" onClick={open} data-autofocus sfx={false}>
                Open crate
              </Button>
              <p class="eco-open__hint">
                {crate.reason} · epic or better guaranteed within <span class="lm-num">{pityLeft}</span> {pityLeft === 1 ? 'crate' : 'crates'}
              </p>
            </>
          )}
          {phase === 'ready' && !crate && <p class="eco-open__hint">No crates waiting. Exemplary cases earn more.</p>}
          {(phase === 'shaking' || phase === 'burst') && <p class="eco-open__hint eco-open__hint--skip">Tap to skip</p>}
          {phase === 'reveal' && (
            <div class="eco-open__buttons">
              {remaining > 0 && (
                <Button variant="glass" icon="crate" onClick={next}>
                  Open next ({remaining})
                </Button>
              )}
              <Button variant="primary" icon="check" onClick={close} data-autofocus>
                Collect
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body,
  );
}

function Prize({ drop, store, services }: { drop: CrateDrop; store: Economy; services: GameServices }) {
  const state = useSignal(store.state);
  const c = drop.content;
  const color = RARITY_COLOR[drop.rarity];
  const playerName = useSignal(services.settings).playerName;
  let art: ComponentChild;
  let title: string;
  let sub: string;
  let extra: ComponentChild = null;
  if (c.type === 'cosmetic') {
    const item = itemById(c.itemId)!;
    art = <ItemArt item={item} playerName={playerName} />;
    title = item.name;
    sub = KIND_LABEL[item.kind];
    const equipped = state.equipped[item.kind] === item.id;
    extra = (
      <Button
        variant="glass" size="sm" icon={equipped ? 'check' : 'sparkle'} disabled={equipped}
        onClick={() => {
          store.equip(item.id);
          services.audio.play('select');
        }}
      >
        {equipped ? 'Equipped' : 'Equip now'}
      </Button>
    );
  } else if (c.type === 'coins') {
    art = (
      <div class="eco-prize__coins">
        <CoinGlyph size={92} spin />
      </div>
    );
    title = '';
    sub = c.converted ?? 'Lumens for the Boutique';
  } else {
    art = (
      <div class="eco-prize__notes">
        <Icon name="book" size={64} />
      </div>
    );
    title = `${c.amount} consult note${c.amount > 1 ? 's' : ''}`;
    sub = 'Each one waives the fee cost of a hint in the exam room.';
  }
  return (
    <div class={`eco-prize eco-prize--${drop.rarity}`} style={{ '--rc': color }}>
      <div class="eco-prize__glow" aria-hidden="true" />
      <div class="eco-prize__card">
        <span class="eco-prize__rarity">{RARITY_LABEL[drop.rarity]}{drop.guaranteed ? ' · guaranteed' : ''}</span>
        <div class="eco-prize__art">{art}</div>
        <h2 class="eco-prize__title">
          {c.type === 'coins' ? (
            <>
              +<CountUp value={c.amount} format={formatCoins} delay={120} /> <span class="eco-prize__glyph">✦</span>
            </>
          ) : (
            title
          )}
        </h2>
        <p class="eco-prize__sub">{sub}</p>
        {extra}
        {drop.rarity !== 'common' && <span class="eco-prize__shine" aria-hidden="true" />}
      </div>
    </div>
  );
}
