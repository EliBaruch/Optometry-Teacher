import type { Eye, PosteriorSegment } from '@core';
import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { makeCanvas } from '../eye/color';
import { canvasToFundus, hitTestFundus } from './geometry';
import { createTapGesture } from './gesture';
import { fundusMap, paintFundus } from './paint';
import type { FundusMap, FundusMark, FundusViewport } from './types';

export interface FundusViewProps {
  post: PosteriorSegment;
  eye: Eye;
  seed: number;
  width: number;
  height: number;
  /** Ophthalmoscope light circle: dark outside a movable circle. radius is a fraction of the shorter side. */
  lensView?: boolean | { radius?: number; follow?: 'center' | 'pointer' };
  redFree?: boolean;
  /** Indirect ophthalmoscopy: image inverted & reversed. */
  inverted?: boolean;
  /** Camera aperture (default: true unless lensView). */
  frame?: boolean;
  initialView?: FundusViewport;
  minZoom?: number;
  maxZoom?: number;
  /** Controlled view (optional). */
  view?: FundusViewport;
  onViewChange?: (v: FundusViewport) => void;
  onMap?: (map: FundusMap) => void;
  /** A tap/click (not a drag) with world coords and the marks under it. */
  onTap?: (e: { x: number; y: number; marks: FundusMark[] }) => void;
  reducedMotion?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  label?: string;
}

const prefersReduced = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));

