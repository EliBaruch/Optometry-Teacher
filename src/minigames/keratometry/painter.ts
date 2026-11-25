/**
 * Paints the view through the keratometer eyepiece: the patient's iris & pupil
 * far behind, a warm lamp glow, and the three luminous mire images with their
 * plus (horizontal pair) and minus (vertical pair) signs, in the instrument
 * frame. Canvas 2D only; the bezel/protractor is SVG on top (Eyepiece.tsx).
 */
import type { Keratometry } from '@core';
import { paintIris } from '@render';
import { irregularity, mireRadius, type MireLayout, type MireGrade, type Pt } from './optics';

export interface ViewScene {
  k: Keratometry;
  lay: MireLayout;
  /** instrument rotation, degrees (TABO, counter-clockwise) */
  theta: number;
  seed: number;
  t: number;
  /** fixation drift of the whole image, field units */
  drift: Pt;
  /** 0..1 bloom where the plus / minus signs fuse */
  glowH: number;
  glowV: number;
  iris: HTMLCanvasElement | null;
}

/** Field radius as a fraction of half the canvas (the bezel covers the rest). */
export const FIELD = 0.8;
const TAU = Math.PI * 2;
const RAD = Math.PI / 180;

export const INK = {
  ring: 'rgba(255, 246, 226, 0.96)',
  ringGlow: 'rgba(255, 205, 130, 0.85)',
  plus: 'rgba(255, 214, 128, 1)',
  plusGlow: 'rgba(255, 180, 70, 0.9)',
  minus: 'rgba(170, 235, 255, 1)',
  minusGlow: 'rgba(80, 190, 255, 0.9)',
};

/**
 * Pre-render the iris backdrop once per eye (it never changes during a
 * measurement): painted, softened and dimmed up front so a frame is one blit.
 */
export function renderIris(size: number, color: string, seed: number, pupilFrac: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const n = Math.max(8, Math.round(size));
  const raw = document.createElement('canvas');
  raw.width = raw.height = n;
  const rc = raw.getContext('2d');
  if (!rc) return null;
  const R = n / 2;
  try {
    paintIris(rc, R, R, R, R * pupilFrac, { color, seed });
  } catch {
    rc.fillStyle = '#2a2030';
    rc.beginPath();
    rc.arc(R, R, R, 0, TAU);
    rc.fill();
  }
  const out = document.createElement('canvas');
  out.width = out.height = n;
  const oc = out.getContext('2d');
  if (!oc) return raw;
  oc.globalAlpha = 0.5;
  if ('filter' in oc) oc.filter = `blur(${Math.max(0.6, n * 0.0028).toFixed(1)}px)`;
  oc.drawImage(raw, 0, 0);
  return out;
}

function ellipsePath(ctx: CanvasRenderingContext2D, c: Pt, k: Keratometry, theta: number, grade: MireGrade, seed: number, t: number) {
  const n = grade === 'regular' ? 72 : 144;
  ctx.beginPath();
  for (let i = 0; i <= n; i++) {
    const phi = (i / n) * 360; // absolute meridian
    const r = mireRadius(k, phi) * (1 + irregularity(grade, seed, phi * RAD, t));
    const a = (phi - theta) * RAD; // instrument frame
    const x = c.x + r * Math.cos(a);
    const y = c.y + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function bar(ctx: CanvasRenderingContext2D, x0: number, y0: number, x1: number, y1: number) {
  ctx.moveTo(x0, y0);
  ctx.lineTo(x1, y1);
}

/**
 * Stroke the current path as a neon line: wide faint halo passes, then a bright
 * core. `soft` (device px) spreads and dims the line — defocus without a costly
 * blur filter.
 */
function neon(ctx: CanvasRenderingContext2D, px: number, core: string, halo: string, width: number, alpha: number, soft: number) {
  const spread = width + soft * 1.4;
  const dim = Math.max(0.14, width / (width + soft * 0.9));
  ctx.strokeStyle = halo;
  for (const [w, a] of [[4.2, 0.1], [2.6, 0.2], [1.6, 0.35]] as const) {
    ctx.globalAlpha = a * alpha * Math.sqrt(dim);
    ctx.lineWidth = (width * w + soft * 1.6) * px;
    ctx.stroke();
  }
  ctx.globalAlpha = alpha * dim;
  ctx.strokeStyle = core;
  ctx.lineWidth = spread * px;
  ctx.stroke();
}

/** One complete mire image: ring + two plus signs (along u) + two minus signs (along v). */
function drawImage(ctx: CanvasRenderingContext2D, s: ViewScene, c: Pt, px: number, alpha: number, ghost = false) {
  const { lay, k } = s;
  const soft = lay.blur / px;
  const arm = 0.042;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ellipsePath(ctx, c, k, s.theta, k.mires, s.seed, s.t);
  neon(ctx, px, INK.ring, INK.ringGlow, ghost ? 1.7 : 2.4, alpha, soft);

  // plus signs (horizontal pair)
  ctx.beginPath();
  for (const sgn of [-1, 1]) {
    const x = c.x + sgn * lay.signU;
    bar(ctx, x - arm, c.y, x + arm, c.y);
    bar(ctx, x, c.y - arm, x, c.y + arm);
  }
  neon(ctx, px, INK.plus, INK.plusGlow, 3, alpha, soft);

  // minus signs (vertical pair)
  ctx.beginPath();
  for (const sgn of [-1, 1]) {
    const y = c.y + sgn * lay.signV;
    bar(ctx, c.x - arm, y, c.x + arm, y);
  }
  neon(ctx, px, INK.minus, INK.minusGlow, 3, alpha, soft);
  ctx.globalAlpha = 1;
}

function bloom(ctx: CanvasRenderingContext2D, p: Pt, r: number, color: string, a: number) {
  if (a <= 0.01) return;
  const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, r);
  g.addColorStop(0, color.replace('A', String(0.55 * a)));
  g.addColorStop(1, color.replace('A', '0'));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.x, p.y, r, 0, TAU);
  ctx.fill();
}

