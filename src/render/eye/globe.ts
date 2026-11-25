/**
 * Sclera + bulbar conjunctiva: wet porcelain sclera with lid shadow, fine
 * tortuous conjunctival vessels, injection patterns, subconjunctival
 * haemorrhage, chemosis, pinguecula and the caruncle.
 * Everything here is drawn inside the palpebral fissure clip.
 */
import { createRng, type Rng } from '@core';
import { rgba, smoothClosedPath, smoothOpenPath, type RGB } from './color';
import type { EyeGeometry } from './geometry';
import type { EyeState } from './types';

const TAU = Math.PI * 2;
const hash = (i: number) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

export function drawSclera(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState): void {
  const { pxmm, cx, cy, ix, iy } = g;
  // porcelain base, warmer & greyer toward the canthi (globe curvature)
  const base = ctx.createRadialGradient(ix, iy, g.irisR * 0.9, ix, iy, pxmm * 17);
  base.addColorStop(0, '#f4efea');
  base.addColorStop(0.45, '#ebe3df');
  base.addColorStop(0.8, '#cdbfbe');
  base.addColorStop(1, '#a8928f');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  // faint blue-grey under-tone near the limbus (thin sclera shows uvea)
  const blue = ctx.createRadialGradient(ix, iy, g.irisR, ix, iy, g.irisR * 1.6);
  blue.addColorStop(0, 'rgba(150,160,190,0.18)');
  blue.addColorStop(1, 'rgba(150,160,190,0)');
  ctx.fillStyle = blue;
  ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);

  const rng = createRng((s.irisSeed * 7919) ^ 0xc0);
  drawConjVessels(ctx, g, s, rng);
  drawInjection(ctx, g, s);
  if (s.subconjHemorrhage) drawSubconj(ctx, g, s, rng.fork('sch'));
  if (s.pinguecula) drawPinguecula(ctx, g, rng.fork('ping'));
  drawCaruncle(ctx, g, s);
  if ((s.chemosis ?? 0) > 0) drawChemosis(ctx, g, s.chemosis ?? 0);
  void cx; void cy;
}

/** A tapered vessel filled as one smooth polygon (no overlapping joints → no banding). */
function taper(ctx: CanvasRenderingContext2D, pts: [number, number][], w0: number, w1: number): void {
  const n = pts.length;
  if (n < 2) return;
  const left: [number, number][] = [];
  const right: [number, number][] = [];
  for (let j = 0; j < n; j++) {
    const p = pts[Math.max(0, j - 1)]!;
    const q = pts[Math.min(n - 1, j + 1)]!;
    const dx = q[0] - p[0];
    const dy = q[1] - p[1];
    const L = Math.hypot(dx, dy) || 1;
    const hw = Math.max(0.3, w0 + (w1 - w0) * (j / (n - 1))) / 2;
    left.push([pts[j]![0] - (dy / L) * hw, pts[j]![1] + (dx / L) * hw]);
    right.push([pts[j]![0] + (dy / L) * hw, pts[j]![1] - (dx / L) * hw]);
  }
  ctx.beginPath();
  smoothOpenPath(ctx, left);
  smoothOpenPath(ctx, right.reverse(), false);
  ctx.closePath();
  ctx.fill();
}

/**
 * Bulbar conjunctival vessels: arborising trees that enter from the fornices
 * and canthi and taper toward the limbus (posterior conjunctival vessels).
 * Calibre, number and colour scale with the injection; ciliary flush and
 * sectoral injection only lightly engorge them.
 */
