/**
 * The eyepiece: a live canvas of the mire images inside a lacquered bezel with
 * a fixed TABO protractor. The bezel is the rotation control — drag around it,
 * scroll, or use the arrow keys — and gold/ice pointers show the meridians the
 * horizontal and vertical drums are measuring.
 */
import { useEffect, useRef } from 'preact/hooks';
import { paintView, renderIris, FIELD, type ViewScene } from './painter';

export interface EyepieceProps {
  /** Called every frame for the scene to paint (reads live state; t in seconds). */
  scene: (t: number) => ViewScene;
  /** Unwrapped instrument rotation for the pointer (degrees, CCW). */
  theta: number;
  axisLabel: string;
  /** Screen-reader value text for the axis, e.g. "045 degrees". */
  axisValueText?: string;
  axisWord?: string;
  rotationLabel?: string;
  onRotate: (deltaDeg: number, fine: boolean) => void;
  disabled?: boolean;
  reduced: boolean;
  iris: { color: string; seed: number; pupilFrac: number };
  /** bumps when the scene changes so a reduced-motion view repaints */
  version: number;
}

const TICKS = Array.from({ length: 72 }, (_, i) => i * 5);
const LABELS = [0, 30, 60, 90, 120, 150];

function polar(r: number, deg: number): [number, number] {
  const a = (deg * Math.PI) / 180;
  return [100 + r * Math.cos(a), 100 - r * Math.sin(a)];
}

