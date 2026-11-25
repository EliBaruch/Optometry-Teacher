/**
 * drawEye — the clinical close-up of one eye. Layers, back to front:
 * skin → (fissure clip: sclera & conjunctiva → iris/pupil/lens → cornea & AC
 * findings → lid shadows, tear meniscus) → lid margins & lashes → lighting →
 * fluorescein (cobalt) → corneal reflections (window / penlight / Hirschberg).
 */
import { grainPattern } from './color';
import { drawCornealFindings, drawLensInPupil, drawStain } from './cornea';
import { eyeGeometry, type EyeGeometry } from './geometry';
import { drawPterygium, drawSclera } from './globe';
import { drawIrisTexture, paintIris } from './iris';
import { drawLidMargins, drawLidShadows, drawSkin, drawStringyMucus, fillAll, fissurePath } from './lids';
import { drawSlitBeam, type SlitBeam } from './slit';
import type { EyeState } from './types';

const TAU = Math.PI * 2;

const LENS_BRIGHTNESS: Record<EyeState['lighting'], number> = { room: 0.75, penlight: 1.15, slit: 0.5, cobalt: 0.35, dim: 0.45 };

function drawIrisLayer(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState): void {
  const R = g.irisR;
  ctx.save();
  ctx.translate(g.ix, g.iy);
  ctx.scale(g.foreX, g.foreY);
  const opts = {
    color: s.irisColor, seed: s.irisSeed, pupilShape: s.pupilShape ?? 'round',
    rubeosis: s.irisNeovascularization, nevus: s.irisNevus,
  } as const;
  const haze = Math.min(1, s.cornealHaze);
  if ('filter' in ctx && haze > 0.15) ctx.filter = `blur(${(haze * R * 0.018).toFixed(2)}px)`;
  if (!drawIrisTexture(ctx, 0, 0, R, g.pupilR, opts)) paintIris(ctx, 0, 0, R, g.pupilR, opts);
  if ('filter' in ctx) ctx.filter = 'none';

  drawLensInPupil(ctx, s, g.pxmm, g.pupilR, LENS_BRIGHTNESS[s.lighting]);

  // limbus: translucent grey-blue corneoscleral transition
  const lim = ctx.createRadialGradient(0, 0, R * 0.93, 0, 0, R * 1.09);
  lim.addColorStop(0, 'rgba(40,40,60,0)');
  lim.addColorStop(0.45, 'rgba(30,30,45,0.35)');
  lim.addColorStop(0.7, 'rgba(180,185,200,0.35)');
  lim.addColorStop(1, 'rgba(220,220,230,0)');
  ctx.fillStyle = lim;
  ctx.beginPath();
  ctx.arc(0, 0, R * 1.1, 0, TAU);
  ctx.fill();

  drawCornealFindings(ctx, s, g.pxmm, R);

  // corneal dome: a faint lit hemisphere (light from the upper-left)
  const dome = ctx.createRadialGradient(-R * 0.35, -R * 0.4, R * 0.1, 0, 0, R * 1.02);
  dome.addColorStop(0, 'rgba(255,255,255,0.10)');
  dome.addColorStop(0.6, 'rgba(255,255,255,0.03)');
  dome.addColorStop(1, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = dome;
  ctx.beginPath();
  ctx.arc(0, 0, R, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function applyLighting(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState): void {
  const { ix, iy, pxmm, cx, cy } = g;
  ctx.save();
  switch (s.lighting) {
    case 'room': {
      const v = ctx.createRadialGradient(cx - pxmm * 3, cy - pxmm * 3, pxmm * 6, cx, cy, pxmm * 22);
      v.addColorStop(0, 'rgba(0,0,0,0)');
      v.addColorStop(1, 'rgba(14,8,24,0.45)');
      ctx.fillStyle = v;
      fillAll(ctx, g);
      break;
    }
    case 'penlight': {
      ctx.globalCompositeOperation = 'multiply';
      const v = ctx.createRadialGradient(ix, iy, pxmm * 3, ix, iy, pxmm * 15);
      v.addColorStop(0, 'rgb(255,250,240)');
      v.addColorStop(0.55, 'rgb(150,130,130)');
      v.addColorStop(1, 'rgb(40,30,45)');
      ctx.fillStyle = v;
      fillAll(ctx, g);
      ctx.globalCompositeOperation = 'screen';
      const w = ctx.createRadialGradient(ix, iy, 0, ix, iy, pxmm * 8);
      w.addColorStop(0, 'rgba(255,235,200,0.12)');
      w.addColorStop(1, 'rgba(255,235,200,0)');
      ctx.fillStyle = w;
      fillAll(ctx, g);
      break;
    }
    case 'dim': {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(88,80,100)';
      fillAll(ctx, g);
      break;
    }
    case 'slit': {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(46,40,52)';
      fillAll(ctx, g);
      break;
    }
    case 'cobalt': {
      ctx.globalCompositeOperation = 'multiply';
      ctx.fillStyle = 'rgb(60,80,215)';
      fillAll(ctx, g);
      ctx.globalCompositeOperation = 'source-over';
      const v = ctx.createRadialGradient(ix, iy, pxmm * 4, ix, iy, pxmm * 18);
      v.addColorStop(0, 'rgba(10,14,60,0.1)');
      v.addColorStop(1, 'rgba(6,8,40,0.7)');
      ctx.fillStyle = v;
      fillAll(ctx, g);
      break;
    }
  }
  ctx.restore();
}

function drawReflections(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState, t: number): void {
  const { pxmm, ix, iy, irisR } = g;
  if (s.lidAperture < 0.12) return;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(ix, iy, irisR * g.foreX * 1.02, irisR * g.foreY * 1.02, 0, 0, TAU);
  ctx.clip();
  const shimmer = Math.sin(t * 1.9) * 0.04 * pxmm;
  if (s.lighting === 'room' || s.lighting === 'dim') {
    // a four-pane window reflected on the wet cornea, bowed by the dome
    const base = g.reflex ?? { x: ix, y: iy };
    const wx = base.x - pxmm * 1.7 + shimmer;
    const wy = base.y - pxmm * 1.9;
    const a = s.lighting === 'dim' ? 0.35 : 0.85;
    ctx.save();
    ctx.translate(wx, wy);
    ctx.transform(1, 0.06, -0.1, 1, 0, 0);
    const W = pxmm * 1.55;
    const H = pxmm * 1.25;
    const gap = Math.max(0.7, pxmm * 0.09);
    ctx.shadowColor = `rgba(255,255,255,${a * 0.6})`;
    ctx.shadowBlur = pxmm * 0.35;
    ctx.fillStyle = `rgba(255,255,255,${a})`;
    for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const x = -W / 2 + qx * (W / 2 + gap / 2);
      const y = -H / 2 + qy * (H / 2 + gap / 2);
      ctx.beginPath();
      ctx.roundRect?.(x, y, W / 2 - gap / 2, H / 2 - gap / 2, pxmm * 0.08);
      if (!ctx.roundRect) ctx.rect(x, y, W / 2 - gap / 2, H / 2 - gap / 2);
      ctx.fill();
    }
    ctx.restore();
    // secondary soft highlight lower-right (fill light)
    const f = ctx.createRadialGradient(ix + pxmm * 2.2, iy + pxmm * 2.6, 0, ix + pxmm * 2.2, iy + pxmm * 2.6, pxmm * 1.4);
    f.addColorStop(0, `rgba(255,255,255,${0.16 * a})`);
    f.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = f;
    ctx.fillRect(ix, iy, pxmm * 5, pxmm * 5);
  }
  ctx.restore();

  // Hirschberg reflex (penlight / dim / cobalt) — a crisp catch-light
  if (g.reflex && s.lighting !== 'room' && s.lighting !== 'slit') {
    const { x, y } = g.reflex;
    const col = s.lighting === 'cobalt' ? '170,190,255' : '255,255,255';
    const glow = ctx.createRadialGradient(x, y, 0, x, y, pxmm * 1.1);
    glow.addColorStop(0, `rgba(${col},0.9)`);
    glow.addColorStop(0.25, `rgba(${col},0.35)`);
    glow.addColorStop(1, `rgba(${col},0)`);
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, pxmm * 1.1, 0, TAU);
    ctx.fill();
    ctx.fillStyle = `rgba(${col},1)`;
    ctx.beginPath();
    ctx.arc(x + shimmer * 0.3, y, Math.max(1.5, pxmm * 0.22), 0, TAU);
    ctx.fill();
  }
}

function drawScene(ctx: CanvasRenderingContext2D, g: EyeGeometry, s: EyeState, t: number): void {
  drawSkin(ctx, g, s);
  ctx.save();
  ctx.beginPath();
  fissurePath(ctx, g);
  ctx.clip();
  drawSclera(ctx, g, s);
  drawIrisLayer(ctx, g, s);
  if (s.pterygium) drawPterygium(ctx, g, s.irisSeed);
  if (s.discharge === 'stringy') drawStringyMucus(ctx, g);
  drawLidShadows(ctx, g, s, t);
  ctx.restore();
  drawLidMargins(ctx, g, s);
}

/**
 * Paint a clinically faithful eye close-up filling (0,0,w,h).
 * `t` (seconds) drives tear-film shimmer and AC cell drift in slit views.
 */
export function drawEye(ctx: CanvasRenderingContext2D, w: number, h: number, s: EyeState, t = 0): void {
  const g = eyeGeometry(w, h, s);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  drawScene(ctx, g, s, t);
  applyLighting(ctx, g, s);
  if (s.lighting === 'slit') {
    ctx.save();
    ctx.beginPath();
    fissurePath(ctx, g);
    ctx.clip();
    drawSlitBeam(ctx, g, s, { x: -0.25 * g.nasal, width: 1.2, angleDeg: 40 * g.nasal }, t);
    ctx.restore();
  }
  if (s.lighting === 'cobalt') {
    ctx.save();
    ctx.beginPath();
    fissurePath(ctx, g);
    ctx.clip();
    ctx.translate(g.ix, g.iy);
    ctx.scale(g.foreX, g.foreY);
    drawStain(ctx, s, g.pxmm, g.irisR, t);
    ctx.restore();
    // fluorescent tear meniscus on the lower lid
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.beginPath();
    fissurePath(ctx, g);
    ctx.clip();
    ctx.strokeStyle = 'rgba(120,255,80,0.28)';
    ctx.lineWidth = g.pxmm * 0.35;
    ctx.beginPath();
    const lo = g.lower.slice(5, -5);
    lo.forEach(([x, y], i) => (i ? ctx.lineTo(x, y - g.pxmm * 0.12) : ctx.moveTo(x, y - g.pxmm * 0.12)));
    ctx.stroke();
    ctx.restore();
  }
  ctx.save();
  ctx.beginPath();
  fissurePath(ctx, g);
  ctx.clip();
  drawReflections(ctx, g, s, t);
  ctx.restore();
  const grain = grainPattern(ctx, 0.05);
  if (grain) {
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h);
    ctx.restore();
  }
  ctx.restore();
}

