/** Canvas painters for the greyscale printouts and the pattern glyphs. */
import type { Eye, FieldDefect } from '@core';
import { blindSpotDepth, defectDepth, FIELD_RADIUS, lossAt, pointKey } from './model';
import type { PointResult } from './patient';
import { frameFor, toPx } from './paintBowl';


/** 0 (white) .. 1 (black) halftone darkness of a threshold, in 10 bands like a greyscale printout. */
export function darkness(db: number | null): number {
  if (db === null) return 1;
  // gamma so that normal sensitivities (25–33 dB) print light, as on a real greyscale
  const d = Math.pow(Math.max(0, Math.min(1, 1 - (db - 1) / 31)), 1.6);
  return Math.round(d * 9) / 9;
}

function halftone(ctx: CanvasRenderingContext2D, x0: number, y0: number, size: number, dark: number, pitch: number, ink: string) {
  ctx.fillStyle = ink;
  if (dark >= 0.99) {
    ctx.fillRect(x0, y0, size, size);
    return;
  }
  if (dark <= 0.01) return;
  const r = Math.sqrt(dark) * pitch * 0.62;
  const n = Math.max(1, Math.round(size / pitch));
  const step = size / n;
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      const off = (j % 2) * step * 0.5 * (dark < 0.5 ? 1 : 0);
      ctx.beginPath();
      ctx.arc(x0 + (i + 0.5) * step + off, y0 + (j + 0.5) * step, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** Soft true-field loss map (pathology + blind spot) rendered at 1 px/degree. */
function truthImage(defect: FieldDefect, eye: Eye, rgb: [number, number, number], alphaMax: number): HTMLCanvasElement | null {
  if (typeof document === 'undefined') return null;
  const N = FIELD_RADIUS * 2 + 1;
  const c = document.createElement('canvas');
  c.width = N;
  c.height = N;
  const g = c.getContext('2d');
  if (!g) return null;
  const img = g.createImageData(N, N);
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = i - FIELD_RADIUS;
      const y = FIELD_RADIUS - j;
      const d = Math.max(defectDepth(defect, eye, x, y), 0.85 * blindSpotDepth(eye, x, y));
      const o = (j * N + i) * 4;
      img.data[o] = rgb[0];
      img.data[o + 1] = rgb[1];
      img.data[o + 2] = rgb[2];
      img.data[o + 3] = Math.round(255 * alphaMax * d);
    }
  }
  g.putImageData(img, 0, 0);
  return c;
}

export interface PrintoutOpts {
  eye: Eye;
  results: ReadonlyMap<string, PointResult>;
  view: 'grey' | 'numeric';
  truth?: { defect: FieldDefect; reveal: number } | null;
  /** most recent result key — drawn with a brief highlight */
  fresh?: string | null;
}

