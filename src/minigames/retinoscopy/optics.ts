/**
 * Streak-retinoscopy optics. Pure maths, no DOM.
 *
 * Conventions
 *  - Refraction is minus-cylinder: sphere S, cylinder C <= 0, axis A (1..180).
 *    Power along meridian phi (the direction the light is swept):  P(phi) = S + C * sin^2(phi - A).
 *    So the meridian lying ALONG the axis carries only the sphere (S), the one 90 deg away carries S + C.
 *  - A lens L (sphere) in front of the eye and a working distance d (m) leave the eye
 *    with a dioptric "error from neutral"  e(phi) = L - (P(phi) + 1/d).
 *      e < 0  -> reflex moves WITH the streak (add plus)
 *      e > 0  -> reflex moves AGAINST the streak (add minus)
 *      e = 0  -> neutrality (the far point of the eye is at the retinoscope)
 *  - Net Rx = gross neutralising lens - 1/d  (the working-distance lens).
 *  - Angles are clinical (TABO from the examiner's view: 0 = right, counter-clockwise).
 *    Screen vectors use y-down, so a clinical angle phi maps to (cos phi, -sin phi).
 */

export interface Rx {
  sphere: number;
  cylinder: number;
  axis: number;
}

export const rad = (d: number): number => (d * Math.PI) / 180;
export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
export const quarter = (x: number): number => Math.round(x * 4) / 4;
/** Meridian angle in [0, 180). */
export const wrapPhi = (a: number): number => ((a % 180) + 180) % 180;
/** Cylinder axis in 1..180. */
export const wrapAxis = (a: number): number => {
  const m = ((Math.round(a) % 180) + 180) % 180;
  return m === 0 ? 180 : m;
};
/** Shortest signed rotation (deg) from a to b for a half-turn symmetric thing (meridians). */
export const meridianDelta = (a: number, b: number): number => {
  let d = wrapPhi(b - a);
  if (d > 90) d -= 180;
  return d;
};
export const smooth = (e0: number, e1: number, x: number): number => {
  const t = clamp((x - e0) / (e1 - e0), 0, 1);
  return t * t * (3 - 2 * t);
};

// ───────────────────────── working distance
export const WD_CM = [50, 67, 100] as const;
export type WdCm = (typeof WD_CM)[number];
/** The conventional working-distance lens: 67 cm -> +1.50, 50 cm -> +2.00, 100 cm -> +1.00. */
export const wdPower = (cm: number): number => (cm === 67 ? 1.5 : quarter(100 / cm));
export const WD_LENSES = [0, 1, 1.5, 2] as const;

// ───────────────────────── Rx helpers
/** Return minus-cylinder form (transposes plus cylinder). */
export function normalizeRx(r: { sphere: number; cylinder: number; axis: number }): Rx {
  if (r.cylinder > 0) return { sphere: r.sphere + r.cylinder, cylinder: -r.cylinder, axis: wrapAxis(r.axis + 90) };
  return { sphere: r.sphere, cylinder: r.cylinder, axis: wrapAxis(r.axis) };
}

export const meridianPower = (rx: Rx, phi: number): number => rx.sphere + rx.cylinder * Math.sin(rad(phi - rx.axis)) ** 2;

export const sphericalEquivalent = (rx: Rx): number => rx.sphere + rx.cylinder / 2;

export interface Principal {
  /** meridian lying along the cylinder axis (power = sphere) */
  phiA: number;
  pA: number;
  /** meridian 90 deg away (power = sphere + cylinder) */
  phiB: number;
  pB: number;
}
export function principalMeridians(rx: Rx): Principal {
  return { phiA: wrapPhi(rx.axis), pA: rx.sphere, phiB: wrapPhi(rx.axis + 90), pB: rx.sphere + rx.cylinder };
}

/** Errors from neutral along the two principal meridians for a sphere lens + working distance lens. */
export function ametropia(rx: Rx, lens: number, wd: number): { e1: number; e2: number } {
  return { e1: lens - (rx.sphere + wd), e2: lens - (rx.sphere + rx.cylinder + wd) };
}

/** Error from neutral along an arbitrary meridian (what the examiner sees when streak and axis coincide). */
export const errorAlong = (rx: Rx, lens: number, wd: number, phi: number): number => lens - (meridianPower(rx, phi) + wd);

// ───────────────────────── reflex appearance
export interface ReflexGeo {
  /** magnitude of the vergence vector (D) — 0 at true neutrality on a principal meridian */
  q: number;
  /** signed error along the sweep (negative = with) */
  eEff: number;
  /** unit screen vector of the reflex's direction of travel when the streak moves along +u */
  nx: number;
  ny: number;
  /** reflex displacement per unit of streak displacement (pupil radii) */
  gain: number;
  /** half-width of the reflex band (pupil radii) */
  halfWidth: number;
  /** 0..1 */
  brightness: number;
  /** 0..1 how completely the pupil fills (neutrality) */
  fill: number;
  motion: 'with' | 'against' | 'neutral' | 'skew';
}

export const NEUTRAL_Q = 0.125;

/**
 * What the examiner sees for given errors on the two principal meridians (e1 along axis A,
 * e2 across it) when the streak sweeps along clinical meridian `phi`.
 * The reflex travels along  -M u  (M = diag(e1, e2) in the principal frame): when the sweep
 * is off-axis the reflex BREAKS away from the streak orientation (skew) — exactly the clinical cue.
 */
