import { useEffect, useState, type MutableRef } from 'preact/hooks';
import type { Diagnosis } from '@core';
import { Icon, RingMeter, cx, isIconName, useStrings } from '@ui-kit';
import { RARITY_META, URGENCY_META, silhouette, toRoman } from './logic';
import { S } from './strings';

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

/** A vivid app-icon tile: the first letter on a category-coloured glass tile (a padlock while locked). */
export function Illumination(props: { letter: string; accent: string; size?: number; icon?: string; locked?: boolean }) {
  const s = props.size ?? 64;
  return (
    <span class={cx('codex-illum', props.locked && 'is-locked')} style={{ '--acc': props.accent, width: s, height: s, fontSize: s * 0.5 }} aria-hidden="true">
      {props.locked ? <Icon name="lock" class="codex-illum__lock" /> : <span class="codex-illum__letter">{props.letter}</span>}
      {props.icon && isIconName(props.icon) && !props.locked && (
        <span class="codex-illum__badge"><Icon name={props.icon} /></span>
      )}
    </span>
  );
}

export function UrgencyTag(props: { urgency: Diagnosis['typicalUrgency']; long?: boolean }) {
  const t = useStrings(S);
  const u = { ...URGENCY_META[props.urgency], ...t.urgency[props.urgency] };
  return (
    <span class={cx('codex-urgency', `codex-urgency--${props.urgency}`)} style={{ '--u': u.color }} title={u.when}>
      <span class="codex-urgency__dot" aria-hidden="true" />
      {u.label}
      {props.long && <span class="codex-urgency__when"> · {u.when}</span>}
    </span>
  );
}

export function RarityGem(props: { rarity: Diagnosis['rarity']; suffix?: string }) {
  const t = useStrings(S);
  const r = RARITY_META[props.rarity] ?? RARITY_META.common;
  return (
    <span class="codex-rarity" style={{ '--r': r.color }}>
      <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M6 .8 11 4.4 6 11.2 1 4.4z" /></svg>
      {t.rarity[props.rarity] ?? r.label}{props.suffix ? ` ${props.suffix}` : ''}
    </span>
  );
}

/** One entry in the atlas grid. Locked entries show an engraved silhouette. */
export function EntryCard(props: {
  d: Diagnosis;
  cm: (c: string) => { label: string; accent: string };
  unlocked: boolean;
  seen: boolean;
  mastery: number;
  index: number;
  /** 1-based page number in the atlas (shown on sealed pages). */
  folio?: number;
  reduced: boolean;
  onOpen: () => void;
}) {
  const t = useStrings(S);
  const { d, unlocked } = props;
  const meta = props.cm(d.category);
  const delay = props.reduced ? 0 : Math.min(props.index, 14) * 45;
  return (
    <button
      type="button"
      class={cx('codex-card', unlocked ? 'is-open' : 'is-locked', props.seen && 'is-seen')}
      style={{ '--acc': meta.accent, '--lm-delay': `${delay}ms` }}
      onClick={props.onOpen}
      aria-label={unlocked ? t.cardAria(d.name, props.seen, Math.round(props.mastery * 100)) : t.undiscoveredEntry(meta.label)}
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
              {props.folio ? <span class="codex-card__folio">{t.folio(toRoman(props.folio), props.folio)}</span> : null}
              {d.rarity !== 'common'
                ? <RarityGem rarity={d.rarity} suffix={t.findSuffix} />
                : <span class="codex-card__hint">{t.meetInClinic}</span>}
            </span>
          </>
        )}
      </span>
      {unlocked && props.seen && (
        <RingMeter value={props.mastery} size={40} thickness={11} ticks={false} accent={meta.accent} class="codex-card__ring" ariaLabel={t.mastery}>
          <span class="lm-num codex-card__pct">{Math.round(props.mastery * 100)}</span>
        </RingMeter>
      )}
      {unlocked && !props.seen && (
        <span class="codex-card__new" title={t.notMet}>
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
