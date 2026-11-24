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

/** A main arcade from the disc following anatomical control points (mm, temporal +x', inferior +y'). */
function arcade(g: GenCtx, kind: VesselKind, ctrlMm: [number, number][], w0: number, seed: number, macularSide: 1 | -1 | 0): void {
  const { a, rng } = g;
  const toWorld = ([tx, ty]: [number, number]): [number, number] => [a.disc.x - a.nasal * tx * U, a.disc.y + ty * U];
  const jittered = ctrlMm.map(([x, y], i) => (i < 2 ? [x, y] : [x + rng.float(-0.35, 0.35), y + rng.float(-0.3, 0.3)]) as [number, number]);
  const base = catmull(jittered.map(toWorld), STEP);
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

// Control polylines (mm from the disc centre; +x' = temporal, +y' = inferior)
// All trunks emerge from the central vessel stem, just nasal to the cup centre (−0.15 mm).
const O: [number, number] = [-0.15, 0.05];
const ST: [number, number][] = [O, [-0.12, -0.5], [0.1, -1.3], [0.9, -2.6], [2.7, -3.5], [4.8, -3.8], [7.3, -3.4], [9.8, -2.9], [13, -2.2]];
const SN: [number, number][] = [O, [-0.2, -0.5], [-0.5, -1.2], [-1.4, -2.3], [-3.0, -3.3], [-5.0, -4.6], [-7, -6.2]];
const NAS: [number, number][] = [O, [-0.6, -0.05], [-1.4, -0.2], [-3, -0.5], [-6, -0.9]];
const MAC: [number, number][] = [O, [0.3, -0.05], [0.9, -0.05], [1.7, -0.15], [2.4, -0.2]];
const flipY = (c: [number, number][]) => c.map(([x, y], i) => (i === 0 ? [x, y] : [x, -y + 0.1]) as [number, number]);

export function buildVessels(a: Anatomy, post: PosteriorSegment, seed: number): VesselTree {
  const v = post.vessels;
  const tort = v.tortuosity === 'increased' || v.venousDilation ? 1 : 0;
  const veinW = 0.135 * U * (v.venousDilation ? 1.5 : 1);
  const artW = 0.135 * U * Math.max(0.3, Math.min(1, v.avRatio));
  const out: Vessel[] = [];
  const bif: { x: number; y: number }[] = [];
  const mk = (salt: string, kind: VesselKind): GenCtx => ({
    a, rng: createRng(seed).fork(salt), out, bif: kind === 'artery' ? bif : [], tort: kind === 'vein' ? tort : tort * 0.5, minW: 0.022 * U,
  });
  const off = (c: [number, number][], dx: number, dy: number) => c.map(([x, y], i) => (i === 0 ? [x, y] : i === 1 ? [x + dx * 0.5, y] : [x + dx, y + dy]) as [number, number]);
  // veins: slightly nasal in the cup, running beside the arteries
  for (const [name, ctrl, side] of [
    ['st', ST, 1], ['it', flipY(ST), -1], ['sn', SN, 0], ['in', flipY(SN), 0],
  ] as const) {
    arcade(mk(`v-${name}`, 'vein'), 'vein', off(ctrl as [number, number][], -0.12, name.startsWith('s') ? -0.35 : 0.35), veinW * (name.endsWith('n') ? 0.8 : 1), seed + name.length * 13 + 1, side as 1 | -1 | 0);
    arcade(mk(`a-${name}`, 'artery'), 'artery', ctrl as [number, number][], artW * (name.endsWith('n') ? 0.8 : 1), seed + name.length * 7 + 5, side as 1 | -1 | 0);
  }
  arcade(mk('v-nas', 'vein'), 'vein', off(NAS, 0, 0.3), veinW * 0.55, seed + 91, 0);
  arcade(mk('a-nas', 'artery'), 'artery', NAS, artW * 0.55, seed + 93, 0);
  arcade(mk('v-mac', 'vein'), 'vein', off(MAC, 0, 0.35), veinW * 0.42, seed + 95, 0);
  arcade(mk('a-mac', 'artery'), 'artery', MAC, artW * 0.42, seed + 97, 0);

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