/** Paint one frame. `size` is the canvas edge in device pixels. */
export function paintView(ctx: CanvasRenderingContext2D, size: number, s: ViewScene): void {
  const c = size / 2;
  const R = c * FIELD;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, size, size);
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.clip();

  // ── deep background + the iris far behind the mire image
  ctx.fillStyle = '#05030a';
  ctx.fillRect(0, 0, size, size);
  if (s.iris) {
    const ir = R * 1.32;
    const dx = s.drift.x * R * 0.6;
    const dy = -s.drift.y * R * 0.6;
    ctx.drawImage(s.iris, c - ir + dx, c - ir + dy, ir * 2, ir * 2);
  }
  // instrument illumination: a warm pool of light, cooler at the edges
  const lamp = ctx.createRadialGradient(c - R * 0.1, c - R * 0.12, R * 0.05, c, c, R);
  lamp.addColorStop(0, 'rgba(255, 214, 150, 0.16)');
  lamp.addColorStop(0.55, 'rgba(60, 30, 80, 0.18)');
  lamp.addColorStop(1, 'rgba(4, 2, 10, 0.86)');
  ctx.fillStyle = lamp;
  ctx.fillRect(0, 0, size, size);

  // ── mires, in the instrument frame (u right, v up, field units)
  ctx.save();
  ctx.translate(c + s.drift.x * R, c - s.drift.y * R);
  ctx.scale(R, -R);
  ctx.rotate(s.theta * RAD);
  const px = 1 / R;
  const { lay } = s;
  ctx.globalCompositeOperation = 'lighter';
  const ghost = Math.hypot(lay.doubling.x, lay.doubling.y) > 0.004;
  if (ghost) {
    drawImage(ctx, s, { x: lay.ref.x - lay.doubling.x, y: lay.ref.y - lay.doubling.y }, px, 0.62, true);
    drawImage(ctx, s, { x: lay.ref.x + lay.doubling.x, y: lay.ref.y + lay.doubling.y }, px, 0.62, true);
  } else {
    drawImage(ctx, s, lay.ref, px, 1);
  }
  drawImage(ctx, s, lay.h, px, 0.92);
  drawImage(ctx, s, lay.v, px, 0.92);

  // fusion bloom where the measured signs superimpose
  bloom(ctx, { x: lay.ref.x - lay.signU, y: lay.ref.y }, 0.11, 'rgba(255,200,110,A)', s.glowH);
  bloom(ctx, { x: lay.ref.x, y: lay.ref.y + lay.signV }, 0.11, 'rgba(120,210,255,A)', s.glowV);
  ctx.globalCompositeOperation = 'source-over';

  // fixation reticle in the reference image
  ctx.strokeStyle = 'rgba(255, 240, 215, 0.42)';
  ctx.lineWidth = 1 * px;
  ctx.beginPath();
  const rr = 0.05;
  bar(ctx, lay.ref.x - rr, lay.ref.y, lay.ref.x + rr, lay.ref.y);
  bar(ctx, lay.ref.x, lay.ref.y - rr, lay.ref.x, lay.ref.y + rr);
  ctx.stroke();
  ctx.restore();

  // ── glass: vignette, chromatic field stop and a soft reflection
  const vig = ctx.createRadialGradient(c, c, R * 0.62, c, c, R);
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(0.86, 'rgba(6,2,14,0.45)');
  vig.addColorStop(1, 'rgba(2,1,6,0.95)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, size, size);
  const sheen = ctx.createLinearGradient(c - R, c - R, c + R * 0.2, c + R * 0.2);
  sheen.addColorStop(0, 'rgba(255,255,255,0.07)');
  sheen.addColorStop(0.35, 'rgba(255,255,255,0.0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.ellipse(c - R * 0.32, c - R * 0.42, R * 0.62, R * 0.26, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();

  ctx.lineWidth = Math.max(1, R * 0.012);
  ctx.strokeStyle = 'rgba(140, 200, 255, 0.22)';
  ctx.beginPath();
  ctx.arc(c, c, R - ctx.lineWidth, 0, TAU);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(255, 170, 120, 0.18)';
  ctx.beginPath();
  ctx.arc(c, c, R - ctx.lineWidth * 2.2, 0, TAU);
  ctx.stroke();
}
