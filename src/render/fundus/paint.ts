/**
 * paintFundus — a fundus photograph painted procedurally. World layers are
 * drawn under a world→canvas transform; optics (vignette, red-free, aperture,
 * grain) are applied in screen space.
 */
import { createRng, type PosteriorSegment } from '@core';
import { fbm, grainPattern, makeCanvas, smoothClosedPath, smoothOpenPath } from '../eye/color';
import { viewScale } from './geometry';
import { computeFundusLayout, layoutToMap, type FundusLayout } from './layout';
import { DEEP, paintLesion } from './paint-lesions';
import { U, type FundusMap, type FundusViewport, type PaintFundusOptions } from './types';
import type { Vessel } from './vessels';

const TAU = Math.PI * 2;
type Ctx = CanvasRenderingContext2D;

const TONES = {
  light: { c: '#f0904e', m: '#dc6630', e: '#a8401f', pig: 0 },
  medium: { c: '#e2793c', m: '#c85424', e: '#8a3014', pig: 0.1 },
  dark: { c: '#be6234', m: '#94411d', e: '#4f1e0c', pig: 0.35 },
  tigroid: { c: '#d8743e', m: '#b9542a', e: '#7a3216', pig: 0.2 },
} as const;

// ── layout memo (painting the same patient repeatedly, e.g. while panning)
const memo: { key: string; L: FundusLayout }[] = [];
function layoutFor(post: PosteriorSegment, eye: PaintFundusOptions['eye'], seed: number): FundusLayout {
  const key = `${eye}|${seed}|${JSON.stringify(post)}`;
  const hit = memo.find((m) => m.key === key);
  if (hit) return hit.L;
  const L = computeFundusLayout(post, eye, seed);
  memo.push({ key, L });
  if (memo.length > 8) memo.shift();
  return L;
}

// ── noise texture (RPE mottle), cached per seed
const noiseCache = new Map<number, HTMLCanvasElement | OffscreenCanvas | null>();
function mottle(seed: number): HTMLCanvasElement | OffscreenCanvas | null {
  if (noiseCache.has(seed)) return noiseCache.get(seed)!;
  const N = 192;
  const c = makeCanvas(N, N);
  let out: HTMLCanvasElement | OffscreenCanvas | null = null;
  if (c && typeof c.ctx.createImageData === 'function') {
    const img = c.ctx.createImageData(N, N);
    for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
      const v = fbm(x / 6, y / 6, seed, 4);
      const v2 = fbm(x / 2.2, y / 2.2, seed + 3, 2);
      const i = (y * N + x) * 4;
      const g = Math.round((v * 0.7 + v2 * 0.3) * 255);
      img.data[i] = g;
      img.data[i + 1] = g;
      img.data[i + 2] = g;
      img.data[i + 3] = 255;
    }
    c.ctx.putImageData(img, 0, 0);
    out = c.canvas;
  }
  if (noiseCache.size > 12) noiseCache.clear();
  noiseCache.set(seed, out);
  return out;
}

function paintBackground(ctx: Ctx, L: FundusLayout): void {
  const tone = TONES[L.post.fundusTone ?? 'medium'];
  const { a } = L;
  const cx = (a.fovea.x + a.disc.x) / 2;
  const g = ctx.createRadialGradient(cx, a.fovea.y, 0.02, cx, 0.5, 0.62);
  g.addColorStop(0, tone.c);
  g.addColorStop(0.45, tone.m);
  g.addColorStop(1, tone.e);
  ctx.fillStyle = g;
  ctx.fillRect(-0.5, -0.5, 2, 2);
  const tex = mottle(L.seed % 997);
  if (tex) {
    ctx.save();
    ctx.globalCompositeOperation = 'soft-light';
    ctx.globalAlpha = 0.32;
    ctx.drawImage(tex as CanvasImageSource, -0.05, -0.05, 1.1, 1.1);
    ctx.restore();
  }
}

