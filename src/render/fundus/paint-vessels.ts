/**
 * Retinal vessel painting. Every vessel is filled as ONE tapered polygon with
 * smooth (Catmull-Rom → Bézier) edges, so there are no polyline kinks, joint
 * beads or blunt caps at any zoom; vessels of a kind and order are unioned
 * into a single fill per layer so translucent layers never double up where
 * trunks share a course. Also: venous beading, AV nicking (the vein tapers
 * either side of a crossing arteriole), and CRAO box-carring (segmented blood
 * columns in a few larger vessels, with the pale vessel wall left visible).
 */
import { createRng } from '@core';
import { smoothOpenPath } from '../eye/color';
import type { FundusLayout } from './layout';
import { U } from './types';
import type { Vessel } from './vessels';

type Ctx = CanvasRenderingContext2D;
type Pt = [number, number];
export type Displace = (x: number, y: number) => Pt;

/** Arc length at each point. */
export function arcLengths(pts: readonly Pt[]): number[] {
  const s = [0];
  for (let i = 1; i < pts.length; i++) s.push(s[i - 1]! + Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]));
  return s;
}

/**
 * Append a tapered ribbon (closed sub-path) along `pts` with full widths `w`.
 * The start gets a round cap; the end a round cap scaled to its width (so a
 * tip tapered to ~0 ends in a point).
 */
export function taperPath(ctx: Ctx, pts: readonly Pt[], w: readonly number[]): void {
  const n = pts.length;
  if (n < 2) return;
  const left: Pt[] = [];
  const right: Pt[] = [];
  const tang: number[] = [];
  for (let i = 0; i < n; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(n - 1, i + 1)]!;
    const t = Math.atan2(b[1] - a[1], b[0] - a[0]);
    tang.push(t);
    const h = w[i]! / 2;
    const nx = -Math.sin(t) * h;
    const ny = Math.cos(t) * h;
    left.push([pts[i]![0] + nx, pts[i]![1] + ny]);
    right.push([pts[i]![0] - nx, pts[i]![1] - ny]);
  }
  ctx.moveTo(left[0]![0], left[0]![1]);
  smoothOpenPath(ctx, left, false);
  const te = tang[n - 1]!;
  ctx.arc(pts[n - 1]![0], pts[n - 1]![1], w[n - 1]! / 2, te + Math.PI / 2, te - Math.PI / 2, true);
  smoothOpenPath(ctx, right.slice().reverse(), false);
  const ts = tang[0]!;
  ctx.arc(pts[0]![0], pts[0]![1], w[0]! / 2, ts - Math.PI / 2, ts - Math.PI * 1.5, true);
  ctx.closePath();
}

/** Calibre modifiers: venous beading and AV nicking. */
function calibre(L: FundusLayout, v: Vessel, vi: number, s: readonly number[]): number[] {
  const out = v.w.slice();
  if (v.kind !== 'vein') return out;
  if (L.beads.length) {
    for (let i = 0; i < out.length; i++) {
      const [x, y] = v.pts[i]!;
      for (const b of L.beads) {
        const dd = Math.hypot(x - b.x, y - b.y);
        // sausage-like dilatations and constrictions
        if (dd < b.r) out[i] = out[i]! * (1 + 0.5 * Math.sin(s[i]! / (0.16 * U)) * Math.sin((1 - dd / b.r) * Math.PI * 0.5));
      }
    }
  }
  if (L.post.vessels.avNicking) {
    for (const c of L.tree.crossings) {
      if (c.vein !== vi || !c.arteryOver) continue;
      const s0 = s[c.idx]!;
      const len = Math.max(v.w[c.idx]! * 3, 0.22 * U);
      for (let i = 0; i < out.length; i++) {
        const d = Math.abs(s[i]! - s0) / len;
        // the vein tapers either side of the crossing and is hidden beneath the sclerosed arteriole
        if (d < 1.6) out[i] = out[i]! * (1 - 0.85 * Math.exp(-d * d * 1.6));
      }
    }
  }
  return out;
}

/** Tip taper over the last stretch of a vessel so small branches fade to a point. */
function tipTaper(s: readonly number[], depth: number): (i: number) => number {
  const total = s[s.length - 1] || 1;
  const span = Math.min(total * (depth === 0 ? 0.12 : 0.3), 1.2 * U);
  return (i) => {
    const rem = total - s[i]!;
    if (rem >= span) return 1;
    const t = rem / span;
    return 0.12 + 0.88 * t * t * (3 - 2 * t);
  };
}

interface Prepared {
  v: Vessel;
  pts: Pt[];
  w: number[];
  s: number[];
  /** box-carring blood columns: [s0, s1] arc-length ranges, if segmented */
  columns?: [number, number][];
}

/** Which vessels show box-carring and where the blood columns lie. */
function boxCarring(v: Vessel, vi: number, s: readonly number[], seed: number): [number, number][] | undefined {
  if (v.depth > 1) return undefined;
  const rng = createRng(seed).fork(`box-${vi}`);
  const p = v.depth === 0 ? (v.kind === 'artery' ? 0.55 : 0.45) : 0.15;
  if (!rng.chance(p)) return undefined;
  const total = s[s.length - 1]!;
  const a0 = total * rng.float(0.12, 0.3);
  const a1 = Math.min(total * rng.float(0.5, 0.8), a0 + rng.float(2.5, 5) * U);
  const cols: [number, number][] = [[0, a0]];
  let x = a0 + rng.float(0.04, 0.1) * U;
  while (x < a1) {
    const len = rng.float(0.12, 0.55) * U;
    cols.push([x, Math.min(a1, x + len)]);
    x += len + rng.float(0.05, 0.17) * U;
  }
  cols.push([Math.max(x, a1), total]);
  return cols;
}

