/** Canvas painters for the perimeter bowl. Pure drawing, no DOM besides the canvases handed in. */
import type { Eye } from '@core';
import { FIELD_RADIUS, GRID_30_2, normalSensitivity, pointKey, type FieldPoint } from './model';
import type { Flash, PointResult } from './patient';

export interface Frame {
  cx: number;
  cy: number;
  /** px per degree */
  k: number;
  R: number;
}

export function frameFor(w: number, h: number, pad = 0.1): Frame {
  const R = Math.min(w, h) * (0.5 - pad);
  return { cx: w / 2, cy: h / 2, R, k: R / FIELD_RADIUS };
}

export const toPx = (f: Frame, x: number, y: number) => ({ x: f.cx + x * f.k, y: f.cy - y * f.k });
export const toDeg = (f: Frame, px: number, py: number) => ({ x: (px - f.cx) / f.k, y: -(py - f.cy) / f.k });

/** Deterministic hash noise for grain (no Math.random in painters). */
function hash(i: number): number {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
}

// ───────────────────────── bowl

export function paintBowlBase(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number): void {
  const f = frameFor(w, h);
  const { cx, cy, R } = f;
  ctx.clearRect(0, 0, w, h);

  // soft halo behind the instrument
  const halo = ctx.createRadialGradient(cx, cy, R * 0.95, cx, cy, Math.min(w, h) / 2);
  halo.addColorStop(0, 'rgba(255, 196, 110, 0.12)');
  halo.addColorStop(0.6, 'rgba(255, 196, 110, 0.03)');
  halo.addColorStop(1, 'rgba(255, 196, 110, 0)');
  ctx.fillStyle = halo;
  ctx.fillRect(0, 0, w, h);

  // brass bezel
  const bez = ctx.createLinearGradient(cx - R, cy - R, cx + R, cy + R);
  bez.addColorStop(0, '#fbe3a6');
  bez.addColorStop(0.22, '#a87528');
  bez.addColorStop(0.5, '#4d310b');
  bez.addColorStop(0.75, '#c39042');
  bez.addColorStop(1, '#f6d895');
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.13, 0, Math.PI * 2);
  ctx.fillStyle = bez;
  ctx.shadowColor = 'rgba(0,0,0,0.75)';
  ctx.shadowBlur = 40 * dpr;
  ctx.shadowOffsetY = 16 * dpr;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;
  // engraved inner lip
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.07, 0, Math.PI * 2);
  ctx.fillStyle = '#1a1006';
  ctx.fill();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.1, 0, Math.PI * 2);
  ctx.strokeStyle = 'rgba(40, 24, 4, 0.75)';
  ctx.lineWidth = 1.2 * dpr;
  ctx.stroke();

  // degree ticks engraved on the bezel every 15°
  ctx.save();
  ctx.translate(cx, cy);
  for (let a = 0; a < 360; a += 5) {
    const rad = (a * Math.PI) / 180;
    const major = a % 45 === 0;
    const r0 = R * (major ? 1.085 : 1.095);
    ctx.beginPath();
    ctx.moveTo(Math.cos(rad) * r0, Math.sin(rad) * r0);
    ctx.lineTo(Math.cos(rad) * R * 1.12, Math.sin(rad) * R * 1.12);
    ctx.strokeStyle = major ? 'rgba(60, 36, 6, 0.9)' : 'rgba(60, 36, 6, 0.45)';
    ctx.lineWidth = (major ? 1.6 : 0.9) * dpr;
    ctx.stroke();
  }
  ctx.restore();

  // bowl interior — deep, luminous, slightly lit from the top
  const bowl = ctx.createRadialGradient(cx, cy - R * 0.18, R * 0.05, cx, cy, R * 1.07);
  bowl.addColorStop(0, '#2a2044');
  bowl.addColorStop(0.45, '#170f2b');
  bowl.addColorStop(0.85, '#0b0717');
  bowl.addColorStop(1, '#040208');
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.065, 0, Math.PI * 2);
  ctx.fillStyle = bowl;
  ctx.fill();

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R * 1.065, 0, Math.PI * 2);
  ctx.clip();

  // grain
  const n = Math.round((w * h) / (900 * dpr));
  for (let i = 0; i < n; i++) {
    const px = hash(i) * w;
    const py = hash(i + 9301) * h;
    ctx.fillStyle = `rgba(255,240,220,${0.015 + hash(i + 77) * 0.03})`;
    ctx.fillRect(px, py, dpr, dpr);
  }

  // isopter rings & meridians
  ctx.setLineDash([2 * dpr, 5 * dpr]);
  for (const deg of [10, 20, 30]) {
    ctx.beginPath();
    ctx.arc(cx, cy, deg * f.k, 0, Math.PI * 2);
    ctx.strokeStyle = deg === 30 ? 'rgba(255, 228, 190, 0.12)' : 'rgba(255, 228, 190, 0.075)';
    ctx.lineWidth = dpr;
    ctx.stroke();
  }
  ctx.setLineDash([]);
  ctx.strokeStyle = 'rgba(255, 228, 190, 0.07)';
  ctx.lineWidth = dpr;
  ctx.beginPath();
  ctx.moveTo(cx - R * 1.06, cy);
  ctx.lineTo(cx + R * 1.06, cy);
  ctx.moveTo(cx, cy - R * 1.06);
  ctx.lineTo(cx, cy + R * 1.06);
  ctx.stroke();

  // labels
  ctx.fillStyle = 'rgba(255, 228, 190, 0.32)';
  ctx.font = `${Math.round(9.5 * dpr)}px "Space Grotesk", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'top';
  for (const deg of [10, 20, 30]) ctx.fillText(`${deg}°`, cx + deg * f.k - 9 * dpr, cy + 4 * dpr);

  // specular sheen at the top of the bowl, a warm bounce at the bottom lip, rim shadow
  ctx.save();
  ctx.translate(cx, cy - R * 0.62);
  ctx.scale(1, 0.42);
  const sheen = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.85);
  sheen.addColorStop(0, 'rgba(255, 240, 220, 0.075)');
  sheen.addColorStop(1, 'rgba(255, 240, 220, 0)');
  ctx.fillStyle = sheen;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(cx, cy + R * 0.98);
  ctx.scale(1, 0.25);
  const bounce = ctx.createRadialGradient(0, 0, 0, 0, 0, R * 0.7);
  bounce.addColorStop(0, 'rgba(255, 200, 120, 0.10)');
  bounce.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = bounce;
  ctx.beginPath();
  ctx.arc(0, 0, R * 0.7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  const rim = ctx.createRadialGradient(cx, cy, R * 0.86, cx, cy, R * 1.07);
  rim.addColorStop(0, 'rgba(0,0,0,0)');
  rim.addColorStop(1, 'rgba(0,0,0,0.6)');
  ctx.fillStyle = rim;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

export interface BowlLive {
  eye: Eye;
  results: ReadonlyMap<string, PointResult>;
  queued: readonly FieldPoint[];
  hover: FieldPoint | null;
  focus: FieldPoint | null;
  flash: { flash: Flash; at: number; until: number } | null;
  age: number;
  now: number;
  reduced: boolean;
  interactive: boolean;
}

/** Colour of a tested result on the bowl (teal normal → amber depressed → rose absent). */
export function resultTone(r: PointResult, age: number): string {
  if (r.mode === 'screen') return r.seen ? '#5eead4' : '#f43f5e';
  if (r.db === null) return '#f43f5e';
  const deficit = normalSensitivity(r.x, r.y, age) - r.db;
  return deficit <= 5 ? '#5eead4' : deficit <= 12 ? '#fbbf24' : '#fb7185';
}

export function paintBowlLive(ctx: CanvasRenderingContext2D, w: number, h: number, dpr: number, s: BowlLive): void {
  const f = frameFor(w, h);
  const t = s.now / 1000;
  ctx.clearRect(0, 0, w, h);
  const queued = new Set(s.queued.map(pointKey));

  // grid locations
  for (const p of GRID_30_2) {
    const k = pointKey(p);
    const r = s.results.get(k);
    const { x, y } = toPx(f, p.x, p.y);
    if (r) {
      const col = resultTone(r, s.age);
      ctx.save();
      ctx.shadowColor = col;
      ctx.shadowBlur = 8 * dpr;
      ctx.fillStyle = col;
      if (r.mode === 'screen' && r.seen) {
        ctx.beginPath();
        ctx.arc(x, y, 3.2 * dpr, 0, Math.PI * 2);
        ctx.lineWidth = 1.4 * dpr;
        ctx.strokeStyle = col;
        ctx.stroke();
      } else if ((r.mode === 'screen' && !r.seen) || r.db === null) {
        const q = 3 * dpr;
        ctx.fillRect(x - q, y - q, q * 2, q * 2);
      } else {
        ctx.beginPath();
        ctx.arc(x, y, 3.1 * dpr, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.restore();
    } else {
      ctx.beginPath();
      ctx.arc(x, y, 1.5 * dpr, 0, Math.PI * 2);
      ctx.fillStyle = s.interactive ? 'rgba(255, 236, 210, 0.26)' : 'rgba(255, 236, 210, 0.14)';
      ctx.fill();
    }
    if (queued.has(k)) {
      const pulse = s.reduced ? 0.7 : 0.55 + 0.45 * Math.sin(t * 6 + p.x * 0.3);
      ctx.beginPath();
      ctx.arc(x, y, 7 * dpr, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 210, 122, ${0.35 + 0.4 * pulse})`;
      ctx.setLineDash([2.5 * dpr, 2.5 * dpr]);
      ctx.lineWidth = 1.2 * dpr;
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }

  // reticle (pointer hover takes priority over keyboard focus)
  const ret = s.interactive ? (s.hover ?? s.focus) : null;
  if (ret) {
    const { x, y } = toPx(f, ret.x, ret.y);
    const rr = 11 * dpr;
    ctx.save();
    ctx.strokeStyle = 'rgba(255, 210, 122, 0.9)';
    ctx.shadowColor = 'rgba(255, 210, 122, 0.8)';
    ctx.shadowBlur = 10 * dpr;
    ctx.lineWidth = 1.4 * dpr;
    ctx.beginPath();
    ctx.arc(x, y, rr, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const a = (i * Math.PI) / 2;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (rr + 2 * dpr), y + Math.sin(a) * (rr + 2 * dpr));
      ctx.lineTo(x + Math.cos(a) * (rr + 7 * dpr), y + Math.sin(a) * (rr + 7 * dpr));
      ctx.stroke();
    }
    ctx.restore();
  }

  // fixation light (amber LED)
  const pulse = s.reduced ? 1 : 0.85 + 0.15 * Math.sin(t * 2.4);
  const glow = ctx.createRadialGradient(f.cx, f.cy, 0, f.cx, f.cy, 16 * dpr);
  glow.addColorStop(0, `rgba(255, 196, 90, ${0.55 * pulse})`);
  glow.addColorStop(1, 'rgba(255, 196, 90, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(f.cx, f.cy, 16 * dpr, 0, Math.PI * 2);
  ctx.fill();
  ctx.beginPath();
  ctx.arc(f.cx, f.cy, 2.6 * dpr, 0, Math.PI * 2);
  ctx.fillStyle = '#ffe3a1';
  ctx.fill();

  // the stimulus (Goldmann III, exaggerated for visibility); brighter = lower dB
  if (s.flash && s.now <= s.flash.until + 120) {
    const fl = s.flash.flash;
    const { x, y } = toPx(f, fl.x, fl.y);
    const dur = s.flash.until - s.flash.at;
    const u = (s.now - s.flash.at) / dur;
    const env = s.reduced ? (u <= 1 ? 1 : 0) : u < 0.15 ? u / 0.15 : u <= 1 ? 1 : Math.max(0, 1 - (u - 1) * 4);
    const lum = Math.max(0.12, 1 - fl.db / 44);
    const a = env * lum;
    const bloom = ctx.createRadialGradient(x, y, 0, x, y, (10 + 16 * lum) * dpr);
    bloom.addColorStop(0, `rgba(255, 255, 255, ${0.75 * a})`);
    bloom.addColorStop(0.3, `rgba(220, 230, 255, ${0.25 * a})`);
    bloom.addColorStop(1, 'rgba(220, 230, 255, 0)');
    ctx.fillStyle = bloom;
    ctx.beginPath();
    ctx.arc(x, y, (10 + 16 * lum) * dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x, y, 3.2 * dpr, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${Math.min(1, a * 1.3)})`;
    ctx.fill();
  }
}

// ───────────────────────── printout
