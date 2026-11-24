import { useEffect, type MutableRef } from 'preact/hooks';
import type { Diagnosis } from '@core';
import { Icon, RingMeter, cx, isIconName } from '@ui-kit';
import { RARITY_META, URGENCY_META, categoryMeta, silhouette } from './logic';

/** Pointer parallax: writes --mx / --my (-1..1) on the element. Off with reduced motion. */
export function useParallax(ref: MutableRef<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) {
      el?.style.setProperty('--mx', '0');
      el?.style.setProperty('--my', '0');
      return;
    }
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (!raf)
        raf = requestAnimationFrame(() => {
          raf = 0;
          el.style.setProperty('--mx', x.toFixed(3));
          el.style.setProperty('--my', y.toFixed(3));
        });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);
}

/** A gilded manuscript initial: the first letter in an ornamented frame tinted by the category accent. */
export function Illumination(props: { letter: string; accent: string; size?: number; icon?: string; locked?: boolean }) {
  const s = props.size ?? 64;
  return (
    <span class={cx('codex-illum', props.locked && 'is-locked')} style={{ '--acc': props.accent, width: s, height: s, fontSize: s * 0.62 }} aria-hidden="true">
      <svg class="codex-illum__frame" viewBox="0 0 64 64">
        <rect x="2.5" y="2.5" width="59" height="59" rx="9" />
        <rect x="6.5" y="6.5" width="51" height="51" rx="6" class="codex-illum__inner" />
        {[[6.5, 6.5], [57.5, 6.5], [6.5, 57.5], [57.5, 57.5]].map(([cx_, cy], i) => (
          <g key={i} transform={`translate(${cx_} ${cy})`}>
            <path d="M-4 0 0 -4 4 0 0 4z" class="codex-illum__gem" />
          </g>
        ))}
        <path d="M14 32c6-9 12-9 18 0s12 9 18 0" class="codex-illum__vine" />
      </svg>
      {props.locked ? (
        <Icon name="lock" class="codex-illum__lock" />
      ) : (
        <span class="codex-illum__letter">{props.letter}</span>
      )}
      {props.icon && isIconName(props.icon) && !props.locked && (
        <span class="codex-illum__badge"><Icon name={props.icon} /></span>
      )}
    </span>
  );
}

export function UrgencyTag(props: { urgency: Diagnosis['typicalUrgency']; long?: boolean }) {
  const u = URGENCY_META[props.urgency];
  return (
    <span class={cx('codex-urgency', `codex-urgency--${props.urgency}`)} style={{ '--u': u.color }} title={u.when}>
      <span class="codex-urgency__dot" aria-hidden="true" />
      {u.label}
      {props.long && <span class="codex-urgency__when"> · {u.when}</span>}
    </span>
  );
}

export function RarityGem(props: { rarity: Diagnosis['rarity'] }) {
  const r = RARITY_META[props.rarity] ?? RARITY_META.common;
  return (
    <span class="codex-rarity" style={{ '--r': r.color }}>
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8 11 4.4 6 11.2 1 4.4z" /></svg>
      {r.label}
    </span>
  );
}

/** One entry in the atlas grid. Locked entries show an engraved silhouette. */
export function EntryCard(props: {
  d: Diagnosis;
  unlocked: boolean;
  seen: boolean;
  mastery: number;
  index: number;
  reduced: boolean;
  onOpen: () => void;
}) {
  const { d, unlocked } = props;
  const meta = categoryMeta(d.category);
  const delay = props.reduced ? 0 : Math.min(props.index, 14) * 45;
  return (
    <button
      type="button"
      class={cx('codex-card', unlocked ? 'is-open' : 'is-locked', props.seen && 'is-seen')}
      style={{ '--acc': meta.accent, '--lm-delay': `${delay}ms` }}
      onClick={props.onOpen}
      aria-label={unlocked ? `${d.name}${props.seen ? `, mastery ${Math.round(props.mastery * 100)}%` : ''}` : `Undiscovered ${meta.label} entry`}
      data-id={d.id}
    >
      <span class="codex-card__shine" aria-hidden="true" />
      <Illumination letter={unlocked ? d.name.charAt(0) : '?'} accent={meta.accent} size={46} locked={!unlocked} />
      <span class="codex-card__body">
        {unlocked ? (
          <>
            <span class="codex-card__name">{d.name}</span>
            {d.aka?.[0] && <span class="codex-card__aka">{d.aka[0]}</span>}
            <span class="codex-card__meta">
              <UrgencyTag urgency={d.typicalUrgency} />
              {d.rarity !== 'common' && <RarityGem rarity={d.rarity} />}
            </span>
          </>
        ) : (
          <>
            <span class="codex-card__ghost" aria-hidden="true">
              {silhouette(d.name).map((w, i) => <span key={i} style={{ width: `${w * 0.55}em` }} />)}
            </span>
            <span class="codex-card__aka">Meet it in clinic to unlock</span>
          </>
        )}
      </span>
      {unlocked && props.seen && (
        <RingMeter value={props.mastery} size={40} thickness={11} ticks={false} accent={meta.accent} class="codex-card__ring" ariaLabel="Mastery">
          <span class="lm-num codex-card__pct">{Math.round(props.mastery * 100)}</span>
        </RingMeter>
      )}
      {unlocked && !props.seen && <span class="codex-card__new" title="Not yet met in clinic">Study</span>}
    </button>
  );
}