/** Choroidal vessels: barely visible normally, a tiger-stripe mosaic in myopic (tigroid) fundi. */
const choroidCache = new Map<string, HTMLCanvasElement | OffscreenCanvas | null>();
const CH_PAD = 0.1;
function choroidLayer(L: FundusLayout): HTMLCanvasElement | OffscreenCanvas | null {
  const tone = L.post.fundusTone ?? 'medium';
  const key = `${tone}|${L.seed}|${L.a.eye}`;
  if (choroidCache.has(key)) return choroidCache.get(key)!;
  const N = 640;
  const off = makeCanvas(N, N);
  if (!off) return null;
  const ctx = off.ctx;
  const k = N / (1 + CH_PAD * 2);
  ctx.setTransform(k, 0, 0, k, CH_PAD * k, CH_PAD * k);
  const tig = tone === 'tigroid';
  const strength = tig ? 1 : tone === 'light' ? 0.35 : tone === 'dark' ? 0.12 : 0.18;
  const rng = createRng(L.seed).fork('choroid');
  const { a } = L;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  // a mesh of broad, gently curving vessels draining toward the four vortex veins
  const vortices: [number, number][] = [[-0.15, -0.15], [1.15, -0.15], [-0.15, 1.15], [1.15, 1.15]];
  const n = tig ? 120 : 90;
  for (let i = 0; i < n; i++) {
    let x = rng.float(-0.05, 1.05);
    let y = rng.float(-0.05, 1.05);
    const vt = vortices[(x < 0.5 ? 0 : 1) + (y < 0.5 ? 0 : 2)]!;
    let h = Math.atan2(vt[1] - y, vt[0] - x) + rng.float(-0.9, 0.9);
    const w = rng.float(0.22, 0.55) * U;
    const dFov = Math.hypot(x - a.fovea.x, y - a.fovea.y);
    const vis = tig ? Math.min(1, 0.35 + dFov * 2.2) : strength;
    ctx.strokeStyle = tig ? `rgba(208,98,52,${(rng.float(0.35, 0.6) * vis).toFixed(2)})` : `rgba(255,150,90,${(rng.float(0.2, 0.45) * vis).toFixed(3)})`;
    const curl = rng.float(-0.05, 0.05);
    const steps = 32;
    const pts: [number, number][] = [[x, y]];
    for (let s2 = 0; s2 < steps; s2++) {
      const tgt = Math.atan2(vt[1] - y, vt[0] - x);
      let d = tgt - h;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      h += d * 0.05 + curl + rng.float(-0.04, 0.04);
      x += Math.cos(h) * 0.012;
      y += Math.sin(h) * 0.012;
      pts.push([x, y]);
    }
    // tapered: draw in 4 runs of increasing then decreasing width
    const runs = 6;
    for (let r = 0; r < runs; r++) {
      const i0 = Math.floor((r * steps) / runs);
      const i1 = Math.floor(((r + 1) * steps) / runs);
      ctx.lineWidth = w * Math.sin(((r + 0.5) / runs) * Math.PI) ** 0.7;
      ctx.beginPath();
      ctx.moveTo(pts[i0]![0], pts[i0]![1]);
      for (let j = i0 + 1; j <= i1; j++) ctx.lineTo(pts[j]![0], pts[j]![1]);
      ctx.stroke();
    }
  }
  if (choroidCache.size > 10) choroidCache.clear();
  choroidCache.set(key, off.canvas);
  return off.canvas;
}

function paintChoroid(ctx: Ctx, L: FundusLayout, S: number): void {
  const tig = L.post.fundusTone === 'tigroid';
  const { a } = L;
  ctx.save();
  if (tig) {
    // dark interstitial pigment between the vessels, fading toward the posterior pole
    const g = ctx.createRadialGradient(a.fovea.x, a.fovea.y, 0.04, 0.5, 0.5, 0.6);
    g.addColorStop(0, 'rgba(96,36,16,0.18)');
    g.addColorStop(1, 'rgba(84,30,12,0.5)');
    ctx.fillStyle = g;
    ctx.fillRect(-0.5, -0.5, 2, 2);
  }
  const layer = choroidLayer(L);
  if (layer) {
    if ('filter' in ctx) ctx.filter = `blur(${Math.max(0.5, 0.08 * U * S).toFixed(1)}px)`;
    ctx.drawImage(layer as CanvasImageSource, -CH_PAD, -CH_PAD, 1 + CH_PAD * 2, 1 + CH_PAD * 2);
    if ('filter' in ctx) ctx.filter = 'none';
  }
  ctx.restore();
}

