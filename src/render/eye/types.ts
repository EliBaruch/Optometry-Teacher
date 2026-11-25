import type { Eye, StainPattern } from '@core';

export type EyeLighting = 'room' | 'penlight' | 'slit' | 'cobalt' | 'dim';
export type RednessPattern = 'diffuse' | 'ciliary-flush' | 'sectoral';
export type LensOpacityType = 'none' | 'nuclear' | 'cortical' | 'psc';

/**
 * Everything the close-up eye painter needs. All lengths are in millimetres of
 * real anatomy (the painter scales an ~11.5 mm cornea to the canvas).
 * Image coordinates: +x = viewer's right, +y = down. For OD the nasal side is
 * on the viewer's right; for OS it is on the viewer's left.
 */
export interface EyeState {
  eye: Eye;
  irisColor: string;
  irisSeed: number;
  /** Entrance pupil diameter, mm (1.5 .. 9). */
  pupilMm: number;
  pupilShape?: 'round' | 'irregular' | 'mid-dilated' | 'peaked';
  /** -1..1 each; 1 ≈ 40° of rotation. +x = viewer's right, +y = down. */
  gaze: { x: number; y: number };
  /** 1 = normal palpebral aperture, 0 = closed (blink), ~0.6 = ptosis. */
  lidAperture: number;
  lighting: EyeLighting;
  /** Optional periocular skin tone (hex). */
  skinTone?: string;

  // ── conjunctiva / sclera
  redness: number;
  rednessPattern: RednessPattern;
  /** For sectoral injection: which side. */
  rednessSector?: 'nasal' | 'temporal' | 'superior' | 'inferior';
  subconjHemorrhage?: boolean;
  chemosis?: number; // 0..1
  pinguecula?: boolean;
  pterygium?: boolean;
  papillae?: boolean;
  follicles?: boolean;
  discharge?: 'none' | 'watery' | 'mucopurulent' | 'stringy';
  lidSwelling?: number; // 0..1
  lidMarginRed?: boolean; // blepharitis / MGD

  // ── cornea
  cornealHaze: number; // 0..1 (edema)
  dendrite?: boolean;
  /** white stromal opacity (ulcer has an epithelial defect & stains, infiltrate doesn't) */
  ulcer?: 'none' | 'ulcer' | 'infiltrate';
  keraticPrecipitates?: boolean;
  abrasion?: boolean;
  foreignBody?: boolean;
  /** orange-brown iron ring around (or left after) a metallic foreign body */
  rustRing?: boolean;
  punctateKeratitis?: boolean;
  arcus?: boolean;

  // ── anterior chamber
  hypopyon?: number; // 0..1 height fraction of cornea (0 = none)
  hyphema?: number; // 0..1
  /** Van Herick grade 1..4 (peripheral AC depth vs corneal thickness). */
  vanHerick: 1 | 2 | 3 | 4;
  acCells: 0 | 0.5 | 1 | 2 | 3 | 4;
  acFlare: 0 | 1 | 2 | 3 | 4;
  acDepth?: 'deep' | 'normal' | 'shallow' | 'flat';

  // ── lens
  lensOpacity: number; // 0..1
  lensType: LensOpacityType;
  iol?: boolean;

  // ── iris
  irisNeovascularization?: boolean;
  posteriorSynechiae?: boolean;
  irisNevus?: boolean;

  // ── fluorescein (only visible under cobalt light)
  stain: StainPattern;
  /** Hirschberg reflex offset (mm, image coords) relative to the PUPIL centre. Undefined = computed from gaze. null = none. */
  reflex?: { x: number; y: number } | null;
}

export const DEFAULT_EYE_STATE: EyeState = {
  eye: 'OD',
  irisColor: '#4a6b8a',
  irisSeed: 7,
  pupilMm: 3.5,
  pupilShape: 'round',
  gaze: { x: 0, y: 0 },
  lidAperture: 1,
  lighting: 'room',
  redness: 0.08,
  rednessPattern: 'diffuse',
  cornealHaze: 0,
  vanHerick: 4,
  acCells: 0,
  acFlare: 0,
  acDepth: 'normal',
  lensOpacity: 0,
  lensType: 'none',
  stain: 'none',
};

/** Convenience: defaults + overrides. */
export function eyeState(patch: Partial<EyeState> = {}): EyeState {
  return { ...DEFAULT_EYE_STATE, ...patch, gaze: { ...DEFAULT_EYE_STATE.gaze, ...(patch.gaze ?? {}) } };
}

/** Real anatomy constants (mm). */
export const ANATOMY = {
  corneaDiameter: 11.5,
  fissureWidth: 30,
  fissureHeight: 10.5,
  /** distance from the centre of rotation to the pupil plane projection */
  pupilArm: 10,
  /** distance from the centre of rotation to the centre of corneal curvature */
  reflexArm: 5.7,
  /** Positive angle kappa — reflex sits slightly nasal in a normal eye. */
  kappaNasalMm: 0.3,
  maxGazeDeg: 40,
  centralCornealThickness: 0.55,
  peripheralCornealThickness: 0.68,
  centralAcDepth: 3.1,
} as const;
