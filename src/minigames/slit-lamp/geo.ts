/** Small geometry helpers shared by the model and the painters (pure). */
import { ZOOM, type Mag } from './model';

export interface Pan { x: number; y: number }
export const PAN_LIMIT = { x: 16, y: 9.5 };

export const clampPan = (p: Pan): Pan => ({
  x: Math.max(-PAN_LIMIT.x, Math.min(PAN_LIMIT.x, p.x)),
  y: Math.max(-PAN_LIMIT.y, Math.min(PAN_LIMIT.y, p.y)),
});

/** Pixels per mm of the on-screen view of diameter `d` px. */
export const viewScale = (d: number, mag: Mag): number => (d / 34) * ZOOM[mag];

export function mmToScreen(x: number, y: number, pan: Pan, d: number, mag: Mag): { x: number; y: number } {
  const s = viewScale(d, mag);
  return { x: d / 2 + (x - pan.x) * s, y: d / 2 + (y - pan.y) * s };
}

export function screenToMm(sx: number, sy: number, pan: Pan, d: number, mag: Mag): { x: number; y: number } {
  const s = viewScale(d, mag);
  return { x: pan.x + (sx - d / 2) / s, y: pan.y + (sy - d / 2) / s };
}