function drawConjVessels(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState, rng: Rng): void {
  const { pxmm, ix, iy, irisR } = g;
  const red = s.redness;
  const diffuse = s.rednessPattern === 'diffuse' ? red : red * 0.4;
  const n = Math.round(9 + diffuse * 26);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const trees: { pts: [number, number][]; w: number; col: RGB; a: number }[] = [];
  const walk = (x: number, y: number, h: number, len: number, w: number, depth: number, col: RGB, a: number) => {
    const pts: [number, number][] = [[x, y]];
    const steps = Math.max(4, Math.round(len / (pxmm * 0.45)));
    const bend = rng.float(-0.05, 0.05);
    for (let i = 0; i < steps; i++) {
      // drift toward the limbus, meandering
      const toL = Math.atan2(iy - y, ix - x);
      let d = toL - h;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      h += d * 0.06 + bend + rng.float(-0.32, 0.32);
      x += Math.cos(h) * pxmm * 0.45;
      y += Math.sin(h) * pxmm * 0.45;
      const dl = Math.hypot((x - ix) / g.foreX, (y - iy) / g.foreY);
      if (dl < irisR * 1.04) break;
      pts.push([x, y]);
      if (depth < 2 && i > 1 && rng.chance(depth === 0 ? 0.22 : 0.12)) {
        walk(x, y, h + (rng.chance(0.5) ? 1 : -1) * rng.float(0.5, 1.2), len * rng.float(0.25, 0.5), w * rng.float(0.45, 0.7), depth + 1, col, a * 0.9);
      }
    }
    if (pts.length > 2) trees.push({ pts, w, col, a });
  };
  for (let i = 0; i < n; i++) {
    // roots along the exposed nasal & temporal sclera, a few from the fornices
    const side = rng.chance(0.5) ? 0 : Math.PI;
    const a = side + rng.float(-0.8, 0.8) + (rng.chance(0.2) ? (rng.chance(0.5) ? 1 : -1) * 1.2 : 0);
    const r = pxmm * rng.float(11.5, 15.5);
    const x = ix + Math.cos(a) * r;
    const y = iy + Math.sin(a) * r * 0.55;
    const h = Math.atan2(iy - y, ix - x) + rng.float(-0.5, 0.5);
    const w = pxmm * rng.float(0.07, 0.15) * (1 + diffuse * 1.4);
    const col: RGB = rng.chance(0.35) ? [150, 38, 52] : [192, 50, 52];
    const alpha = rng.float(0.3, 0.55) * (0.35 + diffuse * 1.1);
    walk(x, y, h, pxmm * rng.float(5, 10), w, 0, col, Math.min(0.9, alpha));
  }
  // deep, soft blur pass (engorged episcleral glow), then the crisp vessels
  if (diffuse > 0.25 && 'filter' in ctx) {
    ctx.filter = `blur(${(pxmm * 0.25).toFixed(1)}px)`;
    for (const t of trees) {
      ctx.fillStyle = rgba(t.col, t.a * 0.35 * diffuse);
      taper(ctx, t.pts, t.w * 2.6, t.w * 1.2);
    }
    ctx.filter = 'none';
  }
  for (const t of trees) {
    ctx.fillStyle = rgba(t.col, t.a);
    taper(ctx, t.pts, t.w, t.w * 0.3);
  }
  ctx.restore();
}

