/**
 * Procedural retinal vasculature (pure, deterministic): four arcades (ST, IT,
 * SN, IN) each with an artery and a vein, small nasal/macular trunks, and
 * recursive side-branches that respect the foveal avascular zone.
 */
import { createRng, type PosteriorSegment, type Rng, type Zone } from '@core';
import { fbm } from '../eye/color';
import type { Anatomy } from './geometry';
import { U } from './types';

export type VesselKind = 'artery' | 'vein';
export interface Vessel {
  kind: VesselKind;
  pts: [number, number][];
  /** width (world units) at each point */
  w: number[];
  depth: number;
}
export interface Crossing { x: number; y: number; vein: number; idx: number; arteryOver: boolean; angle: number }
export interface VesselTree {
  vessels: Vessel[];
  crossings: Crossing[];
  /** arterial bifurcations (for Hollenhorst plaques) */
  bifurcations: { x: number; y: number; zone?: Zone }[];
}

const STEP = 0.11 * U;

function catmull(ctrl: [number, number][], step: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = 0; i < ctrl.length - 1; i++) {
    const p0 = ctrl[Math.max(0, i - 1)]!;
    const p1 = ctrl[i]!;
    const p2 = ctrl[i + 1]!;
    const p3 = ctrl[Math.min(ctrl.length - 1, i + 2)]!;
    const len = Math.hypot(p2[0] - p1[0], p2[1] - p1[1]);
    const n = Math.max(2, Math.ceil(len / step));
    for (let j = 0; j < n; j++) {
      const t = j / n;
      const t2 = t * t;
      const t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) =>
        0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  out.push(ctrl[ctrl.length - 1]!);
  return out;
}

/** Perpendicular wiggle for tortuosity. */
function wiggle(pts: [number, number][], seed: number, amp: number, freq: number): [number, number][] {
  if (amp <= 0) return pts;
  const out: [number, number][] = [];
  let s = 0;
  for (let i = 0; i < pts.length; i++) {
    const a = pts[Math.max(0, i - 1)]!;
    const b = pts[Math.min(pts.length - 1, i + 1)]!;
    const dx = b[0] - a[0];
    const dy = b[1] - a[1];
    const L = Math.hypot(dx, dy) || 1;
    if (i > 0) s += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
    const ramp = Math.min(1, s / (1.2 * U)); // vessels leave the disc straight
    const o = (fbm(s * freq, seed * 0.37, seed, 3) - 0.5) * 2 * amp * ramp;
    out.push([pts[i]![0] - (dy / L) * o, pts[i]![1] + (dx / L) * o]);
  }
  return out;
}

interface GenCtx {
  a: Anatomy;
  rng: Rng;
  out: Vessel[];
  bif: { x: number; y: number }[];
  tort: number;
  minW: number;
}

/** A free-growing branch (random walk with gentle curvature), may sub-branch. */
function grow(g: GenCtx, kind: VesselKind, x: number, y: number, heading: number, len: number, w0: number, depth: number, toFovea: boolean): void {
  const { a, rng } = g;
  const pts: [number, number][] = [[x, y]];
  const ws: number[] = [w0];
  let h = heading;
  const curl = rng.float(-0.03, 0.03);
  const n = Math.max(4, Math.round(len / STEP));
  let nextBranch = rng.float(1.2, 2.2) * U;
  let s = 0;
  for (let i = 0; i < n; i++) {
    if (toFovea) {
      const target = Math.atan2(a.fovea.y - y, a.fovea.x - x);
      let d = target - h;
      while (d > Math.PI) d -= Math.PI * 2;
      while (d < -Math.PI) d += Math.PI * 2;
      h += d * 0.05;
    }
    h += curl + rng.float(-0.09, 0.09) * (1 + g.tort);
    x += Math.cos(h) * STEP;
    y += Math.sin(h) * STEP;
    s += STEP;
    // foveal avascular zone (~0.5 mm) & edge of the world
    if (Math.hypot(x - a.fovea.x, y - a.fovea.y) < 0.35 * U + w0 * 4) break;
    if (x < -0.02 || y < -0.02 || x > 1.02 || y > 1.02) break;
    pts.push([x, y]);
    const w = Math.max(g.minW, w0 * (1 - 0.55 * (i / n)));
    ws.push(w);
    if (depth < 2 && s > nextBranch && w > g.minW * 1.6) {
      nextBranch = s + rng.float(1.5, 2.8) * U;
      if (rng.chance(0.35)) continue;
      const side = rng.chance(0.5) ? 1 : -1;
      g.bif.push({ x, y });
      grow(g, kind, x, y, h + side * rng.float(0.5, 1.1), len * rng.float(0.3, 0.55), w * rng.float(0.55, 0.72), depth + 1, toFovea && rng.chance(0.5));
    }
  }
  if (pts.length > 2) g.out.push({ kind, pts, w: ws, depth });
}

