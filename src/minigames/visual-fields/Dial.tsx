import { useEffect, useRef } from 'preact/hooks';

export interface DialProps {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  format: (v: number) => string;
  onChange: (v: number) => void;
  size?: number;
  disabled?: boolean;
}

const SWEEP = 270;

/** Brass instrument knob: drag (any direction), mouse wheel or arrow keys. */
export function Dial({ value, min, max, step, label, format, onChange, size = 64, disabled = false }: DialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef({ value, onChange, disabled });
  live.current = { value, onChange, disabled };

  const set = (v: number) => {
    if (live.current.disabled) return;
    const q = Math.round(Math.max(min, Math.min(max, v)) / step) * step;
    const fixed = Number(q.toFixed(4));
    if (fixed !== live.current.value) live.current.onChange(fixed);
  };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (live.current.disabled) return;
      e.preventDefault();
      set(live.current.value + (e.deltaY < 0 ? step : -step));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [min, max, step]);

  const drag = useRef<{ id: number; y: number; x: number; v0: number } | null>(null);
  const t = (value - min) / (max - min);
  const angle = -SWEEP / 2 + t * SWEEP;
  const ticks = Math.round((max - min) / step);

  return (
    <div class={`vf-dial${disabled ? ' is-disabled' : ''}`}>
      <div
        ref={ref}
        class="vf-dial__knob"
        style={{ width: size, height: size }}
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={label}
        aria-disabled={disabled || undefined}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onPointerDown={(e) => {
          if (disabled) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { id: e.pointerId, y: e.clientY, x: e.clientX, v0: value };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const delta = (d.y - e.clientY + (e.clientX - d.x)) / 70;
          set(d.v0 + delta * (max - min) * 0.5);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
        onKeyDown={(e) => {
          const k = e.key;
          if (k === 'ArrowUp' || k === 'ArrowRight') set(value + step);
          else if (k === 'ArrowDown' || k === 'ArrowLeft') set(value - step);
          else if (k === 'Home') set(min);
          else if (k === 'End') set(max);
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
      >
        <svg viewBox="-50 -50 100 100" aria-hidden="true">
          <defs>
            <radialGradient id="vf-knob-face" cx="35%" cy="30%" r="80%">
              <stop offset="0" stop-color="#ffffff" />
              <stop offset="0.35" stop-color="#dfe5f0" />
              <stop offset="0.75" stop-color="#9ba7bd" />
              <stop offset="1" stop-color="#6b7690" />
            </radialGradient>
            <radialGradient id="vf-knob-cap" cx="40%" cy="35%" r="70%">
              <stop offset="0" stop-color="#ffffff" />
              <stop offset="1" stop-color="#dde3ef" />
            </radialGradient>
          </defs>
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const a = ((-SWEEP / 2 + (i / ticks) * SWEEP - 90) * Math.PI) / 180;
            const on = i / ticks <= t + 1e-6;
            const major = i % 5 === 0;
            return (
              <line
                key={i}
                x1={Math.cos(a) * (major ? 42 : 44)}
                y1={Math.sin(a) * (major ? 42 : 44)}
                x2={Math.cos(a) * 48}
                y2={Math.sin(a) * 48}
                stroke={on ? '#2257f0' : 'rgba(10,22,51,0.25)'}
                stroke-width={major ? 2.4 : 1.4}
                stroke-linecap="round"
              />
            );
          })}
          <circle r="37" fill="url(#vf-knob-face)" />
          {Array.from({ length: 24 }, (_, i) => {
            const a = (i / 24) * Math.PI * 2;
            return <line key={`k${i}`} x1={Math.cos(a) * 34} y1={Math.sin(a) * 34} x2={Math.cos(a) * 37} y2={Math.sin(a) * 37} stroke="rgba(10,22,51,0.3)" stroke-width="1.2" />;
          })}
          <circle r="29" fill="url(#vf-knob-cap)" stroke="rgba(10,22,51,0.15)" stroke-width="1" />
          <g style={{ transform: `rotate(${angle}deg)` }} class="vf-dial__pointer">
            <line x1="0" y1="-11" x2="0" y2="-25" stroke="#2257f0" stroke-width="3.2" stroke-linecap="round" />
          </g>
        </svg>
      </div>
      <div class="vf-dial__meta">
        <span class="vf-dial__label">{label}</span>
        <span class="vf-dial__value">{format(value)}</span>
      </div>
    </div>
  );
}
