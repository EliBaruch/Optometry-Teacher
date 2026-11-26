import { useRef } from 'preact/hooks';
import { useT } from './locale';

export interface LensDialProps {
  /** lens wheel setting in dioptres */
  value: number;
  min?: number;
  max?: number;
  disabled?: boolean;
  /** pulse the wheel: the image is out of focus and the player has not found the dial yet */
  cue?: boolean;
  /** 0..1, how sharp the image is (drives the focus lamp) */
  sharpness: number;
  onChange: (v: number) => void;
}

const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Rekoss-style lens wheel: drag, mouse wheel, or arrow keys; one click per dioptre. */
export function LensDial({ value, min = -10, max = 10, disabled, cue, sharpness, onChange }: LensDialProps) {
  const t = useT();
  const drag = useRef<{ y: number; x: number; v: number } | null>(null);
  const set = (v: number) => {
    const nv = clamp(Math.round(v), min, max);
    if (nv !== value) onChange(nv);
  };
  const label = `${value > 0 ? '+' : value < 0 ? '−' : ''}${Math.abs(value)}`;
  return (
    <div dir="ltr" class={`oph-dial${disabled ? ' is-off' : ''}${sharpness > 0.92 ? ' is-sharp' : ''}${cue && !disabled ? ' is-cue' : ''}`}>
      <div
        class="oph-dial__knob"
        role="slider"
        tabIndex={disabled ? -1 : 0}
        aria-label={t.dialAria}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-valuetext={t.dialValue(label)}
        aria-disabled={disabled}
        data-testid="oph-dial"
        onKeyDown={(e) => {
          if (disabled) return;
          const k = e.key;
          const d = k === 'ArrowRight' || k === 'ArrowUp' ? 1 : k === 'ArrowLeft' || k === 'ArrowDown' ? -1 : k === 'PageUp' ? 3 : k === 'PageDown' ? -3 : 0;
          if (d) {
            e.preventDefault();
            e.stopPropagation();
            set(value + d);
          } else if (k === 'Home') set(0);
        }}
        onWheel={(e) => {
          if (disabled) return;
          e.preventDefault();
          set(value + (e.deltaY < 0 ? 1 : -1));
        }}
        onPointerDown={(e) => {
          if (disabled) return;
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, v: value };
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          set(d.v + ((e.clientX - d.x) - (e.clientY - d.y)) / 16);
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <svg viewBox="-50 -50 100 100" width="100%" height="100%" aria-hidden="true">
          <defs>
            <radialGradient id="oph-knob-g" cx="35%" cy="30%" r="80%">
              <stop offset="0" stop-color="#ffffff" />
              <stop offset="0.35" stop-color="#e4e9f3" />
              <stop offset="0.8" stop-color="#98a3b8" />
              <stop offset="1" stop-color="#6b768b" />
            </radialGradient>
          </defs>
          <circle r="47" fill="url(#oph-knob-g)" stroke="rgba(10,22,51,.15)" stroke-width="1" />
          <g style={{ transform: `rotate(${value * 11}deg)`, transition: 'transform 160ms cubic-bezier(.2,.8,.2,1)' }}>
            {Array.from({ length: 36 }, (_, i) => (
              <line key={i} x1="0" y1="-45" x2="0" y2="-39" stroke={i % 3 === 0 ? 'rgba(10,22,51,.8)' : 'rgba(10,22,51,.35)'} stroke-width={i % 3 === 0 ? 2 : 1.2} transform={`rotate(${i * 10})`} />
            ))}
            <circle cx="0" cy="-30" r="3.4" fill="#2257f0" stroke="#fff" stroke-width="1" />
          </g>
          <circle r="26" fill="#0a1633" stroke="rgba(255,255,255,.6)" />
          <text y="6" text-anchor="middle" font-size="19" font-weight="700" fill="#ffffff" style={{ fontFamily: 'var(--lm-font-num, sans-serif)' }}>{label}</text>
        </svg>
      </div>
      <div class="oph-dial__cap">
        <span class="oph-dial__lamp" aria-hidden="true" />
        <span>{disabled ? t.dialScope : cue ? t.dialCue : t.dialLabel}</span>
      </div>
    </div>
  );
}
