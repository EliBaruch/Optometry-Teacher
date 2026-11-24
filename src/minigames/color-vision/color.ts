/**
 * Colour science for procedural pseudo-isochromatic plates.
 *
 * Linear-RGB <-> LMS uses the Viénot, Brettel & Mollon (1999) matrix. Dichromat
 * simulation replaces the missing cone signal with a fixed combination of the
 * remaining two (projection onto the dichromat's plane), so colours that differ
 * ONLY in the missing cone collapse to the same percept — exactly how the plate
 * generator builds its confusion-line colour pairs. Anomalous trichromacy is
 * modelled as a partial shift toward the dichromat percept.
 */

export type Vec3 = [number, number, number];
export type DeficiencyAxis = 'protan' | 'deutan' | 'tritan';

const RGB2LMS: readonly Vec3[] = [
  [17.8824, 43.5161, 4.11935],
  [3.45565, 27.1554, 3.86714],
  [0.0299566, 0.184309, 1.46709],
];

function mul(m: readonly Vec3[], v: Vec3): Vec3 {
  return [
    m[0]![0] * v[0] + m[0]![1] * v[1] + m[0]![2] * v[2],
    m[1]![0] * v[0] + m[1]![1] * v[1] + m[1]![2] * v[2],
    m[2]![0] * v[0] + m[2]![1] * v[1] + m[2]![2] * v[2],
  ];
}

function invert3(m: readonly Vec3[]): Vec3[] {
  const [a, b, c] = m[0]!;
  const [d, e, f] = m[1]!;
  const [g, h, i] = m[2]!;
  const A = e * i - f * h;
  const B = -(d * i - f * g);
  const C = d * h - e * g;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * h) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * g) / det, -(a * f - c * d) / det],
    [C / det, -(a * h - b * g) / det, (a * e - b * d) / det],
  ];
}

const LMS2RGB = invert3(RGB2LMS);

export const rgbToLms = (rgb: Vec3): Vec3 => mul(RGB2LMS, rgb);
export const lmsToRgb = (lms: Vec3): Vec3 => mul(LMS2RGB, lms);

/** sRGB 0..1 -> linear 0..1 */
export function toLinear(c: number): number {
  return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
}
/** linear 0..1 -> sRGB 0..1 */
export function toSrgb(c: number): number {
  const v = c <= 0 ? 0 : c >= 1 ? 1 : c;
  return v <= 0.0031308 ? v * 12.92 : 1.055 * Math.pow(v, 1 / 2.4) - 0.055;
}

export function hexToLinear(hex: string): Vec3 {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  return [toLinear(((n >> 16) & 255) / 255), toLinear(((n >> 8) & 255) / 255), toLinear((n & 255) / 255)];
}

export function linearToCss(rgb: Vec3, alpha = 1): string {
  const r = Math.round(toSrgb(rgb[0]) * 255);
  const g = Math.round(toSrgb(rgb[1]) * 255);
  const b = Math.round(toSrgb(rgb[2]) * 255);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${alpha})`;
}

/** Relative luminance (Rec.709 weights) of a linear-RGB colour. */
export function luminance(rgb: Vec3): number {
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

/** Dichromat percept in LMS: the missing cone is rebuilt from the other two. */
export function dichromatLms(lms: Vec3, axis: DeficiencyAxis): Vec3 {
  const [L, M, S] = lms;
  switch (axis) {
    case 'protan':
      return [2.02344 * M - 2.52581 * S, M, S];
    case 'deutan':
      return [L, 0.494207 * L + 1.24827 * S, S];
    case 'tritan':
      return [L, M, -0.395913 * L + 0.801109 * M];
  }
}

/**
 * Simulated appearance (linear RGB) for an observer with the given deficiency.
 * severity 0 = normal, 1 = dichromat; in between = anomalous trichromat.
 */
export function simulate(rgb: Vec3, axis: DeficiencyAxis, severity: number): Vec3 {
  const k = Math.max(0, Math.min(1, severity));
  if (k === 0) return [...rgb] as Vec3;
  const lms = rgbToLms(rgb);
  const d = dichromatLms(lms, axis);
  const mix: Vec3 = [lms[0] + (d[0] - lms[0]) * k, lms[1] + (d[1] - lms[1]) * k, lms[2] + (d[2] - lms[2]) * k];
  return lmsToRgb(mix);
}

/**
 * Acquired optic-nerve type loss: colours wash out toward their own luminance
 * (red-green first), and a dim, low-contrast percept.
 */
export function simulateAcquired(rgb: Vec3, severity: number, redGreenBias = 0.65): Vec3 {
  const k = Math.max(0, Math.min(1, severity));
  const rg = simulate(rgb, 'deutan', k * redGreenBias);
  const y = luminance(rg);
  const wash = k * 0.75;
  const dim = 1 - k * 0.25;
  return [(rg[0] + (y - rg[0]) * wash) * dim, (rg[1] + (y - rg[1]) * wash) * dim, (rg[2] + (y - rg[2]) * wash) * dim];
}

/** Apply a log-space offset (dL, dM, dS) to a base LMS colour and return linear RGB. */
export function offsetLms(baseLms: Vec3, d: Vec3): Vec3 {
  return lmsToRgb([baseLms[0] * Math.exp(d[0]), baseLms[1] * Math.exp(d[1]), baseLms[2] * Math.exp(d[2])]);
}

export function clampRgb(rgb: Vec3): Vec3 {
  return [Math.max(0, Math.min(1, rgb[0])), Math.max(0, Math.min(1, rgb[1])), Math.max(0, Math.min(1, rgb[2]))];
}

/** CIE76-ish distance in a simple opponent space (perceptual-enough for tests). */
export function opponentDistance(a: Vec3, b: Vec3): number {
  const oa = opponent(a);
  const ob = opponent(b);
  return Math.hypot(oa[0] - ob[0], oa[1] - ob[1], oa[2] - ob[2]);
}

/** Approximate opponent channels from linear RGB via LMS (log-compressed). */
export function opponent(rgb: Vec3): Vec3 {
  const [L, M, S] = rgbToLms(clampRgb(rgb)).map((v) => Math.log(Math.max(1e-4, v))) as Vec3;
  const lum = (L + M) / 2;
  return [lum, (L - M) * 4, (S - (L + M) / 2) * 1.2];
}