export function reflexGeo(e1: number, e2: number, axisA: number, phi: number): ReflexGeo {
  const A = rad(axisA);
  const P = rad(phi);
  const u = [Math.cos(P), -Math.sin(P)];
  const a = [Math.cos(A), -Math.sin(A)];
  const b = [-Math.sin(A), -Math.cos(A)];
  const ua = u[0]! * a[0]! + u[1]! * a[1]!;
  const ub = u[0]! * b[0]! + u[1]! * b[1]!;
  const mx = e1 * ua * a[0]! + e2 * ub * b[0]!;
  const my = e1 * ua * a[1]! + e2 * ub * b[1]!;
  const q = Math.hypot(mx, my);
  const eEff = e1 * ua * ua + e2 * ub * ub;
  const nx = q > 1e-6 ? -mx / q : u[0]!;
  const ny = q > 1e-6 ? -my / q : u[1]!;
  // cues that are only readable when the two meridians really differ (astigmatism)
  const ani = Math.min(1, Math.abs(e1 - e2));
  const off = Math.abs(Math.sin(2 * (P - A)));
  const gain = clamp(0.5 / (q + 0.04), 0.18, 3.4);
  const halfWidth = (0.1 + 0.62 / (q + 0.35)) * (1 + 0.3 * off * ani);
  const brightness = (0.18 + 0.82 / Math.pow(1 + 1.4 * q, 1.2)) * (1 - 0.25 * off * ani);
  const fill = smooth(0.3, 0.09, q);
  let motion: ReflexGeo['motion'] = 'neutral';
  if (eEff < -NEUTRAL_Q) motion = 'with';
  else if (eEff > NEUTRAL_Q) motion = 'against';
  else if (q > 0.25) motion = 'skew';
  return { q, eEff, nx, ny, gain, halfWidth, brightness, fill, motion };
}

/** Angle (deg, 0..90) between the reflex band and the streak — the "break". 0 = aligned. */
export function breakAngle(g: ReflexGeo, phi: number): number {
  const P = rad(phi);
  const ux = Math.cos(P);
  const uy = -Math.sin(P);
  const dot = Math.abs(g.nx * ux + g.ny * uy);
  return (Math.acos(clamp(dot, 0, 1)) * 180) / Math.PI;
}

// ───────────────────────── locking meridians -> net Rx
export interface MeridianLock {
  /** clinical meridian swept (0..179) */
  phi: number;
  /** gross sphere lens that neutralised it */
  gross: number;
}

/** Power-cross to minus-cyl. `m2` is 90 deg from `m1`. */
export function netFromLocks(m1: MeridianLock, m2: MeridianLock, wd: number): Rx {
  const p1 = m1.gross - wd;
  const p2 = m2.gross - wd;
  if (Math.abs(p1 - p2) < 0.125) return { sphere: p1, cylinder: 0, axis: 180 };
  const lowIs1 = p1 < p2;
  const hi = Math.max(p1, p2);
  const lo = Math.min(p1, p2);
  const phiLow = lowIs1 ? m1.phi : m2.phi;
  return { sphere: hi, cylinder: lo - hi, axis: wrapAxis(phiLow + 90) };
}

// ───────────────────────── scoring
export function powerVector(rx: Rx): { M: number; J0: number; J45: number } {
  const c = rx.cylinder;
  const a = rad(rx.axis);
  return { M: rx.sphere + c / 2, J0: -(c / 2) * Math.cos(2 * a), J45: -(c / 2) * Math.sin(2 * a) };
}

/** Length of the difference between two Rx in (M, J0, J45) space, in dioptres. */
export function vectorError(a: Rx, b: Rx): number {
  const p = powerVector(a);
  const q = powerVector(b);
  return Math.hypot(p.M - q.M, p.J0 - q.J0, p.J45 - q.J45);
}

/** 1 within 0.125 D, falling linearly to 0 at ~1.9 D. 0.50 D (the clinical target) scores about 0.79. */
export const accuracyFromError = (err: number): number => clamp(1 - Math.max(0, err - 0.125) / 1.75, 0, 1);

/** Axis difference (deg, 0..90) — only meaningful when there is cylinder. */
export const axisError = (a: number, b: number): number => Math.abs(meridianDelta(a, b));

// ───────────────────────── formatting
const MINUS = '−';
export const fmtSigned = (x: number): string => {
  const v = Math.abs(x) < 0.005 ? 0 : x;
  return `${v < 0 ? MINUS : '+'}${Math.abs(v).toFixed(2)}`;
};
export const fmtAxis = (a: number): string => String(wrapAxis(a)).padStart(3, '0');

export function fmtRx(rx: Rx): string {
  const s = Math.abs(rx.sphere) < 0.005 ? 0 : rx.sphere;
  const c = Math.abs(rx.cylinder) < 0.005 ? 0 : rx.cylinder;
  if (c === 0) return s === 0 ? 'Plano' : `${fmtSigned(s)} DS`;
  return `${s === 0 ? 'Plano' : fmtSigned(s)} ${fmtSigned(c)} × ${fmtAxis(rx.axis)}`;
}

export const fmtGross = (x: number): string => `${fmtSigned(x)} D`;
export const describeMotion = (m: ReflexGeo['motion']): string =>
  m === 'with' ? 'WITH' : m === 'against' ? 'AGAINST' : m === 'skew' ? 'SKEW' : 'NEUTRAL';