/** Cup boundary distance (mm) from the disc centre along a disc-local direction (tx temporal, ty inferior). */
export type CupRadiusMm = (tx: number, ty: number) => number;

/**
 * Route a trunk's first control points through the optic cup: trunks leave the
 * central stem on the cup floor (nasalised in large cups), and where they climb
 * the steep wall of a large cup they "bayonet" — a sharp double kink as the
 * vessel disappears under the overhanging rim and re-emerges displaced.
 */
function throughCup(ctrl: [number, number][], origin: [number, number], cupMm: CupRadiusMm | undefined, cdr: number, jog: number): [number, number][] {
  const out: [number, number][] = [origin];
  const rest = ctrl.slice(1);
  if (!cupMm || cdr < 0.55) return out.concat(rest);
  // first control point outside the cup gives the trunk's direction up the wall
  const idx = rest.findIndex(([x, y]) => Math.hypot(x, y) > cupMm(x, y));
  if (idx < 0) return out.concat(rest);
  const [ex, ey] = rest[idx]!;
  const [px, py] = idx > 0 ? rest[idx - 1]! : origin;
  // intersection with the cup outline (bisection along the segment)
  let lo = 0;
  let hi = 1;
  for (let k = 0; k < 20; k++) {
    const m = (lo + hi) / 2;
    const x = px + (ex - px) * m;
    const y = py + (ey - py) * m;
    if (Math.hypot(x, y) > cupMm(x, y)) hi = m;
    else lo = m;
  }
  const hx = px + (ex - px) * lo;
  const hy = py + (ey - py) * lo;
  const dl = Math.hypot(ex - px, ey - py) || 1;
  const ux = (ex - px) / dl;
  const uy = (ey - py) / dl;
  const strength = Math.min(1, (cdr - 0.5) / 0.3);
  const j = jog * strength;
  // on the cup floor the vessel runs along the nasal wall; then it bends sharply at the rim
  for (let i = 0; i < idx; i++) out.push(rest[i]!);
  out.push([hx - ux * 0.06, hy - uy * 0.06]);
  out.push([hx + ux * 0.05 - uy * j, hy + uy * 0.05 + ux * j]);
  out.push([hx + ux * 0.2 - uy * j * 0.8, hy + uy * 0.2 + ux * j * 0.8]);
  return out.concat(rest.slice(idx));
}

/** A main arcade from the disc following anatomical control points (mm, temporal +x', inferior +y'). */
function arcade(g: GenCtx, kind: VesselKind, ctrlMm: [number, number][], w0: number, seed: number, macularSide: 1 | -1 | 0): void {
  const { a, rng } = g;
  const toWorld = ([tx, ty]: [number, number]): [number, number] => [a.disc.x - a.nasal * tx * U, a.disc.y + ty * U];
  // keep the course on the disc anatomical; jitter only beyond it
  const jittered = ctrlMm.map(([x, y]) => (Math.hypot(x, y) < 1.4 ? [x, y] : [x + rng.float(-0.35, 0.35), y + rng.float(-0.3, 0.3)]) as [number, number]);
  const base = catmull(jittered.map(toWorld), STEP * 0.6);
  const amp = (kind === 'vein' ? 0.07 : 0.05) * U * (1 + g.tort * 2.6);
  const pts = wiggle(base, seed, amp, 1 / (1.1 * U));
  const ws: number[] = [];
  let s = 0;
  let total = 0;
  for (let i = 1; i < pts.length; i++) total += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
  let nextBranch = rng.float(1.3, 2.0) * U;
  let side = rng.chance(0.5) ? 1 : -1;
  for (let i = 0; i < pts.length; i++) {
    if (i > 0) s += Math.hypot(pts[i]![0] - pts[i - 1]![0], pts[i]![1] - pts[i - 1]![1]);
    const w = Math.max(g.minW, w0 * (1 - 0.5 * (s / total)));
    ws.push(w);
    if (s > nextBranch && i < pts.length - 3) {
      nextBranch = s + rng.float(1.6, 2.8) * U;
      side = -side as 1 | -1;
      const p = pts[i]!;
      const q = pts[i + 1]!;
      const h = Math.atan2(q[1] - p[1], q[0] - p[0]);
      const hb = h + side * rng.float(0.55, 1.0);
      // branches on the macular side head for the fovea (stopping at the FAZ)
      const towardMacula = macularSide !== 0 && Math.cos(hb - Math.atan2(a.fovea.y - p[1], a.fovea.x - p[0])) > 0.35;
      g.bif.push({ x: p[0], y: p[1] });
      grow(g, kind, p[0], p[1], hb, rng.float(1.8, 3.8) * U, w * rng.float(0.45, 0.65), 1, towardMacula);
    }
  }
  g.out.push({ kind, pts, w: ws, depth: 0 });
}

