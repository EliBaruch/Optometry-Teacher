import { useEffect, useId, useRef } from 'preact/hooks';
import type { Grade } from '@core';
import { useInView } from '../hooks/useInView';
import { useLiteRendering } from '../hooks/useLiteRendering';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useFx, useSfx } from '../hooks/useSfx';
import { GRADE_COLOR, GRADE_VIVID } from '../lib/palette';
import { cx } from '../lib/cx';
import './GradeStamp.css';
import { useUiStrings } from '../strings';

export interface GradeStampProps {
  grade: Grade;
  size?: number;
  /** Slam in on mount (default true). */
  animate?: boolean;
  delay?: number;
  /** Shake the screen on impact via services.fx (default true for S/A/F). */
  shake?: boolean;
  /** @deprecated kept for API compatibility; the medal has no rim text. */
  rimText?: string;
  onImpact?: () => void;
  class?: string;
}

/** Time from animation start to the stamp hitting the paper (ms). Matches CSS keyframes. */
export const STAMP_IMPACT_MS = 300;

/** Editorial grade medal that pops onto the page: vivid colour-coded glass disc, huge navy numeral. S is gold with an iridescent rim. */
export function GradeStamp({ grade, size = 168, animate = true, delay = 0, shake, onImpact, class: klass }: GradeStampProps) {
  const ui = useUiStrings();
  const reduced = useReducedMotion();
  const play = useSfx();
  const fx = useFx();
  const uid = 'lm-stamp-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const anim = animate && !reduced;
  const isS = grade === 'S';
  const doShake = shake ?? (grade === 'S' || grade === 'A' || grade === 'F');
  const root = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  // Decorative S loops (rays, glare, gradient drift) pause while off screen.
  const inView = useInView(root);
  const lite = useLiteRendering();
  useEffect(() => {
    const el = svg.current;
    if (!el || !isS || typeof el.pauseAnimations !== 'function') return;
    if (inView) el.unpauseAnimations();
    else el.pauseAnimations();
  }, [inView, isS]);

  useEffect(() => {
    if (!animate) return;
    const t = setTimeout(() => {
      play('stamp');
      if (isS) play('legendary', { volume: 0.6 });
      if (doShake && !reduced) fx.shake(isS ? 9 : 6, 260);
      onImpact?.();
    }, reduced ? delay : delay + STAMP_IMPACT_MS);
    return () => clearTimeout(t);
  }, [grade, animate]);

  const ink = isS ? `url(#${uid}-iri)` : 'none';
  return (
    <div
      ref={root}
      class={cx('lm-stamp', `lm-stamp--${grade}`, anim && 'is-anim', !inView && 'is-idle', klass)}
      style={{ width: size, '--stamp-c': GRADE_COLOR[grade], '--stamp-v': GRADE_VIVID[grade], '--d': `${delay}ms` }}
      role="img"
      aria-label={ui.grade(grade, ui.gradeWord[grade])}
    >
      {isS && <span class="lm-stamp__rays" aria-hidden="true" />}
      <span class="lm-stamp__shock" aria-hidden="true" />
      <span class="lm-stamp__dust" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 36 + (i % 2) * 14}deg`, '--r': `${58 + (i % 3) * 9}%` }} />
        ))}
      </span>
      <svg ref={svg} class="lm-stamp__svg" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <linearGradient id={`${uid}-fill`} x1="0.15" y1="0" x2="0.85" y2="1">
            <stop offset="0" style={{ stopColor: 'color-mix(in srgb, var(--stamp-v) 55%, white)' }} />
            <stop offset="1" style={{ stopColor: 'var(--stamp-v)' }} />
          </linearGradient>
          <linearGradient id={`${uid}-gloss`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stop-color="#fff" stop-opacity="0.75" />
            <stop offset="1" stop-color="#fff" stop-opacity="0" />
          </linearGradient>
          {isS && (
            <linearGradient id={`${uid}-iri`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
              <stop offset="0" stop-color="#ffe27a" />
              <stop offset="0.25" stop-color="#ff9ccf" />
              <stop offset="0.5" stop-color="#b69cff" />
              <stop offset="0.75" stop-color="#6fd6ff" />
              <stop offset="1" stop-color="#ffe27a" />
              {!reduced && !lite && <animateTransform attributeName="gradientTransform" type="translate" values="-200 -200; 0 0; -200 -200" dur="6s" begin={`${(delay + STAMP_IMPACT_MS) / 1000}s`} repeatCount="2" fill="freeze" />}
            </linearGradient>
          )}
        </defs>
        {/* a vivid glass medal: colour-coded disc, specular dome, hairline inner ring, huge navy numeral */}
        <circle class="lm-stamp__disc" cx="100" cy="100" r="92" fill={`url(#${uid}-fill)`} />
        {isS && <circle cx="100" cy="100" r="92" fill="none" stroke={ink} stroke-width="5" />}
        <circle cx="100" cy="100" r="91" fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="1.5" />
        <circle cx="100" cy="100" r="76" fill="none" stroke="#0a1633" stroke-opacity="0.14" stroke-width="1.5" />
        <path d="M30 78a76 76 0 0 1 140 0c-20-12-46-16-70-16s-50 4-70 16z" fill={`url(#${uid}-gloss)`} />
        <text class="lm-stamp__letter" x="100" y="104" text-anchor="middle" dominant-baseline="central">
          {grade}
        </text>
      </svg>
      {isS && <span class="lm-stamp__glare" aria-hidden="true" />}
    </div>
  );
}
