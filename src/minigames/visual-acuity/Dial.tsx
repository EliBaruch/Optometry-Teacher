/**
 * Brass projector-remote knob. Drag to turn (one detent per 26°), mouse wheel,
 * or arrow keys when focused. Clockwise = down the chart (smaller letters).
 */
import { useRef } from 'preact/hooks';

export interface DialProps {
  value: number;
  min: number;
  max: number;
  label: string;
  valueText: string;
  onChange(next: number): void;
}

const DETENT = 26;

export function Dial(p: DialProps) {
  const drag = useRef<{ id: number; cx: number; cy: number; last: number; acc: number } | null>(null);
  const clampV = (v: number) => Math.max(p.min, Math.min(p.max, v));
  const nudge = (d: number) => {
    const n = clampV(p.value + d);
    if (n !== p.value) p.onChange(n);
  };
  const angleAt = (e: PointerEvent, cx: number, cy: number) => (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;

  const ticks = [];
  const span = p.max - p.min;
  for (let i = 0; i <= span; i++) {
    const a = -135 + (270 * i) / Math.max(1, span);
    ticks.push(<span key={i} class={`va-dial__tick${i + p.min === p.value ? ' is-on' : ''}`} style={{ transform: `rotate(${a}deg) translateY(-38px)` }} />);
  }
  const rot = -135 + (270 * (p.value - p.min)) / Math.max(1, span);

  return (
    <div class="va-dial">
      <div class="va-dial__ring" aria-hidden="true">{ticks}</div>
      <div
        class="va-dial__knob"
        role="slider"
        tabIndex={0}
        aria-label={p.label}
        aria-valuemin={p.min}
        aria-valuemax={p.max}
        aria-valuenow={p.value}
        aria-valuetext={p.valueText}
        style={{ transform: `rotate(${rot}deg)` }}
        onKeyDown={(e) => {
          if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') nudge(-1);
          else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') nudge(1);
          else if (e.key === 'Home') p.onChange(p.min);
          else if (e.key === 'End') p.onChange(p.max);
          else return;
          e.preventDefault();
          e.stopPropagation();
        }}
        onWheel={(e) => {
          e.preventDefault();
          nudge(e.deltaY > 0 ? 1 : -1);
        }}
        onPointerDown={(e) => {
          const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
          const cx = r.left + r.width / 2;
          const cy = r.top + r.height / 2;
          drag.current = { id: e.pointerId, cx, cy, last: angleAt(e, cx, cy), acc: 0 };
          (e.currentTarget as HTMLElement).setPointerCapture?.(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d || d.id !== e.pointerId) return;
          const a = angleAt(e, d.cx, d.cy);
          let delta = a - d.last;
          if (delta > 180) delta -= 360;
          if (delta < -180) delta += 360;
          d.last = a;
          d.acc += delta;
          let steps = 0;
          while (d.acc >= DETENT) {
            d.acc -= DETENT;
            steps++;
          }
          while (d.acc <= -DETENT) {
            d.acc += DETENT;
            steps--;
          }
          if (steps) nudge(steps);
        }}
        onPointerUp={() => (drag.current = null)}
        onPointerCancel={() => (drag.current = null)}
      >
        <span class="va-dial__notch" />
        <span class="va-dial__cap" />
      </div>
    </div>
  );
}
