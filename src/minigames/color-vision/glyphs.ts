/**
 * Stroke glyphs for plate figures: digits, HRR-style symbols and tracing paths.
 * Every glyph is a set of polylines in a unit box (x -0.5..0.5, y -0.5..0.5,
 * y down). A dot belongs to a figure when its centre lies within the stroke's
 * half-width — pure geometry, so plates are deterministic and testable without
 * a canvas or fonts.
 */

export type Pt = [number, number];
export type Polyline = Pt[];

export interface Figure {
  lines: Polyline[];
  /** stroke half-width in plate units (plate radius = 1) */
  half: number;
}

function arc(cx: number, cy: number, rx: number, ry: number, a0: number, a1: number, n = 18): Polyline {
  const out: Polyline = [];
  for (let i = 0; i <= n; i++) {
    const a = ((a0 + ((a1 - a0) * i) / n) * Math.PI) / 180;
    out.push([cx + Math.cos(a) * rx, cy + Math.sin(a) * ry]);
  }
  return out;
}

function quad(p0: Pt, p1: Pt, p2: Pt, n = 14): Polyline {
  const out: Polyline = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    out.push([u * u * p0[0] + 2 * u * t * p1[0] + t * t * p2[0], u * u * p0[1] + 2 * u * t * p1[1] + t * t * p2[1]]);
  }
  return out;
}

function cubic(p0: Pt, p1: Pt, p2: Pt, p3: Pt, n = 28): Polyline {
  const out: Polyline = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const u = 1 - t;
    const a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
    out.push([a * p0[0] + b * p1[0] + c * p2[0] + d * p3[0], a * p0[1] + b * p1[1] + c * p2[1] + d * p3[1]]);
  }
  return out;
}

const rot180 = (lines: Polyline[]): Polyline[] => lines.map((l) => l.map(([x, y]) => [-x, -y] as Pt));

const SIX: Polyline[] = [arc(0, 0.17, 0.27, 0.27, 0, 360, 28), quad([-0.27, 0.17], [-0.3, -0.38], [0.2, -0.45])];

export const DIGITS: Record<string, Polyline[]> = {
  '0': [arc(0, 0, 0.27, 0.45, 0, 360, 32)],
  '1': [[[-0.13, -0.27], [0.04, -0.45], [0.04, 0.45]]],
  '2': [[...arc(0, -0.2, 0.26, 0.25, 195, 380, 16), [-0.27, 0.45], [0.3, 0.45]]],
  '3': [arc(0, -0.23, 0.23, 0.22, 200, 450, 16), arc(0, 0.2, 0.27, 0.25, 270, 520, 18)],
  '4': [[[0.14, 0.45], [0.14, -0.45], [-0.3, 0.16], [0.32, 0.16]]],
  '5': [[[0.27, -0.45], [-0.18, -0.45], [-0.23, -0.04], ...arc(0, 0.17, 0.28, 0.28, 235, 505, 18)]],
  '6': SIX,
  '7': [[[-0.28, -0.45], [0.3, -0.45], [-0.06, 0.45]]],
  '8': [arc(0, -0.25, 0.21, 0.2, 0, 360, 22), arc(0, 0.2, 0.26, 0.25, 0, 360, 24)],
  '9': rot180(SIX),
};

export type SymbolName = 'circle' | 'triangle' | 'cross';
export const SYMBOLS: Record<SymbolName, Polyline[]> = {
  circle: [arc(0, 0, 0.36, 0.36, 0, 360, 32)],
  triangle: [[[0, -0.38], [0.38, 0.3], [-0.38, 0.3], [0, -0.38]]],
  cross: [[[-0.32, -0.32], [0.32, 0.32]], [[0.32, -0.32], [-0.32, 0.32]]],
};

function place(lines: Polyline[], cx: number, cy: number, scale: number): Polyline[] {
  return lines.map((l) => l.map(([x, y]) => [cx + x * scale, cy + y * scale] as Pt));
}

/** A one- or two-digit number laid out to fill the plate centre. */
export function numberFigure(text: string, half = 0.095): Figure {
  const chars = text.split('').filter((c) => DIGITS[c]);
  if (chars.length === 0) return { lines: [], half };
  if (chars.length === 1) return { lines: place(DIGITS[chars[0]!]!, 0, 0, 1.18), half };
  const scale = 0.98;
  const gap = 0.66;
  const lines: Polyline[] = [];
  chars.slice(0, 2).forEach((c, i) => lines.push(...place(DIGITS[c]!, (i - 0.5) * gap, 0, scale)));
  return { lines, half };
}

/** Single digit at a given slot of a two-digit layout (0 = left, 1 = right). */
export function digitAt(text: string, slot: 0 | 1, half = 0.095): Figure {
  const c = text[slot];
  if (!c || !DIGITS[c]) return { lines: [], half };
  return { lines: place(DIGITS[c], (slot - 0.5) * 0.66, 0, 0.98), half };
}

export function symbolFigure(name: SymbolName, half = 0.1): Figure {
  return { lines: place(SYMBOLS[name], 0, 0, 1.6), half };
}

/** A winding tracing path from the left rim to the right rim (for non-readers). */
export function pathFigure(variant: number, half = 0.075): Figure {
  const v = ((variant % 3) + 3) % 3;
  const curves: Polyline[] = [
    cubic([-0.86, 0.32], [-0.3, 0.95], [0.25, -0.85], [0.86, -0.22]),
    cubic([-0.86, -0.3], [-0.2, -0.95], [0.1, 0.95], [0.86, 0.28]),
    cubic([-0.8, 0.5], [-0.6, -0.7], [0.6, 0.7], [0.8, -0.5]),
  ];
  return { lines: [curves[v]!], half };
}

function segDist2(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len2 = dx * dx + dy * dy;
  let t = len2 > 0 ? ((px - a[0]) * dx + (py - a[1]) * dy) / len2 : 0;
  t = t < 0 ? 0 : t > 1 ? 1 : t;
  const x = a[0] + t * dx - px;
  const y = a[1] + t * dy - py;
  return x * x + y * y;
}

/** Distance from a point to the nearest stroke of the figure. */
export function figureDistance(fig: Figure, x: number, y: number): number {
  let best = Infinity;
  for (const line of fig.lines) {
    for (let i = 1; i < line.length; i++) {
      const d = segDist2(x, y, line[i - 1]!, line[i]!);
      if (d < best) best = d;
    }
  }
  return Math.sqrt(best);
}

export function inFigure(fig: Figure, x: number, y: number): boolean {
  return fig.lines.length > 0 && figureDistance(fig, x, y) <= fig.half;
}
