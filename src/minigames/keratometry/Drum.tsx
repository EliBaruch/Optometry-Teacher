/**
 * A measuring drum: a knurled brass cylinder seen side-on, its engraved scale
 * sliding under a fixed gold index. Drag it like a tape (the scale follows your
 * finger), scroll, or use the arrow keys (PageUp/Down = big steps, Shift = fine
 * where the drum has a fine pitch). Exposed to assistive tech as a slider.
 */
import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

export interface DrumProps {
  id: string;
  label: string;
  /** compact label for narrow layouts */
  shortLabel?: string;
  /** big readout, e.g. "43.25 D" */
  display: string;
  sub?: string;
  value: number;
  min: number;
  max: number;
  /** scale pixels per unit */
  ppu: number;
  /** engraved numbers (dioptre drum) or a plain knurled focus wheel */
  kind: 'scale' | 'knurl';
  onStep: (n: number, fine: boolean) => void;
  /** units per keyboard/drag step (for drag tracking) */
  step: number;
  accent: 'gold' | 'ice' | 'violet';
  disabled?: boolean;
  /** shows the fused "lock" glint on the index */
  fused?: boolean;
}

export function Drum(p: DrumProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef(p);
  live.current = p;

  useEffect(() => {
    const el = ref.current!;
    let drag: { x: number; y: number; acc: number; id: number } | null = null;
    const down = (e: PointerEvent) => {
      if (live.current.disabled || e.button > 0) return;
      drag = { x: e.clientX, y: e.clientY, acc: 0, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
      el.classList.add('is-grabbed');
      el.focus({ preventScroll: true });
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const L = live.current;
      // the scale follows the finger: dragging left brings higher numbers under the index
      const dx = e.clientX - drag.x;
      drag.x = e.clientX;
      drag.acc += -dx;
      const stepPx = Math.max(3, L.ppu * L.step);
      const n = Math.trunc(drag.acc / stepPx);
      if (n) {
        drag.acc -= n * stepPx;
        L.onStep(n, false);
      }
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
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wheelAcc += e.deltaMode === 1 ? d * 33 : d;
      const n = Math.trunc(wheelAcc / 40);
      if (n) {
        wheelAcc -= n * 40;
        live.current.onStep(-n, e.shiftKey);
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
    const map: Record<string, number> = { ArrowUp: 1, ArrowRight: 1, ArrowDown: -1, ArrowLeft: -1, PageUp: 8, PageDown: -8 };
    const n = map[e.key];
    if (n) {
      e.preventDefault();
      e.stopPropagation();
      p.onStep(n, e.shiftKey);
    }
  };

  const off = -p.value * p.ppu;
  const labels: JSX.Element[] = [];
  if (p.kind === 'scale') {
    const span = Math.ceil(300 / p.ppu) + 1;
    const c = Math.round(p.value);
    for (let n = Math.max(p.min, c - span); n <= Math.min(p.max, c + span); n++) {
      labels.push(
        <span key={n} class="kr-drum__n" style={{ transform: `translateX(${((n - p.value) * p.ppu).toFixed(2)}px)` }}>{n}</span>,
      );
    }
  }
  return (
    <div class={`kr-drum kr-drum--${p.accent}${p.disabled ? ' is-disabled' : ''}${p.fused ? ' is-fused' : ''}`}>
      <div class="kr-drum__meta">
        <label class="kr-drum__label" for={p.id} aria-label={p.label}>{p.shortLabel ? <><span class="kr-lbl-l">{p.label}</span><span class="kr-lbl-s">{p.shortLabel}</span></> : p.label}</label>
        <output class="kr-drum__value kr-num" for={p.id}>{p.display}</output>
        {p.sub && <span class="kr-drum__sub kr-num">{p.sub}</span>}
      </div>
      <div
        ref={ref}
        id={p.id}
        dir="ltr"
        class={`kr-drum__barrel kr-drum__barrel--${p.kind}`}
        role="slider"
        tabIndex={p.disabled ? -1 : 0}
        aria-label={p.label}
        aria-valuemin={p.min}
        aria-valuemax={p.max}
        aria-valuenow={p.value}
        aria-valuetext={p.display}
        aria-disabled={p.disabled || undefined}
        onKeyDown={onKey}
        style={{ '--kr-off': `${off.toFixed(2)}px`, '--kr-ppu': `${p.ppu}px` }}
      >
        <div class="kr-drum__track" aria-hidden="true" />
        {p.kind === 'scale' && <div class="kr-drum__nums" aria-hidden="true">{labels}</div>}
        <div class="kr-drum__shade" aria-hidden="true" />
        <div class="kr-drum__index" aria-hidden="true" />
      </div>
    </div>
  );
}