// Control polylines (mm from the disc centre; +x' = temporal, +y' = inferior).
// The central retinal artery and vein divide on the disc into superior and
// inferior papillary trunks, which split into temporal and nasal arcades near
// the margin; the small nasal and macular vessels are side branches of those
// trunks — nothing leaves the stem horizontally.
const ST: [number, number][] = [[0, 0], [-0.05, -0.42], [0.05, -0.85], [0.45, -1.55], [1.2, -2.55], [2.7, -3.45], [4.8, -3.8], [7.3, -3.4], [9.8, -2.9], [13, -2.2]];
const SN: [number, number][] = [[0, 0], [-0.08, -0.42], [-0.2, -0.85], [-0.6, -1.4], [-1.4, -2.3], [-3.0, -3.3], [-5.0, -4.6], [-7, -6.2]];
const NAS: [number, number][] = [[0, 0], [-0.06, -0.3], [-0.35, -0.5], [-0.95, -0.42], [-1.8, -0.35], [-3.2, -0.55], [-6, -0.95]];
const MAC: [number, number][] = [[0, 0], [-0.04, -0.33], [0.28, -0.55], [0.9, -0.45], [1.6, -0.38], [2.3, -0.3]];
const flipY = (c: [number, number][]) => c.map(([x, y]) => [x, -y] as [number, number]);

export interface VesselOptions {
  /** cup boundary for routing trunks (bayoneting & nasalisation in large cups) */
  cupMm?: CupRadiusMm;
  cdr?: number;
}

/** Where the central vessel stem emerges (mm, disc-local): just nasal to centre, nasalised in large cups. */
export function stemMm(cdr: number): [number, number] {
  return [-0.14 - Math.max(0, cdr - 0.45) * 0.75, 0.04];
}

export function buildVessels(a: Anatomy, post: PosteriorSegment, seed: number, vo: VesselOptions = {}): VesselTree {
  const v = post.vessels;
  const tort = v.tortuosity === 'increased' || v.venousDilation ? 1 : 0;
  const veinW = 0.15 * U * (v.venousDilation ? 1.5 : 1);
  const artW = 0.15 * U * Math.max(0.3, Math.min(1, v.avRatio));
  const cdr = vo.cdr ?? post.disc.cdr;
  const out: Vessel[] = [];
  const bif: { x: number; y: number }[] = [];
  const mk = (salt: string, kind: VesselKind): GenCtx => ({
    a, rng: createRng(seed).fork(salt), out, bif: kind === 'artery' ? bif : [], tort: kind === 'vein' ? tort : tort * 0.5, minW: 0.022 * U,
  });
  const [sx, sy] = stemMm(cdr);
  // the vein emerges a hair temporal of the artery within the stem
  const stem = (kind: VesselKind): [number, number] => (kind === 'vein' ? [sx + 0.07, sy] : [sx, sy]);
  const shifted = (c: [number, number][], kind: VesselKind, dx: number, dy: number): [number, number][] =>
    c.map(([x, y], i) => {
      if (i === 0) return stem(kind);
      const r = Math.hypot(x, y);
      // veins run beside the arteries: offset grows from 0 on the disc to (dx,dy) beyond it
      const k = Math.min(1, r / 1.6);
      // trunks shift nasally with the stem, easing back by the disc margin
      const nasalise = Math.max(0, 1 - r / 1.1) * sx;
      return [x + dx * k + nasalise + (kind === 'vein' ? 0.06 * Math.max(0, 1 - r) : 0), y + dy * k];
    });
  const jog = (salt: number) => 0.1 + ((seed * 31 + salt * 17) % 7) * 0.012;
  const route = (c: [number, number][], salt: number) => throughCup(c, c[0]!, vo.cupMm, cdr, jog(salt) * (c[2]![0] >= 0 ? 1 : -1));
  for (const [name, ctrl, side] of [
    ['st', ST, 1], ['it', flipY(ST), -1], ['sn', SN, 0], ['in', flipY(SN), 0],
  ] as const) {
    const sup = name.startsWith('s');
    const vc = route(shifted(ctrl as [number, number][], 'vein', -0.12, sup ? -0.35 : 0.35), name.length + (sup ? 1 : 2));
    const ac = route(shifted(ctrl as [number, number][], 'artery', 0, 0), name.length + (sup ? 3 : 4));
    arcade(mk(`v-${name}`, 'vein'), 'vein', vc, veinW * (name.endsWith('n') ? 0.8 : 1), seed + name.length * 13 + 1, side as 1 | -1 | 0);
    arcade(mk(`a-${name}`, 'artery'), 'artery', ac, artW * (name.endsWith('n') ? 0.8 : 1), seed + name.length * 7 + 5, side as 1 | -1 | 0);
  }
  // nasal arteriole off the superior trunk, nasal venule into the inferior one
  arcade(mk('a-nas', 'artery'), 'artery', route(shifted(NAS, 'artery', 0, 0), 11), artW * 0.55, seed + 93, 0);
  arcade(mk('v-nas', 'vein'), 'vein', route(shifted(flipY(NAS), 'vein', 0, 0.1), 12), veinW * 0.55, seed + 91, 0);
  // superior macular arteriole and inferior macular venule toward the fovea
  arcade(mk('a-mac', 'artery'), 'artery', route(shifted(MAC, 'artery', 0, 0), 13), artW * 0.42, seed + 97, 0);
  arcade(mk('v-mac', 'vein'), 'vein', route(shifted(flipY(MAC), 'vein', 0, 0.1), 14), veinW * 0.42, seed + 95, 0);

  return { vessels: out, crossings: [], bifurcations: bif };
}

