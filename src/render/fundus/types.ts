import type { Eye, LesionType, Zone } from '@core';

/**
 * World space: the painted fundus spans 0..1 on both axes (a square of retina
 * ≈ FIELD_MM wide, centred between disc and fovea). All FundusMap positions and
 * radii are in these normalised world units.
 */
export const FIELD_MM = 16;
export const U = 1 / FIELD_MM; // world units per millimetre

export interface FundusViewport {
  /** world point shown at the canvas centre */
  cx: number;
  cy: number;
  /** 1 = the whole world square fits the canvas' shorter side */
  zoom: number;
}

export type FundusMarkType = LesionType | 'retinal-detachment' | 'vitreous-hemorrhage' | 'weiss-ring';

export interface FundusMark {
  type: FundusMarkType;
  zone: Zone;
  /** normalised world position & radius */
  x: number;
  y: number;
  r: number;
  /** index of the RetinalLesion in PosteriorSegment.lesions (−1 for detachment / vitreous) */
  source: number;
}

export interface FundusMap {
  eye: Eye;
  seed: number;
  mmPerUnit: number;
  disc: { x: number; y: number; rx: number; ry: number; r: number };
  cup: { x: number; y: number; rx: number; ry: number; cdr: number };
  macula: { x: number; y: number; r: number };
  fovea: { x: number; y: number; r: number };
  lesions: FundusMark[];
  detachment?: { zones: Zone[]; maculaOff: boolean; polygon: [number, number][] };
  view: FundusViewport;
}

export interface PaintFundusOptions {
  eye: Eye;
  seed: number;
  redFree?: boolean;
  view?: FundusViewport;
  /** Circular camera aperture with black surround (default true). */
  frame?: boolean;
  /** Draw vitreous opacities (default true). */
  vitreous?: boolean;
}
