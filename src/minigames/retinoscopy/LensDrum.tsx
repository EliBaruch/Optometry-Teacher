import { useEffect, useRef } from 'preact/hooks';
import type { JSX } from 'preact';
import { fmtSigned } from './optics';

export interface LensDrumProps {
  value: number;
  min: number;
  max: number;
  onStep: (n: number, big: boolean) => void;
  disabled?: boolean;
}

const PPD = 56; // px per dioptre

/** Horizontal brass drum of trial lenses, 0.25 D per click. Drag, wheel, arrow keys. */
export function LensDrum(p: LensDrumProps) {
  const ref = useRef<HTMLDivElement>(null);
  const live = useRef(p);
  live.current = p;
  useEffect(() => {
    const el = ref.current!;
    let id = -1;
    let x0 = 0;
    let acc = 0;
    const down = (e: PointerEvent) => {
      if (live.current.disabled) return;
      id = e.pointerId;
      x0 = e.clientX;
      acc = 0;
      el.setPointerCapture(id);
      el.classList.add('is-grabbed');
      el.focus({ preventScroll: true });
    };
    const move = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      acc += e.clientX - x0;
      x0 = e.clientX;
      const n = Math.trunc(acc / (PPD / 4));
      if (n) {
        acc -= n * (PPD / 4);
        live.current.onStep(-n, false);
      }
    };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      el.classList.remove('is-grabbed');
    };
    let wacc = 0;
    const wheel = (e: WheelEvent) => {
      if (live.current.disabled) return;
      e.preventDefault();
      const d = Math.abs(e.deltaX) > Math.abs(e.deltaY) ? e.deltaX : e.deltaY;
      wacc += e.deltaMode === 1 ? d * 33 : d;
      const n = Math.trunc(wacc / 40);
      if (n) {
        wacc -= n * 40;
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

  const onKey = (e: JSX.TargetedKeyboardEvent<HTMLDivElement>) => {
    if (p.disabled) return;
    const map: Record<string, number> = { ArrowRight: 1, ArrowUp: 1, ArrowLeft: -1, ArrowDown: -1, PageUp: 4, PageDown: -4 };
    const n = map[e.key];
    if (n !== undefined) {
      e.preventDefault();
      e.stopPropagation();
      p.onStep(n, e.shiftKey);
    }
  };

  const labels: JSX.Element[] = [];
  const c = Math.round(p.value);
  for (let n = Math.max(p.min, c - 7); n <= Math.min(p.max, c + 7); n++) {
    labels.push(
      <span key={n} class={`rt-drum__n${n === 0 ? ' is-zero' : ''}`} style={{ transform: `translateX(${((n - p.value) * PPD).toFixed(2)}px)` }}>
        {n === 0 ? '0' : fmtSigned(n).slice(0, -3)}
      </span>,
    );
  }
  return (
    <div
      ref={ref} class={`rt-drum${p.disabled ? ' is-disabled' : ''}`} role="slider" tabIndex={p.disabled ? -1 : 0} onKeyDown={onKey}
      aria-label="Trial lens power" aria-valuemin={p.min} aria-valuemax={p.max} aria-valuenow={p.value} aria-valuetext={`${fmtSigned(p.value)} dioptres`}
      aria-disabled={p.disabled || undefined} style={{ '--rt-off': `${(-p.value * PPD).toFixed(2)}px`, '--rt-ppd': `${PPD}px` } as JSX.CSSProperties}
    >
      <div class="rt-drum__track" />
      <div class="rt-drum__nums">{labels}</div>
      <div class="rt-drum__shade" />
      <div class="rt-drum__index" />
    </div>
  );
}