function drawInjection(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState): void {
  const { pxmm, ix, iy, irisR } = g;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  const red = s.redness;
  if (red <= 0.05) return;
  if (s.rednessPattern === 'diffuse') {
    // conjunctivitis: maximal in the fornices, fading toward the limbus
    const gr = ctx.createRadialGradient(ix, iy, irisR * 1.05, ix, iy, pxmm * 16);
    gr.addColorStop(0, `rgba(210,70,70,${0.05 * red})`);
    gr.addColorStop(0.5, `rgba(210,60,60,${0.28 * red})`);
    gr.addColorStop(1, `rgba(170,30,40,${0.55 * red})`);
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
  } else if (s.rednessPattern === 'ciliary-flush') {
    // deep violaceous perilimbal ring with fine straight radial vessels
    const gr = ctx.createRadialGradient(ix, iy, irisR * 0.98, ix, iy, irisR + pxmm * 3.2);
    gr.addColorStop(0, `rgba(140,30,70,${0.75 * red})`);
    gr.addColorStop(0.35, `rgba(150,40,80,${0.45 * red})`);
    gr.addColorStop(1, 'rgba(150,40,80,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.lineWidth = Math.max(0.6, pxmm * 0.05);
    for (let i = 0; i < 150; i++) {
      const a = (i / 150) * TAU + hash(i) * 0.05;
      const r0 = irisR * (1.0 + hash(i + 7) * 0.03);
      const r1 = irisR + pxmm * (0.8 + hash(i + 3) * 2.4);
      ctx.strokeStyle = `rgba(125,20,60,${(0.15 + hash(i + 11) * 0.35) * red})`;
      ctx.beginPath();
      ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0);
      ctx.quadraticCurveTo(ix + Math.cos(a + 0.02) * (r0 + r1) / 2, iy + Math.sin(a + 0.02) * (r0 + r1) / 2, ix + Math.cos(a + (hash(i + 5) - 0.5) * 0.06) * r1, iy + Math.sin(a + (hash(i + 5) - 0.5) * 0.06) * r1);
      ctx.stroke();
    }
  } else {
    // sectoral (episcleritis): salmon-red wedge
    const sector = s.rednessSector ?? 'temporal';
    const dir = sector === 'nasal' ? (g.nasal > 0 ? 0 : Math.PI) : sector === 'temporal' ? (g.nasal > 0 ? Math.PI : 0) : sector === 'superior' ? -Math.PI / 2 : Math.PI / 2;
    const cxs = ix + Math.cos(dir) * (irisR + pxmm * 4);
    const cys = iy + Math.sin(dir) * (irisR + pxmm * 3) * 0.7;
    const gr = ctx.createRadialGradient(cxs, cys, 0, cxs, cys, pxmm * 5.5);
    gr.addColorStop(0, `rgba(205,55,55,${0.65 * red})`);
    gr.addColorStop(1, 'rgba(205,55,55,0)');
    ctx.fillStyle = gr;
    ctx.fillRect(0, 0, W, H);
    ctx.strokeStyle = `rgba(170,25,35,${0.6 * red})`;
    ctx.lineWidth = pxmm * 0.12;
    for (let i = 0; i < 14; i++) {
      const a = dir + (i / 13 - 0.5) * 1.1;
      ctx.beginPath();
      ctx.moveTo(ix + Math.cos(a) * irisR * 1.1, iy + Math.sin(a) * irisR * 1.1);
      ctx.quadraticCurveTo(ix + Math.cos(a + 0.08) * (irisR + pxmm * 3), iy + Math.sin(a + 0.08) * (irisR + pxmm * 3), ix + Math.cos(a) * (irisR + pxmm * 7), iy + Math.sin(a) * (irisR + pxmm * 6));
      ctx.stroke();
    }
  }
}

function blobPoints(rng: Rng, x: number, y: number, rx: number, ry: number, n = 16, jit = 0.28): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + rng.float(-jit, jit);
    pts.push([x + Math.cos(a) * rx * k, y + Math.sin(a) * ry * k]);
  }
  return pts;
}

