/**
 * Pure, deterministic geometry for corneal findings, in millimetres relative to
 * the corneal centre (image coords, +y down). Shared by white-light, cobalt and
 * slit renderers so a lesion is in the same place under every illumination.
 */
import { createRng, type StainPattern } from '@core';

export type Pt = [number, number];
export interface Branch { pts: Pt[]; bulb: boolean }
export interface Dot { x: number; y: number; r: number }

const CORNEA_R = 5.75;

/** Herpetic dendrite: branching epithelial line with terminal bulbs. */
export function dendriteBranches(seed: number): Branch[] {
  const rng = createRng(seed ^ 0xde7d);
  const out: Branch[] = [];
  const grow = (x: number, y: number, ang: number, len: number, depth: number) => {
    const pts: Pt[] = [[x, y]];
    const steps = Math.max(3, Math.round(len / 0.35));
    let a = ang;
    for (let i = 0; i < steps; i++) {
      a += rng.float(-0.45, 0.45);
      x += Math.cos(a) * (len / steps);
      y += Math.sin(a) * (len / steps);
      pts.push([x, y]);
      if (depth < 2 && i > 1 && rng.chance(0.28)) grow(x, y, a + (rng.chance(0.5) ? 1 : -1) * rng.float(0.5, 1.0), len * rng.float(0.35, 0.6), depth + 1);
    }
    out.push({ pts, bulb: true });
  };
  const sx = rng.float(-1.2, 0.6);
  const sy = rng.float(-0.8, 1.0);
  const a0 = rng.float(0, Math.PI * 2);
  grow(sx, sy, a0, rng.float(2.2, 3.2), 0);
  grow(sx, sy, a0 + Math.PI + rng.float(-0.4, 0.4), rng.float(1.4, 2.4), 0);
  return out;
}

/** Fine punctate dots of a given distribution. */
function dots(seed: number, n: number, accept: (x: number, y: number) => boolean, rmin = 0.05, rmax = 0.11): Dot[] {
  const rng = createRng(seed);
  const out: Dot[] = [];
  let guard = 0;
  while (out.length < n && guard++ < n * 40) {
    const x = rng.float(-CORNEA_R, CORNEA_R);
    const y = rng.float(-CORNEA_R, CORNEA_R);
    if (x * x + y * y > (CORNEA_R - 0.3) ** 2) continue;
    if (!accept(x, y)) continue;
    out.push({ x, y, r: rng.float(rmin, rmax) });
  }
  return out;
}

export interface StainGeometry {
  dots: Dot[];
  /** stroked polylines (scratches / dendrites); width mm */
  lines: { pts: Pt[]; width: number; bulb?: boolean }[];
  /** filled closed blobs (abrasion / ulcer) */
  blobs: { pts: Pt[]; soft: number }[];
}

