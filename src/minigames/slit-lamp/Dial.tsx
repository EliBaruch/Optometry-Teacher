import { useRef } from 'preact/hooks';
import type { JSX } from 'preact';

export interface DialProps {
  label: string;
  value: number;
  min: number;
  max: number;
  /** Logarithmic travel (beam width). */
  log?: boolean;
  /** Quantise a raw value (e.g. to 5° steps). */
  snap?: (v: number) => number;
  /** Keyboard step in the dial's own (display) units. */
  step?: number;
  format: (v: number) => string;
  onChange: (v: number) => void;
  /** Fired whenever the (snapped) value changes via the user — for click sounds. */
  onDetent?: () => void;
  disabled?: boolean;
  size?: number;
  accent?: string;
}

const SWEEP = 270;
const TICKS = 29;

/** A silver knob: drag (↔ / ↕), mouse wheel or arrow keys. */
export function Dial(p: DialProps) {
  const norm = (v: number) => {
    const c = Math.max(p.min, Math.min(p.max, v));
    return p.log ? Math.log(c / p.min) / Math.log(p.max / p.min) : (c - p.min) / (p.max - p.min);
  };
  const denorm = (u: number) => {
    const c = Math.max(0, Math.min(1, u));
    return p.log ? p.min * Math.pow(p.max / p.min, c) : p.min + c * (p.max - p.min);
  };
  const u = norm(p.value);
  const angle = -SWEEP / 2 + u * SWEEP;
  const drag = useRef<{ x: number; y: number; u0: number } | null>(null);
  const last = useRef(p.value);

  const commit = (uu: number) => {
    let v = denorm(uu);
    if (p.snap) v = p.snap(v);
    if (v !== last.current) {
      last.current = v;
      p.onChange(v);
      p.onDetent?.();
    }
  };
  last.current = p.value;

  const nudge = (dir: number, mult = 1) => {
    if (p.step !== undefined && !p.log) commit(norm(p.value + dir * p.step * mult));
    else if (p.step !== undefined && p.log) commit(norm(p.value * (dir > 0 ? 1 + p.step * mult : 1 / (1 + p.step * mult))));
    else commit(u + (dir * mult) / 24);
  };

  const onKey = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (p.disabled) return;
    const k = e.key;
    if (k === 'ArrowRight' || k === 'ArrowUp') nudge(1);
    else if (k === 'ArrowLeft' || k === 'ArrowDown') nudge(-1);
    else if (k === 'PageUp') nudge(1, 4);
    else if (k === 'PageDown') nudge(-1, 4);
    else if (k === 'Home') commit(0);
    else if (k === 'End') commit(1);
    else return;
    e.preventDefault();
    e.stopPropagation();
  };

  const size = p.size ?? 62;
  const ticks = Array.from({ length: TICKS }, (_, i) => {
    const t = i / (TICKS - 1);
    const a = ((-SWEEP / 2 + t * SWEEP - 90) * Math.PI) / 180;
    const r1 = 47;
    const r2 = i % 7 === 0 ? 40 : 43.5;
    return (
      <line
        key={i}
        x1={50 + Math.cos(a) * r1} y1={50 + Math.sin(a) * r1}
        x2={50 + Math.cos(a) * r2} y2={50 + Math.sin(a) * r2}
        class={t <= u + 0.001 ? 'on' : ''}
      />
    );
  });

  return (
    <div
      class={`sl-dial${p.disabled ? ' is-disabled' : ''}`}
      style={{ '--sl-dial': `${size}px`, ...(p.accent ? { '--sl-acc': p.accent } : {}) } as JSX.CSSProperties}
    >
      <span class="sl-dial__label">{p.label}</span>
      <div
        class="sl-dial__body"
        role="slider"
        tabIndex={p.disabled ? -1 : 0}
        aria-label={p.label}
        aria-valuemin={p.min}
        aria-valuemax={p.max}
        aria-valuenow={Math.round(p.value * 100) / 100}
        aria-valuetext={p.format(p.value)}
        aria-disabled={p.disabled || undefined}
        onKeyDown={onKey}
        onDblClick={() => !p.disabled && commit(norm((p.min + p.max) / 2))}
        onWheel={(e) => {
          if (p.disabled) return;
          e.preventDefault();
          e.stopPropagation();
          nudge(e.deltaY < 0 ? 1 : -1);
        }}
        onPointerDown={(e) => {
          if (p.disabled) return;
          (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
          drag.current = { x: e.clientX, y: e.clientY, u0: u };
          e.stopPropagation();
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          commit(d.u0 + (dx - dy) / 170);
        }}
        onPointerUp={(e) => {
          drag.current = null;
          (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        }}
        onPointerCancel={() => { drag.current = null; }}
      >
        <svg class="sl-dial__ticks" viewBox="0 0 100 100" aria-hidden="true">{ticks}</svg>
        <div class="sl-dial__knob" style={{ transform: `rotate(${angle}deg)` }}>
          <i class="sl-dial__ptr" />
        </div>
      </div>
      <output class="sl-dial__val">{p.format(p.value)}</output>
    </div>
  );
}
