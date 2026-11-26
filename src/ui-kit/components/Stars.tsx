import { useEffect, useId } from 'preact/hooks';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSfx } from '../hooks/useSfx';
import { cx } from '../lib/cx';
import './Stars.css';
import { useUiStrings } from '../strings';

export interface StarsProps {
  /** 0..max (integers) */
  value: number;
  max?: number;
  size?: number;
  /** Play the staggered fill animation on mount. */
  animate?: boolean;
  /** ms before the first star */
  delay?: number;
  /** ms between stars */
  stagger?: number;
  sfx?: boolean;
  class?: string;
}

const STAR = 'M12 2.6l2.78 6.02 6.6.74-4.92 4.47 1.37 6.5L12 17.04l-5.83 3.29 1.37-6.5L2.62 9.36l6.6-.74z';

/** Mastery stars (0–3). Earned stars pop in one by one with a glint. */
export function Stars({ value, max = 3, size = 28, animate = true, delay = 150, stagger = 260, sfx = true, class: klass }: StarsProps) {
  const ui = useUiStrings();
  const reduced = useReducedMotion();
  const play = useSfx();
  const anim = animate && !reduced;
  const filled = Math.max(0, Math.min(max, Math.round(value)));
  const gid = 'lm-star-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');

  useEffect(() => {
    if (!anim || !sfx) return;
    const ts = Array.from({ length: filled }, (_, i) =>
      setTimeout(() => play('sparkle', { pitch: 1 + i * 0.12, volume: 0.7 }), delay + i * stagger + 180),
    );
    return () => ts.forEach(clearTimeout);
  }, [filled, anim]);

  return (
    <span class={cx('lm-stars', anim && 'is-anim', klass)} role="img" aria-label={ui.stars(filled, max)}>
      {Array.from({ length: max }, (_, i) => {
        const on = i < filled;
        return (
          <span
            key={i}
            class={cx('lm-star', on && 'is-on', max === 3 && i === 1 && 'is-mid')}
            style={{ width: size, height: size, '--d': `${delay + i * stagger}ms` }}
          >
            <svg viewBox="0 0 24 24" aria-hidden="true">
              {on && (
                <defs>
                  <linearGradient id={`${gid}-${i}`} x1="0.2" y1="0" x2="0.8" y2="1">
                    <stop offset="0" stop-color="#ffe27a" />
                    <stop offset="0.45" stop-color="#ffcb00" />
                    <stop offset="1" stop-color="#f5a524" />
                  </linearGradient>
                </defs>
              )}
              <path class="lm-star__empty" d={STAR} />
              {on && <path class="lm-star__fill" d={STAR} fill={`url(#${gid}-${i})`} />}
            </svg>
            {on && <span class="lm-star__glint" aria-hidden="true" />}
          </span>
        );
      })}
    </span>
  );
}
