import { useEffect, useRef } from 'preact/hooks';

export interface DialProps {
  value: number;
  min: number;
  max: number;
  step?: number;
  /** degrees of knob rotation per step */
  degPerStep?: number;
  onChange: (v: number) => void;
  label: string;
  valueText?: string;
  size?: number;
  class?: string;
}

/**
 * A brass rotary knob: drag around it, scroll the wheel, or use arrow keys,
 * Page Up/Down, Home and End. Snaps to detents.
 */
export function Dial({ value, min, max, step = 1, degPerStep = 30, onChange, label, valueText, size = 76, class: klass }: DialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef({ value, onChange });
  live.current = { value, onChange };

  const set = (v: number) => {
    const n = Math.max(min, Math.min(max, Math.round(v / step) * step));
    if (n !== live.current.value) live.current.onChange(n);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let dragging = false;
    let lastAngle = 0;
    let acc = 0;
    const angleOf = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      return (Math.atan2(e.clientY - (r.top + r.height / 2), e.clientX - (r.left + r.width / 2)) * 180) / Math.PI;
    };
    const down = (e: PointerEvent) => {
      dragging = true;
      lastAngle = angleOf(e);
      acc = 0;
      el.setPointerCapture?.(e.pointerId);
      el.focus({ preventScroll: true });
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!dragging) return;
      const a = angleOf(e);
      let delta = a - lastAngle;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngle = a;
      acc += delta;
      while (Math.abs(acc) >= degPerStep * 0.6) {
        const dir = Math.sign(acc);
        acc -= dir * degPerStep * 0.6;
        set(live.current.value + dir * step);
      }
    };
    const up = (e: PointerEvent) => {
      dragging = false;
      el.releasePointerCapture?.(e.pointerId);
    };
    const wheel = (e: WheelEvent) => {
      e.preventDefault();
      set(live.current.value + (e.deltaY > 0 || e.deltaX > 0 ? step : -step));
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    el.addEventListener('wheel', wheel, { passive: false });
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
      el.removeEventListener('wheel', wheel);
    };
  }, [min, max, step, degPerStep]);

  const onKey = (e: KeyboardEvent) => {
    const big = Math.max(step, (max - min) / 10);
    const map: Record<string, number> = {
      ArrowRight: value + step, ArrowUp: value + step, ArrowLeft: value - step, ArrowDown: value - step,
      PageUp: value + big, PageDown: value - big, Home: min, End: max,
    };
    if (e.key in map) {
      e.preventDefault();
      e.stopPropagation();
      set(map[e.key]!);
    }
  };

  const angle = ((value - min) / step) * degPerStep;
  return (
    <div
      ref={ref}
      class={`cv-dial ${klass ?? ''}`}
      role="slider"
      tabIndex={0}
      aria-label={label}
      aria-valuemin={min}
      aria-valuemax={max}
      aria-valuenow={value}
      aria-valuetext={valueText}
      onKeyDown={onKey}
      style={{ width: size, height: size }}
    >
      <span class="cv-dial__ticks" aria-hidden="true" />
      <span class="cv-dial__knob" aria-hidden="true" style={{ transform: `rotate(${angle}deg)` }}>
        <span class="cv-dial__grip" />
        <span class="cv-dial__mark" />
      </span>
    </div>
  );
}