function slice(p: Prepared, s0: number, s1: number): { pts: Pt[]; w: number[] } {
  const pts: Pt[] = [];
  const w: number[] = [];
  for (let i = 0; i < p.pts.length; i++) {
    if (p.s[i]! < s0 || p.s[i]! > s1) continue;
    pts.push(p.pts[i]!);
    w.push(p.w[i]!);
  }
  return { pts, w };
}

export interface VesselPaintOptions {
  onlyKind?: 'artery' | 'vein';
  /** override body colour (e.g. detached retina) */
  tint?: { vein: string; artery: string };
  /** warp the course (e.g. over detachment folds) */
  displace?: Displace;
  /** draw the central light reflexes (default true) */
  reflex?: boolean;
}

export function paintVessels(ctx: Ctx, L: FundusLayout, S: number, o: VesselPaintOptions = {}): void {
  const vs = L.post.vessels;
  const minW = 0.6 / S;
  const seg = !!vs.segmentation;
  const prepared: Prepared[] = L.tree.vessels.map((v, vi) => {
    const pts = o.displace ? v.pts.map(([x, y]) => o.displace!(x, y)) : (v.pts as Pt[]);
    const s = arcLengths(v.pts as Pt[]);
    const cal = calibre(L, v, vi, s);
    const tip = tipTaper(s, v.depth);
    const w = cal.map((wi, i) => Math.max(minW * (v.depth ? 0.8 : 1), wi) * tip(i));
    return { v, pts, w, s, columns: seg ? boxCarring(v, vi, s, L.seed) : undefined };
  });
  const blur = (k: number) => {
    if ('filter' in ctx) ctx.filter = `blur(${Math.max(0, k * U * S).toFixed(2)}px)`;
  };
  const noBlur = () => {
    if ('filter' in ctx) ctx.filter = 'none';
  };
  const layer = (kind: 'artery' | 'vein', depths: number[], scale: number, style: string, opts: { skipSeg?: boolean; trim?: number } = {}) => {
    ctx.beginPath();
    for (const p of prepared) {
      if (p.v.kind !== kind || !depths.includes(p.v.depth)) continue;
      if (opts.skipSeg && p.columns) continue;
      let pts = p.pts;
      let w = p.w.map((x) => x * scale);
      if (opts.trim) {
        // light reflexes start a little way out of the cup
        const k = p.s.findIndex((x) => x > opts.trim!);
        if (k < 0 || pts.length - k < 3) continue;
        pts = pts.slice(k);
        w = w.slice(k);
      }
      taperPath(ctx, pts, w);
    }
    ctx.fillStyle = style;
    ctx.fill();
  };
  const copper = !!vs.copperWiring;
  ctx.save();
  for (const kind of ['vein', 'artery'] as const) {
    if (o.onlyKind && kind !== o.onlyKind) continue;
    const vein = kind === 'vein';
    // soft halo: the blood column seen through the slightly scattering retina
    blur(0.02);
    layer(kind, [0, 1, 2], 1.45, vein ? 'rgba(80,12,22,0.2)' : 'rgba(140,40,22,0.14)');
    blur(0.006);
    for (const [depth, fade] of [[0, 1], [1, 0.93], [2, 0.82]] as const) {
      const body = o.tint ? (vein ? o.tint.vein : o.tint.artery) : vein ? `rgba(112,20,36,${fade})` : copper ? `rgba(190,92,46,${fade})` : `rgba(194,54,40,${fade})`;
      layer(kind, [depth], 1, body, { skipSeg: true });
    }
    noBlur();
    // segmented vessels: the pale, near-empty wall, then irregular columns of dark blood
    for (const p of prepared) {
      if (p.v.kind !== kind || !p.columns) continue;
      ctx.beginPath();
      taperPath(ctx, p.pts, p.w.map((x) => x * 1.05));
      ctx.fillStyle = vein ? 'rgba(206,140,130,0.5)' : 'rgba(214,150,132,0.45)';
      ctx.fill();
      blur(0.008);
      ctx.beginPath();
      for (const [a, b] of p.columns) {
        const sl = slice(p, a, b);
        if (sl.pts.length >= 2) taperPath(ctx, sl.pts, sl.w.map((x) => x * 0.92));
      }
      ctx.fillStyle = vein ? 'rgba(96,14,30,0.95)' : 'rgba(150,34,32,0.92)';
      ctx.fill();
      noBlur();
    }
    if (o.reflex === false) continue;
    // central light reflex: subtle on veins, brighter and broad on (sclerosed) arteries
    const trim = (L.a.disc.ry * Math.max(0.3, L.cup.verticalCdr)) * 1.1;
    if (vein) {
      layer('vein', [0, 1], 0.42, 'rgba(150,40,56,0.45)', { skipSeg: true });
      blur(0.004);
      layer('vein', [0, 1], 0.14, 'rgba(225,140,140,0.16)', { skipSeg: true, trim });
      noBlur();
    } else {
      blur(0.004);
      layer('artery', [0, 1, 2], copper ? 0.5 : 0.3, copper ? 'rgba(242,172,104,0.8)' : 'rgba(255,186,156,0.42)', { skipSeg: true, trim });
      noBlur();
    }
  }
  ctx.restore();
}
