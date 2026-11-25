/**
 * Periocular skin, lid margins, lashes and the shadows/tear meniscus the lids
 * throw onto the globe.
 */
import { createRng } from '@core';
import { hexToRgb, mix, rgba, shade, smoothClosedPath, smoothOpenPath, type RGB } from './color';
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
  ctx.lineCap = 'round';
  for (const [wd, al] of [[2.0, 0.07], [0.8, 0.1], [0.22, 0.18]] as const) {
    ctx.strokeStyle = rgba(shade(tone, 0.5), al);
    ctx.lineWidth = pxmm * wd;
    ctx.beginPath();
    smoothOpenPath(ctx, upperTop.slice(3, -3));
    ctx.stroke();
  }
  ctx.strokeStyle = rgba(shade(tone, 1.12), 0.1);
  ctx.lineWidth = pxmm * 0.35;
  ctx.beginPath();
  smoothOpenPath(ctx, upperTop.slice(4, -4).map(([x, y]) => [x, y + pxmm * 0.55] as [number, number]));
  ctx.stroke();
  // lower lid fold
  const lowFold = g.lower.map(([x, y]) => [x, y + pxmm * (3.4 + swell) * (1 - Math.pow((x - cx) / (pxmm * 17), 2))] as [number, number]);
  for (const [wd, al] of [[2.2, 0.06], [0.9, 0.08]] as const) {
    ctx.strokeStyle = rgba(shade(tone, 0.6), al);
    ctx.lineWidth = pxmm * wd;
    ctx.beginPath();
    smoothOpenPath(ctx, lowFold.slice(5, -5));
    ctx.stroke();
  }
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

  // lashes — tapered, curled, gently clumped; fanned outward from the centre
  const lerpPt = (pts: [number, number][], u: number): [number, number] => {
    const f = Math.max(0, Math.min(1, u)) * (pts.length - 1);
    const i = Math.min(pts.length - 2, Math.floor(f));
    const k = f - i;
    return [pts[i]![0] + (pts[i + 1]![0] - pts[i]![0]) * k, pts[i]![1] + (pts[i + 1]![1] - pts[i]![1]) * k];
  };
  const latDir = -g.nasal;
  const open = 0.35 + 0.65 * Math.min(1, s.lidAperture + 0.2);
  const up = g.upper;
  const n = 120;
  let clumpDx = 0;
  for (let i = 0; i < n; i++) {
    const u = 0.06 + (0.88 * i) / (n - 1) + rng.float(-0.005, 0.005);
    const [x, y0] = lerpPt(up, u);
    const row = i % 3;
    const y = y0 - pxmm * (0.15 + row * 0.12);
    const hx = (x - g.cx) / (pxmm * 15);
    const medialFade = Math.max(0, hx * g.nasal); // shorter, sparser medially
    if (medialFade > 0.75 && rng.chance(0.5)) continue;
    if (i % 4 === 0) clumpDx = rng.float(-0.25, 0.25);
    const L = pxmm * rng.float(1.9, 3.0) * (1 - medialFade * 0.45) * (1 - Math.abs(hx) * 0.15) * open;
    const fan = hx * 0.9 + latDir * Math.max(0, hx * latDir) * 0.55 + clumpDx;
    const root: [number, number] = [x, y];
    const ctrl: [number, number] = [x + fan * L * 0.35, y + L * 0.42];
    const tip: [number, number] = [x + fan * L * 0.95, y - L * (0.75 - Math.abs(fan) * 0.2)];
    taperedLash(ctx, root, ctrl, tip, pxmm * rng.float(0.1, 0.15), `rgba(22,14,10,${rng.float(0.8, 0.98).toFixed(2)})`);
  }
  // lower lashes: fewer, shorter, finer, irregularly spaced and curving down-and-out
  for (let i = 0; i < 34; i++) {
    const u = 0.14 + (0.72 * i) / 33 + rng.float(-0.012, 0.012);
    const [x, y] = lerpPt(lowerOuter, u);
    const hx = (x - g.cx) / (pxmm * 15);
    if (hx * g.nasal > 0.45 && rng.chance(0.7)) continue;
    if (rng.chance(0.2)) continue;
    const L = pxmm * rng.float(0.7, 1.5) * (1 - Math.max(0, hx * g.nasal) * 0.5) * (1 - Math.abs(hx) * 0.25);
    const fan = hx * 1.2 + rng.float(-0.18, 0.18);
    taperedLash(ctx, [x, y - pxmm * 0.2], [x + fan * L * 0.2, y + L * 0.55], [x + fan * L * 0.8, y + L * 0.92], pxmm * rng.float(0.045, 0.07), `rgba(36,24,18,${rng.float(0.45, 0.75).toFixed(2)})`);
  }
  // blepharitis scurf at lash bases
  if (s.lidMarginRed) {
    for (let i = 0; i < 26; i++) {
      const [x, y] = lerpPt(up, rng.float(0.1, 0.9));
      ctx.fillStyle = 'rgba(238,224,176,0.9)';
      ctx.beginPath();
      ctx.ellipse(x, y - pxmm * 0.35, pxmm * rng.float(0.12, 0.25), pxmm * 0.1, 0, 0, TAU);
      ctx.fill();
    }
  }

  // discharge
  if (s.discharge === 'mucopurulent') {
    // creamy yellow-green pus pooled at the medial canthus and crusting the lashes
    const mc = g.medialCanthus;
    const pool: [number, number][] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const k = 1 + rng.float(-0.25, 0.25);
      pool.push([mc[0] - g.nasal * pxmm * 2.3 + Math.cos(a) * pxmm * 1.3 * k, mc[1] + pxmm * 0.35 + Math.sin(a) * pxmm * 0.7 * k]);
    }
    ctx.beginPath();
    smoothClosedPath(ctx, pool);
    const pg = ctx.createRadialGradient(mc[0] - g.nasal * pxmm * 2.5, mc[1] + pxmm * 0.1, 0, mc[0] - g.nasal * pxmm * 2.3, mc[1] + pxmm * 0.35, pxmm * 1.5);
    pg.addColorStop(0, 'rgba(246,238,178,0.97)');
    pg.addColorStop(0.7, 'rgba(222,206,120,0.9)');
    pg.addColorStop(1, 'rgba(200,180,96,0.5)');
    ctx.fillStyle = pg;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,245,0.7)';
    ctx.beginPath();
    ctx.ellipse(mc[0] - g.nasal * pxmm * 2.6, mc[1] + pxmm * 0.05, pxmm * 0.4, pxmm * 0.15, -0.3, 0, TAU);
    ctx.fill();
    // matted, glistening crusts caught in the lower lashes (irregular, uneven)
    for (let i = 0; i < 3; i++) {
      const u = 0.3 + i * 0.2 + rng.float(-0.06, 0.06);
      const [x, y] = lerpPt(lowerOuter, u);
      const pts: [number, number][] = [];
      const rx = pxmm * rng.float(0.9, 1.6);
      const ry = pxmm * rng.float(0.3, 0.5);
      for (let k = 0; k < 12; k++) {
        const a = (k / 12) * TAU;
        const j = 1 + rng.float(-0.3, 0.3);
        pts.push([x + Math.cos(a) * rx * j, y - pxmm * 0.25 + Math.sin(a) * ry * j]);
      }
      ctx.beginPath();
      smoothClosedPath(ctx, pts);
      ctx.fillStyle = 'rgba(232,214,140,0.55)';
      ctx.fill();
      ctx.fillStyle = 'rgba(255,250,225,0.45)';
      ctx.beginPath();
      ctx.ellipse(x - rx * 0.3, y - pxmm * 0.32, rx * 0.25, ry * 0.25, 0, 0, TAU);
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

function taperedLash(ctx: CanvasRenderingContext2D, p0: [number, number], p1: [number, number], p2: [number, number], w: number, color: string): void {
  const n = 6;
  ctx.strokeStyle = color;
  ctx.lineCap = 'round';
  let px = p0[0];
  let py = p0[1];
  for (let i = 1; i <= n; i++) {
    const u = i / n;
    const a = (1 - u) * (1 - u);
    const b = 2 * (1 - u) * u;
    const c = u * u;
    const x = a * p0[0] + b * p1[0] + c * p2[0];
    const y = a * p0[1] + b * p1[1] + c * p2[1];
    ctx.lineWidth = Math.max(0.35, w * (1 - u * 0.85));
    ctx.beginPath();
    ctx.moveTo(px, py);
    ctx.lineTo(x, y);
    ctx.stroke();
    px = x;
    py = y;
  }
}
