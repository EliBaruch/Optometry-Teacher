/**
 * Everything on or behind the cornea, drawn in the cornea's local frame
 * (origin = corneal centre, units = px, already foreshortened by the caller):
 * lens opacities seen through the pupil, AC levels (hypopyon / hyphema),
 * corneal opacities, and fluorescein staining under cobalt blue.
 */
import { createRng } from '@core';
import { rgba, smoothClosedPath } from './color';
import { dendriteBranches, kpDots, lesionSpot, stainGeometry, type Pt } from './features';
import { pupilPath } from './iris';
import type { EyeState } from './types';

const TAU = Math.PI * 2;

/** Lens findings visible through the pupil. */
export function drawLensInPupil(ctx: CanvasRenderingContext2D, s: EyeState, pxmm: number, pupilR: number, bright: number): void {
  if (s.lensType === 'none' && !s.iol) return;
  const o = Math.max(0, Math.min(1, s.lensOpacity));
  ctx.save();
  ctx.beginPath();
  pupilPath(ctx, 0, 0, pupilR, s.pupilShape ?? 'round', s.irisSeed);
  ctx.clip();
  const rng = createRng(s.irisSeed ^ 0x1e45);
  if (s.lensType === 'nuclear') {
    // yellow-brown brunescent nucleus glowing in the pupil
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, pupilR * 1.05);
    gr.addColorStop(0, rgba([196, 150, 70], (0.35 + o * 0.5) * bright));
    gr.addColorStop(0.6, rgba([160, 110, 50], (0.25 + o * 0.45) * bright));
    gr.addColorStop(1, rgba([90, 60, 30], 0.2 * o * bright));
    ctx.fillStyle = gr;
    ctx.fillRect(-pupilR, -pupilR, pupilR * 2, pupilR * 2);
  } else if (s.lensType === 'cortical') {
    // cuneiform spokes pointing to the centre from the periphery
    const n = 7 + Math.round(o * 8);
    for (let i = 0; i < n; i++) {
      const a = rng.float(0, TAU);
      const len = 5.8 * pxmm * rng.float(0.35, 0.6 + o * 0.25);
      const w = rng.float(0.08, 0.22);
      const R = 5 * pxmm;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - w) * R, Math.sin(a - w) * R);
      ctx.lineTo(Math.cos(a) * (R - len), Math.sin(a) * (R - len));
      ctx.lineTo(Math.cos(a + w) * R, Math.sin(a + w) * R);
      ctx.closePath();
      const gr = ctx.createRadialGradient(0, 0, R - len, 0, 0, R);
      gr.addColorStop(0, rgba([230, 230, 225], 0));
      gr.addColorStop(0.5, rgba([235, 235, 230], (0.35 + o * 0.45) * bright));
      gr.addColorStop(1, rgba([245, 245, 240], (0.5 + o * 0.4) * bright));
      ctx.fillStyle = gr;
      ctx.fill();
    }
    // background greyish cortex
    ctx.fillStyle = rgba([180, 180, 175], 0.08 * o * bright);
    ctx.fillRect(-pupilR, -pupilR, pupilR * 2, pupilR * 2);
  } else if (s.lensType === 'psc') {
    // central granular plaque at the posterior pole
    const r = pxmm * (0.9 + o * 0.9);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    gr.addColorStop(0, rgba([215, 210, 190], (0.35 + o * 0.4) * bright));
    gr.addColorStop(1, rgba([215, 210, 190], 0));
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 40; i++) {
      const a = rng.float(0, TAU);
      const d = Math.sqrt(rng.next()) * r * 0.9;
      ctx.fillStyle = rgba([240, 236, 220], rng.float(0.3, 0.8) * bright);
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, pxmm * rng.float(0.03, 0.08), 0, TAU);
      ctx.fill();
    }
  }
  if (s.iol) {
    ctx.strokeStyle = rgba([200, 220, 255], 0.35 * bright);
    ctx.lineWidth = Math.max(1, pxmm * 0.06);
    ctx.beginPath();
    ctx.arc(pxmm * 0.15, 0, pxmm * 3, 0, TAU);
    ctx.stroke();
  }
  ctx.restore();
}

