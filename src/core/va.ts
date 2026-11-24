/** Visual-acuity notation helpers. Internally everything is logMAR. */

/** logMAR -> Snellen 20/x (feet), rounded to the standard chart lines. */
const LINES = [10, 12.5, 16, 20, 25, 32, 40, 50, 63, 80, 100, 125, 160, 200, 400];

export function logmarToSnellenDenominator(logmar: number): number {
  const raw = 20 * Math.pow(10, logmar);
  let best = LINES[0]!;
  for (const l of LINES) if (Math.abs(l - raw) < Math.abs(best - raw)) best = l;
  return best;
}

export function formatSnellen(logmar: number, metric = false): string {
  const d = logmarToSnellenDenominator(logmar);
  if (logmar >= 1.5) return 'CF';
  if (metric) return `6/${Math.round((d * 6) / 20 * 10) / 10}`;
  return `20/${d}`;
}

export function snellenToLogmar(denominator: number, numerator = 20): number {
  return Math.round(Math.log10(denominator / numerator) * 100) / 100;
}

export function formatLogmar(logmar: number): string {
  return (logmar >= 0 ? '' : '−') + Math.abs(logmar).toFixed(1);
}

/** Format diopters with sign, quarter-step, e.g. "+1.25", "−0.50", "pl" */
export function formatDiopters(d: number): string {
  if (Math.abs(d) < 0.125) return 'pl';
  const v = Math.round(d * 4) / 4;
  return (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2);
}

export function formatRx(r: { sphere: number; cylinder: number; axis: number; add?: number }): string {
  const sph = formatDiopters(r.sphere);
  const base = Math.abs(r.cylinder) < 0.125 ? `${sph} DS` : `${sph} ${formatDiopters(r.cylinder)} × ${String(Math.round(r.axis)).padStart(3, '0')}`;
  return r.add ? `${base}  Add ${formatDiopters(r.add)}` : base;
}

/** Spherical equivalent */
export function sphericalEquivalent(r: { sphere: number; cylinder: number }): number {
  return r.sphere + r.cylinder / 2;
}
