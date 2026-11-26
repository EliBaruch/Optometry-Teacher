import { useEffect, useRef, useState } from 'preact/hooks';
import type { SfxId } from '@core';
import { Button, ProgressBar, cx, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { CARD_RARITIES, nextFrame, rarityRank, setReward, type CardRarity, type Pull } from '../model';
import { GALLERY_COLOR, RARITY_HEX, type CollectionStore } from '../store';
import { S, wingText } from '../strings';
import { WINGS } from '../catalog';
import { EyeGlyph, GhostCard, IrisCard } from './IrisCard';
import { viewFor } from './views';
import { useSeenFor } from './visibility';
import './reveal.css';

type Phase = 'sealed' | 'charging' | 'open';

const AUTO_OPEN_MS = 1800;
const TEAR_MS = 760;
const CHARGE_STEP_MS = 260;
const SFX: Record<CardRarity, SfxId> = { common: 'reveal', rare: 'rare', epic: 'rare', legendary: 'legendary' };
const BURST: Record<CardRarity, 'sparks' | 'stars' | 'confetti'> = { common: 'sparks', rare: 'sparks', epic: 'stars', legendary: 'confetti' };

export function headline(p: Pull, t: typeof S.en = S.en): string {
  if (p.isNew) return t.headNew;
  if (p.frameAfter !== p.frameBefore) return t.headFrame(t.frame[p.frameAfter]);
  if (p.rarityUp) return t.headUp(t.rarity[p.rarity]);
  return t.headPolished;
}

/** Results screen: the sealed card sleeve that bursts open into this patient's iris card. */
export function PackReveal({ store }: { store: CollectionStore }) {
  const { services } = store;
  const session = useSignal(services.session.state);
  const state = useSignal(store.state);
  const pull = state.lastPull && session && state.lastPull.caseId === session.caseId && state.lastPull.at >= session.startedAt ? state.lastPull : null;
  const glimpse = !pull && state.lastGlimpse && session && state.lastGlimpse.caseId === session.caseId && state.lastGlimpse.at >= session.startedAt ? state.lastGlimpse : null;

  if (pull) return <Reveal key={`${pull.caseId}:${pull.at}`} store={store} pull={pull} />;
  if (glimpse) return <Glimpse store={store} dx={glimpse.dx} />;
  return null;
}

function Reveal({ store, pull }: { store: CollectionStore; pull: Pull }) {
  const { services } = store;
  const t = useStrings(S);
  const reduced = useReducedMotion();
  const state = useSignal(store.state);
  const catalog = store.catalog();
  const view = viewFor(state, catalog, pull.dx);
  const [phase, setPhaseState] = useState<Phase>(reduced ? 'open' : 'sealed');
  const phaseRef = useRef(phase);
  const setPhase = (p: Phase) => {
    phaseRef.current = p;
    setPhaseState(p);
  };
  const [charge, setCharge] = useState<CardRarity>('common');
  const [flipped, setFlipped] = useState(!reduced);
  const [tearing, setTearing] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = (fn: () => void, ms: number) => void timers.current.push(setTimeout(fn, ms));
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const open = () => {
    if (phaseRef.current !== 'sealed') return;
    const { audio, fx } = services;
    setPhase('charging');
    audio.play('drumroll', { volume: 0.5 });
    // Colour climb: the sleeve's glow steps up through each tier it reaches.
    const steps = CARD_RARITIES.slice(0, rarityRank(pull.rarity) + 1);
    steps.forEach((r, i) => later(() => {
      setCharge(r);
      if (i > 0) {
        audio.play('sparkle', { volume: 0.5, pitch: 1 + i * 0.15 });
        fx.shake(1 + i, 120);
      }
    }, i * CHARGE_STEP_MS));
    later(() => {
      setPhase('open');
      setTearing(true);
      later(() => setTearing(false), TEAR_MS);
      audio.play('chest-open');
      later(() => audio.play(SFX[pull.rarity]), 120);
      const r = root.current?.querySelector('.gp-stage')?.getBoundingClientRect();
      if (r) {
        const x = r.left + r.width / 2;
        const y = r.top + r.height * 0.45;
        fx.burst(x, y, { kind: BURST[pull.rarity], count: 24 + rarityRank(pull.rarity) * 22, color: RARITY_HEX[pull.rarity] });
        if (rarityRank(pull.rarity) >= 2) later(() => fx.burst(x, y, { kind: 'sparks', count: 30, color: '#fff3c4' }), 260);
      }
      if (pull.rarity === 'legendary') {
        fx.flash('#ffd27a', 260);
        fx.hitstop(90);
      } else if (pull.rarity === 'epic') fx.flash('#c084fc', 160);
      later(() => setFlipped(false), 380);
    }, steps.length * CHARGE_STEP_MS + 220);
  };

  // Auto-open only after the sleeve has really been on screen for a beat
  // (the results screen fades its extras in late and may scroll).
  useSeenFor(root, AUTO_OPEN_MS, open, phase === 'sealed');

  if (!view) return null;
  const name = view.dx?.name ?? pull.dx;
  const next = nextFrame(view.card.shine);
  const set = pull.setCompleted ? WINGS[pull.setCompleted as keyof typeof WINGS] : undefined;
  const setSize = pull.setCompleted ? catalog.filter((d) => d.category === pull.setCompleted).length : 0;
  const isOpen = phase === 'open';

  return (
    <section
      ref={root}
      class={cx('gp', `gp--${phase}`, `gp-charge-${charge}`)}
      style={{ '--rar': RARITY_HEX[pull.rarity], '--charge': RARITY_HEX[charge] }}
      aria-label={t.rewardAria}
    >
      <div class="gp-stage">
        <div class="gp-rays" aria-hidden="true" />
        <div class="gp-card-wrap">
          <IrisCard view={view} size="md" flipped={flipped} sway={isOpen && !flipped} onActivate={isOpen ? () => { services.audio.play('whoosh', { volume: 0.6 }); setFlipped((f) => !f); } : undefined} />
        </div>
        {(!isOpen || tearing) && (
          <button type="button" class={cx('gp-sleeve', tearing && 'is-torn')} onClick={open} aria-label={t.openAria} tabIndex={isOpen ? -1 : 0} aria-hidden={isOpen ? 'true' : undefined}>
            <span class="gp-sleeve__half gp-sleeve__half--top" aria-hidden="true" />
            <span class="gp-sleeve__half gp-sleeve__half--bottom" aria-hidden="true" />
            <span class="gp-seal" aria-hidden="true"><EyeGlyph /></span>
            <span class="gp-sleeve__brand" aria-hidden="true">{t.brand}</span>
          </button>
        )}
      </div>
      <div class="gp-copy" aria-live="polite">
        <div class="lm-eyebrow gp-eyebrow">{t.hubTitle}</div>
        {isOpen ? (
          <>
            <h3 class="gp-title">{headline(pull, t)}</h3>
            <p class="gp-name">{name}</p>
            <p class="gp-rarity"><i class="gp-gem" />{t.pullRarity(t.rarity[pull.rarity])}{pull.isNew ? '' : t.pullShine(pull.shineGained)}</p>
            {!pull.isNew && next && (
              <ProgressBar value={view.card.shine - next.from} max={next.to - next.from} label={t.polishTo(t.frame[next.tier])} valueText={`\u2066${view.card.shine} / ${next.to}\u2069`} size="sm" accent={GALLERY_COLOR} />
            )}
            {set && (
              <p class="gp-set" style={{ '--c': set.color }}>
                {t.setDone(wingText(t, pull.setCompleted as never).wing)} <span class="lm-num"><bdi dir="ltr">+{setReward(setSize).xp} XP</bdi></span>
              </p>
            )}
            <p class="gp-hint">{t.packHint}</p>
            <div class="gp-actions">
              <Button size="sm" icon="refresh" onClick={() => setFlipped((f) => !f)} sfx="whoosh">{t.flip}</Button>
              <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={() => services.router.go('gallery')}>{t.openGallery}</Button>
            </div>
          </>
        ) : (
          <>
            <h3 class="gp-title">{t.leftSomething}</h3>
            <p class="gp-hint">{t.leftSub}</p>
            <div class="gp-actions">
              <Button size="sm" variant="primary" icon="gem" onClick={open} sfx={false} disabled={phase !== 'sealed'}>
                {phase === 'charging' ? t.opening : t.openCard}
              </Button>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Glimpse({ store, dx }: { store: CollectionStore; dx: string }) {
  const t = useStrings(S);
  const catalog = store.catalog();
  const d = catalog.find((x) => x.id === dx);
  const no = catalog.indexOf(d!) + 1;
  return (
    <section class="gp gp--glimpse" aria-label={t.hubTitle}>
      <div class="gp-stage gp-stage--small">
        <GhostCard number={no} total={catalog.length} category={d?.category} glimpsedName={d?.name ?? dx} />
      </div>
      <div class="gp-copy">
        <div class="lm-eyebrow gp-eyebrow">{t.hubTitle}</div>
        <h3 class="gp-title">{t.silhouette}</h3>
        <p class="gp-hint">
          {t.glimpseA}<strong>{d?.name ?? dx}</strong>{t.glimpseB}
        </p>
      </div>
    </section>
  );
}
