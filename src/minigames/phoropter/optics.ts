/**
 * Phoropter optics — pure maths, no DOM.
 *
 * Refractions are handled as Thibos power vectors (M, J0, J45), which add
 * linearly for thin lenses in contact. Conventions:
 *   M   = S + C/2
 *   J0  = −(C/2)·cos 2A
 *   J45 = −(C/2)·sin 2A
 * Residual = true Rx − lens in the phoropter (what the eye still needs).
 *   residual M < 0 → the eye is left myopic (blur, accommodation cannot help — "fogged")
 *   residual M > 0 → the eye is left hyperopic (a young eye accommodates it away — over-minus hides)
 */
import type { Refraction } from '@core';

export interface Lens {
  sphere: number;
  /** minus-cylinder, ≤ 0 */
  cyl: number;
  /** 1..180 */
  axis: number;
}

export interface PowerVector {
  M: number;
  J0: number;
  J45: number;
}

const RAD = Math.PI / 180;
export const PLANO: Lens = { sphere: 0, cyl: 0, axis: 180 };

export const round = (v: number, step: number) => Math.round(v / step) * step;
export const quarter = (v: number) => round(v, 0.25);
export const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** Wrap any angle to the clinical axis range 1..180 (0 → 180). */
export function wrapAxis(a: number): number {
  let x = Math.round(a) % 180;
  if (x <= 0) x += 180;
  return x;
}

export function toVector(r: { sphere: number; cyl?: number; cylinder?: number; axis: number }): PowerVector {
  const C = r.cyl ?? r.cylinder ?? 0;
  const a = 2 * r.axis * RAD;
  return { M: r.sphere + C / 2, J0: -(C / 2) * Math.cos(a), J45: -(C / 2) * Math.sin(a) };
}

/** Back to minus-cylinder form. Axis is 1..180; a cylinder below 0.005 D keeps axis 180. */
export function fromVector(v: PowerVector): Lens {
  const j = Math.hypot(v.J0, v.J45);
  const C = -2 * j;
  if (j < 0.0025) return { sphere: v.M, cyl: 0, axis: 180 };
  const A = wrapAxisFloat(Math.atan2(v.J45, v.J0) / RAD / 2);
  return { sphere: v.M - C / 2, cyl: C, axis: A };
}

function wrapAxisFloat(a: number): number {
  let x = a % 180;
  if (x <= 0) x += 180;
  return x;
}

export const add = (a: PowerVector, b: PowerVector): PowerVector => ({ M: a.M + b.M, J0: a.J0 + b.J0, J45: a.J45 + b.J45 });
export const sub = (a: PowerVector, b: PowerVector): PowerVector => ({ M: a.M - b.M, J0: a.J0 - b.J0, J45: a.J45 - b.J45 });
export const vlen = (v: PowerVector) => Math.hypot(v.M, v.J0, v.J45);

/** Rx (core shape) → Lens; also transposes any plus-cyl input into minus-cyl. */
export function lensFromRx(rx: Refraction): Lens {
  if (rx.cylinder > 0) return { sphere: rx.sphere + rx.cylinder, cyl: -rx.cylinder, axis: wrapAxis(rx.axis + 90) };
  return { sphere: rx.sphere, cyl: rx.cylinder, axis: wrapAxis(rx.axis) };
}

/** A lens rounded to phoropter steps (0.25 D, 1°). */
export function snapLens(l: Lens): Lens {
  const cyl = Math.min(0, quarter(l.cyl));
  return { sphere: quarter(l.sphere), cyl: cyl === 0 ? 0 : cyl, axis: wrapAxis(l.axis) };
}

/**
 * Jackson cross-cylinder ±0.25 (i.e. +0.25 / −0.50 × redAxis): zero spherical
 * equivalent, the red dot marks the minus-cylinder axis.
 */
export function jccVector(redAxis: number, power = 0.25): PowerVector {
  return toVector({ sphere: power, cyl: -2 * power, axis: redAxis });
}

export type JccMode = 'axis' | 'power';

/** Red-dot (minus-cyl) axis of the JCC for flip 1 / flip 2 given the cylinder axis. */
export function jccRedAxis(mode: JccMode, cylAxis: number, flip: 1 | 2): number {
  if (mode === 'axis') return wrapAxis(cylAxis + (flip === 1 ? 45 : -45));
  return wrapAxis(flip === 1 ? cylAxis : cylAxis + 90);
}

// ───────────────────────── eye model

export interface EyeModel {
  /** True refraction as a power vector */
  rx: PowerVector;
  /** Best-corrected logMAR (pathology floor) */
  best: number;
  /** Accommodation available for a distance target, D */
  amp: number;
  /** Per-eye calibration so plano matches the chart's uncorrected VA */
  k: number;
}

/** Fraction of the amplitude a patient will actually exert on a distance chart. */
export const USABLE_AMPLITUDE = 0.8;

/** Blur (D) → logMAR increase: about one line per 0.25 D at low blur, saturating towards CF. */
export function blurLoss(B: number): number {
  if (B <= 2.5) return 0.4 * B;
  return Math.min(1.7, 1.0 + 0.2 * (B - 2.5));
}

export function makeEyeModel(rx: Refraction, best: number, amplitudeD: number, uncorrected?: number): EyeModel {
  const m: EyeModel = { rx: toVector(lensFromRx(rx)), best, amp: Math.max(0, amplitudeD) * USABLE_AMPLITUDE, k: 1 };
  if (uncorrected !== undefined) {
    const raw = blurLoss(effectiveResidual(m, PLANO).B);
    if (raw > 0.1) m.k = clamp((uncorrected - best) / raw, 0.6, 1.6);
  }
  return m;
}

