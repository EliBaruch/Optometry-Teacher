import type { Eye } from '@core';

export interface TracePoint { t: number; od: number; os: number; lit: Eye | 'near' | 'bright' | null }
const SPAN = 14;
const MM_LO = 1.5;
const MM_HI = 9;

const COL = { OD: '#ffd27a', OS: '#7fe3ff' };

/** Oscilloscope-style pupil diameter trace with bands showing where the light was. */
export function drawTrace(g: CanvasRenderingContext2D, c: HTMLCanvasElement, pts: TracePoint[], now: number): void {
  const w = c.width, h = c.height;
  g.clearRect(0, 0, w, h);
  const x = (t: number) => w - ((now - t) / SPAN) * w;
  const y = (mm: number) => h - 8 - ((mm - MM_LO) / (MM_HI - MM_LO)) * (h - 16);
  g.fillStyle = 'rgba(6,3,13,0.55)';
  g.fillRect(0, 0, w, h);
  for (let i = 0; i < pts.length - 1; i++) {
    const p = pts[i]!;
    if (!p.lit) continue;
    g.fillStyle = p.lit === 'OD' ? 'rgba(255,210,122,0.2)' : p.lit === 'OS' ? 'rgba(127,227,255,0.2)' : p.lit === 'near' ? 'rgba(190,150,255,0.16)' : 'rgba(255,246,223,0.1)';
    g.fillRect(x(p.t), 0, Math.max(1, x(pts[i + 1]!.t) - x(p.t) + 0.5), h);
  }
  (['od', 'os'] as const).forEach((k) => {
    g.beginPath();
    pts.forEach((p, i) => (i ? g.lineTo(x(p.t), y(p[k])) : g.moveTo(x(p.t), y(p[k]))));
    g.strokeStyle = COL[k === 'od' ? 'OD' : 'OS'];
    g.lineWidth = 2;
    g.shadowColor = g.strokeStyle;
    g.shadowBlur = 6;
    g.stroke();
    g.shadowBlur = 0;
  });
}
