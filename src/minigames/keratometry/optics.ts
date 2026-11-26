/**
 * Optical model of a one-position (Bausch & Lomb style) keratometer.
 *
 * The cornea is a toric mirror with a flat principal meridian (K1 @ axisK1) and
 * a steep one (K2 @ axisK1 + 90). Its dioptric power matrix gives, for an
 * instrument meridian θ:
 *   P(θ) = K1·cos²(θ−a) + K2·sin²(θ−a)           (power measured by the drum)
 *   T(θ) = (K2 − K1)/2 · sin 2(θ−a)              (torsional / cross term)
 * T is what breaks the plus-sign bars apart when the instrument is not on a
 * principal meridian; it vanishes only at θ = a or a + 90.
 *
 * Field coordinates are in units of the eyepiece field radius, in the
 * INSTRUMENT frame (u along the horizontal-drum meridian θ, v 90° to it, up).
 * Angles follow the TABO convention: degrees counter-clockwise from 3 o'clock
 * as the examiner sees the patient. Pure — no DOM.
 */
import { pickStrings, type Keratometry, type Locale } from '@core';
import { S } from './strings';

export type MireGrade = Keratometry['mires'];
export const MIRE_GRADES: readonly MireGrade[] = ['regular', 'irregular', 'distorted'];

/** Keratometric index 1.3375 → P = 337.5 / r(mm). */
export const radiusMm = (k: number): number => 337.5 / k;

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const clamp01 = (v: number): number => clamp(v, 0, 1);
/** Round to the 0.25 D steps clinicians record. */
export const quarter = (v: number): number => Math.round(v * 4) / 4;
/** Round to the instrument's 0.125 D drum graduation. */
export const eighth = (v: number): number => Math.round(v * 8) / 8;

/** Wrap any angle to a clinical axis 1..180. */
export function wrapAxis(a: number): number {
  const x = ((Math.round(a) % 180) + 180) % 180;
  return x === 0 ? 180 : x;
}
/** Smallest difference between two axes (0..90). */
export function axisDiff(a: number, b: number): number {
  const d = (((a - b) % 180) + 180) % 180;
  return Math.min(d, 180 - d);
}
/** Continuous instrument angle wrapped to [0, 180). */
export function wrapTheta(t: number): number {
  return ((t % 180) + 180) % 180;
}

const RAD = Math.PI / 180;

/** Canonical form: k1 is the flat meridian (k1 <= k2). */
export function normalizeK(k: Keratometry): Keratometry {
  if (k.k1 <= k.k2) return { ...k, axisK1: wrapAxis(k.axisK1) };
  return { k1: k.k2, k2: k.k1, axisK1: wrapAxis(k.axisK1 + 90), mires: k.mires };
}

export function cornealCyl(k: Keratometry): number {
  return Math.abs(k.k2 - k.k1);
}

export type Orientation = 'with-the-rule' | 'against-the-rule' | 'oblique';
/** By the flat meridian (= minus-cyl axis): flat ~180 → steep vertical → with-the-rule. */
export function orientation(axisFlat: number): Orientation {
  const a = wrapAxis(axisFlat);
  if (a <= 30 || a >= 150) return 'with-the-rule';
  if (a >= 60 && a <= 120) return 'against-the-rule';
  return 'oblique';
}
export const ORIENTATION_SHORT: Record<Orientation, string> = { 'with-the-rule': 'WTR', 'against-the-rule': 'ATR', oblique: 'oblique' };

/** Power in meridian θ (degrees). */
export function meridianPower(k: Keratometry, deg: number): number {
  const d = (deg - k.axisK1) * RAD;
  const c = Math.cos(d);
  const s = Math.sin(d);
  return k.k1 * c * c + k.k2 * s * s;
}

/** Torsional (off-diagonal) power for an instrument meridian θ. */
export function torsion(k: Keratometry, deg: number): number {
  return ((k.k2 - k.k1) / 2) * Math.sin(2 * (deg - k.axisK1) * RAD);
}

// ───────────────────────── instrument & reading

export interface Instrument {
  /** Focus carriage position, mm. In focus when equal to the eye's hidden target. */
  focus: number;
  /** Instrument rotation (meridian of the horizontal drum), degrees [0,180). */
  theta: number;
  /** Horizontal drum, D (meridian θ). */
  pH: number;
  /** Vertical drum, D (meridian θ + 90). */
  pV: number;
}

export interface KReading {
  k1: number;
  k2: number;
  axisK1: number;
}

/** What the drums say, expressed as flat K @ axis / steep K. */
export function readingOf(ins: Pick<Instrument, 'theta' | 'pH' | 'pV'>): KReading {
  const th = wrapAxis(ins.theta);
  if (ins.pH <= ins.pV) return { k1: ins.pH, k2: ins.pV, axisK1: th };
  return { k1: ins.pV, k2: ins.pH, axisK1: wrapAxis(th + 90) };
}

export const DRUM = { min: 36, max: 52, step: 0.125 } as const;
export const FOCUS = { min: -3, max: 3, step: 0.1, fine: 0.025, tolerance: 0.1 } as const;

// ───────────────────────── mire geometry

/** Base mire image radius, field units (for a 43 D cornea). */
export const MIRE_R = 0.19;
/** Distance of the plus/minus signs outside the ring. */
export const SIGN_GAP = 0.075;
/** How strongly corneal power shrinks the mire image (exaggerated for legibility). */
const SIZE_GAIN = 2.2;
/** Saturating drum → displacement mapping: max travel and softness (D). */
const TRAVEL = 0.5;
const TRAVEL_D = 3;
/** Perpendicular sign displacement per dioptre of torsion. */
export const TORSION_GAIN = 0.1;
/** Focus doubling, field units per mm. */
export const DOUBLING_GAIN = 0.11;