export function paintPrintout(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, o: PrintoutOpts): void {
  const f = frameFor(w, h, 0.04);
  const ink = '#1c1524';
  ctx.clearRect(0, 0, w, h);

  // truth overlay (debrief)
  if (o.truth && o.truth.reveal > 0) {
    const img = truthImage(o.truth.defect, o.eye, [214, 52, 96], 0.5 * o.truth.reveal);
    if (img) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(f.cx, f.cy, f.R, 0, Math.PI * 2);
      ctx.clip();
      ctx.imageSmoothingEnabled = true;
      ctx.drawImage(img, f.cx - f.R - f.k / 2, f.cy - f.R - f.k / 2, f.R * 2 + f.k, f.R * 2 + f.k);
      ctx.restore();
    }
  }

  // axes & ticks
  ctx.strokeStyle = 'rgba(28, 21, 36, 0.55)';
  ctx.lineWidth = Math.max(1, 0.8 * dpr);
  ctx.beginPath();
  ctx.moveTo(f.cx - f.R, f.cy);
  ctx.lineTo(f.cx + f.R, f.cy);
  ctx.moveTo(f.cx, f.cy - f.R);
  ctx.lineTo(f.cx, f.cy + f.R);
  ctx.stroke();
  for (let d = -30; d <= 30; d += 10) {
    if (!d) continue;
    const tk = 3 * dpr;
    ctx.beginPath();
    ctx.moveTo(f.cx + d * f.k, f.cy - tk);
    ctx.lineTo(f.cx + d * f.k, f.cy + tk);
    ctx.moveTo(f.cx - tk, f.cy + d * f.k);
    ctx.lineTo(f.cx + tk, f.cy + d * f.k);
    ctx.stroke();
  }
  ctx.setLineDash([1.5 * dpr, 3 * dpr]);
  ctx.strokeStyle = 'rgba(28, 21, 36, 0.22)';
  ctx.beginPath();
  ctx.arc(f.cx, f.cy, f.R, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);

  const cell = 6 * f.k;
  const pitch = Math.max(2.4 * dpr, cell / 7);
  for (const r of o.results.values()) {
    const { x, y } = toPx(f, r.x, r.y);
    if (o.view === 'grey') {
      if (r.mode === 'threshold') {
        halftone(ctx, x - cell / 2, y - cell / 2, cell, darkness(r.db), pitch, ink);
      } else {
        // screening symbols: ○ seen, ■ not seen
        ctx.strokeStyle = ink;
        ctx.fillStyle = ink;
        ctx.lineWidth = 1.2 * dpr;
        if (r.seen) {
          ctx.beginPath();
          ctx.arc(x, y, cell * 0.18, 0, Math.PI * 2);
          ctx.stroke();
        } else {
          const q = cell * 0.22;
          ctx.fillRect(x - q, y - q, q * 2, q * 2);
        }
      }
    } else {
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `600 ${Math.round(Math.min(cell * 0.42, 12 * dpr))}px "Space Grotesk", ui-monospace, sans-serif`;
      if (r.mode === 'threshold') ctx.fillText(r.db === null ? '<0' : String(r.db), x, y);
      else {
        ctx.font = `${Math.round(Math.min(cell * 0.5, 13 * dpr))}px "Space Grotesk", sans-serif`;
        ctx.fillText(r.seen ? '○' : '■', x, y);
      }
    }
    if (o.fresh && o.fresh === pointKey(r)) {
      ctx.strokeStyle = 'rgba(200, 140, 30, 0.9)';
      ctx.lineWidth = 1.5 * dpr;
      ctx.strokeRect(x - cell / 2, y - cell / 2, cell, cell);
    }
  }
}

// ───────────────────────── glyph

export function paintGlyph(ctx: CanvasRenderingContext2D, size: number, defect: FieldDefect, eye: Eye, tone: 'dark' | 'gold' = 'dark'): void {
  const N = 41;
  const c = typeof document !== 'undefined' ? document.createElement('canvas') : null;
  ctx.clearRect(0, 0, size, size);
  if (!c) return;
  c.width = N;
  c.height = N;
  const g = c.getContext('2d');
  if (!g) return;
  const img = g.createImageData(N, N);
  const lit = tone === 'gold' ? [255, 226, 160] : [205, 190, 240];
  const off = [24, 14, 40];
  for (let j = 0; j < N; j++) {
    for (let i = 0; i < N; i++) {
      const x = ((i - 20) / 20) * FIELD_RADIUS;
      const y = ((20 - j) / 20) * FIELD_RADIUS;
      const d = lossAt(defect, eye, x, y);
      const fade = 0.75 + 0.25 * (1 - Math.hypot(x, y) / 34);
      const o = (j * N + i) * 4;
      for (let ch = 0; ch < 3; ch++) img.data[o + ch] = Math.round((lit[ch]! * fade) * (1 - d) + off[ch]! * d);
      img.data[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  const r = size / 2;
  ctx.save();
  ctx.beginPath();
  ctx.arc(r, r, r - 1.5, 0, Math.PI * 2);
  ctx.clip();
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(c, 0, 0, size, size);
  // meridian hairlines
  ctx.strokeStyle = 'rgba(20, 12, 36, 0.25)';
  ctx.lineWidth = Math.max(1, size / 60);
  ctx.beginPath();
  ctx.moveTo(0, r);
  ctx.lineTo(size, r);
  ctx.moveTo(r, 0);
  ctx.lineTo(r, size);
  ctx.stroke();
  ctx.restore();
  ctx.beginPath();
  ctx.arc(r, r, r - 1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(255, 214, 140, 0.55)';
  ctx.lineWidth = Math.max(1, size / 30);
  ctx.stroke();
}
