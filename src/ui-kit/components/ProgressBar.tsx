import type { ComponentChildren } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { clamp } from '../lib/motion';
import { cx } from '../lib/cx';
import './ProgressBar.css';

export interface ProgressBarProps {
  /** 0..max */
  value: number;
  max?: number;
  label?: ComponentChildren;
  /** Text at the right of the label row (e.g. "340 / 500 XP"). `true` shows a %. */
  valueText?: ComponentChildren | true;
  accent?: string;
  size?: 'sm' | 'md' | 'lg';
  /** Moving sheen on the fill (for active/levelling bars). */
  shimmer?: boolean;
  /** Accessible name when there's no visible label. */
  ariaLabel?: string;
  class?: string;
}

/** Luminous progress bar; the fill eases from 0 on mount and between values. */
export function ProgressBar({ value, max = 1, label, valueText, accent, size = 'md', shimmer, ariaLabel, class: klass }: ProgressBarProps) {
  const reduced = useReducedMotion();
  const ratio = max > 0 ? clamp(value / max) : 0;
  const [shown, setShown] = useState(reduced ? ratio : 0);
  useEffect(() => {
    if (reduced) {
      setShown(ratio);
      return;
    }
    const raf = requestAnimationFrame(() => setShown(ratio));
    return () => cancelAnimationFrame(raf);
  }, [ratio, reduced]);

  return (
    <div class={cx('lm-progress', `lm-progress--${size}`, klass)} style={accent ? { '--prog-c': accent } : undefined}>
      {(label || valueText) && (
        <div class="lm-progress__row">
          {label && <span class="lm-progress__label">{label}</span>}
          {valueText && <span class="lm-progress__value lm-num">{valueText === true ? `${Math.round(ratio * 100)}%` : valueText}</span>}
        </div>
      )}
      <div
        class="lm-progress__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={Math.round(value * 100) / 100}
        aria-label={ariaLabel ?? (typeof label === 'string' ? label : undefined)}
      >
        <div class={cx('lm-progress__fill', shimmer && 'is-shimmer', shown <= 0 && 'is-empty')} style={{ width: `${shown * 100}%` }}>
          <span class="lm-progress__tip" />
        </div>
      </div>
    </div>
  );
}
