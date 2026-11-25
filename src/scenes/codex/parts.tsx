import { useEffect, useState, type MutableRef } from 'preact/hooks';
import type { Diagnosis } from '@core';
import { Icon, RingMeter, cx, isIconName } from '@ui-kit';
import { RARITY_META, URGENCY_META, categoryMeta, silhouette, toRoman } from './logic';

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

/** True while the viewport is at most `px` wide (phone layouts that need different sizes, not just CSS). */
export function useNarrow(px = 560): boolean {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return narrow;
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
        <span class="codex-illum__seal">
          <svg class="codex-illum__wax" viewBox="0 0 40 40">
            <path d="M20 2.5c2.6 0 3.4 2 5.6 2.6 2.3.6 4.2-.6 6 1 1.8 1.6.9 3.7 1.7 5.9.8 2.2 3 3 3 5.6s-1.9 3.3-2.3 5.6c-.4 2.3.9 4.2-.7 6-1.6 1.8-3.8.9-6 1.7-2.2.8-3 3-5.6 3.6-2.6.6-3.4-1.6-5.6-2.2-2.3-.6-4.4.7-6.1-.9-1.7-1.6-.7-3.8-1.5-6-.8-2.2-3.1-3-3.1-5.6s2.2-3.4 2.9-5.6c.7-2.2-.4-4.3 1.3-5.9 1.7-1.6 3.8-.4 6-1 2.3-.6 3.2-2.8 5.8-2.8z" />
            <circle cx="20" cy="20" r="10.5" class="codex-illum__wax-ring" />
          </svg>
          <Icon name="lock" class="codex-illum__lock" />
        </span>
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

export function RarityGem(props: { rarity: Diagnosis['rarity']; suffix?: string }) {
  const r = RARITY_META[props.rarity] ?? RARITY_META.common;
  return (
    <span class="codex-rarity" style={{ '--r': r.color }}>
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8 11 4.4 6 11.2 1 4.4z" /></svg>
      {r.label}{props.suffix ? ` ${props.suffix}` : ''}
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
  /** 1-based page number in the atlas (shown on sealed pages). */
  folio?: number;
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
            <span class="codex-card__sealed">
              {props.folio ? <span class="codex-card__folio">Folio {toRoman(props.folio)}</span> : null}
              {d.rarity !== 'common'
                ? <RarityGem rarity={d.rarity} suffix="find" />
                : <span class="codex-card__hint">Meet it in clinic</span>}
            </span>
          </>
        )}
      </span>
      {unlocked && props.seen && (
        <RingMeter value={props.mastery} size={40} thickness={11} ticks={false} accent={meta.accent} class="codex-card__ring" ariaLabel="Mastery">
          <span class="lm-num codex-card__pct">{Math.round(props.mastery * 100)}</span>
        </RingMeter>
      )}
      {unlocked && !props.seen && (
        <span class="codex-card__new" title="Not yet met in clinic">
          <Icon name="eye" size={16} />
        </span>
      )}
    </button>
  );
}

/** A reading-lens magnifier (the shared icon set has no search glyph). */
export function SearchGlyph(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
      <circle cx="10.5" cy="10.5" r="6.5" />
      <path d="M7.4 8.4a3.6 3.6 0 0 1 3-1.9" opacity="0.7" />
      <path d="m15.4 15.4 5.1 5.1" stroke-width="2.6" />
    </svg>
  );
}
