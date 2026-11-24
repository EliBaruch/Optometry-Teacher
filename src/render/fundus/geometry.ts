/**
 * Pure fundus geometry: anatomical landmarks per eye, zone sampling,
 * world↔canvas transforms and hit-testing.
 *
 * Orientation (as in a standard, non-inverted fundus photograph): the optic
 * disc lies NASAL to the fovea, so for the RIGHT eye (OD) it appears on the
 * RIGHT of the image and for the left eye (OS) on the LEFT.
 */
import type { Eye, Rng, Zone } from '@core';
import { U, type FundusMap, type FundusViewport } from './types';

export interface Anatomy {
  eye: Eye;
  /** +1 if nasal is toward +x (OD), −1 for OS */
  nasal: 1 | -1;
  disc: { x: number; y: number; rx: number; ry: number };
  fovea: { x: number; y: number };
  /** world centre of the posterior-pole photograph */
  centre: { x: number; y: number };
}

export const DISC_FOVEA_MM = 4.5;
export const DISC_V_MM = 1.88;
export const DISC_H_MM = 1.76;

export function anatomy(eye: Eye, swelling = 1): Anatomy {
  const nasal = eye === 'OD' ? 1 : -1;
  const fx = 0.5 - nasal * 0.115;
  const fy = 0.515;
  return {
    eye,
    nasal,
    fovea: { x: fx, y: fy },
    // the disc centre sits ~0.3–0.5 mm above the foveal horizontal
    disc: { x: fx + nasal * DISC_FOVEA_MM * U, y: fy - 0.4 * U, rx: (DISC_H_MM / 2) * U * swelling, ry: (DISC_V_MM / 2) * U * swelling },
    centre: { x: 0.5, y: 0.5 },
  };
}

const dist = (ax: number, ay: number, bx: number, by: number) => Math.hypot(ax - bx, ay - by);

/** Which zone a world point belongs to (the most specific match). */
export function zoneOf(a: Anatomy, x: number, y: number): Zone {
  if (((x - a.disc.x) / a.disc.rx) ** 2 + ((y - a.disc.y) / a.disc.ry) ** 2 <= 1.3) return 'disc';
  if (dist(x, y, a.fovea.x, a.fovea.y) <= 2.2 * U) return 'macula';
  if (dist(x, y, a.centre.x, a.centre.y) >= 0.39) return 'periphery';
  const sup = y < a.disc.y;
  const temporal = (x - a.disc.x) * a.nasal < 0;
  return sup ? (temporal ? 'superotemporal' : 'superonasal') : temporal ? 'inferotemporal' : 'inferonasal';
}

/** Is (x,y) a valid location for a lesion assigned to `zone`? */
export function inZone(a: Anatomy, zone: Zone, x: number, y: number): boolean {
  const dC = dist(x, y, a.centre.x, a.centre.y);
  const dF = dist(x, y, a.fovea.x, a.fovea.y);
  const dD = Math.hypot((x - a.disc.x) / a.disc.rx, (y - a.disc.y) / a.disc.ry);
  switch (zone) {
    case 'disc':
      return dD >= 0.75 && dD <= 1.25;
    case 'macula':
      return dF <= 2.0 * U;
    case 'periphery':
      return dC >= 0.37 && dC <= 0.47;
    case 'diffuse':
      return dC <= 0.4 && dD > 1.6 && dF > 0.4 * U;
    default: {
      if (dC > 0.4 || dD < 1.6 || dF < 1.2 * U) return false;
      const sup = y < a.fovea.y - 0.2 * U;
      const inf = y > a.fovea.y + 0.2 * U;
      const temporal = (x - a.disc.x) * a.nasal < -0.5 * U;
      const nasalSide = (x - a.disc.x) * a.nasal > 0.6 * U;
      if (zone === 'superotemporal') return sup && temporal;
      if (zone === 'inferotemporal') return inf && temporal;
      if (zone === 'superonasal') return sup && nasalSide;
      return inf && nasalSide;
    }
  }
}

/** Rejection-sample a point in a zone (falls back to the posterior pole). */
export function samplePoint(a: Anatomy, zone: Zone, rng: Rng, accept?: (x: number, y: number) => boolean): [number, number] {
  for (let i = 0; i < 600; i++) {
    let x: number;
    let y: number;
    if (zone === 'macula') {
      const ang = rng.float(0, Math.PI * 2);
      const r = Math.sqrt(rng.next()) * 2.0 * U;
      x = a.fovea.x + Math.cos(ang) * r;
      y = a.fovea.y + Math.sin(ang) * r;
    } else if (zone === 'disc') {
      const ang = rng.float(0, Math.PI * 2);
      const r = rng.float(0.8, 1.15);
      x = a.disc.x + Math.cos(ang) * a.disc.rx * r;
      y = a.disc.y + Math.sin(ang) * a.disc.ry * r;
    } else {
      x = rng.float(0.04, 0.96);
      y = rng.float(0.04, 0.96);
    }
    if (inZone(a, zone, x, y) && (!accept || accept(x, y))) return [x, y];
  }
  return [a.centre.x, a.centre.y - 0.2];
}

// ── world ↔ canvas ────────────────────────────────────────────────────────────
export function viewScale(w: number, h: number, view: FundusViewport): number {
  return Math.min(w, h) * view.zoom;
}

export function fundusToCanvas(view: FundusViewport, w: number, h: number, x: number, y: number): { x: number; y: number } {
  const S = viewScale(w, h, view);
  return { x: w / 2 + (x - view.cx) * S, y: h / 2 + (y - view.cy) * S };
}

export function canvasToFundus(view: FundusViewport, w: number, h: number, px: number, py: number): { x: number; y: number } {
  const S = viewScale(w, h, view);
  return { x: view.cx + (px - w / 2) / S, y: view.cy + (py - h / 2) / S };
}

/** Marks whose disc (r + tolerance) contains the world point, nearest first. */
export function hitTestFundus(map: FundusMap, x: number, y: number, tolerance = 0.004) {
  return map.lesions
    .map((m) => ({ m, d: Math.hypot(m.x - x, m.y - y) - m.r }))
    .filter((e) => e.d <= tolerance)
    .sort((a, b) => a.d - b.d)
    .map((e) => e.m);
}
