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
  ctx.beginPath();
  smoothClosedPath(ctx, blob(rng, l.x, l.y, r, 10, 0.28));
  const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, r * 1.2);
  g.addColorStop(0, 'rgba(110,6,14,0.95)');
  g.addColorStop(0.75, 'rgba(135,12,20,0.9)');
  g.addColorStop(1, 'rgba(150,20,25,0.4)');
  ctx.fillStyle = g;
  ctx.fill();
}

function flame(ctx: Ctx, l: LesionInst): void {
  // feathery streak in the nerve fibre layer, frayed at both ends along the fibres
  const rng = createRng(l.seed);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a);
  const L = l.r;
  const W = L * rng.float(0.22, 0.32);
  for (let i = 0; i < 16; i++) {
    const oy = rng.float(-W, W);
    const len = L * rng.float(0.6, 1.0) * (1 - Math.abs(oy) / (W * 1.6));
    const ox = rng.float(-L * 0.15, L * 0.15);
    ctx.strokeStyle = `rgba(${rng.int(150, 185)},${rng.int(12, 30)},${rng.int(18, 30)},${rng.float(0.45, 0.8).toFixed(2)})`;
    ctx.lineWidth = W * rng.float(0.35, 0.7);
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(ox - len, oy * 0.7);
    ctx.quadraticCurveTo(ox, oy, ox + len, oy * 0.7);
    ctx.stroke();
  }
  ctx.restore();
}

function cottonWool(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a + Math.PI / 2);
  // fluffy, fibrillated white patch with feathery margins
  for (let i = 0; i < 14; i++) {
    const ox = rng.float(-0.6, 0.6) * l.r;
    const oy = rng.float(-0.35, 0.35) * l.r;
    softDot(ctx, ox, oy, l.r * rng.float(0.35, 0.6), 'rgba(250,246,236,0.55)', 'rgba(245,240,230,0)', 0.2);
  }
  ctx.strokeStyle = 'rgba(255,252,245,0.35)';
  ctx.lineWidth = l.r * 0.06;
  for (let i = 0; i < 10; i++) {
    const ox = rng.float(-0.7, 0.7) * l.r;
    ctx.beginPath();
    ctx.moveTo(ox, -l.r * 0.55);
    ctx.lineTo(ox + rng.float(-0.1, 0.1) * l.r, l.r * 0.55);
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
  for (let i = 0; i < 14; i++) {
    const a = rng.float(0, TAU);
    ctx.strokeStyle = `rgba(214,110,60,${alpha.toFixed(2)})`;
    ctx.lineWidth = rng.float(0.1, 0.22) * U;
    ctx.beginPath();
    ctx.moveTo(x + Math.cos(a) * r * 1.2, y + Math.sin(a) * r * 1.2);
    ctx.bezierCurveTo(x + rng.float(-r, r), y + rng.float(-r, r), x + rng.float(-r, r), y + rng.float(-r, r), x + Math.cos(a + 2.5) * r * 1.2, y + Math.sin(a + 2.5) * r * 1.2);
    ctx.stroke();
  }
}