function paintMacula(ctx: Ctx, L: FundusLayout, S: number): void {
  const f = L.a.fovea;
  const g = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 2.9 * U);
  g.addColorStop(0, 'rgba(70,12,4,0.5)');
  g.addColorStop(0.3, 'rgba(80,16,6,0.32)');
  g.addColorStop(1, 'rgba(80,16,6,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(f.x, f.y, 2.9 * U, 0, TAU);
  ctx.fill();
  const g2 = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, 0.8 * U);
  g2.addColorStop(0, 'rgba(60,8,2,0.35)');
  g2.addColorStop(1, 'rgba(60,8,2,0)');
  ctx.fillStyle = g2;
  ctx.beginPath();
  ctx.arc(f.x, f.y, 0.8 * U, 0, TAU);
  ctx.fill();
  const lost = L.post.lesions.some((l) => ['macular-edema', 'macular-hole', 'drusen-large', 'geographic-atrophy', 'subretinal-hemorrhage', 'epiretinal-membrane', 'cherry-red-spot'].includes(l.type) && (l.zone === 'macula' || l.zone === 'diffuse'));
  if (!lost && !L.detachment?.maculaOff) {
    // foveolar light reflex + faint annular macular reflex
    const r = Math.max(0.035 * U, 1.2 / S);
    const fr = ctx.createRadialGradient(f.x, f.y, 0, f.x, f.y, r * 3);
    fr.addColorStop(0, 'rgba(255,250,235,0.95)');
    fr.addColorStop(0.35, 'rgba(255,240,220,0.45)');
    fr.addColorStop(1, 'rgba(255,240,220,0)');
    ctx.fillStyle = fr;
    ctx.beginPath();
    ctx.arc(f.x, f.y, r * 3, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,235,215,0.035)';
    ctx.lineWidth = 0.25 * U;
    ctx.beginPath();
    ctx.ellipse(f.x, f.y, 1.3 * U, 1.1 * U, 0, 0, TAU);
    ctx.stroke();
  }
}

/** Retinal nerve fibre layer sheen along the arcades and radiating from the disc. */
function paintNflSheen(ctx: Ctx, L: FundusLayout, S: number): void {
  ctx.save();
  if ('filter' in ctx) ctx.filter = `blur(${Math.max(1, 0.25 * U * S).toFixed(1)}px)`;
  ctx.lineCap = 'round';
  ctx.strokeStyle = 'rgba(255,225,200,0.07)';
  ctx.lineWidth = 1.1 * U;
  ctx.beginPath();
  for (const v of L.tree.vessels) {
    if (v.depth !== 0 || v.kind !== 'artery') continue;
    v.pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)));
  }
  ctx.stroke();
  if ('filter' in ctx) ctx.filter = 'none';
  const { disc } = L.a;
  const rng = createRng(L.seed).fork('nfl');
  ctx.strokeStyle = 'rgba(255,230,210,0.03)';
  ctx.lineWidth = Math.max(0.03 * U, 0.8 / S);
  for (let i = 0; i < 90; i++) {
    const ang = rng.float(0, TAU);
    const r0 = disc.ry * 1.05;
    const r1 = disc.ry * rng.float(1.6, 2.6);
    ctx.beginPath();
    ctx.moveTo(disc.x + Math.cos(ang) * r0, disc.y + Math.sin(ang) * r0);
    ctx.lineTo(disc.x + Math.cos(ang) * r1, disc.y + Math.sin(ang) * r1);
    ctx.stroke();
  }
  ctx.restore();
}

function discColors(post: PosteriorSegment) {
  switch (post.disc.color) {
    case 'pale': return { rimIn: '#f2dcc2', rimOut: '#e8c6a4', cup: '#fbf2e2' };
    case 'hyperemic': return { rimIn: '#ec8a68', rimOut: '#d8634a', cup: '#f2b89a' };
    default: return { rimIn: '#f7bf96', rimOut: '#eea27c', cup: '#fbe8c6' };
  }
}

