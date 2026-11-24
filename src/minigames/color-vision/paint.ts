/**
 * Canvas painting for plates: warm paper stock, ink dots with a soft printed
 * body, and daylight-lamp lighting. Each plate is painted once into an
 * offscreen canvas and blitted onto the visible page canvas.
 */
import type { Vec3 } from './color';
import { toSrgb } from './color';
import type { Dot } from './packing';

export const PLATE_PX = 720;

let paperCache: HTMLCanvasElement | null = null;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/** Cream paper with fibres and fine tooth (cached). */
function paper(size: number): HTMLCanvasElement {
  if (paperCache && paperCache.width === size) return paperCache;
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  if (!g) return c;
  const base = g.createRadialGradient(size * 0.38, size * 0.3, size * 0.05, size * 0.5, size * 0.5, size * 0.75);
  base.addColorStop(0, '#f8f0de');
  base.addColorStop(0.6, '#efe3c9');
  base.addColorStop(1, '#ddcca8');
  g.fillStyle = base;
  g.fillRect(0, 0, size, size);
  // tooth: per-pixel grain
  const img = g.getImageData(0, 0, size, size);
  const d = img.data;
  let seed = 1234567;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) >>> 0) / 4294967296);
  for (let i = 0; i < d.length; i += 4) {
    const n = (rnd() - 0.5) * 14;
    d[i] = d[i]! + n;
    d[i + 1] = d[i + 1]! + n;
    d[i + 2] = d[i + 2]! + n * 0.9;
  }
  g.putImageData(img, 0, 0);
  // fibres
  g.lineCap = 'round';
  for (let i = 0; i < 260; i++) {
    const x = rnd() * size;
    const y = rnd() * size;
    const a = rnd() * Math.PI;
    const l = 4 + rnd() * 16;
    g.strokeStyle = rnd() < 0.5 ? 'rgba(150,120,80,0.10)' : 'rgba(255,255,245,0.22)';
    g.lineWidth = 0.6 + rnd() * 0.8;
    g.beginPath();
    g.moveTo(x, y);
    g.quadraticCurveTo(x + Math.cos(a) * l * 0.5 + (rnd() - 0.5) * 4, y + Math.sin(a) * l * 0.5, x + Math.cos(a) * l, y + Math.sin(a) * l);
    g.stroke();
  }
  paperCache = c;
  return c;
}

const css = (c: Vec3, k = 1, a = 1) =>
  `rgba(${Math.round(toSrgb(c[0] * k) * 255)},${Math.round(toSrgb(c[1] * k) * 255)},${Math.round(toSrgb(c[2] * k) * 255)},${a})`;

/** Paint a full plate (paper + printed dots + lighting) into a new canvas. */
export function paintPlate(dots: readonly Dot[], colors: readonly Vec3[], size = PLATE_PX): HTMLCanvasElement {
  const c = makeCanvas(size, size);
  const g = c.getContext('2d');
  if (!g) return c;
  g.drawImage(paper(size), 0, 0);
  const cx = size / 2;
  const R = size * 0.46;

  // faint impression of the printed disc on the stock
  g.save();
  g.beginPath();
  g.arc(cx, cx, R * 1.004, 0, Math.PI * 2);
  g.fillStyle = 'rgba(120, 95, 60, 0.05)';
  g.fill();
  g.restore();

  for (let i = 0; i < dots.length; i++) {
    const d = dots[i]!;
    const col = colors[i]!;
    const x = cx + d.x * R;
    const y = cx + d.y * R;
    const r = d.r * R;
    // ink spreads slightly into the paper
    g.beginPath();
    g.arc(x + r * 0.06, y + r * 0.1, r * 1.04, 0, Math.PI * 2);
    g.fillStyle = css(col, 0.72, 0.28);
    g.fill();
    const grad = g.createRadialGradient(x - r * 0.32, y - r * 0.36, r * 0.08, x, y, r);
    grad.addColorStop(0, css(col, 1.16));
    grad.addColorStop(0.7, css(col, 1));
    grad.addColorStop(1, css(col, 0.86));
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fillStyle = grad;
    g.fill();
  }

  // a touch of paper tooth over the ink (matte print)
  g.save();
  g.globalAlpha = 0.18;
  g.globalCompositeOperation = 'multiply';
  g.drawImage(paper(size), 0, 0);
  g.restore();

  // daylight lamp from the upper left
  g.save();
  g.globalCompositeOperation = 'soft-light';
  const lamp = g.createRadialGradient(size * 0.28, size * 0.2, 0, size * 0.28, size * 0.2, size * 0.95);
  lamp.addColorStop(0, 'rgba(255,250,235,0.55)');
  lamp.addColorStop(0.5, 'rgba(255,245,225,0.08)');
  lamp.addColorStop(1, 'rgba(40,25,10,0.45)');
  g.fillStyle = lamp;
  g.fillRect(0, 0, size, size);
  g.restore();

  // vignette into the binding
  const vig = g.createLinearGradient(0, 0, size * 0.08, 0);
  vig.addColorStop(0, 'rgba(60,40,20,0.22)');
  vig.addColorStop(1, 'rgba(60,40,20,0)');
  g.fillStyle = vig;
  g.fillRect(0, 0, size * 0.08, size);
  return c;
}

/** Copy a cached plate onto a visible canvas, matching its backing size. */
export function blit(target: HTMLCanvasElement, source: HTMLCanvasElement): void {
  if (target.width !== source.width) target.width = source.width;
  if (target.height !== source.height) target.height = source.height;
  const g = target.getContext('2d');
  if (!g) return;
  g.clearRect(0, 0, target.width, target.height);
  g.drawImage(source, 0, 0);
}
