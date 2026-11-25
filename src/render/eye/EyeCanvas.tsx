import type { JSX } from 'preact';
import { useEffect, useRef } from 'preact/hooks';
import { pickStrings } from '@core';
import { RS, renderLocale } from '../strings';
import { drawEye, drawSlitSection } from './draw';
import type { SlitBeam } from './slit';
import type { EyeState } from './types';

export interface EyeCanvasProps {
  state: EyeState;
  width: number;
  height: number;
  /** Micro-saccades, hippus, tear-film shimmer (and AC cell drift in slit view). Default true. */
  animate?: boolean;
  /** Spontaneous blinks every few seconds (needs animate). Default false. */
  blink?: boolean;
  /** Render a slit-lamp optical section with this beam instead of the normal view. */
  beam?: SlitBeam;
  /** Force reduced motion (otherwise follows prefers-reduced-motion). */
  reducedMotion?: boolean;
  class?: string;
  style?: JSX.CSSProperties;
  label?: string;
}

const prefersReduced = () =>
  typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

/** DPR-aware canvas that paints an EyeState, optionally alive (RAF). */
export function EyeCanvas(props: EyeCanvasProps) {
  const ref = useRef<HTMLCanvasElement>(null);
  const latest = useRef(props);
  latest.current = props;

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    let raf = 0;
    let disposed = false;
    const start = performance.now();
    // micro-saccade state
    let sac = { x: 0, y: 0 };
    let sacFrom = { x: 0, y: 0 };
    let sacAt = 0;
    let nextSac = 0.8;
    let nextBlink = 2.5 + Math.random() * 3;
    let blinkStart = -1;

    const paint = (t: number) => {
      const p = latest.current;
      const dpr = Math.min(3, typeof devicePixelRatio === 'number' ? devicePixelRatio : 1);
      const W = Math.round(p.width * dpr);
      const H = Math.round(p.height * dpr);
      if (canvas.width !== W || canvas.height !== H) {
        canvas.width = W;
        canvas.height = H;
      }
      const reduced = p.reducedMotion ?? prefersReduced();
      const live = (p.animate ?? true) && !reduced;
      let s = p.state;
      if (live) {
        // micro-saccades: brief ballistic jumps + slow drift
        if (t > nextSac) {
          sacFrom = { ...sac };
          sac = { x: (Math.random() - 0.5) * 0.016, y: (Math.random() - 0.5) * 0.012 };
          sacAt = t;
          nextSac = t + 0.6 + Math.random() * 1.6;
        }
        const k = Math.min(1, (t - sacAt) / 0.045);
        const drift = { x: Math.sin(t * 0.7) * 0.003, y: Math.cos(t * 0.53) * 0.002 };
        const gx = sacFrom.x + (sac.x - sacFrom.x) * k + drift.x;
        const gy = sacFrom.y + (sac.y - sacFrom.y) * k + drift.y;
        // hippus (physiological pupillary unrest)
        const hippus = Math.sin(t * 1.3) * 0.06 + Math.sin(t * 2.9) * 0.03;
        let lid = s.lidAperture;
        if (p.blink) {
          if (blinkStart < 0 && t > nextBlink) blinkStart = t;
          if (blinkStart >= 0) {
            const u = (t - blinkStart) / 0.22;
            if (u >= 1) {
              blinkStart = -1;
              nextBlink = t + 2.8 + Math.random() * 4.5;
            } else {
              lid *= Math.abs(Math.cos(u * Math.PI)) ** 0.7;
            }
          }
        }
        s = { ...s, gaze: { x: s.gaze.x + gx, y: s.gaze.y + gy }, pupilMm: s.pupilMm + hippus, lidAperture: lid };
      }
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, p.width, p.height);
      if (p.beam) drawSlitSection(ctx, p.width, p.height, s, p.beam, live ? t : 0);
      else drawEye(ctx, p.width, p.height, s, live ? t : 0);
      return live || false;
    };

    const loop = () => {
      if (disposed) return;
      const t = (performance.now() - start) / 1000;
      const live = paint(t);
      if (live) raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
    };
  }, [props.state, props.width, props.height, props.animate, props.blink, props.beam, props.reducedMotion]);

  return (
    <canvas
      ref={ref}
      class={props.class}
      role="img"
      aria-label={props.label ?? pickStrings(RS, renderLocale()).eyeCloseup(props.state.eye)}
      style={{ width: `${props.width}px`, height: `${props.height}px`, display: 'block', ...(props.style ?? {}) }}
    />
  );
}