function drawSubconj(ctx: CanvasRenderingContext2D, g: EyeGeometry, _s: EyeState, rng: Rng): void {
  const { pxmm, ix, iy, irisR, nasal } = g;
  // flat, bright red, sharply demarcated sheet — typically temporal/inferotemporal,
  // stopping just short of the limbus. Built from overlapping soft lobes for an organic edge.
  const dir = (nasal > 0 ? Math.PI : 0) + rng.float(-0.25, 0.45);
  const d = irisR + pxmm * 5;
  const x0 = ix + Math.cos(dir) * d;
  const y0 = iy + Math.sin(dir) * d * 0.6;
  const lobes: [number, number, number][] = [];
  for (let i = 0; i < 34; i++) {
    const a = rng.float(0, TAU);
    const rr = Math.sqrt(rng.next());
    lobes.push([x0 + Math.cos(a) * rr * pxmm * 4.4, y0 + Math.sin(a) * rr * pxmm * 3.0, pxmm * rng.float(0.9, 1.9)]);
  }
  ctx.save();
  // keep a thin white rim at the limbus
  ctx.beginPath();
  ctx.rect(ix - pxmm * 30, iy - pxmm * 20, pxmm * 60, pxmm * 40);
  ctx.ellipse(ix, iy, irisR * g.foreX + pxmm * 0.9, irisR * g.foreY + pxmm * 0.9, 0, 0, TAU, true);
  ctx.clip('evenodd');
  ctx.filter = 'blur(' + (pxmm * 0.12).toFixed(1) + 'px)';
  ctx.fillStyle = 'rgba(214,40,46,0.55)';
  for (const [x, y, r] of lobes) {
    ctx.beginPath();
    ctx.arc(x, y, r * 1.12, 0, TAU);
    ctx.fill();
  }
  ctx.filter = 'none';
  ctx.fillStyle = '#c3121b';
  ctx.beginPath();
  for (const [x, y, r] of lobes) {
    ctx.moveTo(x + r, y);
    ctx.arc(x, y, r, 0, TAU);
  }
  ctx.fill();
  // mottled density: thicker pools and thinner, brighter spreading edges
  for (let i = 0; i < 10; i++) {
    const [x, y, r] = lobes[rng.int(0, lobes.length - 1)]!;
    const m = ctx.createRadialGradient(x, y, 0, x, y, r * 1.2);
    const dark = rng.chance(0.5);
    m.addColorStop(0, dark ? 'rgba(110,0,10,0.35)' : 'rgba(240,60,60,0.25)');
    m.addColorStop(1, dark ? 'rgba(110,0,10,0)' : 'rgba(240,60,60,0)');
    ctx.fillStyle = m;
    ctx.beginPath();
    ctx.arc(x, y, r * 1.2, 0, TAU);
    ctx.fill();
  }
  // a few conjunctival vessels still run OVER the blood (it lies beneath the conjunctiva)
  ctx.strokeStyle = 'rgba(150,10,20,0.6)';
  ctx.lineCap = 'round';
  for (let i = 0; i < 4; i++) {
    const [x, y] = lobes[rng.int(0, lobes.length - 1)]!;
    ctx.lineWidth = pxmm * rng.float(0.05, 0.09);
    ctx.beginPath();
    ctx.moveTo(x - pxmm * 2, y + rng.float(-1, 1) * pxmm);
    ctx.quadraticCurveTo(x, y + rng.float(-1, 1) * pxmm, x + pxmm * 2, y + rng.float(-1, 1) * pxmm);
    ctx.stroke();
  }
  // denser centre, slight sheen
  const gr = ctx.createRadialGradient(x0, y0, 0, x0, y0, pxmm * 5);
  gr.addColorStop(0, 'rgba(120,0,8,0.45)');
  gr.addColorStop(1, 'rgba(120,0,8,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.arc(x0, y0, pxmm * 5, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawPinguecula(ctx: CanvasRenderingContext2D, g: EyeGeometry, rng: Rng): void {
  const { pxmm, ix, iy, irisR, nasal } = g;
  const x = ix + nasal * (irisR + pxmm * 1.7);
  const y = iy + pxmm * 0.2;
  const pts = blobPoints(rng, x, y, pxmm * 1.4, pxmm * 0.95, 14, 0.18);
  ctx.save();
  ctx.beginPath();
  smoothClosedPath(ctx, pts);
  const gr = ctx.createRadialGradient(x - pxmm * 0.3, y - pxmm * 0.3, 0, x, y, pxmm * 1.6);
  gr.addColorStop(0, 'rgba(250,236,180,0.95)');
  gr.addColorStop(0.7, 'rgba(232,208,150,0.85)');
  gr.addColorStop(1, 'rgba(225,200,150,0.2)');
  ctx.fillStyle = gr;
  ctx.fill();
  // raised: tiny highlight
  ctx.fillStyle = 'rgba(255,255,255,0.55)';
  ctx.beginPath();
  ctx.ellipse(x - pxmm * 0.35, y - pxmm * 0.35, pxmm * 0.35, pxmm * 0.18, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function drawCaruncle(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState): void {
  const { pxmm, medialCanthus, nasal } = g;
  const x = medialCanthus[0] - nasal * pxmm * 1.2;
  const y = medialCanthus[1] - pxmm * 0.1;
  const gr = ctx.createRadialGradient(x, y, 0, x, y, pxmm * 2.6);
  const r = s.redness;
  gr.addColorStop(0, `rgba(${200 + r * 30},${110 - r * 40},${110 - r * 40},0.95)`);
  gr.addColorStop(0.6, 'rgba(210,130,125,0.7)');
  gr.addColorStop(1, 'rgba(210,130,125,0)');
  ctx.fillStyle = gr;
  ctx.beginPath();
  ctx.ellipse(x, y, pxmm * 2.4, pxmm * 2.0, 0, 0, TAU);
  ctx.fill();
  // plica semilunaris: a pale crescent fold lateral to the caruncle
  const pl = ctx.createLinearGradient(x - nasal * pxmm * 3.2, y, x - nasal * pxmm * 1.6, y);
  pl.addColorStop(0, 'rgba(225,165,155,0)');
  pl.addColorStop(1, 'rgba(225,165,155,0.45)');
  ctx.fillStyle = pl;
  ctx.beginPath();
  ctx.ellipse(x - nasal * pxmm * 2.0, y, pxmm * 0.9, pxmm * 2.4, 0, 0, TAU);
  ctx.fill();
  // wet glints
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  ctx.beginPath();
  ctx.arc(x - nasal * pxmm * 0.4, y - pxmm * 0.6, pxmm * 0.22, 0, TAU);
  ctx.fill();
}

function drawChemosis(ctx: CanvasRenderingContext2D, g: EyeGeometry, amount: number): void {
  const { pxmm, ix, iy, irisR } = g;
  const W = ctx.canvas.width;
  const H = ctx.canvas.height;
  // glassy, boggy conjunctiva: translucent yellow-pink veil, a moat at the limbus
  const gr = ctx.createRadialGradient(ix, iy, irisR * 1.08, ix, iy, pxmm * 15);
  gr.addColorStop(0, 'rgba(255,240,220,0)');
  gr.addColorStop(0.12, `rgba(250,232,200,${0.45 * amount})`);
  gr.addColorStop(1, `rgba(240,210,190,${0.55 * amount})`);
  ctx.fillStyle = gr;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = `rgba(255,255,255,${0.45 * amount})`;
  ctx.lineWidth = pxmm * 0.25;
  for (const off of [1.2, 3.5]) {
    ctx.beginPath();
    ctx.ellipse(ix, iy, irisR + pxmm * off, (irisR + pxmm * off) * 0.85, 0, Math.PI * 1.1, Math.PI * 1.9);
    ctx.stroke();
  }
}

/** Pterygium: nasal fibrovascular wedge crossing the limbus toward the pupil (drawn after the iris). */
export function drawPterygium(ctx: CanvasRenderingContext2D, g: EyeGeometry, seed: number): void {
  const { pxmm, ix, iy, irisR, nasal } = g;
  const rng = createRng(seed ^ 0x9e7);
  const apexX = ix + nasal * (irisR - pxmm * 2.2);
  const apexY = iy + pxmm * 0.1;
  const limbX = ix + nasal * irisR;
  const baseX = ix + nasal * (irisR + pxmm * 9);
  const body: [number, number][] = [
    [apexX - nasal * pxmm * 0.2, apexY],
    [apexX + nasal * pxmm * 0.6, apexY - pxmm * 0.85],
    [limbX + nasal * pxmm * 0.3, iy - pxmm * 1.6],
    [limbX + nasal * pxmm * 4, iy - pxmm * 2.6],
    [baseX, iy - pxmm * 3.4],
    [baseX, iy + pxmm * 3.6],
    [limbX + nasal * pxmm * 4, iy + pxmm * 2.8],
    [limbX + nasal * pxmm * 0.3, iy + pxmm * 1.7],
    [apexX + nasal * pxmm * 0.6, apexY + pxmm * 0.9],
  ];
  ctx.save();
  ctx.beginPath();
  smoothClosedPath(ctx, body);
  const gr = ctx.createLinearGradient(apexX, 0, baseX, 0);
  gr.addColorStop(0, 'rgba(238,222,214,0.92)');
  gr.addColorStop(0.3, 'rgba(236,196,186,0.88)');
  gr.addColorStop(1, 'rgba(222,150,140,0.7)');
  ctx.fillStyle = gr;
  ctx.shadowColor = 'rgba(120,40,40,0.25)';
  ctx.shadowBlur = pxmm * 0.5;
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.clip();
  // fleshy fibrovascular texture: wavy, roughly parallel vessels running in the
  // wing, converging as it tapers, ending at staggered points before the head
  ctx.lineCap = 'round';
  const halfW = (u: number) => pxmm * (3.3 - 2.6 * u); // u: 0 base → 1 head
  for (let i = 0; i < 30; i++) {
    const f = rng.float(-0.95, 0.95);
    const uEnd = rng.float(0.55, 0.97);
    const freq = rng.float(6, 14);
    const ph = rng.float(0, 6.28);
    const amp = pxmm * rng.float(0.08, 0.22);
    ctx.strokeStyle = `rgba(${rng.int(165, 200)},${rng.int(35, 70)},${rng.int(45, 70)},${rng.float(0.4, 0.8).toFixed(2)})`;
    const w0 = pxmm * rng.float(0.08, 0.17);
    let px = 0;
    let py = 0;
    const steps = 16;
    for (let j = 0; j <= steps; j++) {
      const u = (j / steps) * uEnd;
      const x = baseX + (apexX + nasal * pxmm * 0.8 - baseX) * u;
      const y = iy + f * halfW(u) + Math.sin(u * freq + ph) * amp * (1 - u * 0.6);
      if (j > 0) {
        ctx.lineWidth = Math.max(0.5, w0 * (1 - (j / steps) * 0.6));
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(x, y);
        ctx.stroke();
      }
      px = x;
      py = y;
    }
  }
  // whitish fibrous streaks
  ctx.strokeStyle = 'rgba(255,245,240,0.25)';
  ctx.lineWidth = pxmm * 0.25;
  for (let i = 0; i < 6; i++) {
    const y0 = iy + rng.float(-2, 2) * pxmm;
    ctx.beginPath();
    ctx.moveTo(baseX, y0);
    ctx.quadraticCurveTo(limbX + nasal * pxmm * 2, y0 * 0.5 + apexY * 0.5, apexX + nasal * pxmm * 1.2, apexY + (y0 - iy) * 0.2);
    ctx.stroke();
  }
  ctx.restore();
  // greyish avascular cap ahead of the head, with Fuchs islets
  const cap = ctx.createRadialGradient(apexX, apexY, 0, apexX, apexY, pxmm * 1.1);
  cap.addColorStop(0, 'rgba(225,230,235,0.6)');
  cap.addColorStop(1, 'rgba(225,230,235,0)');
  ctx.fillStyle = cap;
  ctx.beginPath();
  ctx.arc(apexX, apexY, pxmm * 1.1, 0, TAU);
  ctx.fill();
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = 'rgba(240,240,240,0.6)';
    ctx.beginPath();
    ctx.arc(apexX - nasal * pxmm * rng.float(0.3, 0.9), apexY + rng.float(-0.6, 0.6) * pxmm, pxmm * 0.09, 0, TAU);
    ctx.fill();
  }
  // Stocker line (iron) just ahead of the head
  ctx.strokeStyle = 'rgba(160,115,60,0.4)';
  ctx.lineWidth = pxmm * 0.08;
  ctx.beginPath();
  ctx.arc(apexX + nasal * pxmm * 0.9, apexY, pxmm * 1.4, nasal > 0 ? Math.PI * 0.7 : -Math.PI * 0.3, nasal > 0 ? Math.PI * 1.3 : Math.PI * 0.3);
  ctx.stroke();
}