/** Pan/zoom fundus viewer (drag, wheel, pinch, arrow keys, +/−). */
export function FundusView(props: FundusViewProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;
  const viewRef = useRef<FundusViewport>(props.view ?? props.initialView ?? { cx: 0.5, cy: 0.5, zoom: 1 });
  const targetZoom = useRef(viewRef.current.zoom);
  const api = useRef<{ redraw: () => void } | null>(null);
  // repaint the world texture only when the patient actually changes, not on a fresh object identity
  const postKey = JSON.stringify(props.post);

  // controlled view
  useEffect(() => {
    if (props.view) {
      viewRef.current = { ...props.view };
      targetZoom.current = props.view.zoom;
      api.current?.redraw();
    }
  }, [props.view?.cx, props.view?.cy, props.view?.zoom]);

  useEffect(() => {
    latest.current.onMap?.(fundusMap(props.post, props.eye, props.seed));
  }, [postKey, props.eye, props.seed]);

  // view-only changes (BIO inversion, aperture, light circle size) redraw without repainting the texture
  const lensKey = typeof props.lensView === 'object' ? `${props.lensView.radius ?? ''}|${props.lensView.follow ?? ''}` : String(!!props.lensView);
  useEffect(() => {
    api.current?.redraw();
  }, [props.inverted, props.frame, lensKey]);

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let disposed = false;
    let raf = 0;
    let sharpTimer = 0;
    let sharp = false;
    let pointer: { x: number; y: number } | null = null;
    const p0 = latest.current;
    const dpr = Math.min(2.5, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
    const W = p0.width;
    const H = p0.height;
    canvas.width = Math.round(W * dpr);
    canvas.height = Math.round(H * dpr);

    // world texture (painted once per patient)
    const res = Math.min(2400, Math.max(1024, Math.round(Math.max(W, H) * dpr * 1.6)));
    const tex = makeCanvas(res, res);
    if (tex) paintFundus(tex.ctx, res, res, p0.post, { eye: p0.eye, seed: p0.seed, redFree: p0.redFree, frame: false });

    const lens = () => {
      const l = latest.current.lensView;
      if (!l) return null;
      const o = typeof l === 'object' ? l : {};
      return { r: (o.radius ?? 0.26) * Math.min(W, H), follow: o.follow ?? 'center' };
    };
    const minZ = () => latest.current.minZoom ?? 1;
    const maxZ = () => latest.current.maxZoom ?? 6;
    const clampView = (v: FundusViewport): FundusViewport => {
      const z = clamp(v.zoom, minZ(), maxZ());
      const S = Math.min(W, H) * z;
      const hw = W / 2 / S;
      const hh = H / 2 / S;
      const fx = hw >= 0.5 ? 0.5 : clamp(v.cx, hw, 1 - hw);
      const fy = hh >= 0.5 ? 0.5 : clamp(v.cy, hh, 1 - hh);
      // with a light circle the user may look right to the edge of the world
      return lens() ? { cx: clamp(v.cx, 0, 1), cy: clamp(v.cy, 0, 1), zoom: z } : { cx: fx, cy: fy, zoom: z };
    };
    const toScreen = (px: number, py: number) => (latest.current.inverted ? { x: W - px, y: H - py } : { x: px, y: py });

    const draw = () => {
      const p = latest.current;
      const v = viewRef.current;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, W, H);
      ctx.save();
      if (p.inverted) {
        ctx.translate(W, H);
        ctx.scale(-1, -1);
      }
      const frame = p.frame ?? !p.lensView;
      if (sharp) {
        paintFundus(ctx, W, H, p.post, { eye: p.eye, seed: p.seed, redFree: p.redFree, view: v, frame });
      } else if (tex) {
        ctx.save();
        if (frame) {
          ctx.beginPath();
          ctx.arc(W / 2, H / 2, (Math.min(W, H) / 2) * 0.985, 0, Math.PI * 2);
          ctx.clip();
        }
        const S = Math.min(W, H) * v.zoom;
        ctx.imageSmoothingQuality = 'high';
        ctx.drawImage(tex.canvas as CanvasImageSource, W / 2 - v.cx * S, H / 2 - v.cy * S, S, S);
        ctx.restore();
      }
      ctx.restore();
      const L = lens();
      if (L) {
        const c = L.follow === 'pointer' && pointer ? pointer : { x: W / 2, y: H / 2 };
        ctx.save();
        ctx.beginPath();
        ctx.rect(0, 0, W, H);
        ctx.arc(c.x, c.y, L.r, 0, Math.PI * 2, true);
        ctx.fillStyle = 'rgba(3,2,6,0.96)';
        ctx.fill('evenodd');
        const g = ctx.createRadialGradient(c.x, c.y, L.r * 0.72, c.x, c.y, L.r * 1.02);
        g.addColorStop(0, 'rgba(0,0,0,0)');
        g.addColorStop(1, 'rgba(0,0,0,0.85)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(c.x, c.y, L.r * 1.02, 0, Math.PI * 2);
        ctx.fill();
        // faint corneal reflections of the instrument
        ctx.strokeStyle = 'rgba(200,220,255,0.18)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.arc(c.x, c.y, L.r * 0.93, Math.PI * 1.15, Math.PI * 1.45);
        ctx.stroke();
        ctx.restore();
      }
    };

    const schedule = () => {
      if (raf || disposed) return;
      raf = requestAnimationFrame(tick);
    };
    const tick = () => {
      raf = 0;
      if (disposed) return;
      const v = viewRef.current;
      const reduced = latest.current.reducedMotion ?? prefersReduced();
      const dz = targetZoom.current - v.zoom;
      if (Math.abs(dz) > 0.002 && !reduced) {
        viewRef.current = clampView({ ...v, zoom: v.zoom + dz * 0.25 });
        schedule();
      } else if (Math.abs(dz) > 0) {
        viewRef.current = clampView({ ...v, zoom: targetZoom.current });
      }
      draw();
      latest.current.onViewChange?.(viewRef.current);
    };
    const interacted = () => {
      sharp = false;
      clearTimeout(sharpTimer);
      sharpTimer = window.setTimeout(() => {
        // re-render crisply once the user pauses, if the texture would be soft
        if (viewRef.current.zoom * Math.min(W, H) * dpr > res * 0.85) {
          sharp = true;
          schedule();
        }
      }, 220);
      schedule();
    };
    api.current = { redraw: interacted };

    // ── input
    const pts = new Map<number, { x: number; y: number }>();
    const tap = createTapGesture(6);
    let pinch0 = 0;
    let zoom0 = 1;
    const local = (e: PointerEvent | WheelEvent) => {
      const r = canvas.getBoundingClientRect();
      return { x: ((e.clientX - r.left) / r.width) * W, y: ((e.clientY - r.top) / r.height) * H };
    };
    const onDown = (e: PointerEvent) => {
      canvas.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, local(e));
      tap.down(e.pointerId);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        pinch0 = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        zoom0 = targetZoom.current;
      }
    };
    const onMove = (e: PointerEvent) => {
      const q = local(e);
      // the light circle is drawn in screen space, so it tracks the raw pointer (even when inverted)
      pointer = q;
      const prev = pts.get(e.pointerId);
      if (!prev) {
        if (lens()?.follow === 'pointer') schedule();
        return;
      }
      pts.set(e.pointerId, q);
      if (pts.size === 2) {
        const [a, b] = [...pts.values()];
        const d = Math.hypot(a!.x - b!.x, a!.y - b!.y);
        if (pinch0 > 0) targetZoom.current = clamp((zoom0 * d) / pinch0, minZ(), maxZ());
        interacted();
        return;
      }
      const inv = latest.current.inverted ? -1 : 1;
      const dx = (q.x - prev.x) * inv;
      const dy = (q.y - prev.y) * inv;
      tap.move(e.pointerId, Math.abs(dx) + Math.abs(dy));
      const v = viewRef.current;
      const S = Math.min(W, H) * v.zoom;
      viewRef.current = clampView({ ...v, cx: v.cx - dx / S, cy: v.cy - dy / S });
      interacted();
    };
    const release = (e: PointerEvent, cancelled: boolean) => {
      const q = local(e);
      pts.delete(e.pointerId);
      if (pts.size < 2) pinch0 = 0;
      if (tap.up(e.pointerId, cancelled)) {
        const s = toScreen(q.x, q.y);
        const w = canvasToFundus(viewRef.current, W, H, s.x, s.y);
        const map = fundusMap(latest.current.post, latest.current.eye, latest.current.seed, viewRef.current);
        latest.current.onTap?.({ x: w.x, y: w.y, marks: hitTestFundus(map, w.x, w.y, 0.006 / viewRef.current.zoom) });
      }
    };
    const onUp = (e: PointerEvent) => release(e, false);
    const onCancel = (e: PointerEvent) => release(e, true);
    const onLeave = () => {
      pointer = null;
      if (lens()?.follow === 'pointer') schedule();
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const q = local(e);
      const s = toScreen(q.x, q.y);
      const v = viewRef.current;
      const before = canvasToFundus(v, W, H, s.x, s.y);
      const nz = clamp(targetZoom.current * Math.exp(-e.deltaY * 0.0015), minZ(), maxZ());
      targetZoom.current = nz;
      // zoom about the cursor
      const S1 = Math.min(W, H) * nz;
      viewRef.current = clampView({ zoom: v.zoom, cx: before.x - (s.x - W / 2) / S1, cy: before.y - (s.y - H / 2) / S1 });
      interacted();
    };
    const onKey = (e: KeyboardEvent) => {
      const v = viewRef.current;
      const step = 0.04 / v.zoom;
      const inv = latest.current.inverted ? -1 : 1;
      let handled = true;
      if (e.key === 'ArrowLeft') viewRef.current = clampView({ ...v, cx: v.cx - step * inv });
      else if (e.key === 'ArrowRight') viewRef.current = clampView({ ...v, cx: v.cx + step * inv });
      else if (e.key === 'ArrowUp') viewRef.current = clampView({ ...v, cy: v.cy - step * inv });
      else if (e.key === 'ArrowDown') viewRef.current = clampView({ ...v, cy: v.cy + step * inv });
      else if (e.key === '+' || e.key === '=') targetZoom.current = clamp(targetZoom.current * 1.25, minZ(), maxZ());
      else if (e.key === '-' || e.key === '_') targetZoom.current = clamp(targetZoom.current / 1.25, minZ(), maxZ());
      else if (e.key === 'Enter' || e.key === ' ') {
        const map = fundusMap(latest.current.post, latest.current.eye, latest.current.seed, v);
        latest.current.onTap?.({ x: v.cx, y: v.cy, marks: hitTestFundus(map, v.cx, v.cy, 0.01 / v.zoom) });
      } else handled = false;
      if (handled) {
        e.preventDefault();
        interacted();
      }
    };
    canvas.addEventListener('pointerdown', onDown);
    canvas.addEventListener('pointermove', onMove);
    canvas.addEventListener('pointerup', onUp);
    canvas.addEventListener('pointercancel', onCancel);
    canvas.addEventListener('pointerleave', onLeave);
    canvas.addEventListener('wheel', onWheel, { passive: false });
    canvas.addEventListener('keydown', onKey);
    viewRef.current = clampView(viewRef.current);
    interacted();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(sharpTimer);
      api.current = null;
      canvas.removeEventListener('pointerdown', onDown);
      canvas.removeEventListener('pointermove', onMove);
      canvas.removeEventListener('pointerup', onUp);
      canvas.removeEventListener('pointercancel', onCancel);
      canvas.removeEventListener('pointerleave', onLeave);
      canvas.removeEventListener('wheel', onWheel);
      canvas.removeEventListener('keydown', onKey);
    };
  }, [postKey, props.eye, props.seed, props.width, props.height, props.redFree, !!props.lensView]);

  return (
    <canvas
      ref={ref}
      tabIndex={0}
      role="img"
      aria-label={props.label ?? `Fundus of the ${props.eye === 'OD' ? 'right' : 'left'} eye. Drag or use arrow keys to look around; plus and minus to zoom.`}
      class={props.class}
      style={{ width: `${props.width}px`, height: `${props.height}px`, display: 'block', touchAction: 'none', cursor: 'grab', ...(props.style ?? {}) }}
    />
  );
}
