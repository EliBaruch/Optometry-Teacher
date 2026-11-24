/**
 * Optotype artwork on the standard 5 × 5 grid (whole symbol = 5 units, stroke
 * = 1 unit — the 5-arcmin / 1-arcmin Snellen construction). Sloan letters,
 * the tumbling E and LEA symbols. Strokes are clipped to the 5 × 5 box so
 * diagonals end flush, like the printed optotypes.
 */
export interface GlyphPart {
  d: string;
  kind: 'fill' | 'stroke';
  /** stroke width in grid units */
  w?: number;
  evenodd?: boolean;
}

const fill = (d: string, evenodd = false): GlyphPart => ({ d, kind: 'fill', evenodd });
const stroke = (d: string, w = 1): GlyphPart => ({ d, kind: 'stroke', w });

const SLOAN_GLYPHS: Record<string, GlyphPart[]> = {
  C: [fill('M4.9495 2A2.5 2.5 0 1 0 4.9495 3L3.9142 3A1.5 1.5 0 1 1 3.9142 2Z')],
  D: [fill('M0 0H2.5A2.5 2.5 0 0 1 2.5 5H0ZM1 1V4H2.5A1.5 1.5 0 0 0 2.5 1Z', true)],
  H: [fill('M0 0H1V2H4V0H5V5H4V3H1V5H0Z')],
  K: [fill('M0 0H1V5H0Z'), stroke('M0.55 3.45L5.35 -0.25', 1.05), stroke('M2.05 2.0L5.4 5.45', 1.1)],
  N: [fill('M0 0H1V5H0ZM4 0H5V5H4Z'), stroke('M0.45 -0.15L4.55 5.15', 1.15)],
  O: [fill('M0 2.5A2.5 2.5 0 1 0 5 2.5A2.5 2.5 0 1 0 0 2.5ZM1 2.5A1.5 1.5 0 1 1 4 2.5A1.5 1.5 0 1 1 1 2.5Z', true)],
  R: [fill('M0 0H1V5H0Z'), fill('M1 0H3.2A1.5 1.5 0 0 1 3.2 3H1V2H3.2A0.5 0.5 0 0 0 3.2 1H1Z'), stroke('M2.3 2.55L5.2 5.4', 1.1)],
  S: [stroke('M4.144 1.158A1.75 1 0 1 0 2.5 2.5A1.75 1 0 1 1 0.856 3.842', 1)],
  V: [stroke('M0.35 -0.3L2.6 5.2', 1.1), stroke('M4.65 -0.3L2.4 5.2', 1.1)],
  Z: [fill('M0 0H5V1H0ZM0 4H5V5H0Z'), stroke('M4.45 0.9L0.55 4.1', 1.2)],
};

const E_GLYPH: GlyphPart[] = [fill('M0 0H5V1H1V2H5V3H1V4H5V5H0Z')];

/** Rotation that turns the right-facing E into each direction. */
export const E_ROTATION: Record<string, number> = { right: 0, down: 90, left: 180, up: 270 };

const LEA_GLYPHS: Record<string, GlyphPart[]> = {
  circle: [stroke('M0.45 2.5A2.05 2.05 0 1 0 4.55 2.5A2.05 2.05 0 1 0 0.45 2.5Z', 0.85)],
  square: [stroke('M0.45 0.45H4.55V4.55H0.45Z', 0.85)],
  house: [stroke('M0.45 4.55V2.15L2.5 0.45L4.55 2.15V4.55Z', 0.85)],
  apple: [
    stroke('M2.5 1.55C1.65 0.85 0.4 1.15 0.45 2.6C0.5 3.95 1.55 4.85 2.5 4.45C3.45 4.85 4.5 3.95 4.55 2.6C4.6 1.15 3.35 0.85 2.5 1.55Z', 0.85),
    stroke('M2.5 1.5C2.5 0.95 2.75 0.5 3.25 0.25', 0.7),
  ],
};

export function glyphFor(symbol: string): { parts: GlyphPart[]; rotate: number } {
  if (symbol in E_ROTATION) return { parts: E_GLYPH, rotate: E_ROTATION[symbol]! };
  return { parts: SLOAN_GLYPHS[symbol] ?? LEA_GLYPHS[symbol] ?? E_GLYPH, rotate: 0 };
}