export interface Residual {
  /** residual before accommodation */
  raw: PowerVector;
  /** accommodation exerted, D */
  acc: number;
  /** residual after accommodation */
  eff: PowerVector;
  /** blur strength, D (length of eff) */
  B: number;
}

/**
 * Residual refractive error with `lens` in front of the eye. The patient
 * accommodates to put the circle of least confusion on the retina when the
 * residual is hyperopic, up to the usable amplitude. `lag` holds some back
 * (used for the duochrome, where the red/green background relaxes accommodation).
 */
export function effectiveResidual(eye: EyeModel, lens: Lens | PowerVector, extra?: PowerVector, lag = 0): Residual {
  const lv = 'M' in lens ? lens : toVector(lens);
  let raw = sub(eye.rx, lv);
  if (extra) raw = sub(raw, extra);
  const acc = clamp(raw.M - lag, 0, eye.amp);
  const eff = { M: raw.M - acc, J0: raw.J0, J45: raw.J45 };
  return { raw, acc, eff, B: vlen(eff) };
}

/** Perceived logMAR through a lens. */
export function perceivedVA(eye: EyeModel, lens: Lens | PowerVector, extra?: PowerVector): number {
  const r = effectiveResidual(eye, lens, extra);
  return eye.best + eye.k * blurLoss(r.B);
}

/** Principal meridian powers of a residual (after accommodation), axis in degrees. */
export function meridians(v: PowerVector): { axis: number; pAxis: number; pPerp: number } {
  const l = fromVector(v);
  return { axis: l.axis, pAxis: l.sphere, pPerp: l.sphere + l.cyl };
}

/** Spectacle magnification of the trial lens (vertex ≈ 14 mm): minus minifies — "smaller and darker". */
export function lensMagnification(lensM: number): number {
  return 1 / (1 - 0.014 * lensM);
}

// ───────────────────────── duochrome & chart blur

/** Longitudinal chromatic aberration: red ≈ 0.25 D behind yellow, green ≈ 0.25 D in front. */
export const LCA_HALF = 0.25;
export const DUO_LAG = 0.25;

export function duochromeResiduals(eye: EyeModel, lens: Lens): { red: PowerVector; green: PowerVector } {
  const r = effectiveResidual(eye, lens, undefined, DUO_LAG);
  return {
    red: { ...r.eff, M: r.eff.M + LCA_HALF },
    green: { ...r.eff, M: r.eff.M - LCA_HALF },
  };
}

/**
 * Blur ellipse for the patient-view chart, in arcminutes (full diameters).
 * A neural/optical floor (scaled by best VA) plus meridional defocus; the
 * defocus scale is chosen so a letter of the perceived VA sits at threshold.
 * `angle` is in screen degrees (patient's view of the chart: TABO mirrored).
 */
export interface BlurKernel {
  /** diameter along `angle`, arcmin */
  major: number;
  /** diameter perpendicular, arcmin */
  minor: number;
  /** degrees, counter-clockwise from screen +x, as the patient sees */
  angle: number;
}

const FLOOR = 1.7;

export function blurKernel(eye: EyeModel, eff: PowerVector): BlurKernel {
  const base = FLOOR * Math.pow(10, eye.best);
  const B = vlen(eff);
  if (B < 0.01) return { major: base, minor: base, angle: 0 };
  const va = eye.best + eye.k * blurLoss(B);
  const perD = (FLOOR * (Math.pow(10, va) - Math.pow(10, eye.best))) / B;
  const m = meridians(eff);
  const dA = perD * Math.abs(m.pAxis);
  const dP = perD * Math.abs(m.pPerp);
  return {
    major: Math.hypot(base, dA),
    minor: Math.hypot(base, dP),
    // Examiner's TABO angle θ appears at 180−θ to the patient looking out.
    angle: 180 - m.axis,
  };
}

// ───────────────────────── chart

export interface ChartLine {
  denom: number;
  logmar: number;
  letters: string;
}

export const SLOAN = 'CDHKNORSVZ';

export const CHART_LINES: ChartLine[] = [
  { denom: 200, logmar: 1.0, letters: 'H' },
  { denom: 100, logmar: 0.7, letters: 'DV' },
  { denom: 70, logmar: 0.54, letters: 'ZSK' },
  { denom: 50, logmar: 0.4, letters: 'NCOR' },
  { denom: 40, logmar: 0.3, letters: 'VHDKS' },
  { denom: 30, logmar: 0.18, letters: 'RZOCNH' },
  { denom: 25, logmar: 0.1, letters: 'KSVDRC' },
  { denom: 20, logmar: 0.0, letters: 'OZHNVDK' },
  { denom: 15, logmar: -0.12, letters: 'SCRKZOHN' },
];

/** Smallest chart line the patient reads fully at a given logMAR (null = not even the top letter). */
export function smallestLine(va: number): ChartLine | null {
  let best: ChartLine | null = null;
  for (const l of CHART_LINES) if (l.logmar >= va - 0.02) best = l;
  return best;
}

export function snellen(va: number): string {
  const l = smallestLine(va);
  if (!l) return va >= 1.5 ? 'CF' : '20/400';
  return `20/${l.denom}`;
}
