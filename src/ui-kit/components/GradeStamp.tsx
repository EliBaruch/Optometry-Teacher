import { useEffect, useId } from 'preact/hooks';
import type { Grade } from '@core';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useFx, useSfx } from '../hooks/useSfx';
import { GRADE_COLOR, GRADE_WORD } from '../lib/palette';
import { cx } from '../lib/cx';
import './GradeStamp.css';

export interface GradeStampProps {
  grade: Grade;
  size?: number;
  /** Slam in on mount (default true). */
  animate?: boolean;
  delay?: number;
  /** Shake the screen on impact via services.fx (default true for S/A/F). */
  shake?: boolean;
  /** Text around the rim. */
  rimText?: string;
  onImpact?: () => void;
  class?: string;
}

/** Time from animation start to the stamp hitting the paper (ms). Matches CSS keyframes. */
export const STAMP_IMPACT_MS = 300;

/** Rubber-stamp grade that slams onto the page. S is iridescent gold. */
export function GradeStamp({ grade, size = 168, animate = true, delay = 0, shake, rimText = 'LUMEN EYE CLINIC ✦ CASE REVIEW ✦ ', onImpact, class: klass }: GradeStampProps) {
  const reduced = useReducedMotion();
  const play = useSfx();
  const fx = useFx();
  const uid = 'lm-stamp-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const anim = animate && !reduced;
  const isS = grade === 'S';
  const doShake = shake ?? (grade === 'S' || grade === 'A' || grade === 'F');

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

  const ink = isS ? `url(#${uid}-iri)` : 'currentColor';
  return (
    <div
      class={cx('lm-stamp', `lm-stamp--${grade}`, anim && 'is-anim', klass)}
      style={{ width: size, height: size, '--stamp-c': GRADE_COLOR[grade], '--d': `${delay}ms` }}
      role="img"
      aria-label={`Grade ${grade}: ${GRADE_WORD[grade]}`}
    >
      {isS && <span class="lm-stamp__rays" aria-hidden="true" />}
      <span class="lm-stamp__shock" aria-hidden="true" />
      <span class="lm-stamp__dust" aria-hidden="true">
        {Array.from({ length: 10 }, (_, i) => (
          <i key={i} style={{ '--a': `${i * 36 + (i % 2) * 14}deg`, '--r': `${58 + (i % 3) * 9}%` }} />
        ))}
      </span>
      <svg class="lm-stamp__svg" viewBox="0 0 200 200" aria-hidden="true">
        <defs>
          <filter id={`${uid}-ink`} x="-10%" y="-10%" width="120%" height="120%">
            <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={grade.charCodeAt(0)} result="n" />
            <feDisplacementMap in="SourceGraphic" in2="n" scale="3" result="d" />
            <feTurbulence type="fractalNoise" baseFrequency="0.045" numOctaves="3" seed="11" result="blot" />
            <feColorMatrix in="blot" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -2.4 1.95" result="mask" />
            <feComposite in="d" in2="mask" operator="in" />
          </filter>
          <path id={`${uid}-rim`} d="M100 100 m-77 0 a77 77 0 1 1 154 0 a77 77 0 1 1 -154 0" />
          {isS && (
            <linearGradient id={`${uid}-iri`} x1="0" y1="0" x2="200" y2="200" gradientUnits="userSpaceOnUse" spreadMethod="reflect">
              <stop offset="0" stop-color="#fff2c4" />
              <stop offset="0.22" stop-color="#ffd27a" />
              <stop offset="0.4" stop-color="#ffb4d8" />
              <stop offset="0.58" stop-color="#bba6ff" />
              <stop offset="0.76" stop-color="#8fe9ff" />
              <stop offset="1" stop-color="#ffe08a" />
              {!reduced && <animateTransform attributeName="gradientTransform" type="translate" values="-200 -200; 0 0; -200 -200" dur="6s" repeatCount="indefinite" />}
            </linearGradient>
          )}
        </defs>
        <g filter={`url(#${uid}-ink)`} fill="none" stroke={ink}>
          <circle cx="100" cy="100" r="92" stroke-width="6" />
          <circle cx="100" cy="100" r="64" stroke-width="2" />
          <text class="lm-stamp__rim" fill={ink} stroke="none">
            <textPath href={`#${uid}-rim`} startOffset="0">{rimText.repeat(2)}</textPath>
          </text>
          <text class="lm-stamp__letter" x="100" y="100" text-anchor="middle" dominant-baseline="central" fill={ink} stroke="none">
            {grade}
          </text>
        </g>
      </svg>
      {isS && <span class="lm-stamp__glare" aria-hidden="true" />}
    </div>
  );
}
