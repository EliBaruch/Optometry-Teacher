/**
 * Periocular skin, lid margins, lashes and the shadows/tear meniscus the lids
 * throw onto the globe.
 */
import { createRng } from '@core';
import { hexToRgb, mix, rgba, shade, smoothOpenPath, type RGB } from './color';
import type { EyeGeometry } from './geometry';
import type { EyeState } from './types';

const TAU = Math.PI * 2;

export function fissurePath(ctx: CanvasRenderingContext2D, g: EyeGeometry): void {
  smoothOpenPath(ctx, g.upper);
  smoothOpenPath(ctx, g.lower, false);
  ctx.closePath();
}

export function fillAll(ctx: CanvasRenderingContext2D, g: EyeGeometry): void {
  ctx.fillRect(g.cx - g.pxmm * 24, g.cy - g.pxmm * 16, g.pxmm * 48, g.pxmm * 32);
}

export function drawSkin(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState): void {
  const { pxmm, cx, cy, nasal } = g;
  const tone: RGB = hexToRgb(s.skinTone ?? '#d3a183');
  const swell = s.lidSwelling ?? 0;
  const base = ctx.createRadialGradient(cx, cy - pxmm * 2, pxmm * 4, cx, cy, pxmm * 22);
  base.addColorStop(0, rgba(shade(tone, 0.82)));
  base.addColorStop(0.45, rgba(tone));
  base.addColorStop(1, rgba(shade(tone, 1.06)));
  ctx.fillStyle = base;
  fillAll(ctx, g);

  // orbital hollow: darker around the fissure, deepest nasally under the brow
  const hollow = ctx.createRadialGradient(cx + nasal * pxmm * 6, cy - pxmm * 4, 0, cx + nasal * pxmm * 6, cy - pxmm * 4, pxmm * 14);
  hollow.addColorStop(0, rgba(shade(tone, 0.55), 0.35));
  hollow.addColorStop(1, rgba(shade(tone, 0.55), 0));
  ctx.fillStyle = hollow;
  fillAll(ctx, g);

  // upper-lid pretarsal skin: a slightly glossy, warmer band with a crease above
  const upperTop = g.upper.map(([x, y]) => [x, y - pxmm * (4.2 + swell * 1.2) * (1 - Math.pow((x - cx) / (pxmm * 17), 2))] as [number, number]);
  ctx.save();
  ctx.beginPath();
  smoothOpenPath(ctx, g.upper);
  smoothOpenPath(ctx, [...upperTop].reverse(), false);
  ctx.closePath();
  const lidG = ctx.createLinearGradient(0, cy - pxmm * 9, 0, cy - pxmm * 3);
  lidG.addColorStop(0, rgba(mix(tone, [200, 120, 120], 0.12 + swell * 0.25), 0.2));
  lidG.addColorStop(1, rgba(mix(shade(tone, 0.9), [190, 110, 110], 0.15 + swell * 0.35), 0.75));
  ctx.fillStyle = lidG;
  ctx.fill();
  ctx.restore();
  // lid crease
  ctx.strokeStyle = rgba(shade(tone, 0.5), 0.5);
  ctx.lineWidth = pxmm * 0.28;
  ctx.lineCap = 'round';
  ctx.beginPath();
  smoothOpenPath(ctx, upperTop.slice(3, -3));
  ctx.stroke();
  ctx.strokeStyle = rgba(shade(tone, 1.15), 0.35);
  ctx.lineWidth = pxmm * 0.35;
  ctx.beginPath();
  smoothOpenPath(ctx, upperTop.slice(4, -4).map(([x, y]) => [x, y + pxmm * 0.55] as [number, number]));
  ctx.stroke();
  // lower lid fold
  const lowFold = g.lower.map(([x, y]) => [x, y + pxmm * (3.4 + swell) * (1 - Math.pow((x - cx) / (pxmm * 17), 2))] as [number, number]);
  ctx.strokeStyle = rgba(shade(tone, 0.68), 0.28);
  ctx.lineWidth = pxmm * 0.5;
  ctx.beginPath();
  smoothOpenPath(ctx, lowFold.slice(4, -4));
  ctx.stroke();
  if (swell > 0) {
    const sg = ctx.createRadialGradient(cx, cy, pxmm * 4, cx, cy, pxmm * 14);
    sg.addColorStop(0, `rgba(205,95,95,${0.25 * swell})`);
    sg.addColorStop(1, 'rgba(205,95,95,0)');
    ctx.fillStyle = sg;
    fillAll(ctx, g);
  }
}