/** Geometry for every StainPattern (green under cobalt). */
export function stainGeometry(pattern: StainPattern, seed: number): StainGeometry {
  const g: StainGeometry = { dots: [], lines: [], blobs: [] };
  const rng = createRng(seed ^ 0x57a1);
  switch (pattern) {
    case 'none':
      break;
    case 'inferior-punctate':
      g.dots = dots(seed + 1, 70, (x, y) => y > 1.4 + Math.abs(x) * 0.12 && rng.chance(0.4 + (y - 1.4) * 0.2));
      break;
    case 'diffuse-punctate':
      g.dots = dots(seed + 2, 150, () => true);
      break;
    case 'interpalpebral':
      g.dots = dots(seed + 3, 110, (_x, y) => Math.abs(y) < 2.4 + rng.float(-0.4, 0.4));
      break;
    case 'linear-abrasion': {
      // geographic epithelial defect, sharp-edged, often linear-curvilinear
      const cx = rng.float(-1.5, 1.0);
      const cy = rng.float(-0.5, 1.2);
      const ang = rng.float(-0.6, 0.6);
      const len = rng.float(3.0, 4.2);
      const pts: Pt[] = [];
      const n = 22;
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        const rx = len / 2;
        const ry = rng.float(0.55, 0.9);
        const jitter = 1 + rng.float(-0.18, 0.18);
        const lx = Math.cos(a) * rx * jitter;
        const ly = Math.sin(a) * ry * jitter;
        pts.push([cx + lx * Math.cos(ang) - ly * Math.sin(ang), cy + lx * Math.sin(ang) + ly * Math.cos(ang)]);
      }
      g.blobs.push({ pts, soft: 0.12 });
      break;
    }
    case 'dendritic':
      for (const b of dendriteBranches(seed)) g.lines.push({ pts: b.pts, width: 0.22, bulb: true });
      break;
    case 'round-ulcer': {
      const cx = rng.float(-1.2, 1.2);
      const cy = rng.float(0, 1.8);
      const r = rng.float(0.9, 1.3);
      const pts: Pt[] = [];
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * Math.PI * 2;
        const rr = r * (1 + rng.float(-0.1, 0.1));
        pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      g.blobs.push({ pts, soft: 0.5 });
      break;
    }
    case 'vertical-linear-scratches': {
      const count = 4 + rng.int(0, 3);
      for (let i = 0; i < count; i++) {
        const x = rng.float(-2.6, 2.6);
        const y0 = rng.float(-5.0, -4.0);
        const y1 = rng.float(-1.2, 0.6);
        const pts: Pt[] = [];
        for (let j = 0; j <= 6; j++) {
          const u = j / 6;
          pts.push([x + Math.sin(u * 3 + i) * 0.08, y0 + (y1 - y0) * u]);
        }
        g.lines.push({ pts, width: rng.float(0.06, 0.12) });
      }
      break;
    }
  }
  return g;
}

/** Keratic precipitates — Arlt's triangle (apex up) on the inferior endothelium. */
export function kpDots(seed: number, count = 34): Dot[] {
  const rng = createRng(seed ^ 0x4b50);
  const out: Dot[] = [];
  let guard = 0;
  while (out.length < count && guard++ < 2000) {
    const y = rng.float(0.5, 4.8);
    const halfW = (y - 0.3) * 0.75;
    const x = rng.float(-halfW, halfW);
    if (x * x + y * y > 5.2 * 5.2) continue;
    // larger KPs lower in the triangle
    out.push({ x, y, r: 0.06 + (y / 4.8) * rng.float(0.04, 0.16) });
  }
  return out;
}

/** Paracentral location of a white stromal opacity (ulcer/infiltrate) and foreign body. */
export function lesionSpot(seed: number, kind: 'ulcer' | 'infiltrate' | 'fb'): { x: number; y: number; r: number } {
  const rng = createRng(seed ^ (kind === 'ulcer' ? 0x0c1 : kind === 'infiltrate' ? 0x1f1 : 0xfb));
  if (kind === 'infiltrate') {
    const a = rng.float(0, Math.PI * 2);
    return { x: Math.cos(a) * 3.9, y: Math.sin(a) * 3.9, r: rng.float(0.45, 0.75) };
  }
  if (kind === 'fb') return { x: rng.float(-2, 2), y: rng.float(-1.2, 2.2), r: 0.18 };
  return { x: rng.float(-1.2, 1.2), y: rng.float(0, 1.8), r: rng.float(0.9, 1.3) };
}

/** Van Herick: peripheral AC depth as a fraction of corneal thickness. */
export function vanHerickRatio(grade: 1 | 2 | 3 | 4): number {
  return grade === 4 ? 1.1 : grade === 3 ? 0.4 : grade === 2 ? 0.25 : 0.1;
}

/** SUN grade → representative number of cells in a 1×1 mm beam. */
export function sunCellCount(grade: 0 | 0.5 | 1 | 2 | 3 | 4): number {
  switch (grade) {
    case 0: return 0;
    case 0.5: return 3;
    case 1: return 10;
    case 2: return 20;
    case 3: return 38;
    case 4: return 60;
  }
}
