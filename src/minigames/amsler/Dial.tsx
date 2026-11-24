import { useEffect, useRef } from 'preact/hooks';

export interface DialProps {
  value: number;
  min: number;
  max: number;
  step: number;
  label: string;
  /** formatted readout under the knob */
  format: (v: number) => string;
  onChange: (v: number) => void;
  size?: number;
}

const SWEEP = 270; // degrees of knob travel

/** A brass instrument knob: drag (any direction), mouse wheel or arrow keys. */
export function Dial({ value, min, max, step, label, format, onChange, size = 58 }: DialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef({ value, onChange });
  live.current = { value, onChange };

  const set = (v: number) => {
    const q = Math.round(Math.max(min, Math.min(max, v)) / step) * step;
    const fixed = Number(q.toFixed(4));
    if (fixed !== live.current.value) live.current.onChange(fixed);
  };

  // wheel must be non-passive to stop the page scrolling
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
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
    <div class="amsler-dial">
      <div
        ref={ref}
        class="amsler-dial__knob"
        style={{ width: size, height: size }}
        role="slider"
        tabIndex={0}
        aria-label={label}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={format(value)}
        onPointerDown={(e) => {
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { id: e.pointerId, y: e.clientY, x: e.clientX, v0: value };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const delta = (d.y - e.clientY + (e.clientX - d.x)) / 60;
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
            <radialGradient id="amsler-knob-face" cx="35%" cy="30%" r="80%">
              <stop offset="0" stop-color="#fff0c8" />
              <stop offset="0.35" stop-color="#d8a648" />
              <stop offset="0.75" stop-color="#7a5418" />
              <stop offset="1" stop-color="#3b2808" />
            </radialGradient>
            <radialGradient id="amsler-knob-cap" cx="40%" cy="35%" r="70%">
              <stop offset="0" stop-color="#3a2a52" />
              <stop offset="1" stop-color="#120b20" />
            </radialGradient>
          </defs>
          {Array.from({ length: ticks + 1 }, (_, i) => {
            const a = ((-SWEEP / 2 + (i / ticks) * SWEEP - 90) * Math.PI) / 180;
            const on = i / ticks <= t + 1e-6;
            return (
              <line
                key={i}
                x1={Math.cos(a) * 44}
                y1={Math.sin(a) * 44}
                x2={Math.cos(a) * 48}
                y2={Math.sin(a) * 48}
                stroke={on ? '#ffd27a' : 'rgba(169,155,189,0.35)'}
                stroke-width={on ? 2.4 : 1.6}
                stroke-linecap="round"
              />
            );
          })}
          <circle r="38" fill="url(#amsler-knob-face)" />
          <circle r="30" fill="url(#amsler-knob-cap)" stroke="rgba(255,226,170,0.35)" stroke-width="1" />
          <g style={{ transform: `rotate(${angle}deg)` }} class="amsler-dial__pointer">
            <line x1="0" y1="-12" x2="0" y2="-26" stroke="#ffd27a" stroke-width="3.2" stroke-linecap="round" />
          </g>
        </svg>
      </div>
      <div class="amsler-dial__meta">
        <span class="amsler-dial__label">{label}</span>
        <span class="amsler-dial__value">{format(value)}</span>
      </div>
    </div>
  );
}