/** Drum error → along-meridian displacement of the doubled image (field units). */
export function travel(deltaD: number): number {
  return TRAVEL * Math.tanh(deltaD / TRAVEL_D);
}

/** Smooth, seeded corneal irregularity profile: relative radius change at polar angle φ (radians, cornea frame). */
export function irregularity(grade: MireGrade, seed: number, phi: number, t = 0): number {
  if (grade === 'regular') return 0;
  const amp = grade === 'irregular' ? 0.035 : 0.085;
  const p1 = (seed % 97) * 0.13;
  const p2 = (seed % 31) * 0.41;
  const p3 = (seed % 13) * 0.77;
  // inferior steepening of a cone: the image is compressed below (+ more harmonics)
  const cone = -0.55 * Math.max(0, -Math.sin(phi + 0.35)) ** 2;
  const wobble = 0.6 * Math.sin(3 * phi + p1) + 0.4 * Math.sin(5 * phi + p2) + 0.3 * Math.sin(2 * phi + p3);
  const shimmer = t ? 0.25 * Math.sin(t * 1.7 + phi * 4 + p2) * Math.sin(t * 0.9 + p1) : 0;
  return amp * (wobble + cone + shimmer);
}

/** Radius of the (regular) elliptical mire image along absolute meridian φ (degrees). */
export function mireRadius(k: Keratometry, phiDeg: number): number {
  const rf = MIRE_R * (43 / k.k1) ** SIZE_GAIN;
  const rs = MIRE_R * (43 / k.k2) ** SIZE_GAIN;
  const d = (phiDeg - k.axisK1) * RAD;
  const c = Math.cos(d) / rf;
  const s = Math.sin(d) / rs;
  return 1 / Math.sqrt(c * c + s * s);
}

export interface Pt { x: number; y: number }

export interface MireLayout {
  /** Reference (fixation) image centre and its focus-doubling offset vector. */
  ref: Pt;
  doubling: Pt;
  /** Horizontal and vertical doubled images. */
  h: Pt;
  v: Pt;
  /** Sign distances from each image centre along u and v. */
  signU: number;
  signV: number;
  /** Image-plane blur, field units. */
  blur: number;
  /** Residual misalignment of the plus (H) and minus (V) pairs: along & across, field units. */
  gapH: number;
  skewH: number;
  gapV: number;
  skewV: number;
}

/** Reference image centre in the instrument frame: lower-right of the triad, so the triad is centred. */
export const REF_CENTRE: Pt = { x: 0.2, y: -0.2 };

/**
 * Where the three mire images sit for a given cornea and instrument setting.
 * focusErr = instrument focus − target (mm); irregular corneas add a residual
 * skew that can never be fully nulled (irregular astigmatism).
 */
export function layout(k: Keratometry, ins: Instrument, focusErr: number, seed = 1): MireLayout {
  const kk = normalizeK(k);
  const th = ins.theta;
  const ru = mireRadius(kk, th);
  const rv = mireRadius(kk, th + 90);
  const signU = ru + SIGN_GAP;
  const signV = rv + SIGN_GAP;
  const gapH = travel(ins.pH - meridianPower(kk, th));
  const gapV = travel(ins.pV - meridianPower(kk, th + 90));
  // irregular astigmatism: a residual step that wanders with rotation but never vanishes
  const irrAmp = kk.mires === 'regular' ? 0 : kk.mires === 'irregular' ? 0.024 : 0.034;
  const irr = irrAmp * (0.65 + 0.35 * Math.sin(seed * 1.37 + th * RAD * 3));
  const tor = TORSION_GAIN * torsion(kk, th);
  const skewH = tor + irr;
  const skewV = -tor + irr * 0.8;
  const o = REF_CENTRE;
  const dd = (DOUBLING_GAIN * focusErr) / Math.SQRT2;
  return {
    ref: o,
    doubling: { x: dd, y: -dd },
    h: { x: o.x - 2 * signU + gapH, y: o.y + skewH },
    v: { x: o.x + skewV, y: o.y + 2 * signV - gapV },
    signU,
    signV,
    blur: Math.min(0.03, Math.abs(focusErr) * 0.025),
    gapH,
    skewH,
    gapV,
    skewV,
  };
}

/** Fused = the signs overlap within what the eye can resolve (~0.125 D / 2-3 px). */
export const FUSE_TOL = 0.012;
export function fusedH(l: MireLayout): boolean {
  return Math.abs(l.gapH) <= FUSE_TOL && Math.abs(l.skewH) <= FUSE_TOL;
}
export function fusedV(l: MireLayout): boolean {
  return Math.abs(l.gapV) <= FUSE_TOL && Math.abs(l.skewV) <= FUSE_TOL;
}

// ───────────────────────── formatting

export const fmtK = (k: number): string => k.toFixed(2);
export const fmtAxis = (a: number): string => String(wrapAxis(a)).padStart(3, '0');
export function fmtReading(r: KReading): string {
  return `${fmtK(r.k1)} @ ${fmtAxis(r.axisK1)} / ${fmtK(r.k2)} @ ${fmtAxis(r.axisK1 + 90)}`;
}
/** Corneal astigmatism in minus-cylinder form: −(K2 − K1) × flat meridian. */
export function fmtCornealCyl(r: KReading, locale: Locale = 'en'): string {
  const c = Math.abs(r.k2 - r.k1);
  const t = pickStrings(S, locale);
  if (c < 0.125) return t.spherical;
  const out = `${c.toFixed(2)} D ${t.ori[orientation(r.axisK1)]} (−${c.toFixed(2)} × ${fmtAxis(r.axisK1)})`;
  return locale === 'he' ? `\u2066${out}\u2069` : out;
}