/** Shadows the lids cast on the globe + tear meniscus (call inside the fissure clip). */
export function drawLidShadows(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState, t: number): void {
  const { pxmm } = g;
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const [wid, a] of [[4.2, 0.12], [2.6, 0.16], [1.3, 0.22], [0.6, 0.3]] as const) {
    ctx.strokeStyle = `rgba(40,20,20,${a})`;
    ctx.lineWidth = pxmm * wid;
    ctx.beginPath();
    smoothOpenPath(ctx, g.upper);
    ctx.stroke();
  }
  for (const [wid, a] of [[1.4, 0.1], [0.6, 0.14]] as const) {
    ctx.strokeStyle = `rgba(60,30,30,${a})`;
    ctx.lineWidth = pxmm * wid;
    ctx.beginPath();
    smoothOpenPath(ctx, g.lower);
    ctx.stroke();
  }
  // canthal shadows
  for (const c of [g.medialCanthus, g.lateralCanthus]) {
    const gr = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], pxmm * 6);
    gr.addColorStop(0, 'rgba(60,25,25,0.35)');
    gr.addColorStop(1, 'rgba(60,25,25,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(c[0] - pxmm * 6, c[1] - pxmm * 6, pxmm * 12, pxmm * 12);
  }
  // tear meniscus: a bright wet strip along the lower lid
  const watery = s.discharge === 'watery';
  ctx.strokeStyle = `rgba(255,255,255,${watery ? 0.55 : 0.32})`;
  ctx.lineWidth = pxmm * (watery ? 0.55 : 0.3);
  ctx.beginPath();
  smoothOpenPath(ctx, g.lower.slice(3, -3).map(([x, y]) => [x, y - pxmm * 0.22] as [number, number]));
  ctx.stroke();
  ctx.strokeStyle = `rgba(255,255,255,${0.5 + 0.15 * Math.sin(t * 2.1)})`;
  ctx.lineWidth = pxmm * 0.08;
  ctx.beginPath();
  smoothOpenPath(ctx, g.lower.slice(8, -8).map(([x, y]) => [x, y - pxmm * 0.32] as [number, number]));
  ctx.stroke();
  ctx.restore();
}

