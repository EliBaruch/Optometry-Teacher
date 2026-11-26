import type { ComponentChildren } from 'preact';
import { useEffect, useId, useState } from 'preact/hooks';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { clamp } from '../lib/motion';
import { cx } from '../lib/cx';
import './RingMeter.css';

export interface RingMeterProps {
  /** 0..1 */
  value: number;
  size?: number;
  thickness?: number;
  accent?: string;
  /** Second colour of the stroke gradient (defaults to a lighter accent). */
  accent2?: string;
  /** Centre content (CountUp, icon, label…) */
  children?: ComponentChildren;
  ariaLabel?: string;
  /** Small tick marks around the dial — instrument look. */
  ticks?: boolean;
  class?: string;
}

/** Circular gauge with an animated luminous arc. */
export function RingMeter({ value, size = 112, thickness = 8, accent = 'var(--lm-accent)', accent2, children, ariaLabel, ticks = true, class: klass }: RingMeterProps) {
  const reduced = useReducedMotion();
  const gid = 'lm-ring-' + useId().replace(/[^a-zA-Z0-9_-]/g, '');
  const v = clamp(value);
  const [shown, setShown] = useState(reduced ? v : 0);
  useEffect(() => {
    if (reduced) return setShown(v);
    const raf = requestAnimationFrame(() => setShown(v));
    return () => cancelAnimationFrame(raf);
  }, [v, reduced]);

  const r = 50 - thickness / 2 - (ticks ? 5 : 1);
  const c = 2 * Math.PI * r;
  const tickEls = ticks
    ? Array.from({ length: 40 }, (_, i) => {
        const a = (i / 40) * Math.PI * 2 - Math.PI / 2;
        const major = i % 5 === 0;
        const r1 = 49;
        const r2 = major ? 45.5 : 47;
        const lit = i / 40 <= shown + 1e-6 && shown > 0;
        return (
          <line
            key={i}
            x1={50 + r1 * Math.cos(a)}
            y1={50 + r1 * Math.sin(a)}
            x2={50 + r2 * Math.cos(a)}
            y2={50 + r2 * Math.sin(a)}
            class={cx('lm-ring__tick', lit && 'is-lit', major && 'is-major')}
          />
        );
      })
    : null;

  return (
    <div
      class={cx('lm-ring', klass)}
      style={{ width: size, height: size, '--ring-c': accent }}
      role="meter"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(v * 100)}
      aria-label={ariaLabel}
    >
      <svg viewBox="0 0 100 100" aria-hidden="true">
        <defs>
          <linearGradient id={gid} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color={accent2 ?? 'var(--lm-brand-400)'} />
            <stop offset="1" stop-color={accent} />
          </linearGradient>
        </defs>
        {tickEls}
        <circle class="lm-ring__track" cx="50" cy="50" r={r} stroke-width={thickness} />
        <circle
          class="lm-ring__arc"
          cx="50"
          cy="50"
          r={r}
          stroke-width={thickness}
          stroke={`url(#${gid})`}
          stroke-dasharray={c}
          stroke-dashoffset={c * (1 - shown)}
          transform="rotate(-90 50 50)"
          opacity={shown > 0 ? 1 : 0}
        />
      </svg>
      {children !== undefined && <div class="lm-ring__center">{children}</div>}
    </div>
  );
}
