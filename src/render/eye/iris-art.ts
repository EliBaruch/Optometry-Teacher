/**
 * Collectible iris card artwork for the Gallery. Rarer = more exotic: palette
 * sectors, iridescent shimmer, starfields in the pupil, a gilded filigree rim
 * and light rays. Deterministic per seed.
 */
import { createRng, type Rng } from '@core';
import { hexToRgb, mix, rgba, shade, type RGB } from './color';
import { paintIris } from './iris';

export type IrisRarity = 'common' | 'rare' | 'epic' | 'legendary';

export interface IrisArtOptions {
  palette: string[];
  rarity: IrisRarity;
  /** animation phase in seconds (shimmer); default 0 */
  t?: number;
}

const TAU = Math.PI * 2;
const EXOTIC: Record<IrisRarity, number> = { common: 0, rare: 0.45, epic: 0.8, legendary: 1 };

function sparkle(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, color: string, alpha: number): void {
  ctx.save();
  ctx.translate(x, y);
  ctx.globalAlpha = alpha;
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  const a = r * 1.8;
  const b = r * 0.12;
  ctx.moveTo(-a, 0);
  ctx.quadraticCurveTo(0, -b, a, 0);
  ctx.quadraticCurveTo(0, b, -a, 0);
  ctx.moveTo(0, -a);
  ctx.quadraticCurveTo(b, 0, 0, a);
  ctx.quadraticCurveTo(-b, 0, 0, -a);
  ctx.fill();
  ctx.restore();
}

function starfield(ctx: CanvasRenderingContext2D, rng: Rng, cx: number, cy: number, r: number, n: number, pal: RGB[]): void {
  for (let i = 0; i < n; i++) {
    const a = rng.float(0, TAU);
    const d = Math.sqrt(rng.next()) * r;
    const s = rng.float(0.3, 1.2) * (r / 40);
    const c = rng.chance(0.7) ? [255, 255, 255] as RGB : pal[rng.int(0, pal.length - 1)]!;
    ctx.fillStyle = rgba(c, rng.float(0.5, 1));
    ctx.beginPath();
    ctx.arc(cx + Math.cos(a) * d, cy + Math.sin(a) * d, Math.max(0.4, s), 0, TAU);
    ctx.fill();
  }
}