export function drawLidMargins(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState): void {
  const { pxmm } = g;
  const rng = createRng((s.irisSeed * 31) ^ 0x1a5);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // lower lid margin: visible pink-tan ledge with grey line and meibomian orifices
  const lowerOuter = g.lower.map(([x, y]) => [x, y + pxmm * 0.95] as [number, number]);
  ctx.beginPath();
  smoothOpenPath(ctx, g.lower);
  smoothOpenPath(ctx, [...lowerOuter].reverse(), false);
  ctx.closePath();
  const red = s.lidMarginRed ? 1 : 0;
  ctx.fillStyle = rgba(mix([214, 150, 140], [205, 85, 80], red * 0.7), 0.95);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = pxmm * 0.12;
  ctx.beginPath();
  smoothOpenPath(ctx, g.lower);
  ctx.stroke();
  for (let i = 4; i < g.lower.length - 4; i++) {
    const p = g.lower[i]!;
    ctx.fillStyle = red ? 'rgba(230,200,120,0.9)' : 'rgba(160,100,95,0.6)';
    ctx.beginPath();
    ctx.arc(p[0], p[1] + pxmm * 0.38, pxmm * (red ? 0.13 : 0.08), 0, TAU);
    ctx.fill();
  }
  // upper lash line
  ctx.strokeStyle = s.lidMarginRed ? 'rgba(150,50,50,0.9)' : 'rgba(55,32,28,0.92)';
  ctx.lineWidth = pxmm * 0.55;
  ctx.beginPath();
  smoothOpenPath(ctx, g.upper.map(([x, y]) => [x, y - pxmm * 0.2] as [number, number]));
  ctx.stroke();

  // lashes
  const lash = '#1a110c';
  const n = 78;
  const up = g.upper;
  const lerpPt = (pts: [number, number][], u: number): [number, number] => {
    const f = u * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    const k = f - i;
    return [pts[i]![0] + (pts[i + 1]![0] - pts[i]![0]) * k, pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * k];
  };
  for (let i = 0; i < n; i++) {
    const u = 0.07 + (0.86 * i) / (n - 1) + rng.float(-0.004, 0.004);
    const [x, y0] = lerpPt(up, u);
    const y = y0 - pxmm * 0.25;
    const hx = (x - g.cx) / (g.pxmm * 15);
    const latDir = -g.nasal;
    const L = pxmm * rng.float(2.2, 3.4) * (1 - Math.abs(hx) * 0.3) * (0.35 + 0.65 * Math.min(1, s.lidAperture + 0.2));
    const dx = (hx * 0.75 + latDir * Math.max(0, hx * latDir) * 0.45) * L;
    ctx.strokeStyle = lash;
    ctx.lineWidth = pxmm * rng.float(0.08, 0.13);
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.quadraticCurveTo(x + dx * 0.45, y + L * 0.32, x + dx * 0.9, y - L * 0.55);
    ctx.stroke();
    if (s.lidMarginRed && i % 3 === 0) {
      ctx.fillStyle = 'rgba(235,220,170,0.85)';
      ctx.beginPath();
      ctx.arc(x + dx * 0.1, y + L * 0.02, pxmm * 0.16, 0, TAU);
      ctx.fill();
    }
  }
  const lo = lowerOuter;
  for (let i = 0; i < 34; i++) {
    const u = 0.15 + (0.7 * i) / 33 + rng.float(-0.006, 0.006);
    const [x, y] = lerpPt(lo, u);
    const L = pxmm * rng.float(1.0, 1.7);
    const dx = ((x - g.cx) / (g.pxmm * 15)) * 0.9 * L;
    ctx.strokeStyle = 'rgba(30,20,16,0.85)';
    ctx.lineWidth = pxmm * 0.07;
    ctx.beginPath();
    ctx.moveTo(x, y - pxmm * 0.1);
    ctx.quadraticCurveTo(x + dx * 0.5, y + L * 0.6, x + dx, y + L);
    ctx.stroke();
  }

  // discharge
  if (s.discharge === 'mucopurulent') {
    const mc = g.medialCanthus;
    for (let i = 0; i < 9; i++) {
      const gx = mc[0] - g.nasal * pxmm * rng.float(0.5, 3.5);
      const gy = mc[1] + pxmm * rng.float(-0.4, 1.4);
      const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, pxmm * rng.float(0.6, 1.2));
      gr.addColorStop(0, 'rgba(240,230,160,0.95)');
      gr.addColorStop(1, 'rgba(230,215,140,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(gx, gy, pxmm * 1.2, 0, TAU);
      ctx.fill();
    }
    for (let i = 0; i < 12; i++) {
      const [x, y] = lerpPt(lo, rng.float(0.2, 0.8));
      ctx.fillStyle = 'rgba(235,225,165,0.9)';
      ctx.beginPath();
      ctx.ellipse(x, y + pxmm * 0.4, pxmm * 0.35, pxmm * 0.2, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}

/** Stringy mucus in the inferior fornix (allergic) — inside fissure clip. */
export function drawStringyMucus(ctx: CanvasRenderingContext2D, g: EyeGeometry): void {
  const { pxmm } = g;
  ctx.save();
  ctx.strokeStyle = 'rgba(250,250,245,0.7)';
  ctx.lineWidth = pxmm * 0.18;
  ctx.lineCap = 'round';
  const pts = g.lower.slice(6, -6).map(([x, y], i) => [x, y - pxmm * (0.5 + 0.3 * Math.sin(i * 1.7))] as [number, number]);
  ctx.beginPath();
  smoothOpenPath(ctx, pts);
  ctx.stroke();
  ctx.restore();
}
