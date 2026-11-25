import type { ComponentChild } from 'preact';
import { createPortal } from 'preact/compat';
import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, SfxId } from '@core';
import { Button, CountUp, Icon, RARITY_COLOR, useFocusTrap, useLocale, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { pickStrings } from '@core';
import { CRATES, PITY_LIMIT, itemById, type Rarity } from '../catalog';
import { S } from '../strings';
import { crateText, itemText, kindLabel } from '../text';
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

/**
 * Full-screen crate-opening theatre: shake → light leaks → burst → reveal.
 *
 * The roll is only PEEKED when the player presses Open; nothing is committed to
 * the save until the reveal, so the wallet, purse, shelf and receipt can't spoil
 * the surprise behind the scrim. If the theatre unmounts mid-shake the crate is
 * committed then (the roll is deterministic, so nothing can be re-rolled).
 */
export function CrateOpening({ services, store, crateId, onClose }: CrateOpeningProps) {
  const state = useSignal(store.state);
  const t = useStrings(S);
  const locale = useLocale();
  const reduced = useReducedMotion();
  const [crate, setCrate] = useState<StoredCrate | undefined>(() => state.crates.find((c) => c.id === crateId) ?? state.crates[0]);
  const [phase, setPhase] = useState<Phase>('ready');
  const [drop, setDrop] = useState<CrateDrop | null>(null);
  /** Late in the shake the light starts to take on the rarity colour. */
  const [foreshadow, setForeshadow] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const pending = useRef<string | null>(null);
  const root = useRef<HTMLDivElement>(null);
  const crateRef = useRef<HTMLDivElement>(null);
  useFocusTrap(root, true, '[data-autofocus]');
  const spec = crate ? CRATES[crate.kind] : CRATES.case;
  const specName = crateText(crate ? crate.kind : 'case', locale).name;

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, ms));

  /** Commit the peeked crate (once). Returns the drop actually applied. */
  const commit = (quiet: boolean): CrateDrop | null => {
    const id = pending.current;
    if (!id) return null;
    pending.current = null;
    return store.openCrate(id, { deferPulse: quiet })?.drop ?? null;
  };

  useEffect(
    () => () => {
      clear();
      commit(false); // closed mid-theatre: bank it now, the wallet celebrates normally
    },
    [],
  );

  // Keep keyboard focus inside the dialog as its buttons come and go.
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const target = phase === 'shaking' || phase === 'burst' ? el : el.querySelector<HTMLElement>('[data-autofocus]') ?? el;
    if (document.activeElement !== target) target.focus({ preventScroll: true });
  }, [phase, crate?.id]);

  const center = () => {
    const r = crateRef.current?.getBoundingClientRect();
    return r ? { x: r.left + r.width / 2, y: r.top + r.height * 0.42 } : { x: innerWidth / 2, y: innerHeight / 2 };
  };

  const burst = (d: CrateDrop) => {
    clear();
    setForeshadow(true);
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

  const reveal = (peeked: CrateDrop) => {
    clear();
    // The moment of truth: only now does the crate leave the shelf and the lumens land.
    const d = commit(true) ?? peeked;
    setDrop(d);
    setForeshadow(true);
    setPhase('reveal');
    services.audio.play(RARITY_SFX[d.rarity], { volume: 0.9 });
    if (d.content.type === 'coins') store.pulse(d.content.amount, specName);
    if (d.rarity === 'legendary' && !reduced) {
      const { x, y } = center();
      later(260, () => services.fx.burst(x, y - 40, { kind: 'confetti', count: 80 }));
    }
  };

  const open = () => {
    if (!crate || phase !== 'ready') return;
    const res = store.peekCrate(crate.id);
    if (!res) return;
    pending.current = crate.id;
    setDrop(res.drop);
    if (reduced) {
      reveal(res.drop);
      return;
    }
    setPhase('shaking');
    services.audio.play('drumroll', { volume: 0.8 });
    // Common crates stay in the crate's own trim; rarer light seeps out late.
    if (res.drop.rarity !== 'common') later(SHAKE_MS * 0.68, () => setForeshadow(true));
    later(SHAKE_MS, () => burst(res.drop));
  };

  const next = () => {
    const n = store.state.get().crates[0];
    clear();
    setDrop(null);
    setForeshadow(false);
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

  // Document-level capture: Escape / Space / Enter belong to the theatre while it
  // is up, whatever has focus — the Screen underneath must never see them.
  const keys = useRef({ phase, close, skip });
  keys.current = { phase, close, skip };
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = keys.current;
      const busy = k.phase === 'shaking' || k.phase === 'burst';
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        k.close();
      } else if ((e.key === ' ' || e.key === 'Enter') && busy) {
        e.preventDefault();
        e.stopPropagation();
        k.skip();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, []);

  const shown = foreshadow && drop ? drop.rarity : null;
  const remaining = state.crates.length;
  const pityLeft = Math.max(1, PITY_LIMIT - state.pity);

  return createPortal(
    <div
      ref={root}
      class={`eco-open eco-open--${phase}${shown ? ` eco-open--${shown}` : ''}${reduced ? ' is-reduced' : ''}`}
      style={{ '--rc': shown ? RARITY_COLOR[shown] : spec.trim, '--trim': spec.trim }}
      role="dialog"
      aria-modal="true"
      aria-label={phase === 'reveal' ? t.opened2(specName) : specName}
      aria-busy={phase === 'shaking' || phase === 'burst' || undefined}
      tabIndex={-1}
    >
      <div class="eco-open__scrim" onClick={phase === 'reveal' || phase === 'ready' ? close : skip} aria-hidden="true" />
      <div class="eco-open__rays" aria-hidden="true" />
      <div class="eco-open__stage">
        <p class="eco-open__eyebrow lm-eyebrow">{specName}</p>

        {crate && phase !== 'reveal' && (
          <div class="eco-open__crate" ref={crateRef} onClick={phase === 'ready' ? open : skip} aria-hidden="true">
            <CrateArt kind={crate.kind} size="min(62vw, 260px)" />
          </div>
        )}

        {phase === 'reveal' && drop && <Prize drop={drop} store={store} services={services} />}

        <div class="eco-open__actions" aria-live="polite">
          {phase === 'ready' && crate && (
            <>
              <Button variant="primary" size="lg" icon="crate" onClick={open} data-autofocus sfx={false}>
                {t.openCrate}
              </Button>
              <p class="eco-open__hint">
                <bdi>{t.hintLine(crate.reason, pityLeft)}</bdi>
              </p>
            </>
          )}
          {phase === 'ready' && !crate && (
            <>
              <p class="eco-open__hint">{t.noCrates}</p>
              <Button variant="glass" icon="check" onClick={close} data-autofocus>{t.backToBoutique}</Button>
            </>
          )}
          {(phase === 'shaking' || phase === 'burst') && <p class="eco-open__hint eco-open__hint--skip">{t.tapSkip}<span class="eco-open__keys">{t.spaceKey}</span></p>}
          {phase === 'reveal' && (
            <div class="eco-open__buttons">
              {remaining > 0 && (
                <Button variant="glass" icon="crate" onClick={next}>
                  {t.openNext(remaining)}
                </Button>
              )}
              <Button variant="primary" icon="check" onClick={close} data-autofocus>
                {t.collect}
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
  const t = useStrings(S);
  const locale = useLocale();
  const T = pickStrings(S, locale);
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
    title = itemText(item, locale).name;
    sub = kindLabel(item.kind, locale);
    const equipped = state.equipped[item.kind] === item.id;
    extra = (
      <Button
        variant="glass" size="sm" icon={equipped ? 'check' : 'sparkle'} disabled={equipped}
        onClick={() => {
          store.equip(item.id);
          services.audio.play('select');
        }}
      >
        {equipped ? t.equipped : t.equipNow}
      </Button>
    );
  } else if (c.type === 'coins') {
    art = (
      <div class="eco-prize__coins">
        <CoinGlyph size={92} spin />
      </div>
    );
    title = '';
    sub = c.converted ? t.converted : t.coinsSub;
  } else {
    art = (
      <div class="eco-prize__notes">
        <Icon name="book" size={64} />
      </div>
    );
    title = t.notesTitle(c.amount);
    sub = t.notesSub;
  }
  return (
    <div class={`eco-prize eco-prize--${drop.rarity}`} style={{ '--rc': color }}>
      <div class="eco-prize__glow" aria-hidden="true" />
      <div class="eco-prize__card">
        <span class="eco-prize__rarity">{T.rarity[drop.rarity]}{drop.guaranteed ? t.guaranteed : ''}</span>
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