function geographicAtrophy(ctx: Ctx, l: LesionInst): void {
  const rng = createRng(l.seed);
  // multilobular, sharply demarcated RPE loss exposing large choroidal vessels
  const pts: [number, number][] = [];
  const lobes = 4 + rng.int(0, 3);
  const ph = rng.float(0, TAU);
  for (let i = 0; i < 40; i++) {
    const a = (i / 40) * TAU;
    const k = 1 + 0.18 * Math.cos(a * lobes + ph) + rng.float(-0.05, 0.05);
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
  choroidalVesselsIn(ctx, rng, l.x, l.y, l.r, 0.55);
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

function neovascularization(ctx: Ctx, l: LesionInst, S: number): void {
  const rng = createRng(l.seed);
  const nvd = l.variant === 'nvd';
  // fine, lacy, looping new vessels on a faint fibrous veil
  softDot(ctx, l.x, l.y, l.r * 1.1, 'rgba(240,220,210,0.12)', 'rgba(240,220,210,0)', 0.3);
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  const loops = nvd ? 26 : 14;
  for (let i = 0; i < loops; i++) {
    const a0 = rng.float(0, TAU);
    let x = l.x + Math.cos(a0) * l.r * rng.float(0, nvd ? 0.6 : 0.3);
    let y = l.y + Math.sin(a0) * l.r * rng.float(0, nvd ? 0.6 : 0.3);
    let h = rng.float(0, TAU);
    ctx.strokeStyle = `rgba(${rng.int(185, 215)},${rng.int(30, 55)},${rng.int(40, 60)},${rng.float(0.6, 0.9).toFixed(2)})`;
    ctx.lineWidth = Math.max(0.018 * U, minPx(S, 0.6));
    ctx.beginPath();
    ctx.moveTo(x, y);
    const steps = 18;
    const curl = rng.float(0.25, 0.45) * (rng.chance(0.5) ? 1 : -1);
    for (let k = 0; k < steps; k++) {
      h += curl + rng.float(-0.2, 0.2);
      x += Math.cos(h) * l.r * 0.09;
      y += Math.sin(h) * l.r * 0.09;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
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
  ctx.rotate(l.a); // circumferential
  const L = l.r;
  const W = L * 0.28;
  ctx.beginPath();
  ctx.ellipse(0, 0, L, W, 0, 0, TAU);
  ctx.fillStyle = 'rgba(165,55,35,0.55)';
  ctx.fill();
  ctx.clip();
  // white sclerosed vessels in a criss-cross lattice
  ctx.strokeStyle = 'rgba(245,240,230,0.85)';
  ctx.lineWidth = 0.04 * U;
  for (let i = 0; i < 9; i++) {
    const x0 = rng.float(-L, L);
    ctx.beginPath();
    ctx.moveTo(x0 - W, -W);
    ctx.lineTo(x0 + W * rng.float(0.5, 1.5), W);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x0 + W, -W);
    ctx.lineTo(x0 - W * rng.float(0.5, 1.5), W);
    ctx.stroke();
  }
  ctx.restore();
  // pigment clumps at the margins
  for (let i = 0; i < 10; i++) {
    const t = rng.float(-1, 1);
    const side = rng.chance(0.5) ? 1 : -1;
    const lx = t * l.r;
    const ly = side * l.r * 0.28 * Math.sqrt(1 - t * t);
    const x = l.x + lx * Math.cos(l.a) - ly * Math.sin(l.a);
    const y = l.y + lx * Math.sin(l.a) + ly * Math.cos(l.a);
    softDot(ctx, x, y, rng.float(0.05, 0.1) * U, 'rgba(35,15,8,0.9)', 'rgba(35,15,8,0)', 0.5);
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
  ctx.beginPath();
  smoothClosedPath(ctx, blob(rng, l.x, l.y, r, 9, 0.45, 0.6, l.a));
  ctx.fillStyle = 'rgba(28,14,8,0.88)';
  ctx.fill();
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

function whitening(ctx: Ctx, l: LesionInst, L: FundusLayout): void {
  const rng = createRng(l.seed);
  if (l.variant === 'pole') {
    // ischaemic posterior pole: opaque milky retina, thinnest at the foveola
    const g = ctx.createRadialGradient(l.x, l.y, 0, l.x, l.y, l.r);
    g.addColorStop(0, 'rgba(236,228,218,0.72)');
    g.addColorStop(0.6, 'rgba(232,224,214,0.6)');
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
  // thickened, greyish, glistening retina; cystoid petals around the fovea
  softDot(ctx, l.x, l.y, l.r, 'rgba(225,205,190,0.32)', 'rgba(225,205,190,0)', 0.35);
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * TAU + rng.float(-0.1, 0.1);
    const d = l.r * 0.32;
    ctx.fillStyle = 'rgba(240,225,210,0.22)';
    ctx.beginPath();
    ctx.ellipse(l.x + Math.cos(a) * d, l.y + Math.sin(a) * d, l.r * 0.22, l.r * 0.1, a, 0, TAU);
    ctx.fill();
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 0.03 * U;
  for (let i = 0; i < 8; i++) {
    const a = rng.float(0, TAU);
    ctx.beginPath();
    ctx.arc(l.x, l.y, l.r * rng.float(0.5, 0.9), a, a + rng.float(0.3, 0.8));
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
  // Drance haemorrhage: splinter crossing the disc margin radially
  const rng = createRng(l.seed);
  ctx.save();
  ctx.translate(l.x, l.y);
  ctx.rotate(l.a);
  for (let i = 0; i < 7; i++) {
    ctx.strokeStyle = `rgba(${rng.int(160, 190)},18,24,${rng.float(0.6, 0.9).toFixed(2)})`;
    ctx.lineWidth = l.r * rng.float(0.15, 0.3);
    ctx.lineCap = 'round';
    const oy = rng.float(-0.15, 0.15) * l.r;
    ctx.beginPath();
    ctx.moveTo(-l.r * 0.8, oy);
    ctx.lineTo(l.r * rng.float(0.7, 1.1), oy * 1.4);
    ctx.stroke();
  }
  ctx.restore();
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
    case 'retinal-whitening': return whitening(ctx, l, L);
    case 'cherry-red-spot': return cherryRed(ctx, l);
    case 'macular-edema': return macularEdema(ctx, l);
    case 'epiretinal-membrane': return erm(ctx, l);
    case 'macular-hole': return macularHole(ctx, l);
    case 'disc-hemorrhage': return discHeme(ctx, l);
    case 'venous-beading': return; // painted as part of the veins
  }
}

export { rgba };
