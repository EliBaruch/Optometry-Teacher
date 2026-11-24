/** Motion maths shared by animated components. Pure and unit-tested. */

export const clamp = (v: number, lo = 0, hi = 1) => (v < lo ? lo : v > hi ? hi : v);
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export const ease = {
  linear: (t: number) => t,
  outCubic: (t: number) => 1 - Math.pow(1 - t, 3),
  outQuart: (t: number) => 1 - Math.pow(1 - t, 4),
  outExpo: (t: number) => (t >= 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  inOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
  /** Springy overshoot (back-out) — rewards, stamps, pops. */
  outBack: (t: number, s = 1.70158) => {
    const u = t - 1;
    return 1 + (s + 1) * u * u * u + s * u * u;
  },
} as const;

export type EaseName = keyof typeof ease;

/** Value of a count-up animation at normalised time t (0..1). */
export function tweenValue(from: number, to: number, t: number, easing: (t: number) => number = ease.outExpo): number {
  const k = clamp(t);
  if (k >= 1) return to;
  return lerp(from, to, easing(k));
}

/** Number formatting for readouts: grouping + fixed decimals, with a proper minus sign. */
export function formatNumber(n: number, decimals = 0, grouping = true): string {
  const fixed = Math.abs(n).toFixed(decimals);
  const [int, frac] = fixed.split('.');
  const grouped = grouping ? int!.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : int!;
  const sign = n < 0 && Number(fixed) !== 0 ? '−' : '';
  return sign + grouped + (frac ? '.' + frac : '');
}

/**
 * Duration for a count-up that feels proportional: tiny changes are quick,
 * big jackpots take longer (but never drag).
 */
export function countDuration(delta: number, min = 450, max = 1600): number {
  const d = Math.abs(delta);
  if (d === 0) return 0;
  return Math.round(clamp(min + Math.log10(d + 1) * 320, min, max));
}
