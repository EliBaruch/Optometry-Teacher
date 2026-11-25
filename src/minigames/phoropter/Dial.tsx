/**
 * A tactile brass knob: turn it by dragging around its centre (or up/down),
 * scroll the mouse wheel, or use the arrow keys (Shift = fine, PageUp/Down = ×4).
 * Exposed to assistive tech as a slider.
 */
import { useEffect, useRef } from 'preact/hooks';

export interface DialProps {
  id: string;
  label: string;
  /** value text for the readout and aria-valuetext */
  display: string;
  value: number;
  /** knob rotation in degrees for the current value */
  rotation: number;
  /** request a change of n steps (fine = Shift / fine gesture) */
  onStep: (n: number, fine: boolean) => void;
  size?: 'lg' | 'md';
  disabled?: boolean;
  min?: number;
  max?: number;
  /** short hint under the label */
  sub?: string;
  /** accent ring colour */
  accent?: string;
  /** −1 when a clockwise drag should decrease the value (e.g. a TABO axis knob) */
  dragSign?: 1 | -1;
  /** 'line' draws the indicator through the centre (an axis is a line, not a ray) */
  mark?: 'notch' | 'line';
}

const DEG_PER_STEP = 16;

export function Dial(p: DialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef(p);
  live.current = p;

  useEffect(() => {
    const el = ref.current!;
    let drag: { cx: number; cy: number; last: number; accA: number; y: number; accY: number; id: number } | null = null;
    const angle = (x: number, y: number, cx: number, cy: number) => (Math.atan2(y - cy, x - cx) * 180) / Math.PI;

    const down = (e: PointerEvent) => {
      if (live.current.disabled || e.button > 0) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      drag = { cx, cy, last: angle(e.clientX, e.clientY, cx, cy), accA: 0, y: e.clientY, accY: 0, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic events */ }
      el.classList.add('is-grabbed');
      el.focus({ preventScroll: true });
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const dist = Math.hypot(e.clientX - drag.cx, e.clientY - drag.cy);
      if (dist > 16) {
        // rotary gesture
        const a = angle(e.clientX, e.clientY, drag.cx, drag.cy);
        let d = a - drag.last;
        if (d > 180) d -= 360;
        if (d < -180) d += 360;
        drag.last = a;
        drag.accA += d;
        const n = Math.trunc(drag.accA / DEG_PER_STEP);
        if (n) {
          drag.accA -= n * DEG_PER_STEP;
          live.current.onStep(n * (live.current.dragSign ?? 1), e.shiftKey);
        }
      } else {
        drag.last = angle(e.clientX, e.clientY, drag.cx, drag.cy);
      }
      drag.y = e.clientY;
    };
    const up = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      drag = null;
      el.classList.remove('is-grabbed');
    };
    let wheelAcc = 0;
    const wheel = (e: WheelEvent) => {
      if (live.current.disabled) return;
      e.preventDefault();
      wheelAcc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const n = Math.trunc(wheelAcc / 60);
      if (n) {
        wheelAcc -= n * 60;
        live.current.onStep(-n, e.shiftKey);
      } else if (Math.abs(e.deltaY) >= 50) {
        wheelAcc = 0;
        live.current.onStep(e.deltaY < 0 ? 1 : -1, e.shiftKey);
      }
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
  }, []);

  const onKey = (e: KeyboardEvent) => {
    if (p.disabled) return;
    const map: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 4, PageDown: -4 };
    const n = map[e.key];
    if (n) {
      e.preventDefault();
      e.stopPropagation();
      p.onStep(n, e.shiftKey);
    }
  };

  const ticks = [];
  const nTicks = p.size === 'lg' ? 48 : 36;
  for (let i = 0; i < nTicks; i++) ticks.push(<line key={i} x1="50" y1="3.5" x2="50" y2="9" transform={`rotate(${(i * 360) / nTicks} 50 50)`} />);

  return (
    <div class={`php-dial php-dial--${p.size ?? 'md'}${p.disabled ? ' is-disabled' : ''}`} style={p.accent ? { '--php-accent': p.accent } : undefined}>
      <div
        ref={ref}
        id={p.id}
        class="php-dial__knob"
        role="slider"
        tabIndex={p.disabled ? -1 : 0}
        aria-label={p.label}
        aria-valuenow={p.value}
        aria-valuemin={p.min}
        aria-valuemax={p.max}
        aria-valuetext={p.display}
        aria-disabled={p.disabled || undefined}
        onKeyDown={onKey}
      >
        <svg viewBox="0 0 100 100" aria-hidden="true">
          <defs>
            <radialGradient id={`${p.id}-face`} cx="0.36" cy="0.3" r="0.85">
              <stop offset="0" stop-color="#fff1c8" />
              <stop offset="0.38" stop-color="#e2b25a" />
              <stop offset="0.78" stop-color="#9a6418" />
              <stop offset="1" stop-color="#5a3a0c" />
            </radialGradient>
            <radialGradient id={`${p.id}-cap`} cx="0.4" cy="0.32" r="0.9">
              <stop offset="0" stop-color="#3b2a4f" />
              <stop offset="1" stop-color="#0d0815" />
            </radialGradient>
          </defs>
          <circle cx="50" cy="50" r="49" class="php-dial__shadow" />
          <circle cx="50" cy="50" r="47" class="php-dial__rim" />
          <g class="php-dial__rot" style={{ transform: `rotate(${p.rotation}deg)` }}>
            <g class="php-dial__knurl">{ticks}</g>
            <circle cx="50" cy="50" r="38" class="php-dial__face" fill={`url(#${p.id}-face)`} />
            <circle cx="50" cy="50" r="31" class="php-dial__groove" />
            <circle cx="50" cy="50" r="21" class="php-dial__cap" fill={`url(#${p.id}-cap)`} />
            <rect x="47.5" y="13" width="5" height="16" rx="2.5" class="php-dial__mark" />
            {p.mark === 'line' && <rect x="48" y="71" width="4" height="16" rx="2" class="php-dial__mark php-dial__mark--tail" />}
          </g>
          <ellipse cx="40" cy="32" rx="18" ry="9" class="php-dial__gloss" />
        </svg>
      </div>
      <div class="php-dial__meta">
        <span class="php-dial__label">{p.label}</span>
        <output class="php-dial__value" for={p.id}>{p.display}</output>
        {p.sub && <span class="php-dial__sub">{p.sub}</span>}
      </div>
    </div>
  );
}