function paintDisc(ctx: Ctx, L: FundusLayout, S: number): void {
  const { a, post, cup } = L;
  const d = a.disc;
  const col = discColors(post);
  const swollen = !!post.disc.edema || post.disc.margins === 'elevated';
  const blurred = swollen || post.disc.margins === 'blurred';
  const rng = createRng(L.seed).fork('disc');

  // peripapillary: myopic temporal crescent / scleral ring
  if (post.fundusTone === 'tigroid') {
    ctx.save();
    // temporal crescent of peripapillary atrophy only
    ctx.beginPath();
    ctx.rect(a.nasal > 0 ? d.x - 1 : d.x, d.y - 1, 1, 2);
    ctx.clip();
    ctx.beginPath();
    ctx.ellipse(d.x - a.nasal * 0.18 * U, d.y, d.rx + 0.3 * U, d.ry + 0.08 * U, 0, 0, TAU);
    const cg = ctx.createRadialGradient(d.x, d.y, d.rx, d.x - a.nasal * 0.3 * U, d.y, d.rx + 0.6 * U);
    cg.addColorStop(0, 'rgba(238,200,160,0.9)');
    cg.addColorStop(0.8, 'rgba(226,182,140,0.85)');
    cg.addColorStop(1, 'rgba(110,55,28,0.5)');
    ctx.fillStyle = cg;
    ctx.fill();
    ctx.restore();
  }
  if (!blurred) {
    ctx.strokeStyle = 'rgba(246,215,180,0.45)';
    ctx.lineWidth = Math.max(0.05 * U, 0.8 / S);
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx * 1.04, d.ry * 1.04, 0, 0, TAU);
    ctx.stroke();
    // a little peripapillary pigment
    ctx.strokeStyle = 'rgba(70,30,12,0.25)';
    ctx.lineWidth = Math.max(0.05 * U, 1 / S);
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx * 1.1, d.ry * 1.09, 0, Math.PI * 0.6, Math.PI * 1.3);
    ctx.stroke();
  }

  if (blurred) {
    // greyish peripapillary halo of swollen nerve fibres, with radial striations
    const halo = swollen ? 1.7 : 1.35;
    const hg = ctx.createRadialGradient(d.x, d.y, d.ry * 0.7, d.x, d.y, d.ry * halo);
    hg.addColorStop(0, swollen ? 'rgba(228,150,118,0.85)' : 'rgba(236,170,130,0.6)');
    hg.addColorStop(0.6, 'rgba(215,150,125,0.4)');
    hg.addColorStop(1, 'rgba(210,150,125,0)');
    ctx.fillStyle = hg;
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx * halo, d.ry * halo, 0, 0, TAU);
    ctx.fill();
  }

  // neuroretinal rim
  ctx.save();
  if (blurred && 'filter' in ctx) ctx.filter = `blur(${Math.max(1, 0.12 * U * S).toFixed(1)}px)`;
  const rg = ctx.createRadialGradient(d.x, d.y, 0, d.x, d.y, Math.max(d.rx, d.ry));
  rg.addColorStop(0, col.rimIn);
  rg.addColorStop(0.7, col.rimIn);
  rg.addColorStop(0.95, col.rimOut);
  rg.addColorStop(1, 'rgba(232,140,100,0.95)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
  if (post.disc.color === 'pale-sectoral') {
    // temporal pallor (e.g. after optic neuritis)
    ctx.save();
    ctx.beginPath();
    ctx.ellipse(d.x, d.y, d.rx, d.ry, 0, 0, TAU);
    ctx.clip();
    const tg = ctx.createLinearGradient(d.x - a.nasal * d.rx, 0, d.x, 0);
    tg.addColorStop(0, 'rgba(250,236,215,0.95)');
    tg.addColorStop(1, 'rgba(250,236,215,0)');
    ctx.fillStyle = tg;
    ctx.fillRect(d.x - d.rx, d.y - d.ry, d.rx * 2, d.ry * 2);
    ctx.restore();
  }

  // cup: pale excavation with sloping walls
  const cupPts: [number, number][] = [];
  for (let i = 0; i < 48; i++) {
    const th = (i / 48) * TAU;
    const r = cup.r(th);
    cupPts.push([d.x + Math.cos(th) * r * d.rx, d.y + Math.sin(th) * r * d.ry]);
  }
  const cupC = cupPts.reduce((acc, p) => [acc[0] + p[0] / cupPts.length, acc[1] + p[1] / cupPts.length], [0, 0]);
  ctx.save();
  ctx.beginPath();
  smoothClosedPath(ctx, cupPts.map(([x, y]) => [cupC[0] + (x - cupC[0]) * 1.12, cupC[1] + (y - cupC[1]) * 1.12] as [number, number]));
  ctx.fillStyle = 'rgba(250,220,180,0.35)';
  ctx.fill();
  ctx.beginPath();
  smoothClosedPath(ctx, cupPts);
  const cg = ctx.createRadialGradient(cupC[0], cupC[1], 0, cupC[0], cupC[1], d.ry * cup.verticalCdr * 1.1);
  cg.addColorStop(0, col.cup);
  cg.addColorStop(0.8, col.cup);
  cg.addColorStop(1, 'rgba(245,215,175,0.9)');
  ctx.fillStyle = cg;
  ctx.fill();
  // lamina cribrosa pores visible in a large cup
  if (cup.verticalCdr > 0.5) {
    ctx.clip();
    for (let i = 0; i < 30; i++) {
      const ang = rng.float(0, TAU);
      const rr = Math.sqrt(rng.next()) * d.ry * cup.verticalCdr * 0.7;
      ctx.fillStyle = 'rgba(150,130,120,0.35)';
      ctx.beginPath();
      ctx.ellipse(cupC[0] + Math.cos(ang) * rr, cupC[1] + Math.sin(ang) * rr, 0.025 * U, 0.04 * U, 0, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
  // inner shadow on the temporal cup wall (light from nasal)
  ctx.strokeStyle = 'rgba(200,120,90,0.25)';
  ctx.lineWidth = Math.max(0.05 * U, 0.8 / S);
  ctx.beginPath();
  smoothClosedPath(ctx, cupPts);
  ctx.stroke();
}

// ── vessels
function strokeVessel(ctx: Ctx, v: Vessel, widthAt: (i: number) => number, color: string, minPx: number): void {
  ctx.strokeStyle = color;
  const n = v.pts.length;
  const run = 4;
  for (let i = 0; i < n - 1; i += run) {
    const end = Math.min(n - 1, i + run);
    ctx.lineWidth = Math.max(minPx, widthAt(Math.min(n - 1, i + (run >> 1))));
    ctx.beginPath();
    ctx.moveTo(v.pts[i]![0], v.pts[i]![1]);
    for (let k = i + 1; k <= end; k++) ctx.lineTo(v.pts[k]![0], v.pts[k]![1]);
    ctx.stroke();
  }
}

function vesselWidthFn(L: FundusLayout, v: Vessel): (i: number) => number {
  if (v.kind !== 'vein' || !L.beads.length) return (i) => v.w[i]!;
  // venous beading: sausage-like calibre variation inside the affected segments
  const mod: number[] = v.pts.map(([x, y], i) => {
    let m = 1;
    for (const b of L.beads) {
      const dd = Math.hypot(x - b.x, y - b.y);
      if (dd < b.r) m = 1 + 0.55 * Math.sin(i * 1.3) * (1 - dd / b.r);
    }
    return m;
  });
  return (i) => v.w[i]! * mod[i]!;
}

function paintVessels(ctx: Ctx, L: FundusLayout, S: number, onlyKind?: 'artery' | 'vein', tint?: string): void {
  const vs = L.post.vessels;
  const minPx = 0.5 / S;
  const seg = !!vs.segmentation;
  ctx.save();
  ctx.lineCap = seg ? 'butt' : 'round';
  ctx.lineJoin = 'round';
  for (const kind of ['vein', 'artery'] as const) {
    if (onlyKind && kind !== onlyKind) continue;
    for (const v of L.tree.vessels) {
      if (v.kind !== kind) continue;
      const wf = vesselWidthFn(L, v);
      const fade = v.depth === 0 ? 1 : v.depth === 1 ? 0.92 : 0.8;
      if (seg) ctx.setLineDash([0.28 * U, 0.12 * U]);
      if (kind === 'vein') {
        strokeVessel(ctx, v, (i) => wf(i) * 1.14, `rgba(60,8,16,${0.3 * fade})`, minPx);
        strokeVessel(ctx, v, wf, tint ?? `rgba(112,20,34,${fade})`, minPx);
        ctx.setLineDash([]);
        strokeVessel(ctx, v, (i) => wf(i) * 0.22, `rgba(230,120,110,${0.18 * fade})`, minPx * 0.5);
      } else {
        const copper = vs.copperWiring;
        strokeVessel(ctx, v, (i) => wf(i) * 1.12, `rgba(120,30,15,${0.15 * fade})`, minPx);
        strokeVessel(ctx, v, wf, tint ?? (copper ? `rgba(184,82,40,${fade})` : `rgba(190,46,32,${fade})`), minPx);
        ctx.setLineDash([]);
        // central light reflex (broad & bright in arteriolosclerosis)
        strokeVessel(ctx, v, (i) => wf(i) * (copper ? 0.5 : 0.24), copper ? `rgba(236,160,92,${0.85 * fade})` : `rgba(255,175,145,${0.42 * fade})`, minPx * 0.4);
      }
    }
    if (kind === 'vein' && !onlyKind && L.post.vessels.avNicking) paintNicking(ctx, L, S);
  }
  ctx.restore();
}

/** AV nicking: the vein tapers & seems interrupted either side of a crossing arteriole. */
function paintNicking(ctx: Ctx, L: FundusLayout, S: number): void {
  const tone = TONES[L.post.fundusTone ?? 'medium'];
  for (const c of L.tree.crossings) {
    if (!c.arteryOver) continue;
    const v = L.tree.vessels[c.vein]!;
    const w = v.w[c.idx]!;
    const len = Math.max(w * 3.5, 0.25 * U);
    const dx = Math.cos(c.angle);
    const dy = Math.sin(c.angle);
    ctx.save();
    ctx.lineCap = 'round';
    // conceal the vein near the crossing
    ctx.strokeStyle = tone.m;
    ctx.lineWidth = w * 1.5;
    ctx.beginPath();
    ctx.moveTo(c.x - dx * len, c.y - dy * len);
    ctx.lineTo(c.x + dx * len, c.y + dy * len);
    ctx.stroke();
    // tapered stumps
    for (const s of [-1, 1]) {
      for (let k = 0; k < 6; k++) {
        const t0 = len * (1 - k / 6);
        const t1 = len * (1 - (k + 1) / 6);
        ctx.strokeStyle = 'rgba(118,22,30,1)';
        ctx.lineWidth = Math.max(0.5 / S, w * (1 - (k + 1) / 7));
        ctx.beginPath();
        ctx.moveTo(c.x + s * dx * t0, c.y + s * dy * t0);
        ctx.lineTo(c.x + s * dx * t1, c.y + s * dy * t1);
        ctx.stroke();
      }
    }
    ctx.restore();
  }
}

/** Disc oedema obscures vessels as they cross the swollen margin. */
function paintDiscOedemaVeil(ctx: Ctx, L: FundusLayout, S: number): void {
  const d = L.a.disc;
  const swollen = !!L.post.disc.edema || L.post.disc.margins === 'elevated';
  if (!swollen && L.post.disc.margins !== 'blurred') return;
  const k = swollen ? 1 : 0.45;
  ctx.save();
  const g = ctx.createRadialGradient(d.x, d.y, d.ry * 0.55, d.x, d.y, d.ry * 1.55);
  g.addColorStop(0, 'rgba(240,190,160,0)');
  g.addColorStop(0.35, `rgba(226,150,120,${0.72 * k})`);
  g.addColorStop(0.7, `rgba(214,140,115,${0.45 * k})`);
  g.addColorStop(1, 'rgba(232,180,155,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(d.x, d.y, d.rx * 1.6, d.ry * 1.6, 0, 0, TAU);
  ctx.fill();
  // radial striations of swollen axons
  const rng = createRng(L.seed).fork('striae');
  ctx.strokeStyle = `rgba(255,220,200,${0.13 * k})`;
  ctx.lineWidth = Math.max(0.03 * U, 0.7 / S);
  for (let i = 0; i < 70; i++) {
    const ang = rng.float(0, TAU);
    ctx.beginPath();
    ctx.moveTo(d.x + Math.cos(ang) * d.rx * 0.75, d.y + Math.sin(ang) * d.ry * 0.75);
    ctx.lineTo(d.x + Math.cos(ang) * d.rx * rng.float(1.3, 1.7), d.y + Math.sin(ang) * d.ry * rng.float(1.3, 1.7));
    ctx.stroke();
  }
  if (swollen) {
    // Paton lines: circumferential folds on the temporal side
    ctx.strokeStyle = 'rgba(255,240,225,0.25)';
    ctx.lineWidth = Math.max(0.03 * U, 0.7 / S);
    for (let i = 0; i < 3; i++) {
      const rr = 1.3 + i * 0.14;
      const mid = L.a.nasal > 0 ? Math.PI : 0;
      ctx.beginPath();
      ctx.ellipse(d.x, d.y, d.rx * rr, d.ry * rr, 0, mid - 0.7, mid + 0.7);
      ctx.stroke();
    }
  }
  ctx.restore();
}

function detachPath(ctx: Ctx, L: FundusLayout, withOuter = true): void {
  ctx.beginPath();
  if (withOuter) ctx.rect(-1, -1, 3, 3);
  smoothClosedPath(ctx, L.detachment!.polygon);
}

function paintDetachment(ctx: Ctx, L: FundusLayout, S: number): void {
  if (!L.detachment) return;
  const rng = createRng(L.seed).fork('rd');
  ctx.save();
  detachPath(ctx, L);
  ctx.clip('evenodd');
  // opaque, grey-white, elevated retina
  const g = ctx.createRadialGradient(0.5, 0.5, 0.1, 0.5, 0.5, 0.62);
  g.addColorStop(0, 'rgba(196,184,180,0.5)');
  g.addColorStop(1, 'rgba(206,196,192,0.72)');
  ctx.fillStyle = g;
  ctx.fillRect(-1, -1, 3, 3);
  // vessels ride on the billowing retina: darker, displaced
  ctx.save();
  ctx.translate(0.004, 0.004);
  paintVessels(ctx, L, S, 'vein', 'rgba(70,14,22,0.85)');
  paintVessels(ctx, L, S, 'artery', 'rgba(120,30,30,0.8)');
  ctx.restore();
  // undulating folds running parallel to the detachment border
  ctx.lineCap = 'round';
  const poly = L.detachment.polygon;
  for (let i = 0; i < 26; i++) {
    const k = 1.06 + (i % 13) * 0.08 + rng.float(-0.03, 0.03);
    const start = rng.int(0, poly.length - 1);
    const len = rng.int(5, 12);
    const pts: [number, number][] = [];
    for (let j = 0; j < len; j++) {
      const p = poly[(start + j) % poly.length]!;
      const wob = 1 + Math.sin(j * 0.8 + i) * 0.015;
      pts.push([0.5 + (p[0] - 0.5) * k * wob, 0.5 + (p[1] - 0.5) * k * wob]);
    }
    ctx.strokeStyle = 'rgba(80,60,60,0.16)';
    ctx.lineWidth = 0.22 * U;
    ctx.beginPath();
    smoothOpenPath(ctx, pts.map(([x, y]) => [x + 0.002, y + 0.003] as [number, number]));
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 0.07 * U;
    ctx.beginPath();
    smoothOpenPath(ctx, pts);
    ctx.stroke();
  }
  ctx.restore();
  // the detachment border: a soft elevated ridge
  ctx.save();
  detachPath(ctx, L, false);
  ctx.strokeStyle = 'rgba(240,230,225,0.35)';
  ctx.lineWidth = 0.1 * U;
  ctx.stroke();
  ctx.restore();
}

function paintVitreous(ctx: Ctx, L: FundusLayout, S: number): void {
  const vit = L.post.vitreous;
  const rng = createRng(L.seed).fork('vit');
  const { a } = L;
  ctx.save();
  switch (vit) {
    case 'hemorrhage': {
      ctx.fillStyle = 'rgba(110,12,10,0.42)';
      ctx.fillRect(-1, -1, 3, 3);
      if ('filter' in ctx) ctx.filter = `blur(${Math.max(2, 0.8 * U * S).toFixed(1)}px)`;
      for (let i = 0; i < 9; i++) {
        const x = rng.float(0.2, 0.8);
        const y = rng.float(0.45, 0.95);
        const r = rng.float(0.08, 0.2);
        const g = ctx.createRadialGradient(x, y, 0, x, y, r);
        g.addColorStop(0, 'rgba(70,4,6,0.75)');
        g.addColorStop(1, 'rgba(70,4,6,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, TAU);
        ctx.fill();
      }
      if ('filter' in ctx) ctx.filter = 'none';
      // boat-shaped preretinal haemorrhage with a flat fluid level
      const bx = (a.fovea.x + a.disc.x) / 2;
      const by = a.fovea.y - 2.2 * U;
      ctx.fillStyle = 'rgba(120,8,12,0.9)';
      ctx.beginPath();
      ctx.moveTo(bx - 1.2 * U, by);
      ctx.lineTo(bx + 1.2 * U, by);
      ctx.quadraticCurveTo(bx, by + 1.6 * U, bx - 1.2 * U, by);
      ctx.fill();
      break;
    }
    case 'weiss-ring': {
      const x = a.disc.x - a.nasal * 0.04;
      const y = a.disc.y - 0.03;
      if ('filter' in ctx) ctx.filter = `blur(${Math.max(1, 0.12 * U * S).toFixed(1)}px)`;
      ctx.strokeStyle = 'rgba(30,20,20,0.3)';
      ctx.lineWidth = 0.18 * U;
      ctx.beginPath();
      ctx.ellipse(x + 0.01, y + 0.012, 0.045, 0.036, 0.4, 0, TAU);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(235,230,225,0.55)';
      ctx.lineWidth = 0.14 * U;
      ctx.beginPath();
      ctx.ellipse(x, y, 0.045, 0.036, 0.4, 0, TAU * 0.92);
      ctx.stroke();
      break;
    }
    case 'floaters':
    case 'pigment-shafer':
    case 'cells': {
      if (vit === 'cells') {
        ctx.fillStyle = 'rgba(235,225,220,0.22)';
        ctx.fillRect(-1, -1, 3, 3);
      }
      if ('filter' in ctx) ctx.filter = `blur(${Math.max(1, 0.15 * U * S).toFixed(1)}px)`;
      ctx.lineCap = 'round';
      for (let i = 0; i < (vit === 'floaters' ? 5 : 2); i++) {
        let x = rng.float(0.25, 0.75);
        let y = rng.float(0.25, 0.75);
        let h = rng.float(0, TAU);
        ctx.strokeStyle = 'rgba(40,25,25,0.25)';
        ctx.lineWidth = rng.float(0.1, 0.25) * U;
        ctx.beginPath();
        ctx.moveTo(x, y);
        for (let k = 0; k < 14; k++) {
          h += rng.float(-0.5, 0.5);
          x += Math.cos(h) * 0.012;
          y += Math.sin(h) * 0.012;
          ctx.lineTo(x, y);
        }
        ctx.stroke();
      }
      if ('filter' in ctx) ctx.filter = 'none';
      if (vit === 'pigment-shafer') {
        for (let i = 0; i < 120; i++) {
          ctx.fillStyle = 'rgba(70,40,20,0.55)';
          ctx.beginPath();
          ctx.arc(rng.float(0.1, 0.9), rng.float(0.1, 0.9), Math.max(0.02 * U, 0.6 / S), 0, TAU);
          ctx.fill();
        }
      }
      break;
    }
  }
  ctx.restore();
}

function redFreeFilter(ctx: Ctx, w: number, h: number): void {
  ctx.save();
  // keep luminance (≈ green channel contrast: blood turns near-black, NFL brightens)
  ctx.globalCompositeOperation = 'saturation';
  ctx.fillStyle = '#808080';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = '#b8b8b8';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'color-dodge';
  ctx.fillStyle = 'rgba(70,70,70,1)';
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'color';
  ctx.fillStyle = '#4d9a6a';
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

/**
 * Paint a fundus into (0,0,w,h). Returns the FundusMap (normalised world
 * coordinates; use fundusToCanvas / canvasToFundus with the same view).
 */
export function paintFundus(ctx: CanvasRenderingContext2D, w: number, h: number, post: PosteriorSegment, opts: PaintFundusOptions): FundusMap {
  const view: FundusViewport = opts.view ?? { cx: 0.5, cy: 0.5, zoom: 1 };
  const L = layoutFor(post, opts.eye, opts.seed);
  const map = layoutToMap(L, view);
  const frame = opts.frame ?? true;
  const S = viewScale(w, h, view);

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, w, h);
  ctx.clip();
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  const R = (Math.min(w, h) / 2) * 0.985;
  if (frame) {
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, R, 0, TAU);
    ctx.clip();
  }

  ctx.save();
  ctx.translate(w / 2 - view.cx * S, h / 2 - view.cy * S);
  ctx.scale(S, S);
  paintBackground(ctx, L);
  paintChoroid(ctx, L, S);
  paintMacula(ctx, L, S);
  paintNflSheen(ctx, L, S);
  for (const l of L.lesions) if (DEEP.has(l.type)) paintLesion(ctx, l, L, S);
  paintDisc(ctx, L, S);
  paintVessels(ctx, L, S);
  {
    const st = { x: L.a.disc.x + L.a.nasal * 0.15 * U, y: L.a.disc.y + 0.05 * U };
    const sg = ctx.createRadialGradient(st.x, st.y, 0, st.x, st.y, 0.16 * U);
    sg.addColorStop(0, 'rgba(120,30,30,0.55)');
    sg.addColorStop(1, 'rgba(120,30,30,0)');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(st.x, st.y, 0.16 * U, 0, TAU);
    ctx.fill();
  }
  paintDiscOedemaVeil(ctx, L, S);
  for (const l of L.lesions) if (!DEEP.has(l.type)) paintLesion(ctx, l, L, S);
  paintDetachment(ctx, L, S);
  if (opts.vitreous ?? true) paintVitreous(ctx, L, S);
  ctx.restore();

  // camera optics: brighter centre, falloff to the aperture edge
  const vg = ctx.createRadialGradient(w / 2, h / 2, R * 0.35, w / 2, h / 2, frame ? R : Math.hypot(w, h) / 2);
  vg.addColorStop(0, 'rgba(255,240,220,0.05)');
  vg.addColorStop(0.7, 'rgba(0,0,0,0)');
  vg.addColorStop(1, 'rgba(10,0,0,0.6)');
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, w, h);
  if (opts.redFree) redFreeFilter(ctx, w, h);
  const grain = grainPattern(ctx, 0.05);
  if (grain) {
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = grain;
    ctx.fillRect(0, 0, w, h);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }
  ctx.restore();
  if (frame) {
    // soft aperture edge
    ctx.save();
    const eg = ctx.createRadialGradient(w / 2, h / 2, R * 0.94, w / 2, h / 2, R * 1.005);
    eg.addColorStop(0, 'rgba(0,0,0,0)');
    eg.addColorStop(1, 'rgba(0,0,0,0.85)');
    ctx.fillStyle = eg;
    ctx.beginPath();
    ctx.arc(w / 2, h / 2, R * 1.01, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
  return map;
}

/** The map alone (no canvas) — for hit-testing / scoring logic and tests. */
export function fundusMap(post: PosteriorSegment, eye: PaintFundusOptions['eye'], seed: number, view: FundusViewport = { cx: 0.5, cy: 0.5, zoom: 1 }): FundusMap {
  return layoutToMap(layoutFor(post, eye, seed), view);
}
