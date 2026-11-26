import { useEffect, useRef } from 'preact/hooks';
import type { Eye } from '@core';
import { PD_MM } from './model';
import type { S } from './strings';

/** One frame of the top-down schematic. `drift` is 0..1 outward drift of `devEye`; `out` marks that eye's divergence. */
export interface PlanState { d: number; drift: number; devEye: Eye; pins: { brk: number | null; rec: number | null } }

const GOLD = '124, 163, 255';
/** Non-linear distance scale so the critical 2-15 cm zone gets most of the height. */
const dist = (cm: number, L: number) => L * (Math.log(1 + cm / 3) / Math.log(1 + 60 / 3));

/**
 * Top-down "plan view" of the two eyes and the target: visual axes converge on the target, the deviating eye's axis
 * swings outward at the break point. Redrawn from the shared RAF (`draw` is returned through `bind`).
 */
export function PlanView({ t, bind }: { t: typeof S.en; bind: (draw: (s: PlanState) => void) => void }) {
  const cv = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = cv.current!;
    let W = 0, H = 0, dpr = 1;
    const measure = () => {
      dpr = Math.min(2, window.devicePixelRatio || 1);
      W = Math.max(60, c.clientWidth); H = Math.max(60, c.clientHeight);
      c.width = Math.round(W * dpr); c.height = Math.round(H * dpr);
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(c);
    bind((s) => {
      const g = c.getContext('2d');
      if (!g || !W) return;
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
      g.clearRect(0, 0, W, H);
      const cx = W / 2, ey = H - 34, L = ey - 14, half = Math.min(W * 0.17, 40);
      const ty = ey - dist(s.d, L);
      // depth scale with labelled ticks
      g.font = '700 11px system-ui, sans-serif'; g.textAlign = 'left'; g.textBaseline = 'middle';
      for (const cm of [3, 6, 10, 15, 25, 40]) {
        const y = ey - dist(cm, L);
        g.strokeStyle = cm === 6 ? 'rgba(45, 212, 191, 0.45)' : 'rgba(210, 224, 255, 0.12)';
        g.setLineDash(cm === 6 ? [] : [2, 4]); g.beginPath(); g.moveTo(10, y); g.lineTo(W - 10, y); g.stroke(); g.setLineDash([]);
        g.fillStyle = cm === 6 ? 'rgba(120, 245, 224, 1)' : 'rgba(235, 242, 255, 0.88)';
        g.fillText(t.cm(String(cm)), 12, y - 7);
      }
      // normal zone wash
      const y6 = ey - dist(6, L);
      const wash = g.createLinearGradient(0, y6, 0, ey);
      wash.addColorStop(0, 'rgba(45, 212, 191, 0.12)'); wash.addColorStop(1, 'rgba(45, 212, 191, 0)');
      g.fillStyle = wash; g.fillRect(cx - half * 1.7, y6, half * 3.4, ey - y6);
      // pins for marked break / recovery
      for (const [v, col, lab] of [[s.pins.brk, '124, 163, 255', 'B'], [s.pins.rec, '0, 200, 117', 'R']] as const) {
        if (v == null) continue;
        const y = ey - dist(v, L);
        g.fillStyle = `rgba(${col}, 0.9)`; g.beginPath(); g.arc(W - 22, y, 9, 0, 7); g.fill();
        g.fillStyle = '#0a1633'; g.textAlign = 'center'; g.font = '800 11px system-ui, sans-serif'; g.fillText(lab, W - 22, y + 0.5); g.textAlign = 'left';
      }
      // trail along the midline (glows brighter the closer the target is)
      const prox = Math.max(0, Math.min(1, 1 - s.d / 40));
      const trail = g.createLinearGradient(0, ty, 0, ey);
      trail.addColorStop(0, `rgba(${GOLD}, ${0.35 + 0.5 * prox})`); trail.addColorStop(1, `rgba(${GOLD}, 0)`);
      g.strokeStyle = trail; g.lineWidth = 2; g.beginPath(); g.moveTo(cx, ty); g.lineTo(cx, ey); g.stroke();
      // visual axes
      const broken = s.drift > 0.5;
      for (const e of ['OD', 'OS'] as Eye[]) {
        // the patient's right eye (OD) sits on the examiner's left of this view
        const ex = cx + (e === 'OD' ? -half : half);
        const toward = Math.atan2(cx - ex, ey - ty);
        const out = e === s.devEye ? s.drift : 0;
        const ang = toward * (1 - 1.7 * out);
        const len = Math.max(30, ey - ty);
        const px = ex + Math.sin(ang) * len, py = ey - Math.cos(ang) * len;
        const dev = out > 0.5;
        g.strokeStyle = dev ? 'rgba(255, 110, 199, 0.95)' : `rgba(${GOLD}, 0.85)`;
        g.lineWidth = dev ? 2.2 : 1.6; g.beginPath(); g.moveTo(ex, ey); g.lineTo(px, py); g.stroke();
        if (dev) { g.strokeStyle = 'rgba(255, 110, 199, 0.35)'; g.lineWidth = 7; g.beginPath(); g.moveTo(ex, ey); g.lineTo(px, py); g.stroke(); }
        // globe, rotated to look along its axis
        g.save(); g.translate(ex, ey); g.rotate(ang);
        const gl = g.createRadialGradient(-4, 4, 2, 0, 0, 17);
        gl.addColorStop(0, '#fbf6ee'); gl.addColorStop(1, '#bfb4a6');
        g.fillStyle = gl; g.beginPath(); g.arc(0, 0, 15, 0, 7); g.fill();
        g.strokeStyle = 'rgba(210, 224, 255, 0.35)'; g.lineWidth = 1; g.stroke();
        g.fillStyle = '#6b5d3a'; g.beginPath(); g.arc(0, -14, 6.2, 0, 7); g.fill();
        g.fillStyle = '#0a0610'; g.beginPath(); g.arc(0, -15.4, 3, 0, 7); g.fill();
        g.restore();
        g.fillStyle = 'rgba(235, 242, 255, 0.92)'; g.textAlign = 'center'; g.font = '700 11px system-ui, sans-serif'; g.fillText(e, ex, ey + 25); g.textAlign = 'left';
      }
      // nose bridge between the eyes
      g.fillStyle = 'rgba(210, 224, 255, 0.12)'; g.beginPath(); g.moveTo(cx, ey + 4); g.lineTo(cx - 7, ey + 18); g.lineTo(cx + 7, ey + 18); g.closePath(); g.fill();
      // target
      const rad = 5 + 3 * prox;
      const halo = g.createRadialGradient(cx, ty, 1, cx, ty, rad * 4);
      halo.addColorStop(0, `rgba(${GOLD}, 0.85)`); halo.addColorStop(1, `rgba(${GOLD}, 0)`);
      g.fillStyle = halo; g.beginPath(); g.arc(cx, ty, rad * 4, 0, 7); g.fill();
      g.fillStyle = '#ffffff'; g.beginPath(); g.arc(cx, ty, rad, 0, 7); g.fill();
      // convergence readout
      g.fillStyle = broken ? 'rgba(255, 110, 199, 0.95)' : 'rgba(210, 224, 255, 0.75)'; g.textAlign = 'right'; g.font = '700 12px system-ui, sans-serif';
      g.fillText(broken ? t.planDrifting : t.planConv((Math.atan(PD_MM / 2 / (s.d * 10)) * 360 / Math.PI).toFixed(0)), W - 10, 12);
    });
    return () => { ro?.disconnect(); bind(() => {}); };
  }, []);
  return <canvas ref={cv} class="mot-plan" aria-hidden="true" dir="ltr" />;
}
