import { useEffect, useRef } from 'preact/hooks';
import { useStrings } from '@ui-kit';
import { S } from './strings';
import { drawEye, eyeState, type EyeState } from '@render';
import { beamIllumination, blinkAperture, damp, gazeFromPointer, pupilForLight, sweepPhase } from './logic';

export interface LivingEyeProps {
  width: number;
  height: number;
  reduced: boolean;
  /** When true the gaze returns to centre (zoom transition) and blinking stops. */
  focusCentre: boolean;
  /** Reports the light-sweep phase (0..1) each frame so the flare can follow the beam. */
  onSweep?: (phase: number) => void;
}

const BASE: EyeState = eyeState({
  eye: 'OD', irisColor: '#3f8f9c', irisSeed: 11, pupilMm: 5, lighting: 'penlight', redness: 0.04, skinTone: '#caa086',
});

/** A single enormous eye: follows the pointer, blinks, pupil answers a sweeping light. */
export function LivingEye({ width, height, reduced, focusCentre, onSweep }: LivingEyeProps) {
  const t = useStrings(S);
  const ref = useRef<HTMLCanvasElement>(null);
  const live = useRef({ focusCentre, reduced, onSweep, width, height });
  live.current = { focusCentre, reduced, onSweep, width, height };

  useEffect(() => {
    const canvas = ref.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let disposed = false;
    const t0 = performance.now();
    let last = 0;
    const gaze = { x: 0, y: 0 };
    let target = { x: 0, y: 0 };
    let idleAt = 0;
    let nextBlink = 2.2;
    let blinkStart = -1;
    let lastPointer = 0;
    let pupil = 5.2;

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect();
      const reach = Math.max(window.innerWidth, window.innerHeight) * 0.45;
      target = gazeFromPointer(e.clientX, e.clientY, r.left + r.width / 2, r.top + r.height / 2, reach);
      lastPointer = (performance.now() - t0) / 1000;
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    window.addEventListener('pointerdown', onMove, { passive: true });

    const paint = (t: number, dt: number) => {
      const { focusCentre: fc, reduced: rm, width: w, height: h } = live.current;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
      }
      // idle wandering gaze when the pointer has not moved for a while
      let tg = target;
      if (fc) tg = { x: 0, y: 0 };
      else if (!rm && t - lastPointer > 4) {
        if (t > idleAt) {
          idleAt = t + 1.4 + Math.random() * 2;
          target = { x: (Math.random() - 0.5) * 0.7, y: (Math.random() - 0.5) * 0.35 };
        }
        tg = target;
      }
      gaze.x = damp(gaze.x, tg.x, fc ? 5 : 9, dt);
      gaze.y = damp(gaze.y, tg.y, fc ? 5 : 9, dt);

      const phase = rm ? -1 : sweepPhase(t);
      live.current.onSweep?.(phase);
      const illum = beamIllumination(phase);
      pupil = damp(pupil, pupilForLight(illum) + (rm ? 0 : Math.sin(t * 1.3) * 0.08), illum > 0 ? 9 : 2.2, dt);

      let lid = 1;
      if (!rm && !fc) {
        if (blinkStart < 0 && t > nextBlink) blinkStart = t;
        if (blinkStart >= 0) {
          const u = (t - blinkStart) / 0.34;
          if (u >= 1) {
            blinkStart = -1;
            nextBlink = t + 2.6 + Math.random() * 4;
          } else lid = blinkAperture(u);
        }
      }
      const state: EyeState = { ...BASE, gaze: { ...gaze }, pupilMm: pupil, lidAperture: lid };
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      drawEye(ctx, w, h, state, rm ? 0 : t);

      // the examiner's light: soft diagonal beam crossing the eye
      if (phase >= 0) {
        const x = -0.25 * w + phase * 1.5 * w;
        const g = ctx.createLinearGradient(x - w * 0.18, 0, x + w * 0.18, 0);
        g.addColorStop(0, 'rgba(255,236,190,0)');
        g.addColorStop(0.5, 'rgba(255,236,190,0.34)');
        g.addColorStop(1, 'rgba(255,236,190,0)');
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        ctx.translate(w / 2, h / 2);
        ctx.rotate(-0.28);
        ctx.translate(-w / 2, -h / 2);
        ctx.fillStyle = g;
        ctx.fillRect(x - w * 0.2, -h * 0.4, w * 0.4, h * 1.8);
        ctx.restore();
      }
    };

    const loop = () => {
      if (disposed) return;
      const t = (performance.now() - t0) / 1000;
      const dt = Math.min(0.05, Math.max(0.001, t - last));
      last = t;
      paint(t, dt);
      if (!document.hidden) raf = requestAnimationFrame(loop);
      else raf = window.setTimeout(loop, 250) as unknown as number;
    };
    loop();
    return () => {
      disposed = true;
      cancelAnimationFrame(raf);
      clearTimeout(raf);
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerdown', onMove);
    };
  }, []);

  return (
    <canvas
      ref={ref}
      class="ttl-eye__canvas"
      role="img"
      aria-label={t.eyeLabel}
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
}
