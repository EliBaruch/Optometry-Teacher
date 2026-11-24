import { useEffect, useRef, useState } from 'preact/hooks';
import type { SfxId } from '@core';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSfx } from '../hooks/useSfx';
import { countDuration, ease, formatNumber, tweenValue } from '../lib/motion';
import { cx } from '../lib/cx';

export interface CountUpProps {
  value: number;
  /** Starting value on first mount (default 0). Later changes animate from the previous value. */
  from?: number;
  /** ms; default scales with the size of the change */
  duration?: number;
  delay?: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  format?: (n: number) => string;
  /** Soft tick sound while counting (throttled). */
  tickSfx?: SfxId | false;
  onDone?: () => void;
  class?: string;
}

/** Animated number readout in Space Grotesk with tabular figures. */
export function CountUp({ value, from = 0, duration, delay = 0, decimals = 0, prefix = '', suffix = '', format, tickSfx = false, onDone, class: klass }: CountUpProps) {
  const reduced = useReducedMotion();
  const play = useSfx();
  const [shown, setShown] = useState(reduced ? value : from);
  const prev = useRef(reduced ? value : from);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    const start = prev.current;
    if (reduced || start === value) {
      prev.current = value;
      setShown(value);
      doneRef.current?.();
      return;
    }
    const dur = duration ?? countDuration(value - start);
    let raf = 0;
    let t0 = -1;
    let lastTick = 0;
    const timer = setTimeout(() => {
      const step = (now: number) => {
        if (t0 < 0) t0 = now;
        const t = (now - t0) / dur;
        const v = tweenValue(start, value, t, ease.outExpo);
        prev.current = v;
        setShown(v);
        if (tickSfx && now - lastTick > 70 && t < 0.9) {
          lastTick = now;
          play(tickSfx, { volume: 0.35, pitch: 0.9 + t * 0.4 });
        }
        if (t < 1) raf = requestAnimationFrame(step);
        else {
          prev.current = value;
          doneRef.current?.();
        }
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [value, reduced]);

  const fmt = (n: number) => prefix + (format ? format(n) : formatNumber(n, decimals)) + suffix;
  return (
    <span class={cx('lm-num lm-countup', klass)}>
      <span class="lm-sr-only">{fmt(value)}</span>
      <span aria-hidden="true">{fmt(shown)}</span>
    </span>
  );
}