export function Eyepiece(p: EyepieceProps) {
  const wrap = useRef<HTMLDivElement>(null);
  const canvas = useRef<HTMLCanvasElement>(null);
  const ring = useRef<SVGSVGElement>(null);
  const live = useRef(p);
  live.current = p;
  const irisCache = useRef<{ key: string; img: HTMLCanvasElement | null }>({ key: '', img: null });
  const dirty = useRef(true);
  dirty.current = true;

  // ── render loop
  useEffect(() => {
    const cv = canvas.current!;
    const ctx = cv.getContext('2d');
    let raf = 0;
    let size = 0;
    const t0 = performance.now();
    const resize = () => {
      const r = wrap.current!.getBoundingClientRect();
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      const s = Math.max(16, Math.round(Math.min(r.width, r.height) * dpr));
      if (s !== size) {
        size = s;
        cv.width = cv.height = s;
        dirty.current = true;
      }
    };
    resize();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(resize) : null;
    ro?.observe(wrap.current!);
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!ctx || !size) return;
      const L = live.current;
      if (L.reduced && !dirty.current) return;
      dirty.current = false;
      const R = size / 2 * FIELD * 1.32;
      const key = `${L.iris.color}|${L.iris.seed}|${L.iris.pupilFrac}|${Math.round(R)}`;
      if (irisCache.current.key !== key) irisCache.current = { key, img: renderIris(R * 2, L.iris.color, L.iris.seed, L.iris.pupilFrac) };
      const t = L.reduced ? 0 : (now - t0) / 1000;
      const sc = L.scene(t);
      paintView(ctx, size, { ...sc, iris: irisCache.current.img });
    };
    raf = requestAnimationFrame(frame);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, []);

  // ── bezel rotation (drag around the ring, wheel)
  useEffect(() => {
    const el = ring.current!;
    let drag: { cx: number; cy: number; last: number; acc: number; id: number } | null = null;
    const ang = (x: number, y: number, cx: number, cy: number) => (Math.atan2(-(y - cy), x - cx) * 180) / Math.PI;
    const down = (e: PointerEvent) => {
      if (live.current.disabled || e.button > 0) return;
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2;
      const cy = r.top + r.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy) / (r.width / 2);
      if (dist < FIELD * 0.96) return; // inside the field: not the bezel
      drag = { cx, cy, last: ang(e.clientX, e.clientY, cx, cy), acc: 0, id: e.pointerId };
      try { el.setPointerCapture(e.pointerId); } catch { /* synthetic */ }
      el.classList.add('is-grabbed');
      (el.querySelector('.kr-bezel__hit') as HTMLElement | null)?.focus?.({ preventScroll: true });
      e.preventDefault();
    };
    const move = (e: PointerEvent) => {
      if (!drag || e.pointerId !== drag.id) return;
      const a = ang(e.clientX, e.clientY, drag.cx, drag.cy);
      let d = a - drag.last;
      if (d > 180) d -= 360;
      if (d < -180) d += 360;
      drag.last = a;
      drag.acc += d;
      const n = Math.trunc(drag.acc);
      if (n) {
        drag.acc -= n;
        live.current.onRotate(n, false);
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
      wheelAcc += e.deltaMode === 1 ? e.deltaY * 33 : e.deltaY;
      const n = Math.trunc(wheelAcc / 40);
      if (n) {
        wheelAcc -= n * 40;
        live.current.onRotate(-n * (e.shiftKey ? 5 : 1), e.shiftKey);
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
    const map: Record<string, number> = { ArrowLeft: 1, ArrowUp: 1, ArrowRight: -1, ArrowDown: -1, PageUp: 10, PageDown: -10 };
    const n = map[e.key];
    if (n) {
      e.preventDefault();
      e.stopPropagation();
      p.onRotate(n * (e.shiftKey && Math.abs(n) === 1 ? 5 : 1), e.shiftKey);
    }
  };

  const rIn = FIELD * 100;
  return (
    <div class={`kr-eyepiece${p.disabled ? ' is-disabled' : ''}`} ref={wrap}>
      <canvas ref={canvas} class="kr-eyepiece__view" aria-hidden="true" />
      <svg ref={ring} class="kr-bezel" viewBox="0 0 200 200">
        <defs>
          <radialGradient id="kr-bezel-face" cx="0.5" cy="0.5" r="0.5">
            <stop offset={FIELD} stop-color="#000" />
            <stop offset={FIELD + 0.01} stop-color="#2a1b10" />
            <stop offset="0.88" stop-color="#1a1020" />
            <stop offset="0.95" stop-color="#120a18" />
            <stop offset="1" stop-color="#07040c" />
          </radialGradient>
          <linearGradient id="kr-bezel-gold" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stop-color="#fff2c8" />
            <stop offset="0.45" stop-color="#e8b65a" />
            <stop offset="1" stop-color="#8a5a16" />
          </linearGradient>
        </defs>
        <path
          class="kr-bezel__face"
          fill="url(#kr-bezel-face)"
          fill-rule="evenodd"
          d={`M100 1a99 99 0 1 0 0.01 0zM100 ${100 - rIn}a${rIn} ${rIn} 0 1 0 0.01 0z`}
        />
        <circle cx="100" cy="100" r={rIn + 0.6} class="kr-bezel__lip" />
        <circle cx="100" cy="100" r="98.2" class="kr-bezel__edge" />
        <g class="kr-bezel__knurl">
          {Array.from({ length: 120 }, (_, i) => {
            const [x1, y1] = polar(94.5, i * 3);
            const [x2, y2] = polar(98, i * 3);
            return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} />;
          })}
        </g>
        <g class="kr-bezel__scale">
          {TICKS.map((d) => {
            const major = d % 30 === 0;
            const mid = d % 10 === 0;
            const [x1, y1] = polar(rIn + 1.6, d);
            const [x2, y2] = polar(rIn + (major ? 6.5 : mid ? 4.6 : 3), d);
            return <line key={d} x1={x1} y1={y1} x2={x2} y2={y2} class={major ? 'is-major' : mid ? 'is-mid' : ''} />;
          })}
          {[...LABELS, ...LABELS.map((l) => l + 180)].map((d) => {
            const [x, y] = polar(rIn + 10.6, d);
            const v = d >= 180 ? d - 180 : d;
            return <text key={d} x={x} y={y} class="kr-bezel__num">{v === 0 ? 180 : v}</text>;
          })}
        </g>
        <g class="kr-bezel__ptr" style={{ transform: `rotate(${-p.theta}deg)` }}>
          <path d={`M${100 + rIn + 1.2} 100l-7 -3.6v7.2z`} class="kr-ptr kr-ptr--h" />
          <path d={`M${100 - rIn - 1.2} 100l7 -3.6v7.2z`} class="kr-ptr kr-ptr--h" />
          <path d={`M100 ${100 - rIn - 1.2}l-2.8 6h5.6z`} class="kr-ptr kr-ptr--v" />
          <path d={`M100 ${100 + rIn + 1.2}l-2.8 -6h5.6z`} class="kr-ptr kr-ptr--v" />
          <line x1={100 - rIn + 6} y1="100" x2={100 - rIn + 13} y2="100" class="kr-ptr__hair" />
          <line x1={100 + rIn - 6} y1="100" x2={100 + rIn - 13} y2="100" class="kr-ptr__hair" />
        </g>
        <circle
          cx="100" cy="100" r="90"
          class="kr-bezel__hit"
          role="slider"
          tabIndex={p.disabled ? -1 : 0}
          aria-label={p.rotationLabel ?? 'Instrument rotation (axis)'}
          aria-valuemin={1}
          aria-valuemax={180}
          aria-valuenow={Number(p.axisLabel)}
          aria-valuetext={p.axisValueText ?? `${p.axisLabel}°`}
          onKeyDown={onKey}
        />
      </svg>
      <div class="kr-eyepiece__axis" aria-hidden="true"><span>{p.axisWord ?? 'AXIS'}</span><b class="kr-num">{p.axisLabel}°</b></div>
    </div>
  );
}
