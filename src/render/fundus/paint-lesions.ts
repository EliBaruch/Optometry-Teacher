/**
 * Lesion painters. Each draws one LesionInst in WORLD coordinates (the caller
 * has applied the world→canvas transform; S = px per world unit, for
 * resolution-aware details). Sizes come from the layout (mm → world).
 */
import { createRng, type LesionType, type Rng } from '@core';
import { rgba, smoothClosedPath } from '../eye/color';
import type { FundusLayout, LesionInst } from './layout';
import { U } from './types';

const TAU = Math.PI * 2;
type Ctx = CanvasRenderingContext2D;

function blob(rng: Rng, x: number, y: number, r: number, n = 12, jit = 0.25, sy = 1, rot = 0): [number, number][] {
  const pts: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    const k = 1 + rng.float(-jit, jit);
    const lx = Math.cos(a) * r * k;
    const ly = Math.sin(a) * r * k * sy;
    pts.push([x + lx * Math.cos(rot) - ly * Math.sin(rot), y + lx * Math.sin(rot) + ly * Math.cos(rot)]);
  }
  return pts;
}

function softDot(ctx: Ctx, x: number, y: number, r: number, inner: string, outer: string, hard = 0.6): void {
  const g = ctx.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(hard, inner);
  g.addColorStop(1, outer);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

const minPx = (S: number, px: number) => px / S;

function microaneurysm(ctx: Ctx, l: LesionInst, S: number): void {
  const r = Math.max(l.r, minPx(S, 1.1));
  softDot(ctx, l.x, l.y, r * 1.3, 'rgba(150,10,18,0.95)', 'rgba(150,10,18,0)', 0.65);
}

function dotBlot(ctx: Ctx, l: LesionInst, S: number): void {
  const rng = createRng(l.seed);
  const r = Math.max(l.r, minPx(S, 1.5));
  // fuzzy margin (blood spreading in the outer plexiform layer) then a dense round core
  softDot(ctx, l.x, l.y, r * 1.35, 'rgba(120,10,16,0.5)', 'rgba(130,16,20,0)', 0.35);
  ctx.beginPath();
  smoothClosedPath(ctx, blob(rng, l.x, l.y, r, 14, 0.12));
  const g = ctx.createRadialGradient(l.x - r * 0.15, l.y - r * 0.15, 0, l.x, l.y, r * 1.1);
  g.addColorStop(0, 'rgba(96,4,12,0.97)');
  g.addColorStop(0.7, 'rgba(122,10,18,0.92)');
  g.addColorStop(1, 'rgba(140,20,24,0.55)');
  ctx.fillStyle = g;
  ctx.fill();
}

/** IRMA: fine, tortuous, irregular intraretinal shunt vessels (do not cross major vessels). */
function irma(ctx: Ctx, l: LesionInst, S: number): void {
  const rng = createRng(l.seed);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (let k = 0; k < 5; k++) {
    let x = l.x + rng.float(-0.4, 0.4) * l.r;
    let y = l.y + rng.float(-0.4, 0.4) * l.r;
    let h = l.a + rng.float(-0.8, 0.8);
    ctx.strokeStyle = `rgba(${rng.int(120, 150)},${rng.int(14, 26)},${rng.int(26, 40)},${rng.float(0.7, 0.95).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.022 * U * rng.float(0.8, 1.4), minPx(S, 0.6));
    ctx.beginPath();
    ctx.moveTo(x, y);
    for (let i = 0; i < 16; i++) {
      h += rng.float(-0.9, 0.9);
      x += Math.cos(h) * l.r * 0.11;
      y += Math.sin(h) * l.r * 0.11;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
}

/** Boat-shaped pre-retinal (subhyaloid) haemorrhage: flat fluid level above, rounded below. */
function preretinal(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  const r = l.r;
  const w = r * rng.float(1.1, 1.3);
  const level = l.y - r * 0.25;
  ctx.save();
  ctx.beginPath();
  ctx.ellipse(l.x, l.y, w, r, 0, 0, TAU);
  ctx.clip();
  // plasma above the level: translucent, yellow-tinged
  ctx.fillStyle = 'rgba(214,120,80,0.35)';
  ctx.fillRect(l.x - w, l.y - r, w * 2, level - (l.y - r));
  // settled red cells below: dense, uniform, obscures the vessels
  const g = ctx.createLinearGradient(0, level, 0, l.y + r);
  g.addColorStop(0, 'rgba(150,14,18,0.97)');
  g.addColorStop(1, 'rgba(105,6,12,0.98)');
  ctx.fillStyle = g;
  ctx.fillRect(l.x - w, level, w * 2, l.y + r - level);
  // bright meniscus at the fluid level
  ctx.strokeStyle = 'rgba(255,190,160,0.5)';
  ctx.lineWidth = 0.03 * U;
  ctx.beginPath();
  ctx.moveTo(l.x - w, level);
  ctx.lineTo(l.x + w, level);
  ctx.stroke();
  ctx.restore();
  // glossy specular on the posterior hyaloid face
  ctx.strokeStyle = 'rgba(255,235,220,0.25)';
  ctx.lineWidth = 0.04 * U;
  ctx.beginPath();
  ctx.ellipse(l.x, l.y, w * 0.92, r * 0.92, 0, Math.PI * 0.15, Math.PI * 0.55);
  ctx.stroke();
}

/** Spindle (flame-shaped) splinter haemorrhage along the nerve fibres. */
function splinter(ctx: Ctx, x: number, y: number, ang: number, L: number, W: number, seed: number, alpha = 1): void {
  const rng = createRng(seed);
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(ang);
  // feathered body: a tapered spindle, frayed toward both ends
  const body = (w: number, a: number) => {
    ctx.beginPath();
    ctx.moveTo(-L, 0);
    ctx.bezierCurveTo(-L * 0.4, -w, L * 0.3, -w * 0.9, L, rng.float(-0.1, 0.1) * w);
    ctx.bezierCurveTo(L * 0.3, w * 0.9, -L * 0.4, w, -L, 0);
    ctx.fillStyle = `rgba(${rng.int(150, 175)},${rng.int(14, 26)},${rng.int(20, 30)},${(a * alpha).toFixed(2)})`;
    ctx.fill();
  };
  body(W * 1.25, 0.35);
  body(W, 0.85);
  ctx.strokeStyle = `rgba(120,8,16,${(0.35 * alpha).toFixed(2)})`;
  ctx.lineWidth = W * 0.12;
  for (let i = 0; i < 6; i++) {
    const oy = rng.float(-0.6, 0.6) * W;
    ctx.beginPath();
    ctx.moveTo(-L * rng.float(0.5, 1.15), oy * 0.6);
    ctx.lineTo(L * rng.float(0.5, 1.15), oy);
    ctx.stroke();
  }
  ctx.restore();
}

function flame(ctx: Ctx, l: LesionInst): void {
  splinter(ctx, l.x, l.y, l.a, l.r, l.r * 0.3, l.seed);
}

function cottonWool(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a + Math.PI / 2);
  // fluffy, fibrillated, greyish-white patch with feathery, indistinct margins
  softDot(ctx, 0, 0, l.r * 1.25, 'rgba(240,230,220,0.28)', 'rgba(240,230,220,0)', 0.2);
  for (let i = 0; i < 22; i++) {
    const ox = rng.float(-0.75, 0.75) * l.r;
    const oy = rng.float(-0.45, 0.45) * l.r;
    softDot(ctx, ox, oy, l.r * rng.float(0.22, 0.45), 'rgba(250,246,238,0.42)', 'rgba(245,240,230,0)', 0.15);
  }
  ctx.strokeStyle = 'rgba(255,252,245,0.18)';
  ctx.lineWidth = l.r * 0.05;
  ctx.lineCap = 'round';
  for (let i = 0; i < 8; i++) {
    const ox = rng.float(-0.6, 0.6) * l.r;
    ctx.beginPath();
    ctx.moveTo(ox, -l.r * 0.5);
    ctx.quadraticCurveTo(ox + rng.float(-0.15, 0.15) * l.r, 0, ox + rng.float(-0.1, 0.1) * l.r, l.r * 0.5);
    ctx.stroke();
  }
  ctx.restore();
}

function exudateDot(ctx: Ctx, x: number, y: number, r: number): void {
  const g = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, 0, x, y, r);
  g.addColorStop(0, 'rgba(255,248,190,1)');
  g.addColorStop(0.6, 'rgba(240,215,110,0.95)');
  g.addColorStop(1, 'rgba(220,180,80,0.2)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, TAU);
  ctx.fill();
}

function hardExudate(ctx: Ctx, l: LesionInst, L: FundusLayout, S: number): void {
  const rng = createRng(l.seed);
  const dotR = (mm: number) => Math.max(mm * U, minPx(S, 0.9));
  if (l.variant === 'star') {
    // macular star: radial streaks in Henle's layer, fuller on the nasal side
    const nasal = L.a.nasal;
    for (let i = 0; i < 70; i++) {
      let ang = rng.float(0, TAU);
      if (Math.cos(ang) * nasal < 0 && rng.chance(0.55)) ang = Math.PI - ang;
      const r0 = rng.float(0.25, 0.5) * U;
      const len = rng.float(0.3, 1.3) * U;
      for (let k = 0; k < 6; k++) {
        const rr = r0 + (len * k) / 5;
        exudateDot(ctx, l.x + Math.cos(ang) * rr, l.y + Math.sin(ang) * rr, dotR(rng.float(0.025, 0.05)));
      }
    }
    return;
  }
  if (l.variant === 'circinate') {
    // ring around a leaking focus (often with microaneurysms in the centre)
    for (let i = 0; i < 46; i++) {
      const ang = rng.float(0, TAU);
      const rr = l.r * rng.float(0.75, 1.0);
      exudateDot(ctx, l.x + Math.cos(ang) * rr, l.y + Math.sin(ang) * rr * 0.85, dotR(rng.float(0.03, 0.09)));
    }
    for (let i = 0; i < 3; i++) softDot(ctx, l.x + rng.float(-0.2, 0.2) * U, l.y + rng.float(-0.2, 0.2) * U, Math.max(0.04 * U, minPx(S, 1)), 'rgba(150,10,18,0.9)', 'rgba(150,10,18,0)');
    return;
  }
  for (let i = 0; i < 26; i++) {
    const ang = rng.float(0, TAU);
    const rr = Math.sqrt(rng.next()) * l.r * 0.8;
    exudateDot(ctx, l.x + Math.cos(ang) * rr, l.y + Math.sin(ang) * rr, dotR(rng.float(0.03, 0.12)));
  }
}

function drusen(ctx: Ctx, l: LesionInst, S: number): void {
  const big = l.type === 'drusen-large';
  const r = Math.max(l.r, minPx(S, 1));
  const g = ctx.createRadialGradient(l.x - r * 0.25, l.y - r * 0.25, 0, l.x, l.y, r * (big ? 1.25 : 1.1));
  g.addColorStop(0, big ? 'rgba(250,225,150,0.85)' : 'rgba(250,230,160,0.9)');
  g.addColorStop(big ? 0.55 : 0.6, big ? 'rgba(232,190,110,0.65)' : 'rgba(235,200,120,0.7)');
  g.addColorStop(1, 'rgba(220,170,90,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(l.x, l.y, r * (big ? 1.25 : 1.1), 0, TAU);
  ctx.fill();
}

function choroidalVesselsIn(ctx: Ctx, rng: Rng, x: number, y: number, r: number, alpha: number): void {
  ctx.lineCap = 'round';
  for (let i = 0; i < 9; i++) {
    const a = rng.float(0, TAU);
    ctx.strokeStyle = `rgba(214,110,60,${alpha.toFixed(2)})`;
    ctx.lineWidth = rng.float(0.16, 0.3) * U;
    ctx.beginPath();
    const b = a + rng.float(2.2, 3.4);
    ctx.moveTo(x + Math.cos(a) * r * 1.3, y + Math.sin(a) * r * 1.3);
    ctx.quadraticCurveTo(x + Math.cos(a + 1.6) * r * 0.5, y + Math.sin(a + 1.6) * r * 0.5, x + Math.cos(b) * r * 1.3, y + Math.sin(b) * r * 1.3);
    ctx.stroke();
  }
}

function geographicAtrophy(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  // multilobular, sharply demarcated RPE loss exposing large choroidal vessels
  const pts: [number, number][] = [];
  const harm = [1, 2, 3, 5].map((f) => ({ f, amp: rng.float(0.04, 0.16) / Math.sqrt(f), ph: rng.float(0, TAU) }));
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * TAU;
    let k = 1 + rng.float(-0.03, 0.03);
    for (const h of harm) k += h.amp * Math.cos(a * h.f + h.ph);
    pts.push([l.x + Math.cos(a) * l.r * k, l.y + Math.sin(a) * l.r * k * 0.85]);
  }
  ctx.save();
  ctx.beginPath();
  smoothClosedPath(ctx, pts);
  const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 1.2);
  g.addColorStop(0, 'rgba(238,200,160,0.95)');
  g.addColorStop(1, 'rgba(225,175,130,0.9)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.clip();
  if ('filter' in ctx) ctx.filter = 'blur(0.6px)';
  choroidalVesselsIn(ctx, rng, l.x, l.y, l.r, 0.32);
  if ('filter' in ctx) ctx.filter = 'none';
  ctx.restore();
  // hyperpigmented border
  ctx.strokeStyle = 'rgba(80,35,15,0.45)';
  ctx.lineWidth = 0.06 * U;
  ctx.beginPath();
  smoothClosedPath(ctx, pts);
  ctx.stroke();
}

function subretinalHeme(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  const pts = blob(rng, l.x, l.y, l.r, 16, 0.22, 0.85);
  ctx.save();
  ctx.beginPath();
  smoothClosedPath(ctx, pts);
  const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 1.15);
  g.addColorStop(0, 'rgba(70,8,14,0.95)');
  g.addColorStop(0.7, 'rgba(105,14,20,0.9)');
  g.addColorStop(1, 'rgba(140,25,25,0.55)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.restore();
  // grey-green choroidal neovascular membrane with a rim of exudate
  softDot(ctx, l.x + rng.float(-0.15, 0.15) * l.r, l.y + rng.float(-0.15, 0.15) * l.r, l.r * 0.45, 'rgba(120,130,105,0.7)', 'rgba(120,130,105,0)', 0.35);
  for (let i = 0; i < 18; i++) {
    const a = rng.float(0, TAU);
    exudateDot(ctx, l.x + Math.cos(a) * l.r * rng.float(1.02, 1.2), l.y + Math.sin(a) * l.r * 0.85 * rng.float(1.02, 1.2), rng.float(0.03, 0.06) * U);
  }
}

/** One NV frond: a fine wandering stem ending in (and budding) small closed loops. */
function frond(ctx: Ctx, rng: Rng, x: number, y: number, ang: number, len: number, w: number, depth: number): void {
  const steps = 10;
  const step = len / steps;
  let h = ang;
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(x, y);
  const buds: [number, number, number][] = [];
  for (let i = 0; i < steps; i++) {
    h += rng.float(-0.28, 0.28);
    x += Math.cos(h) * step;
    y += Math.sin(h) * step;
    ctx.lineTo(x, y);
    if (depth < 2 && i > 2 && i < steps - 1 && rng.chance(0.3)) buds.push([x, y, h + (rng.chance(0.5) ? 1 : -1) * rng.float(0.5, 1.0)]);
  }
  ctx.stroke();
  // terminal loop (new vessels form arcades of loops)
  // teardrop-shaped loop that turns back on itself
  const lr = len * rng.float(0.1, 0.16);
  const side = rng.chance(0.5) ? 1 : -1;
  const nx = Math.cos(h + side * Math.PI / 2);
  const ny = Math.sin(h + side * Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.bezierCurveTo(x + Math.cos(h) * lr * 2.2, y + Math.sin(h) * lr * 2.2, x + Math.cos(h) * lr * 1.6 + nx * lr * 2.2, y + Math.sin(h) * lr * 1.6 + ny * lr * 2.2, x + nx * lr * rng.float(0.6, 1.2), y + ny * lr * rng.float(0.6, 1.2));
  ctx.stroke();
  for (const [bx, by, bh] of buds) frond(ctx, rng, bx, by, bh, len * rng.float(0.35, 0.55), w * 0.85, depth + 1);
}

function neovascularization(ctx: Ctx, l: LesionInst, S: number): void {
  const rng = createRng(l.seed);
  const nvd = l.variant === 'nvd';
  // faint grey-white fibrovascular veil
  softDot(ctx, l.x, l.y, l.r * 1.05, 'rgba(240,222,212,0.14)', 'rgba(240,222,212,0)', 0.35);
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const fronds = nvd ? 16 : 7;
  // NVE grows as a sea-fan in one direction; NVD radiates over the disc and its margin
  const fanDir = rng.float(0, TAU);
  for (let i = 0; i < fronds; i++) {
    const ang = nvd ? (i / fronds) * TAU + rng.float(-0.2, 0.2) : fanDir + rng.float(-0.9, 0.9);
    const r0 = nvd ? l.r * rng.float(0.05, 0.3) : 0;
    ctx.strokeStyle = `rgba(${rng.int(190, 220)},${rng.int(36, 60)},${rng.int(44, 64)},${rng.float(0.7, 0.95).toFixed(2)})`;
    frond(ctx, rng, l.x + Math.cos(ang) * r0, l.y + Math.sin(ang) * r0, ang, l.r * rng.float(0.6, 0.95), Math.max(0.016 * U, minPx(S, 0.55)), 0);
  }
  ctx.restore();
}

function retinalTear(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a); // +x points to the posterior pole: the horseshoe apex
  const r = l.r;
  // cuff of subretinal fluid
  softDot(ctx, 0, 0, r * 1.7, 'rgba(225,215,205,0.45)', 'rgba(225,215,205,0)', 0.45);
  // the horseshoe: bright orange-red bare choroid
  ctx.beginPath();
  ctx.moveTo(-r * 0.7, -r * 0.75);
  ctx.bezierCurveTo(r * 0.6, -r * 1.05, r * 1.05, -r * 0.2, r * 0.95, 0);
  ctx.bezierCurveTo(r * 1.05, r * 0.2, r * 0.6, r * 1.05, -r * 0.7, r * 0.75);
  ctx.lineTo(-r * 0.5, r * 0.45);
  ctx.bezierCurveTo(r * 0.35, r * 0.65, r * 0.62, r * 0.15, r * 0.55, 0);
  ctx.bezierCurveTo(r * 0.62, -r * 0.15, r * 0.35, -r * 0.65, -r * 0.5, -r * 0.45);
  ctx.closePath();
  ctx.fillStyle = 'rgba(225,80,40,0.95)';
  ctx.fill();
  // the grey-white flap (operculum) still attached anteriorly
  ctx.beginPath();
  ctx.ellipse(-r * 0.05, 0, r * 0.55, r * 0.45, 0, 0, TAU);
  const g = ctx.createLinearGradient(-r * 0.6, 0, r * 0.5, 0);
  g.addColorStop(0, 'rgba(230,222,214,0.95)');
  g.addColorStop(1, 'rgba(200,190,185,0.85)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,90,80,0.5)';
  ctx.lineWidth = r * 0.05;
  ctx.stroke();
  // a bridging vessel over the flap
  ctx.strokeStyle = `rgba(140,30,30,${rng.float(0.5, 0.8).toFixed(2)})`;
  ctx.lineWidth = r * 0.06;
  ctx.beginPath();
  ctx.moveTo(-r * 1.4, -r * 0.2);
  ctx.quadraticCurveTo(0, -r * 0.1, r * 1.4, r * 0.3);
  ctx.stroke();
  ctx.restore();
}

function lattice(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a); // long axis circumferential (parallel to the ora)
  const L = l.r;
  const W = L * 0.24;
  // spindle of thinned retina: slightly redder, with pointed ends
  const spindle = () => {
    ctx.beginPath();
    ctx.moveTo(-L, 0);
    ctx.bezierCurveTo(-L * 0.5, -W * 1.3, L * 0.5, -W * 1.3, L, 0);
    ctx.bezierCurveTo(L * 0.5, W * 1.3, -L * 0.5, W * 1.3, -L, 0);
    ctx.closePath();
  };
  spindle();
  ctx.fillStyle = 'rgba(150,48,30,0.35)';
  ctx.fill();
  ctx.clip();
  // white sclerosed vessels: a long axial strand with oblique, criss-crossing branches
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(244,236,226,0.75)';
  ctx.lineWidth = 0.035 * U;
  ctx.beginPath();
  ctx.moveTo(-L * 0.9, rng.float(-0.2, 0.2) * W);
  ctx.bezierCurveTo(-L * 0.3, rng.float(-0.5, 0.5) * W, L * 0.3, rng.float(-0.5, 0.5) * W, L * 0.9, rng.float(-0.2, 0.2) * W);
  ctx.stroke();
  ctx.lineWidth = 0.025 * U;
  for (let i = 0; i < 9; i++) {
    const x0 = rng.float(-0.8, 0.8) * L;
    const dir = rng.chance(0.5) ? 1 : -1;
    ctx.strokeStyle = `rgba(244,236,226,${rng.float(0.4, 0.7).toFixed(2)})`;
    ctx.beginPath();
    ctx.moveTo(x0 - dir * W * 0.9, -W * 1.1);
    ctx.quadraticCurveTo(x0, rng.float(-0.3, 0.3) * W, x0 + dir * W * rng.float(0.6, 1.3), W * 1.1);
    ctx.stroke();
  }
  ctx.restore();
  // clumped pigment along the margins
  for (let i = 0; i < 12; i++) {
    const t = rng.float(-0.9, 0.9);
    const side = rng.chance(0.5) ? 1 : -1;
    const lx = t * l.r;
    const ly = side * W * 0.9 * (1 - t * t) * rng.float(0.6, 1.1);
    const x = l.x + lx * Math.cos(l.a) - ly * Math.sin(l.a);
    const y = l.y + lx * Math.sin(l.a) + ly * Math.cos(l.a);
    softDot(ctx, x, y, rng.float(0.04, 0.09) * U, 'rgba(35,15,8,0.9)', 'rgba(35,15,8,0)', 0.5);
  }
}

function nevus(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  ctx.beginPath();
  smoothClosedPath(ctx, blob(rng, l.x, l.y, l.r, 14, 0.1));
  const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r * 1.1);
  g.addColorStop(0, 'rgba(70,72,68,0.85)');
  g.addColorStop(0.75, 'rgba(85,82,72,0.75)');
  g.addColorStop(1, 'rgba(95,80,60,0)');
  ctx.fillStyle = g;
  ctx.fill();
  for (let i = 0; i < 5; i++) {
    const a = rng.float(0, TAU);
    const d = rng.float(0, 0.6) * l.r;
    drusen(ctx, { ...l, type: 'drusen-small', x: l.x + Math.cos(a) * d, y: l.y + Math.sin(a) * d, r: 0.04 * U }, 1e6);
  }
}

function pigment(ctx: Ctx, l: LesionInst, S: number): void {
  const rng = createRng(l.seed);
  const r = Math.max(l.r, minPx(S, 1.2));
  // irregular hyperpigmentation: a few small brown-black flecks, soft-edged
  for (let i = 0; i < 4; i++) {
    const ox = rng.float(-0.6, 0.6) * r;
    const oy = rng.float(-0.6, 0.6) * r;
    ctx.beginPath();
    smoothClosedPath(ctx, blob(rng, l.x + ox, l.y + oy, r * rng.float(0.3, 0.6), 8, 0.4, rng.float(0.5, 1), l.a));
    ctx.fillStyle = `rgba(${rng.int(40, 70)},${rng.int(20, 32)},12,${rng.float(0.55, 0.8).toFixed(2)})`;
    ctx.fill();
  }
}

function laserScar(ctx: Ctx, l: LesionInst, S: number): void {
  const rng = createRng(l.seed);
  const r = Math.max(l.r, minPx(S, 1.2));
  // chorioretinal scar: pale atrophic centre, pigmented rim
  ctx.beginPath();
  smoothClosedPath(ctx, blob(rng, l.x, l.y, r, 10, 0.12));
  ctx.fillStyle = 'rgba(40,20,10,0.75)';
  ctx.fill();
  softDot(ctx, l.x + rng.float(-0.1, 0.1) * r, l.y + rng.float(-0.1, 0.1) * r, r * 0.72, 'rgba(240,215,170,0.9)', 'rgba(220,180,130,0.4)', 0.5);
  if (rng.chance(0.5)) softDot(ctx, l.x, l.y, r * 0.25, 'rgba(50,25,12,0.7)', 'rgba(50,25,12,0)', 0.3);
}

function hollenhorst(ctx: Ctx, l: LesionInst, S: number): void {
  const r = Math.max(l.r, minPx(S, 1.6));
  softDot(ctx, l.x, l.y, r * 2.2, 'rgba(255,240,170,0.35)', 'rgba(255,240,170,0)', 0.2);
  ctx.fillStyle = 'rgba(255,236,150,1)';
  ctx.beginPath();
  ctx.ellipse(l.x, l.y, r * 1.1, r * 0.75, 0.5, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,240,1)';
  ctx.beginPath();
  ctx.arc(l.x - r * 0.25, l.y - r * 0.2, r * 0.3, 0, TAU);
  ctx.fill();
}

function whitening(ctx: Ctx, l: LesionInst, L: FundusLayout, S: number): void {
  const rng = createRng(l.seed);
  if (l.variant === 'pole') {
    // ischaemic posterior pole: opaque milky retina, thinnest at the foveola
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(236,228,218,0.58)');
    g.addColorStop(0.55, 'rgba(232,224,214,0.45)');
    g.addColorStop(1, 'rgba(232,224,214,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(l.x, l.y, l.r, l.r * 0.82, 0, 0, TAU);
    ctx.fill();
    for (let i = 0; i < 26; i++) {
      const a = rng.float(0, TAU);
      const d = Math.sqrt(rng.next()) * l.r * 0.8;
      softDot(ctx, l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, rng.float(0.3, 0.8) * U, 'rgba(245,240,232,0.25)', 'rgba(245,240,232,0)', 0.1);
    }
    // opacification is densest where the inner retina is thickest: along the arcades & around the disc
    ctx.save();
    if ('filter' in ctx) ctx.filter = `blur(${Math.max(1, 0.3 * U * S).toFixed(1)}px)`;
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(240,234,226,0.22)';
    ctx.lineWidth = 1.1 * U;
    for (const v of L.tree.vessels) {
      if (v.depth !== 0) continue;
      ctx.beginPath();
      let started = false;
      for (const [x, y] of v.pts) {
        if (Math.hypot(x - L.a.disc.x, y - L.a.disc.y) > 7 * U) break;
        if (!started) { ctx.moveTo(x, y); started = true; } else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }
    if ('filter' in ctx) ctx.filter = 'none';
    ctx.restore();
    // the foveola has no inner retina to opacify → the choroid still shows through
    const f = L.a.fovea;
    softDot(ctx, f.x, f.y, 0.5 * U, 'rgba(178,52,34,0.9)', 'rgba(178,52,34,0)', 0.45);
    return;
  }
  // branch occlusion: a wedge of whitening following the occluded arteriole
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a);
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, l.r);
  g.addColorStop(0, 'rgba(236,228,218,0.65)');
  g.addColorStop(1, 'rgba(236,228,218,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, l.r, l.r * 0.55, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

function cherryRed(ctx: Ctx, l: LesionInst): void {
  softDot(ctx, l.x, l.y, l.r * 1.4, 'rgba(200,20,30,0.95)', 'rgba(200,20,30,0)', 0.5);
  softDot(ctx, l.x, l.y, l.r * 0.6, 'rgba(160,0,18,0.8)', 'rgba(160,0,18,0)', 0.3);
}

function macularEdema(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  // thickened, greyish, glistening retina with loss of the foveal reflex;
  // faint cystoid spaces around the fovea and irregular sheen
  softDot(ctx, l.x, l.y, l.r, 'rgba(222,200,186,0.26)', 'rgba(222,200,186,0)', 0.3);
  for (let i = 0; i < 12; i++) {
    const a = rng.float(0, TAU);
    const d = l.r * rng.float(0.15, 0.45);
    softDot(ctx, l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, l.r * rng.float(0.08, 0.16), 'rgba(238,222,206,0.16)', 'rgba(238,222,206,0)', 0.4);
  }
  ctx.strokeStyle = 'rgba(255,250,240,0.09)';
  ctx.lineWidth = 0.04 * U;
  for (let i = 0; i < 6; i++) {
    const a = rng.float(0, TAU);
    ctx.beginPath();
    ctx.arc(l.x + rng.float(-0.1, 0.1) * l.r, l.y + rng.float(-0.1, 0.1) * l.r, l.r * rng.float(0.5, 0.95), a, a + rng.float(0.2, 0.5));
    ctx.stroke();
  }
}

function erm(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  // cellophane sheen + radiating retinal striae toward the contraction centre
  softDot(ctx, l.x, l.y, l.r, 'rgba(255,250,240,0.16)', 'rgba(255,250,240,0)', 0.4);
  ctx.lineCap = 'round';
  for (let i = 0; i < 34; i++) {
    const a = rng.float(0, TAU);
    const r0 = l.r * rng.float(0.15, 0.3);
    const r1 = l.r * rng.float(0.6, 1.0);
    ctx.strokeStyle = `rgba(255,252,245,${rng.float(0.15, 0.4).toFixed(2)})`;
    ctx.lineWidth = rng.float(0.015, 0.035) * U;
    ctx.beginPath();
    ctx.moveTo(l.x + Math.cos(a) * r0, l.y + Math.sin(a) * r0);
    ctx.quadraticCurveTo(l.x + Math.cos(a + 0.1) * (r0 + r1) / 2, l.y + Math.sin(a + 0.1) * (r0 + r1) / 2, l.x + Math.cos(a + rng.float(-0.1, 0.1)) * r1, l.y + Math.sin(a) * r1);
    ctx.stroke();
  }
}

function macularHole(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  // greyish cuff of subretinal fluid, then a sharply punched-out red disc with yellow deposits
  softDot(ctx, l.x, l.y, l.r * 2.4, 'rgba(200,190,185,0.35)', 'rgba(200,190,185,0)', 0.45);
  ctx.fillStyle = 'rgba(190,40,25,0.95)';
  ctx.beginPath();
  ctx.arc(l.x, l.y, l.r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(250,230,215,0.5)';
  ctx.lineWidth = l.r * 0.12;
  ctx.stroke();
  for (let i = 0; i < 7; i++) {
    const a = rng.float(0, TAU);
    const d = rng.float(0, 0.65) * l.r;
    exudateDot(ctx, l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, l.r * 0.09);
  }
}

function discHeme(ctx: Ctx, l: LesionInst): void {
  // Drance haemorrhage: a splinter crossing the disc margin radially
  splinter(ctx, l.x, l.y, l.a, l.r, l.r * 0.22, l.seed);
}

/** Painted beneath the retinal vessels (outer retina / RPE / choroid). */
export const DEEP: ReadonlySet<LesionType> = new Set<LesionType>([
  'drusen-small', 'drusen-large', 'geographic-atrophy', 'subretinal-hemorrhage', 'nevus', 'pigment-clumping',
  'laser-scars', 'lattice', 'retinal-tear', 'microaneurysm', 'dot-blot-hemorrhage', 'hard-exudate',
  'retinal-whitening', 'cherry-red-spot', 'macular-edema', 'macular-hole',
]);

export function paintLesion(ctx: Ctx, l: LesionInst, L: FundusLayout, S: number): void {
  switch (l.type) {
    case 'microaneurysm': return microaneurysm(ctx, l, S);
    case 'dot-blot-hemorrhage': return dotBlot(ctx, l, S);
    case 'flame-hemorrhage': return flame(ctx, l);
    case 'cotton-wool-spot': return cottonWool(ctx, l);
    case 'hard-exudate': return hardExudate(ctx, l, L, S);
    case 'drusen-small':
    case 'drusen-large': return drusen(ctx, l, S);
    case 'geographic-atrophy': return geographicAtrophy(ctx, l);
    case 'subretinal-hemorrhage': return subretinalHeme(ctx, l);
    case 'neovascularization': return neovascularization(ctx, l, S);
    case 'retinal-tear': return retinalTear(ctx, l);
    case 'lattice': return lattice(ctx, l);
    case 'nevus': return nevus(ctx, l);
    case 'pigment-clumping': return pigment(ctx, l, S);
    case 'laser-scars': return laserScar(ctx, l, S);
    case 'hollenhorst-plaque': return hollenhorst(ctx, l, S);
    case 'retinal-whitening': return whitening(ctx, l, L, S);
    case 'cherry-red-spot': return cherryRed(ctx, l);
    case 'macular-edema': return macularEdema(ctx, l);
    case 'epiretinal-membrane': return erm(ctx, l);
    case 'macular-hole': return macularHole(ctx, l);
    case 'disc-hemorrhage': return discHeme(ctx, l);
    case 'irma': return irma(ctx, l, S);
    case 'preretinal-hemorrhage': return preretinal(ctx, l);
    case 'venous-beading': return; // painted as part of the veins
  }
}

export { rgba };
