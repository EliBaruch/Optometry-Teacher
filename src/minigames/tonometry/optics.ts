/**
 * Goldmann applanation + iCare rebound model. Pure, no DOM.
 *
 * Goldmann: the biprism splits the fluorescein tear ring into two semicircles
 * shifted horizontally. Dial reads grams x10 = mmHg. When the dial force equals
 * the (dye-corrected) IOP the inner edges of the semicircles just touch (an S).
 * Too little force: the arcs are apart. Too much: they overlap.
 */
export type Method = 'goldmann' | 'icare';

export const DIAL_MIN = 0;
export const DIAL_MAX = 80;
export const DIAL_PRESET = 15; // procedure: preset between 1 and 2 g
/** Ideal fluorescein: mire width about 1/10 of the ring diameter. */
export const DYE_BAND = { lo: 0.36, hi: 0.64 } as const;
export const CONTACT_WARN_S = 20;
export const CONTACT_LIMIT_S = 40;
export const ICARE_SHOTS = 6;
/** Pixels of arc shift per mmHg, as a fraction of the view size. */
export const SHIFT_PER_MMHG = 0.0068;

export const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
export const clamp01 = (v: number) => clamp(v, 0, 1);

export const grams = (mmHg: number) => mmHg / 10;
export const fmtGrams = (mmHg: number) => `${grams(mmHg).toFixed(1)} g`;

/**
 * Reading error caused by the dye. Too much fluorescein gives wide mires and an
 * UNDER-estimate (surface tension of the wide meniscus pulls the prism in);
 * too little gives thin mires and an OVER-estimate. Zero inside the ideal band.
 */
export function dyeBias(amount: number): number {
  if (amount > DYE_BAND.hi) return -((amount - DYE_BAND.hi) / (1 - DYE_BAND.hi)) * 6;
  if (amount < DYE_BAND.lo) return ((DYE_BAND.lo - amount) / DYE_BAND.lo) * 6;
  return 0;
}
export const dyeInBand = (a: number) => a >= DYE_BAND.lo && a <= DYE_BAND.hi;
/** Mire thickness as a fraction of the ring (centre-line) radius. */
export const mireWidth = (amount: number) => 0.06 + 0.3 * clamp01(amount);

export type DyeState = 'thin' | 'good' | 'thick';
export const dyeState = (a: number): DyeState => (a < DYE_BAND.lo ? 'thin' : a > DYE_BAND.hi ? 'thick' : 'good');

/** Ocular pulse amplitude, mmHg (about 1-3, larger when pressure is high). */
export const pulseAmp = (iop: number, difficulty: number) => clamp(1 + iop * 0.025, 1, 3) * (0.8 + 0.5 * clamp01(difficulty));
/** Ocular pulse waveform at ~72 bpm: sharp systolic rise, slower fall. */
export function pulse(t: number, amp: number, hz = 1.2): number {
  const p = 2 * Math.PI * hz * t;
  return amp * (Math.sin(p) * 0.85 + Math.sin(2 * p + 0.8) * 0.15);
}

/** mmHg-equivalent separation: > 0 overlap (too much force), < 0 apart (too little). */
export const apparentOffset = (dial: number, trueIop: number, bias: number, pulseNow: number) =>
  dial - (trueIop + bias) + pulseNow;

export type Endpoint = 'apart' | 'touch' | 'overlap';
export function endpointOf(offset: number, tol = 0.6): Endpoint {
  return offset < -tol ? 'apart' : offset > tol ? 'overlap' : 'touch';
}

/** Mean misalignment of the ring centre relative to the reticle, 0..1 (1 = field edge). */
export const centreError = (x: number, y: number) => Math.hypot(x, y);
export const CENTRE_TOL = 0.13;
export const alignQuality = (err: number) => clamp01(1 - Math.max(0, err - CENTRE_TOL) / 0.4);

/** Deterministic patient micro-movement (head/fixation drift) of the ring centre. */
export function drift(t: number, amp: number, phase: number): { x: number; y: number } {
  return {
    x: amp * (Math.sin(t * 0.7 + phase) + 0.5 * Math.sin(t * 1.9 + phase * 2.1)),
    y: amp * (Math.sin(t * 0.55 + phase * 1.7) + 0.5 * Math.sin(t * 2.3 + phase)),
  };
}

export interface IcareShot { reading: number; accepted: boolean; err: number }
/** One rebound shot: Gaussian-ish noise grows with decentration; very off-centre is rejected. */
export function icareShot(trueIop: number, centre: number, gauss: number): IcareShot {
  const accepted = centre <= 0.32;
  const sd = 0.9 + centre * 5;
  return { reading: Math.round(trueIop + gauss * sd), accepted, err: centre };
}
export function icareMean(shots: IcareShot[]): number | null {
  const ok = shots.filter((s) => s.accepted);
  if (ok.length === 0) return null;
  return Math.round(ok.reduce((s, x) => s + x.reading, 0) / ok.length);
}
/** Instrument-reported spread (sd) of the accepted shots. */
export function icareSd(shots: IcareShot[]): number {
  const ok = shots.filter((s) => s.accepted).map((s) => s.reading);
  if (ok.length < 2) return 0;
  const m = ok.reduce((a, b) => a + b, 0) / ok.length;
  return Math.sqrt(ok.reduce((a, b) => a + (b - m) ** 2, 0) / (ok.length - 1));
}

export const flagFor = (iop: number): 'normal' | 'abnormal' | 'critical' =>
  iop >= 35 ? 'critical' : iop > 21 || iop < 6 ? 'abnormal' : 'normal';

export function classify(iop: number): 'hypotony' | 'normal' | 'elevated' | 'crisis' {
  return iop >= 35 ? 'crisis' : iop > 21 ? 'elevated' : iop < 6 ? 'hypotony' : 'normal';
}