/** Artery/vein crossings (spatially hashed). Only computed when needed (AV nicking). */
export function findCrossings(tree: VesselTree, minW = 0.045 * U): Crossing[] {
  const cell = 0.02;
  const grid = new Map<string, { v: number; i: number }[]>();
  tree.vessels.forEach((ves, vi) => {
    if (ves.kind !== 'vein') return;
    for (let i = 0; i < ves.pts.length - 1; i++) {
      if (ves.w[i]! < minW) continue;
      const k = `${Math.floor(ves.pts[i]![0] / cell)},${Math.floor(ves.pts[i]![1] / cell)}`;
      (grid.get(k) ?? grid.set(k, []).get(k)!).push({ v: vi, i });
    }
  });
  const out: Crossing[] = [];
  const seen = new Set<string>();
  tree.vessels.forEach((art, ai) => {
    if (art.kind !== 'artery') return;
    for (let i = 0; i < art.pts.length - 1; i++) {
      if (art.w[i]! < minW * 0.7) continue;
      const [ax, ay] = art.pts[i]!;
      const [bx, by] = art.pts[i + 1]!;
      const gx = Math.floor(ax / cell);
      const gy = Math.floor(ay / cell);
      for (let ox = -1; ox <= 1; ox++) for (let oy = -1; oy <= 1; oy++) {
        for (const c of grid.get(`${gx + ox},${gy + oy}`) ?? []) {
          const vv = tree.vessels[c.v]!;
          const [cx, cy] = vv.pts[c.i]!;
          const [dx, dy] = vv.pts[c.i + 1]!;
          const den = (bx - ax) * (dy - cy) - (by - ay) * (dx - cx);
          if (Math.abs(den) < 1e-12) continue;
          const t = ((cx - ax) * (dy - cy) - (cy - ay) * (dx - cx)) / den;
          const u = ((cx - ax) * (by - ay) - (cy - ay) * (bx - ax)) / den;
          if (t < 0 || t > 1 || u < 0 || u > 1) continue;
          const x = ax + (bx - ax) * t;
          const y = ay + (by - ay) * t;
          const key = `${c.v}:${Math.round(x * 200)},${Math.round(y * 200)}`;
          if (seen.has(key)) continue;
          seen.add(key);
          // arteries usually cross anterior to veins (~70%)
          const over = ((ai * 31 + c.v * 17 + i) % 10) < 7;
          out.push({ x, y, vein: c.v, idx: c.i, arteryOver: over, angle: Math.atan2(dy - cy, dx - cx) });
        }
      }
    }
  });
  return out;
}