/**
 * Slit-lamp optical section: the eye under dark-room slit illumination with the
 * given beam (see SlitBeam). Use beam.x ≈ ±0.95, width 0.15, angle 60 for a
 * Van Herick estimate; a central 0.2 mm conical/1 mm beam for cells & flare.
 */
export function drawSlitSection(ctx: CanvasRenderingContext2D, w: number, h: number, s: EyeState, beam: SlitBeam, t = 0): void {
  const st: EyeState = { ...s, lighting: 'slit' };
  const g = eyeGeometry(w, h, st);
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = '#050307';
  ctx.fillRect(0, 0, w, h);
  const mag = Math.max(1, beam.mag ?? 1);
  if (mag > 1) {
    // magnify around the point where the beam meets the cornea
    const fx = g.ix + Math.max(-1, Math.min(1, beam.x)) * g.irisR * g.foreX;
    const shift = Math.sign(beam.angleDeg || 1) * g.pxmm * 0.8;
    ctx.translate(w / 2, h / 2);
    ctx.scale(mag, mag);
    ctx.translate(-(fx + shift), -g.iy);
  }
  drawScene(ctx, g, st, t);
  applyLighting(ctx, g, st);
  ctx.save();
  ctx.beginPath();
  fissurePath(ctx, g);
  ctx.clip();
  drawSlitBeam(ctx, g, st, beam, t);
  ctx.restore();
  ctx.restore();
}

export type { SlitBeam };