/** Paint a square, jewel-like iris card artwork of `size` px at (0,0). */
export function paintIrisArt(ctx: CanvasRenderingContext2D, size: number, seed: number, opts: IrisArtOptions): void {
  const rng = createRng((seed >>> 0) ^ 0xa27);
  const pal = (opts.palette.length ? opts.palette : ['#4a6b8a', '#7aa0c0', '#2c4058']).map(hexToRgb);
  const ex = EXOTIC[opts.rarity];
  const t = opts.t ?? 0;
  const c = size / 2;
  const R = size * 0.34;
  const pupilR = R * (opts.rarity === 'legendary' ? 0.36 : 0.3 + rng.float(-0.03, 0.03));
  const accent = pal[1] ?? pal[0]!;

  ctx.save();
  // ── backdrop: midnight velvet with a palette glow
  const bg = ctx.createRadialGradient(c, c * 0.9, size * 0.05, c, c, size * 0.75);
  bg.addColorStop(0, rgba(mix(shade(accent, 0.55), [26, 15, 46], 0.4)));
  bg.addColorStop(0.55, rgba(mix(shade(pal[0]!, 0.22), [16, 10, 30], 0.6)));
  bg.addColorStop(1, '#07040f');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, size, size);
  // bokeh
  for (let i = 0; i < 10 + ex * 14; i++) {
    const x = rng.float(0, size);
    const y = rng.float(0, size);
    const r = rng.float(0.02, 0.08) * size;
    const col = pal[rng.int(0, pal.length - 1)]!;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, rgba(mix(col, [255, 255, 255], 0.3), 0.18));
    g.addColorStop(0.7, rgba(col, 0.08));
    g.addColorStop(1, rgba(col, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
  }
  starfield(ctx, rng.fork('bg'), c, c, size * 0.7, 30 + ex * 50, pal);

  // light rays behind the jewel (epic+)
  if (ex >= 0.8) {
    ctx.save();
    ctx.translate(c, c);
    ctx.rotate(t * 0.05);
    ctx.globalCompositeOperation = 'screen';
    const rays = opts.rarity === 'legendary' ? 18 : 10;
    for (let i = 0; i < rays; i++) {
      const a = (i / rays) * TAU + rng.float(-0.05, 0.05);
      const w = rng.float(0.03, 0.08);
      const g = ctx.createRadialGradient(0, 0, R, 0, 0, size * 0.7);
      g.addColorStop(0, rgba(mix(accent, [255, 230, 170], 0.5), 0.28 * ex));
      g.addColorStop(1, rgba(accent, 0));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, size * 0.75, a - w, a + w);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  // halo
  const halo = ctx.createRadialGradient(c, c, R * 0.9, c, c, R * 1.5);
  halo.addColorStop(0, rgba(mix(accent, [255, 255, 255], 0.3), 0.45));
  halo.addColorStop(1, rgba(accent, 0));
  ctx.fillStyle = halo;
  ctx.beginPath();
  ctx.arc(c, c, R * 1.5, 0, TAU);
  ctx.fill();

  // ── the iris itself
  paintIris(ctx, c, c, R, pupilR, {
    color: opts.palette[0] ?? '#4a6b8a', seed, palette: opts.palette, exotic: ex,
  });

  // pupil treatment
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, pupilR * 0.97, 0, TAU);
  ctx.clip();
  if (ex >= 0.45) {
    starfield(ctx, rng.fork('pupil'), c, c, pupilR, Math.round(14 + ex * 50), pal);
  }
  if (opts.rarity === 'legendary') {
    // a tiny nebula swirling in the pupil
    for (let i = 0; i < 5; i++) {
      const a = rng.float(0, TAU) + t * 0.1;
      const d = rng.float(0.1, 0.5) * pupilR;
      const col = pal[i % pal.length]!;
      const g = ctx.createRadialGradient(c + Math.cos(a) * d, c + Math.sin(a) * d, 0, c + Math.cos(a) * d, c + Math.sin(a) * d, pupilR * 0.7);
      g.addColorStop(0, rgba(col, 0.38));
      g.addColorStop(1, rgba(col, 0));
      ctx.fillStyle = g;
      ctx.fillRect(c - pupilR, c - pupilR, pupilR * 2, pupilR * 2);
    }
    sparkle(ctx, c + pupilR * 0.1, c - pupilR * 0.05, pupilR * 0.18, 'rgba(255,240,200,0.9)', 0.95);
  }
  ctx.restore();

  // iridescent shimmer (epic+), subtle prismatic for rare
  if (ex > 0 && typeof ctx.createConicGradient === 'function') {
    ctx.save();
    ctx.beginPath();
    ctx.arc(c, c, R, 0, TAU);
    ctx.arc(c, c, pupilR, 0, TAU, true);
    ctx.clip('evenodd');
    const cg = ctx.createConicGradient(t * 0.4 + rng.float(0, TAU), c, c);
    const hues = ['#ff6ad5', '#c774e8', '#ad8cff', '#8795e8', '#94d0ff', '#7affc8', '#fff59e', '#ff6ad5'];
    hues.forEach((h, i) => cg.addColorStop(i / (hues.length - 1), h));
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.18 + ex * 0.32;
    ctx.fillStyle = cg;
    ctx.fillRect(c - R, c - R, R * 2, R * 2);
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.06 + ex * 0.1;
    ctx.fillRect(c - R, c - R, R * 2, R * 2);
    ctx.restore();
  }

  // ── rim: glass for common/rare, silver for epic, gilded filigree for legendary
  const rimCol: RGB = opts.rarity === 'legendary' ? [255, 210, 122] : opts.rarity === 'epic' ? [215, 225, 245] : mix(accent, [255, 255, 255], 0.6);
  ctx.lineWidth = Math.max(1, size * (opts.rarity === 'legendary' ? 0.018 : 0.008));
  const rg = ctx.createLinearGradient(c - R, c - R, c + R, c + R);
  rg.addColorStop(0, rgba(mix(rimCol, [255, 255, 255], 0.6), 0.95));
  rg.addColorStop(0.5, rgba(shade(rimCol, 0.55), 0.85));
  rg.addColorStop(1, rgba(rimCol, 0.95));
  ctx.strokeStyle = rg;
  ctx.beginPath();
  ctx.arc(c, c, R + ctx.lineWidth / 2, 0, TAU);
  ctx.stroke();
  if (opts.rarity === 'legendary') {
    ctx.fillStyle = rgba(rimCol, 0.95);
    const n = 24;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const rr = R + size * 0.045;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a) * rr, c + Math.sin(a) * rr, size * (i % 2 ? 0.004 : 0.008), 0, TAU);
      ctx.fill();
    }
    ctx.strokeStyle = rgba(rimCol, 0.6);
    ctx.lineWidth = Math.max(0.6, size * 0.003);
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      const r0 = R + size * 0.02;
      ctx.beginPath();
      ctx.arc(c + Math.cos(a + 0.13) * (r0 + size * 0.012), c + Math.sin(a + 0.13) * (r0 + size * 0.012), size * 0.016, a + Math.PI * 0.6, a + Math.PI * 1.6);
      ctx.stroke();
    }
  }

  // ── wet glass reflections
  ctx.save();
  ctx.beginPath();
  ctx.arc(c, c, R, 0, TAU);
  ctx.clip();
  const dome = ctx.createRadialGradient(c - R * 0.35, c - R * 0.45, 0, c, c, R);
  dome.addColorStop(0, 'rgba(255,255,255,0.22)');
  dome.addColorStop(0.5, 'rgba(255,255,255,0.04)');
  dome.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = dome;
  ctx.fillRect(c - R, c - R, R * 2, R * 2);
  // window reflection
  ctx.translate(c - R * 0.36, c - R * 0.38);
  ctx.rotate(-0.15);
  ctx.fillStyle = 'rgba(255,255,255,0.82)';
  const W = R * 0.26;
  const H = R * 0.2;
  const gp = R * 0.025;
  for (const [qx, qy] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    ctx.beginPath();
    ctx.rect(-W / 2 + qx * (W / 2 + gp / 2), -H / 2 + qy * (H / 2 + gp / 2), W / 2 - gp / 2, H / 2 - gp / 2);
    ctx.fill();
  }
  ctx.restore();
  // rim light arc
  ctx.strokeStyle = 'rgba(255,255,255,0.35)';
  ctx.lineWidth = Math.max(1, size * 0.006);
  ctx.beginPath();
  ctx.arc(c, c, R * 0.97, Math.PI * 0.15, Math.PI * 0.55);
  ctx.stroke();

  // glints
  const glints = opts.rarity === 'common' ? 1 : opts.rarity === 'rare' ? 3 : opts.rarity === 'epic' ? 5 : 8;
  for (let i = 0; i < glints; i++) {
    const a = rng.float(0, TAU);
    const d = rng.float(R * 0.95, R * 1.35);
    const tw = 0.6 + 0.4 * Math.sin(t * 2 + i * 1.7);
    sparkle(ctx, c + Math.cos(a) * d, c + Math.sin(a) * d, size * rng.float(0.01, 0.022), rgba(mix(accent, [255, 255, 255], 0.6), 0.9), tw);
  }

  // vignette
  const v = ctx.createRadialGradient(c, c, size * 0.4, c, c, size * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(0,0,0,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}
