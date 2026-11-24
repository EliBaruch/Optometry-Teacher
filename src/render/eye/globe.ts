/**
 * Sclera + bulbar conjunctiva: wet porcelain sclera with lid shadow, fine
 * tortuous conjunctival vessels, injection patterns, subconjunctival
 * haemorrhage, chemosis, pinguecula and the caruncle.
 * Everything here is drawn inside the palpebral fissure clip.
 */
import { createRng, type Rng } from '@core';
import { rgba, smoothClosedPath, type RGB } from './color';
import type { EyeGeometry } from './geometry';
import type { EyeState } from './types';

const TAU = Math.PI * 2;

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

/** Conjunctival vessels: from the fornices/canthi toward the limbus, tortuous, branching. */
function drawConjVessels(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState, rng: Rng): void {
  const { pxmm, ix, iy, irisR } = g;
  const red = s.redness;
  const diffuse = s.rednessPattern === 'diffuse' ? red : red * 0.35;
  const n = Math.round(22 + diffuse * 60);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < n; i++) {
    // start angle biased to the exposed nasal & temporal sclera
    const side = rng.chance(0.5) ? 0 : Math.PI;
    const a = side + rng.float(-0.95, 0.95);
    let r = pxmm * rng.float(13, 16.5);
    let ang = a;
    let x = ix + Math.cos(ang) * r;
    let y = iy + Math.sin(ang) * r * 0.6;
    const stopR = irisR * rng.float(1.05, 1.55);
    const pts: [number, number][] = [[x, y]];
    while (r > stopR) {
      r -= pxmm * rng.float(0.5, 1.0);
      ang += rng.float(-0.12, 0.12);
      x = ix + Math.cos(ang) * r + rng.float(-0.3, 0.3) * pxmm;
      y = iy + Math.sin(ang) * r * (0.55 + 0.45 * (1 - r / (pxmm * 16))) + rng.float(-0.3, 0.3) * pxmm;
      pts.push([x, y]);
    }
    const thick = rng.float(0.05, 0.16) * pxmm * (1 + diffuse * 1.4);
    const alpha = rng.float(0.25, 0.55) * (0.45 + diffuse * 1.1);
    const col: RGB = rng.chance(0.3) ? [150, 40, 50] : [196, 52, 52];
    ctx.strokeStyle = rgba(col, Math.min(0.9, alpha));
    ctx.lineWidth = thick;
    ctx.beginPath();
    ctx.moveTo(pts[0]![0], pts[0]![1]);
    for (let j = 1; j < pts.length - 1; j++) {
      const mx = (pts[j]![0] + pts[j + 1]![0]) / 2;
      const my = (pts[j]![1] + pts[j + 1]![1]) / 2;
      ctx.quadraticCurveTo(pts[j]![0], pts[j]![1], mx, my);
    }
    ctx.stroke();
    // twigs
    if (pts.length > 4) {
      ctx.lineWidth = thick * 0.55;
      for (let k = 0; k < 2; k++) {
        const p = pts[rng.int(1, pts.length - 2)]!;
        const ta = rng.float(0, TAU);
        ctx.beginPath();
        ctx.moveTo(p[0], p[1]);
        ctx.quadraticCurveTo(p[0] + Math.cos(ta) * pxmm * 0.8, p[1] + Math.sin(ta) * pxmm * 0.8, p[0] + Math.cos(ta + 0.5) * pxmm * 1.6, p[1] + Math.sin(ta + 0.5) * pxmm * 1.4);
        ctx.stroke();
      }
    }
  }
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
    ctx.strokeStyle = `rgba(120,20,60,${0.45 * red})`;
    ctx.lineWidth = Math.max(0.6, pxmm * 0.06);
    for (let i = 0; i < 120; i++) {
      const a = (i / 120) * TAU + Math.sin(i * 7.3) * 0.02;
      const r0 = irisR * 1.0;
      const r1 = irisR + pxmm * (1.2 + Math.abs(Math.sin(i * 3.1)) * 1.6);
      ctx.beginPath();
      ctx.moveTo(ix + Math.cos(a) * r0, iy + Math.sin(a) * r0);
      ctx.lineTo(ix + Math.cos(a) * r1, iy + Math.sin(a) * r1);
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
  // typically temporal / inferotemporal, flat, sharply demarcated, spares the limbus
  const dir = (nasal > 0 ? Math.PI : 0) + rng.float(-0.4, 0.5);
  const d = irisR + pxmm * 4.6;
  const x = ix + Math.cos(dir) * d;
  const y = iy + Math.sin(dir) * d * 0.55;
  const pts = blobPoints(rng, x, y, pxmm * 5.2, pxmm * 3.6, 18, 0.3);
  ctx.save();
  ctx.beginPath();
  smoothClosedPath(ctx, pts);
  const gr = ctx.createRadialGradient(x, y, 0, x, y, pxmm * 6);
  gr.addColorStop(0, '#b50d18');
  gr.addColorStop(0.7, '#c8141c');
  gr.addColorStop(1, '#d8323a');
  ctx.fillStyle = gr;
  ctx.shadowColor = 'rgba(200,20,30,0.6)';
  ctx.shadowBlur = pxmm * 0.6;
  ctx.fill();
  ctx.restore();
  // feathered edge spots
  for (let i = 0; i < 10; i++) {
    const a = rng.float(0, TAU);
    ctx.fillStyle = 'rgba(200,25,35,0.55)';
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * pxmm * 5.6, y + Math.sin(a) * pxmm * 3.9, pxmm * rng.float(0.2, 0.6), 0, TAU);
    ctx.fill();
  }
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
  const x = medialCanthus[0] - nasal * pxmm * 1.6;
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
  ctx.strokeStyle = 'rgba(225,160,150,0.55)';
  ctx.lineWidth = pxmm * 0.35;
  ctx.beginPath();
  ctx.ellipse(x - nasal * pxmm * 1.9, y, pxmm * 0.8, pxmm * 2.2, 0, nasal > 0 ? Math.PI * 0.6 : -Math.PI * 0.4, nasal > 0 ? Math.PI * 1.4 : Math.PI * 0.4);
  ctx.stroke();
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
  const apexX = ix + nasal * (irisR - pxmm * 2.3);
  const apexY = iy + pxmm * 0.15;
  const baseX = ix + nasal * (irisR + pxmm * 8.5);
  const pts: [number, number][] = [
    [apexX, apexY - pxmm * 0.55],
    [ix + nasal * (irisR + pxmm * 0.2), iy - pxmm * 1.3],
    [baseX, iy - pxmm * 2.8],
    [baseX, iy + pxmm * 3.1],
    [ix + nasal * (irisR + pxmm * 0.2), iy + pxmm * 1.4],
    [apexX, apexY + pxmm * 0.6],
  ];
  ctx.save();
  ctx.beginPath();
  smoothClosedPath(ctx, pts);
  const gr = ctx.createLinearGradient(apexX, 0, baseX, 0);
  gr.addColorStop(0, 'rgba(235,215,205,0.88)');
  gr.addColorStop(0.25, 'rgba(230,180,170,0.82)');
  gr.addColorStop(1, 'rgba(215,120,115,0.55)');
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.clip();
  // radial vessels running toward the head
  ctx.lineCap = 'round';
  for (let i = 0; i < 16; i++) {
    const y0 = iy + rng.float(-2.6, 2.8) * pxmm;
    ctx.strokeStyle = `rgba(185,40,45,${rng.float(0.45, 0.8)})`;
    ctx.lineWidth = pxmm * rng.float(0.07, 0.16);
    ctx.beginPath();
    ctx.moveTo(baseX, y0);
    ctx.bezierCurveTo(baseX - nasal * pxmm * 3, y0 + rng.float(-0.4, 0.4) * pxmm, apexX + nasal * pxmm * 3, apexY + (y0 - iy) * 0.3, apexX + nasal * pxmm * rng.float(0.4, 1.4), apexY + (y0 - iy) * 0.15);
    ctx.stroke();
  }
  ctx.restore();
  // grey avascular cap ahead of the head (+ iron line hint)
  ctx.fillStyle = 'rgba(220,225,230,0.45)';
  ctx.beginPath();
  ctx.ellipse(apexX - nasal * pxmm * 0.35, apexY, pxmm * 0.55, pxmm * 0.9, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,110,60,0.35)';
  ctx.lineWidth = pxmm * 0.08;
  ctx.beginPath();
  ctx.arc(apexX + nasal * pxmm * 0.1, apexY, pxmm * 1.1, nasal > 0 ? Math.PI * 0.65 : -Math.PI * 0.35, nasal > 0 ? Math.PI * 1.35 : Math.PI * 0.35);
  ctx.stroke();
}