/** Opacities and findings on the cornea + AC, white light. */
export function drawCornealFindings(ctx: CanvasRenderingContext2D, s: EyeState, pxmm: number, R: number): void {
  // AC levels settle by gravity — draw first (they are behind the cornea)
  const level = (frac: number, top: string, bottom: string, meniscus: string) => {
    const h = Math.min(0.95, frac) * R * 2;
    ctx.save();
    ctx.beginPath();
    ctx.arc(0, 0, R * 0.985, 0, TAU);
    ctx.clip();
    const y0 = R - h;
    const gr = ctx.createLinearGradient(0, y0, 0, R);
    gr.addColorStop(0, top);
    gr.addColorStop(1, bottom);
    ctx.fillStyle = gr;
    ctx.fillRect(-R, y0, R * 2, h + 2);
    ctx.strokeStyle = meniscus;
    ctx.lineWidth = Math.max(1, pxmm * 0.12);
    ctx.beginPath();
    ctx.moveTo(-R, y0);
    ctx.lineTo(R, y0);
    ctx.stroke();
    ctx.restore();
  };
  if ((s.hyphema ?? 0) > 0) level(s.hyphema!, 'rgba(150,10,18,0.92)', 'rgba(95,5,10,0.98)', 'rgba(200,40,40,0.85)');
  if ((s.hypopyon ?? 0) > 0) level(s.hypopyon!, 'rgba(245,238,215,0.9)', 'rgba(235,225,195,0.96)', 'rgba(255,255,245,0.95)');

  if (s.arcus) {
    const gr = ctx.createRadialGradient(0, 0, R * 0.8, 0, 0, R);
    gr.addColorStop(0, 'rgba(230,230,235,0)');
    gr.addColorStop(0.55, 'rgba(230,232,238,0.55)');
    gr.addColorStop(0.85, 'rgba(230,232,238,0.5)');
    gr.addColorStop(0.93, 'rgba(230,232,238,0)'); // lucid interval
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
  }

  if (s.keraticPrecipitates) {
    for (const d of kpDots(s.irisSeed)) {
      const gr = ctx.createRadialGradient(d.x * pxmm, d.y * pxmm, 0, d.x * pxmm, d.y * pxmm, d.r * pxmm * 1.5);
      gr.addColorStop(0, 'rgba(250,248,240,0.9)');
      gr.addColorStop(0.6, 'rgba(235,230,220,0.6)');
      gr.addColorStop(1, 'rgba(235,230,220,0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(d.x * pxmm, d.y * pxmm, d.r * pxmm * 1.5, 0, TAU);
      ctx.fill();
    }
  }

  if (s.ulcer && s.ulcer !== 'none') {
    const sp = lesionSpot(s.irisSeed, s.ulcer);
    const x = sp.x * pxmm;
    const y = sp.y * pxmm;
    const r = sp.r * pxmm;
    // surrounding stromal haze/oedema
    const halo = ctx.createRadialGradient(x, y, r * 0.5, x, y, r * 2.6);
    halo.addColorStop(0, 'rgba(225,228,232,0.5)');
    halo.addColorStop(1, 'rgba(225,228,232,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, TAU);
    ctx.fill();
    const core = ctx.createRadialGradient(x, y, 0, x, y, r);
    core.addColorStop(0, s.ulcer === 'ulcer' ? 'rgba(252,250,240,0.98)' : 'rgba(245,245,240,0.85)');
    core.addColorStop(0.75, 'rgba(240,238,228,0.8)');
    core.addColorStop(1, 'rgba(240,238,228,0)');
    ctx.fillStyle = core;
    const rng = createRng(s.irisSeed ^ 0x77);
    const pts: Pt[] = [];
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU;
      const k = 1 + rng.float(-0.15, 0.15);
      pts.push([x + Math.cos(a) * r * k, y + Math.sin(a) * r * k]);
    }
    ctx.beginPath();
    smoothClosedPath(ctx, pts);
    ctx.fill();
    if (s.ulcer === 'ulcer') {
      // excavated crater rim catches light
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = Math.max(1, pxmm * 0.08);
      ctx.beginPath();
      ctx.arc(x, y, r * 0.65, Math.PI * 1.1, Math.PI * 1.8);
      ctx.stroke();
    }
  }

  if (s.dendrite) {
    // in white light: faint grey-white raised epithelial line
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const b of dendriteBranches(s.irisSeed)) {
      ctx.strokeStyle = 'rgba(225,230,235,0.5)';
      ctx.lineWidth = pxmm * 0.2;
      strokePts(ctx, b.pts, pxmm);
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = pxmm * 0.07;
      strokePts(ctx, b.pts, pxmm);
      const e = b.pts[b.pts.length - 1]!;
      ctx.fillStyle = 'rgba(235,240,245,0.55)';
      ctx.beginPath();
      ctx.arc(e[0] * pxmm, e[1] * pxmm, pxmm * 0.17, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }

  if (s.abrasion) {
    // white light: irregular edge of the epithelial defect catches the light
    const geo = stainGeometry('linear-abrasion', s.irisSeed);
    for (const b of geo.blobs) {
      ctx.strokeStyle = 'rgba(255,255,255,0.28)';
      ctx.lineWidth = Math.max(0.7, pxmm * 0.05);
      ctx.beginPath();
      smoothClosedPath(ctx, b.pts.map(([x, y]) => [x * pxmm, y * pxmm] as Pt));
      ctx.stroke();
    }
  }

  if (s.foreignBody) {
    const sp = lesionSpot(s.irisSeed, 'fb');
    const x = sp.x * pxmm;
    const y = sp.y * pxmm;
    const rr = pxmm * (s.rustRing ? 0.75 : 0.45);
    const ring = ctx.createRadialGradient(x, y, 0, x, y, rr);
    ring.addColorStop(0, 'rgba(120,60,20,0.9)');
    ring.addColorStop(0.55, s.rustRing ? 'rgba(178,96,34,0.85)' : 'rgba(170,90,30,0.5)');
    ring.addColorStop(1, 'rgba(170,90,30,0)');
    ctx.fillStyle = ring;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, TAU);
    ctx.fill();
    // faint grey infiltrate halo of the reactive stroma
    const halo = ctx.createRadialGradient(x, y, rr * 0.8, x, y, rr * 2.2);
    halo.addColorStop(0, 'rgba(230,232,235,0.25)');
    halo.addColorStop(1, 'rgba(230,232,235,0)');
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(x, y, rr * 2.2, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#1c130e';
    ctx.beginPath();
    ctx.arc(x, y, Math.max(1.2, pxmm * 0.18), 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(x - pxmm * 0.06, y - pxmm * 0.06, Math.max(0.5, pxmm * 0.05), 0, TAU);
    ctx.fill();
  }

  if (s.cornealHaze > 0) {
    // stromal / epithelial oedema: ground-glass veil, maximal centrally
    const hz = Math.min(1, s.cornealHaze);
    const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
    gr.addColorStop(0, `rgba(205,215,222,${0.55 * hz})`);
    gr.addColorStop(0.8, `rgba(200,210,220,${0.42 * hz})`);
    gr.addColorStop(1, `rgba(200,210,220,${0.15 * hz})`);
    ctx.fillStyle = gr;
    ctx.beginPath();
    ctx.arc(0, 0, R, 0, TAU);
    ctx.fill();
    // microcystic texture
    const rng = createRng(s.irisSeed ^ 0xed);
    for (let i = 0; i < 160 * hz; i++) {
      const a = rng.float(0, TAU);
      const d = Math.sqrt(rng.next()) * R * 0.95;
      ctx.fillStyle = `rgba(255,255,255,${rng.float(0.08, 0.25) * hz})`;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * d, Math.sin(a) * d, pxmm * rng.float(0.04, 0.1), 0, TAU);
      ctx.fill();
    }
  }
}

function strokePts(ctx: CanvasRenderingContext2D, pts: Pt[], k: number): void {
  ctx.beginPath();
  pts.forEach(([x, y], i) => (i ? ctx.lineTo(x * k, y * k) : ctx.moveTo(x * k, y * k)));
  ctx.stroke();
}

/** Fluorescein: luminous green under cobalt blue (call only when lighting === 'cobalt'). */
export function drawStain(ctx: CanvasRenderingContext2D, s: EyeState, pxmm: number, R: number, t: number): void {
  const green = '#9dff5c';
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.02, 0, TAU);
  ctx.clip();
  ctx.globalCompositeOperation = 'lighter';
  // faint fluorescent precorneal tear film (thins & shimmers)
  const tf = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
  tf.addColorStop(0, `rgba(80,190,70,${0.1 + 0.02 * Math.sin(t * 1.3)})`);
  tf.addColorStop(1, 'rgba(80,190,70,0.16)');
  ctx.fillStyle = tf;
  ctx.fillRect(-R, -R, R * 2, R * 2);

  const patterns = new Set([s.stain]);
  if (s.dendrite && s.stain === 'none') patterns.add('dendritic');
  if (s.abrasion && s.stain === 'none') patterns.add('linear-abrasion');
  if (s.ulcer === 'ulcer' && s.stain === 'none') patterns.add('round-ulcer');
  if (s.punctateKeratitis && s.stain === 'none') patterns.add('diffuse-punctate');
  if (s.foreignBody && s.stain === 'none') patterns.add('focal');
  for (const p of patterns) {
    const geo = stainGeometry(p, s.irisSeed);
    ctx.shadowColor = 'rgba(140,255,90,0.95)';
    ctx.shadowBlur = pxmm * 0.5;
    for (const d of geo.dots) {
      ctx.fillStyle = 'rgba(160,255,110,0.95)';
      ctx.beginPath();
      ctx.arc(d.x * pxmm, d.y * pxmm, Math.max(0.8, d.r * pxmm), 0, TAU);
      ctx.fill();
    }
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    for (const l of geo.lines) {
      ctx.strokeStyle = green;
      ctx.lineWidth = Math.max(1, l.width * pxmm);
      strokePts(ctx, l.pts, pxmm);
    }
    if (p === 'dendritic') {
      for (const b of dendriteBranches(s.irisSeed)) {
        const e = b.pts[b.pts.length - 1]!;
        ctx.fillStyle = green;
        ctx.beginPath();
        ctx.arc(e[0] * pxmm, e[1] * pxmm, pxmm * 0.22, 0, TAU);
        ctx.fill();
      }
    }
    for (const b of geo.blobs) {
      const pts = b.pts.map(([x, y]) => [x * pxmm, y * pxmm] as Pt);
      ctx.beginPath();
      smoothClosedPath(ctx, pts);
      ctx.fillStyle = b.soft > 0.3 ? 'rgba(150,255,100,0.75)' : 'rgba(165,255,110,0.9)';
      ctx.fill();
      if (b.soft > 0.3) {
        // ulcer: stain pools in the crater + diffuses into surrounding stroma
        const c = pts.reduce((a, p) => [a[0] + p[0] / pts.length, a[1] + p[1] / pts.length], [0, 0]);
        const gr = ctx.createRadialGradient(c[0], c[1], 0, c[0], c[1], pxmm * 2.4);
        gr.addColorStop(0, 'rgba(120,255,80,0.35)');
        gr.addColorStop(1, 'rgba(120,255,80,0)');
        ctx.fillStyle = gr;
        ctx.beginPath();
        ctx.arc(c[0], c[1], pxmm * 2.4, 0, TAU);
        ctx.fill();
      }
    }
  }
  if (s.foreignBody) {
    // the embedded particle itself does not fluoresce: a dark speck inside the green ring
    const sp = lesionSpot(s.irisSeed, 'fb');
    ctx.globalCompositeOperation = 'source-over';
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#120c08';
    ctx.beginPath();
    ctx.arc(sp.x * pxmm, sp.y * pxmm, Math.max(1.2, pxmm * 0.18), 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
