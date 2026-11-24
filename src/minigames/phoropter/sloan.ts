/**
 * Sloan optotypes on the standard 5×5 grid (stroke = 1 unit = 1 arcmin at
 * threshold). Drawn as vector strokes so they stay crisp at any size.
 */
const TAU = Math.PI * 2;

type Path = (c: CanvasRenderingContext2D) => void;

const GAP = Math.asin(0.5 / 2); // C opening: one stroke unit tall

const LETTERS: Record<string, Path> = {
  C: (c) => { c.arc(2.5, 2.5, 2, GAP, TAU - GAP); },
  O: (c) => { c.arc(2.5, 2.5, 2, 0, TAU); },
  D: (c) => {
    c.moveTo(0.5, 0.5); c.lineTo(2.3, 0.5); c.arc(2.3, 2.5, 2, -Math.PI / 2, Math.PI / 2); c.lineTo(0.5, 4.5); c.closePath();
  },
  H: (c) => { c.moveTo(0.5, 0); c.lineTo(0.5, 5); c.moveTo(4.5, 0); c.lineTo(4.5, 5); c.moveTo(0.5, 2.5); c.lineTo(4.5, 2.5); },
  K: (c) => { c.moveTo(0.5, 0); c.lineTo(0.5, 5); c.moveTo(4.8, 0); c.lineTo(0.9, 3.2); c.moveTo(2.1, 2.2); c.lineTo(4.8, 5); },
  N: (c) => { c.moveTo(0.5, 5); c.lineTo(0.5, 0.2); c.lineTo(4.5, 4.8); c.lineTo(4.5, 0); },
  R: (c) => {
    c.moveTo(0.5, 5); c.lineTo(0.5, 0.5); c.lineTo(3, 0.5); c.arc(3, 1.75, 1.25, -Math.PI / 2, Math.PI / 2); c.lineTo(0.5, 3);
    c.moveTo(2.4, 3); c.lineTo(4.7, 5);
  },
  S: (c) => {
    c.moveTo(4.3, 1.2);
    c.bezierCurveTo(3.9, 0.35, 1.2, 0.1, 0.75, 1.35);
    c.bezierCurveTo(0.35, 2.6, 4.6, 2.1, 4.3, 3.65);
    c.bezierCurveTo(4.0, 5.0, 1.0, 4.85, 0.6, 3.75);
  },
  V: (c) => { c.moveTo(0.35, 0); c.lineTo(2.5, 4.6); c.lineTo(4.65, 0); },
  Z: (c) => { c.moveTo(0.2, 0.5); c.lineTo(4.4, 0.5); c.lineTo(0.6, 4.5); c.lineTo(4.8, 4.5); },
};

/** Draw letter `ch` with its top-left at (x, y), `size` px tall. */
export function drawSloan(c: CanvasRenderingContext2D, ch: string, x: number, y: number, size: number, color = '#111'): void {
  const p = LETTERS[ch];
  if (!p) return;
  const u = size / 5;
  c.save();
  c.translate(x, y);
  c.scale(u, u);
  c.beginPath();
  c.rect(0, 0, 5, 5);
  c.clip();
  c.beginPath();
  p(c);
  c.lineWidth = 1;
  c.lineCap = 'butt';
  c.lineJoin = 'miter';
  c.miterLimit = 3;
  c.strokeStyle = color;
  c.stroke();
  c.restore();
}
