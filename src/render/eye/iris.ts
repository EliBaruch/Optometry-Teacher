/**
 * Anatomical iris painter: limbal ring, ciliary zone with radial trabecular
 * fibres and contraction furrows, Fuchs crypts, a raised collarette, pupillary
 * zone, pigment flecks and a crenellated pupillary ruff. Painted with strokes so
 * it reads as illustrated, not noisy. Results are cached as textures.
 */
import { createRng, type Rng } from '@core';
import { hexToRgb, luminance, makeCanvas, mix, rgba, saturate, shade, smoothClosedPath, type RGB } from './color';

export type PupilShape = 'round' | 'irregular' | 'mid-dilated' | 'peaked';

export interface IrisLook {
  inner: RGB;
  collar: RGB;
  mid: RGB;
  outer: RGB;
  limbal: RGB;
  fibreLight: RGB;
  fibreDark: RGB;
  fleck: RGB;
  crypt: RGB;
  ruff: RGB;
  dark: boolean;
  /** extra palette colours for collectible art: painted as sectors/flecks */
  extras: RGB[];
}

export function irisLook(color: string, palette?: readonly string[]): IrisLook {
  if (palette && palette.length) {
    const p = palette.map(hexToRgb);
    const a = p[0]!;
    const b = p[1] ?? shade(a, 1.15);
    const c = p[2] ?? shade(b, 0.8);
    return {
      inner: a, collar: mix(a, b, 0.5), mid: b, outer: c,
      limbal: shade(mix(c, [10, 8, 30], 0.5), 0.45),
      fibreLight: mix(b, [255, 255, 255], 0.5), fibreDark: shade(c, 0.45),
      fleck: p[3] ?? [255, 210, 122], crypt: shade(mix(a, c, 0.5), 0.3), ruff: shade(a, 0.22),
      dark: luminance(b) < 0.16, extras: p.slice(3),
    };
  }
  const base = hexToRgb(color);
  const L = luminance(base);
  const dark = L < 0.17;
  const warm = base[0] > base[2];
  if (dark) {
    return {
      inner: shade(base, 0.7), collar: mix(base, [120, 72, 36], 0.45), mid: shade(base, 1.05), outer: shade(base, 0.8),
      limbal: shade(base, 0.32), fibreLight: mix(base, [176, 112, 60], 0.55), fibreDark: shade(base, 0.45),
      fleck: [150, 92, 40], crypt: shade(base, 0.3), ruff: [22, 12, 8], dark, extras: [],
    };
  }
  // Light/intermediate irides: central heterochromia (amber pupillary zone) is common in green/hazel/blue-grey.
  const amber: RGB = [168, 112, 48];
  return {
    inner: mix(base, amber, warm ? 0.3 : 0.38),
    collar: mix(mix(base, [255, 255, 255], 0.28), amber, 0.15),
    mid: shade(saturate(base, 1.08), 1.06),
    outer: shade(base, 0.78),
    limbal: shade(mix(base, [20, 26, 40], 0.45), 0.42),
    fibreLight: mix(base, [255, 255, 255], 0.5),
    fibreDark: shade(base, 0.5),
    fleck: warm ? [196, 140, 60] : [190, 150, 80],
    crypt: shade(mix(base, [30, 20, 20], 0.4), 0.32),
    ruff: [52, 30, 20],
    dark, extras: [],
  };
}

/** Pupil outline (path only). */
export function pupilPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number, shape: PupilShape = 'round', seed = 1): void {
  if (shape === 'round') {
    ctx.moveTo(cx + r, cy);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    return;
  }
  const pts: [number, number][] = [];
  const rng = createRng(seed ^ 0x5151);
  const lobes = 3 + rng.int(0, 2);
  const phase = rng.float(0, Math.PI * 2);
  for (let i = 0; i < 48; i++) {
    const a = (i / 48) * Math.PI * 2;
    let rr = r;
    if (shape === 'irregular') {
      // posterior synechiae: scalloped, adherent points
      rr = r * (1 - 0.13 * Math.pow(Math.max(0, Math.cos(a * lobes + phase)), 6) + 0.03 * Math.sin(a * 7 + phase));
    } else if (shape === 'mid-dilated') {
      // vertically oval, sluggish (angle-closure)
      rr = r / Math.sqrt(Math.pow(Math.cos(a) / 0.92, 2) + Math.pow(Math.sin(a) / 1.06, 2));
    } else if (shape === 'peaked') {
      const d = Math.cos(a - phase);
      rr = r * (1 + 0.35 * Math.pow(Math.max(0, d), 8));
    }
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  smoothClosedPath(ctx, pts);
}

export interface IrisPaintOptions {
  color: string;
  seed: number;
  palette?: readonly string[];
  pupilShape?: PupilShape;
  /** Neovascularization of the iris (rubeosis) — fine red vessels at the pupil margin. */
  rubeosis?: boolean;
  nevus?: boolean;
  /** Collectible extras */
  exotic?: number; // 0..1
}

/** Paint a full iris (and black pupil) centred at (cx, cy). */
export function paintIris(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, pupilR: number, o: IrisPaintOptions): void {
  const look = irisLook(o.color, o.palette);
  const rng = createRng(o.seed >>> 0);
  const pr = Math.max(R * 0.12, Math.min(R * 0.84, pupilR));
  const span = R - pr;
  const collR = pr + span * (0.3 + 0.06 * (1 - pr / R));
  const k = R / 200; // stroke scale

  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, R, 0, Math.PI * 2);
  ctx.clip();

  // 1 · base radial colour field
  const g = ctx.createRadialGradient(cx, cy, pr * 0.9, cx, cy, R);
  const t = (r: number) => Math.max(0, Math.min(1, (r - pr * 0.9) / (R - pr * 0.9)));
  g.addColorStop(0, rgba(shade(look.inner, 0.75)));
  g.addColorStop(t(pr + span * 0.12), rgba(look.inner));
  g.addColorStop(t(collR), rgba(look.collar));
  g.addColorStop(t(collR + span * 0.12), rgba(look.mid));
  g.addColorStop(t(R * 0.86), rgba(mix(look.mid, look.outer, 0.7)));
  g.addColorStop(t(R * 0.94), rgba(look.outer));
  g.addColorStop(1, rgba(look.limbal));
  ctx.fillStyle = g;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // collectible sectoral colours
  if (look.extras.length && (o.exotic ?? 0) > 0) {
    const n = look.extras.length;
    for (let i = 0; i < n; i++) {
      const a0 = rng.float(0, Math.PI * 2);
      const w = rng.float(0.5, 1.3);
      const sg = ctx.createRadialGradient(cx, cy, collR, cx, cy, R * 0.95);
      sg.addColorStop(0, rgba(look.extras[i]!, 0));
      sg.addColorStop(0.5, rgba(look.extras[i]!, 0.55 * (o.exotic ?? 0)));
      sg.addColorStop(1, rgba(look.extras[i]!, 0));
      ctx.fillStyle = sg;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, R, a0, a0 + w);
      ctx.closePath();
      ctx.fill();
    }
  }

  // 2 · soft stromal mottling
  for (let i = 0; i < 140; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r = rng.float(pr, R * 0.95);
    const s = rng.float(4, 14) * k;
    const c = rng.chance(0.5) ? look.fibreLight : look.fibreDark;
    const gg = ctx.createRadialGradient(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0, cx + Math.cos(a) * r, cy + Math.sin(a) * r, s);
    gg.addColorStop(0, rgba(c, look.dark ? 0.08 : 0.12));
    gg.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = gg;
    ctx.fillRect(cx + Math.cos(a) * r - s, cy + Math.sin(a) * r - s, s * 2, s * 2);
  }

  // 3 · radial fibres (dark interstitial, then light trabeculae)
  const fibre = (rngF: Rng, a: number, r0: number, r1: number, width: number, col: RGB, alpha: number) => {
    const wav = rngF.float(0.02, 0.07);
    const ph = rngF.float(0, 6.28);
    const steps = 7;
    ctx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const u = i / steps;
      const r = r0 + (r1 - r0) * u;
      // fibres wave and bend slightly as they cross the collarette
      const aa = a + Math.sin(u * 5.2 + ph) * wav * (0.4 + u) + (r < collR ? 0.015 * Math.sin(ph) : 0);
      const x = cx + Math.cos(aa) * r;
      const y = cy + Math.sin(aa) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.strokeStyle = rgba(col, alpha);
    ctx.lineWidth = width;
    ctx.stroke();
  };
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // fibre count scales with resolution; a separate stream keeps every other feature identical at any DPR
  const frng = createRng((o.seed ^ 0x9e3779b9) >>> 0);
  const nf = Math.round(Math.max(140, Math.min(520, R * 2.3)));
  for (let i = 0; i < nf; i++) {
    const a = (i / nf) * Math.PI * 2 + frng.float(-0.01, 0.01);
    fibre(frng, a, pr * frng.float(1.0, 1.15), R * frng.float(0.86, 1.0), frng.float(0.8, 2.4) * k, look.fibreDark, look.dark ? 0.35 : 0.28);
  }
  for (let i = 0; i < nf * 0.8; i++) {
    const a = frng.float(0, Math.PI * 2);
    const outer = frng.chance(0.75);
    const r0 = outer ? collR * frng.float(0.98, 1.08) : pr * frng.float(1.05, 1.2);
    const r1 = outer ? R * frng.float(0.78, 0.97) : collR * frng.float(0.92, 1.02);
    fibre(frng, a, r0, r1, frng.float(0.5, 1.6) * k, look.fibreLight, (look.dark ? 0.16 : 0.3) * frng.float(0.5, 1));
  }
  // thicker trabecular bundles with glints
  for (let i = 0; i < 46; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r0 = collR * rng.float(1.0, 1.1);
    const r1 = R * rng.float(0.7, 0.92);
    fibre(rng, a, r0, r1, rng.float(2.5, 4.5) * k, look.fibreLight, look.dark ? 0.08 : 0.13);
    fibre(rng, a, r0, r1 * 0.95, rng.float(0.6, 1.1) * k, mix(look.fibreLight, [255, 255, 255], 0.4), look.dark ? 0.14 : 0.3);
  }

  // 4 · Fuchs crypts: dark lacunae near the collarette and the periphery
  const crypts = look.dark ? 10 : 22;
  for (let i = 0; i < crypts; i++) {
    const near = rng.chance(0.65);
    const a = rng.float(0, Math.PI * 2);
    const r = near ? collR + span * rng.float(0.04, 0.16) : R * rng.float(0.74, 0.86);
    const len = span * rng.float(0.06, near ? 0.16 : 0.1);
    const wid = len * rng.float(0.3, 0.55);
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(a);
    const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, len);
    cg.addColorStop(0, rgba(look.crypt, look.dark ? 0.7 : 0.85));
    cg.addColorStop(0.7, rgba(look.crypt, 0.45));
    cg.addColorStop(1, rgba(look.crypt, 0));
    ctx.fillStyle = cg;
    ctx.beginPath();
    ctx.ellipse(0, 0, len, wid, 0, 0, Math.PI * 2);
    ctx.fill();
    // trabecular strands bridging the crypt
    ctx.strokeStyle = rgba(look.fibreLight, look.dark ? 0.15 : 0.35);
    ctx.lineWidth = 0.8 * k;
    for (let j = 0; j < 2; j++) {
      ctx.beginPath();
      ctx.moveTo(-len * 0.8, rng.float(-wid, wid) * 0.5);
      ctx.quadraticCurveTo(0, rng.float(-wid, wid), len * 0.8, rng.float(-wid, wid) * 0.5);
      ctx.stroke();
    }
    ctx.restore();
  }

  // 5 · contraction furrows (concentric, peripheral)
  ctx.lineWidth = 1.1 * k;
  for (let i = 0; i < 4; i++) {
    const r = R * (0.76 + i * 0.05 + rng.float(-0.01, 0.01));
    const a0 = rng.float(0, Math.PI * 2);
    const len = rng.float(1.2, 3.2);
    ctx.strokeStyle = rgba(look.fibreDark, look.dark ? 0.35 : 0.3);
    ctx.beginPath();
    ctx.arc(cx, cy, r, a0, a0 + len);
    ctx.stroke();
    ctx.strokeStyle = rgba(look.fibreLight, 0.12);
    ctx.beginPath();
    ctx.arc(cx, cy, r + 1.3 * k, a0, a0 + len);
    ctx.stroke();
  }

  // 6 · collarette — a raised, jagged ring
  const cpts: [number, number][] = [];
  const ph1 = rng.float(0, 6.28);
  const ph2 = rng.float(0, 6.28);
  for (let i = 0; i < 72; i++) {
    const a = (i / 72) * Math.PI * 2;
    const r = collR * (1 + 0.06 * Math.sin(a * 9 + ph1) + 0.04 * Math.sin(a * 23 + ph2) + rng.float(-0.025, 0.025));
    cpts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
  }
  ctx.beginPath();
  smoothClosedPath(ctx, cpts);
  ctx.strokeStyle = rgba(look.collar, look.dark ? 0.32 : 0.42);
  ctx.lineWidth = 7 * k;
  ctx.stroke();
  ctx.strokeStyle = rgba(look.collar, look.dark ? 0.4 : 0.5);
  ctx.lineWidth = 3.2 * k;
  ctx.stroke();
  ctx.strokeStyle = rgba(mix(look.collar, [255, 255, 255], 0.45), look.dark ? 0.12 : 0.26);
  ctx.lineWidth = 1.1 * k;
  ctx.stroke();
  // shadow just outside the collarette (it is raised)
  ctx.save();
  ctx.translate(1.5 * k, 2 * k);
  ctx.strokeStyle = rgba(look.fibreDark, 0.25);
  ctx.lineWidth = 3 * k;
  ctx.beginPath();
  smoothClosedPath(ctx, cpts.map(([x, y]) => [cx + (x - cx) * 1.05, cy + (y - cy) * 1.05] as [number, number]));
  ctx.stroke();
  ctx.restore();

  // 7 · pigment flecks / freckles
  const flecks = 6 + rng.int(0, 10);
  for (let i = 0; i < flecks; i++) {
    const a = rng.float(0, Math.PI * 2);
    const r = rng.chance(0.6) ? rng.float(pr * 1.15, collR * 1.15) : rng.float(collR, R * 0.9);
    const s = rng.float(1.2, 3.8) * k;
    const isDark = rng.chance(0.35);
    const c = isDark ? shade(look.ruff, 1.4) : look.fleck;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    const fg = ctx.createRadialGradient(x, y, 0, x, y, s * 1.6);
    fg.addColorStop(0, rgba(c, isDark ? 0.75 : 0.85));
    fg.addColorStop(1, rgba(c, 0));
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.arc(x, y, s * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  if (look.extras.length) {
    for (let i = 0; i < 26; i++) {
      const a = rng.float(0, Math.PI * 2);
      const r = rng.float(pr * 1.2, R * 0.9);
      const c = look.extras[i % look.extras.length]!;
      ctx.fillStyle = rgba(c, 0.8);
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, rng.float(1, 2.6) * k, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  if (o.nevus) {
    const a = rng.float(0, Math.PI * 2);
    const r = R * 0.72;
    ctx.fillStyle = rgba([60, 36, 22], 0.85);
    ctx.beginPath();
    ctx.ellipse(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 11 * k, 8 * k, a, 0, Math.PI * 2);
    ctx.fill();
  }

  // 8 · limbal ring & peripheral darkening
  const lg = ctx.createRadialGradient(cx, cy, R * 0.8, cx, cy, R);
  lg.addColorStop(0, rgba(look.limbal, 0));
  lg.addColorStop(0.75, rgba(look.limbal, 0.45));
  lg.addColorStop(1, rgba(shade(look.limbal, 0.6), 0.95));
  ctx.fillStyle = lg;
  ctx.fillRect(cx - R, cy - R, R * 2, R * 2);

  // 9 · pupillary zone darkening + ruff
  const pz = ctx.createRadialGradient(cx, cy, pr, cx, cy, pr + span * 0.22);
  pz.addColorStop(0, rgba(look.ruff, 0.55));
  pz.addColorStop(1, rgba(look.ruff, 0));
  ctx.fillStyle = pz;
  ctx.beginPath();
  ctx.arc(cx, cy, pr + span * 0.25, 0, Math.PI * 2);
  ctx.fill();

  if (o.rubeosis) {
    ctx.strokeStyle = rgba([200, 30, 40], 0.8);
    ctx.lineWidth = 0.9 * k;
    for (let i = 0; i < 26; i++) {
      const a = rng.float(0, Math.PI * 2);
      let r = pr * 1.04;
      let aa = a;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r);
      for (let j = 0; j < 5; j++) {
        r += span * rng.float(0.02, 0.06);
        aa += rng.float(-0.08, 0.08);
        ctx.lineTo(cx + Math.cos(aa) * r, cy + Math.sin(aa) * r);
      }
      ctx.stroke();
    }
  }

  const ruffW = Math.max(1.5, R * 0.035);
  ctx.beginPath();
  const rpts: [number, number][] = [];
  for (let i = 0; i < 90; i++) {
    const a = (i / 90) * Math.PI * 2;
    const bump = i % 2 === 0 ? 1 : 0.45;
    rpts.push([cx + Math.cos(a) * (pr + ruffW * bump), cy + Math.sin(a) * (pr + ruffW * bump)]);
  }
  smoothClosedPath(ctx, rpts);
  ctx.fillStyle = rgba(look.ruff, 0.95);
  ctx.fill();

  // 10 · pupil
  ctx.beginPath();
  pupilPath(ctx, cx, cy, pr, o.pupilShape ?? 'round', o.seed);
  const pg = ctx.createRadialGradient(cx, cy - pr * 0.2, 0, cx, cy, pr);
  pg.addColorStop(0, '#07080c');
  pg.addColorStop(0.8, '#040406');
  pg.addColorStop(1, '#0b0705');
  ctx.fillStyle = pg;
  ctx.fill();
  ctx.restore();
}

// ── texture cache ─────────────────────────────────────────────────────────────
interface CacheEntry { canvas: HTMLCanvasElement | OffscreenCanvas; key: string }
const cache: CacheEntry[] = [];
const CACHE_MAX = 36;

/** Effective device-pixel scale of the current transform (DPR × zoom × fore-shortening), bucketed. */
export function transformScale(ctx: CanvasRenderingContext2D): number {
  let k = 1;
  try {
    const m = ctx.getTransform?.();
    if (m) k = Math.sqrt(Math.abs(m.a * m.d - m.b * m.c));
  } catch {
    k = 1;
  }
  if (!Number.isFinite(k) || k <= 0) k = 1;
  // buckets of 0.25 keep the cache small while staying crisp
  return Math.max(1, Math.min(6, Math.ceil(k * 4 - 0.15) / 4));
}

const MAX_TEX = 2048;

/**
 * Cached iris texture painted at device resolution. `scale` is the device
 * pixels per CSS pixel the texture will be drawn at (see transformScale);
 * the texture is (2R+2)·k px square and must be drawn back into a
 * (2R+2)-unit square — use drawIrisTexture(). `pupilR` is bucketed to ~0.5px.
 */
export function irisTexture(R: number, pupilR: number, o: IrisPaintOptions, scale = 1): HTMLCanvasElement | OffscreenCanvas | null {
  const Rq = Math.max(4, Math.round(R));
  const k = Math.max(1, Math.min(scale, MAX_TEX / (Rq * 2 + 2)));
  const kq = Math.round(k * 4) / 4;
  const pq = Math.round(pupilR * 2) / 2;
  const key = [Rq, kq, pq, o.color, o.seed, o.pupilShape ?? 'round', o.rubeosis ? 1 : 0, o.nevus ? 1 : 0, (o.palette ?? []).join(','), o.exotic ?? 0].join('|');
  const hit = cache.findIndex((c) => c.key === key);
  if (hit >= 0) {
    const [e] = cache.splice(hit, 1);
    cache.push(e!);
    return e!.canvas;
  }
  const RK = Rq * kq;
  const size = Math.ceil(RK * 2 + 2 * kq);
  const off = makeCanvas(size, size);
  if (!off) return null;
  paintIris(off.ctx, RK + kq, RK + kq, RK, pq * (RK / R), o);
  cache.push({ canvas: off.canvas, key });
  if (cache.length > CACHE_MAX) cache.shift();
  return off.canvas;
}

/**
 * Draw a crisp cached iris centred at (cx,cy) with outer radius R in the
 * current coordinate system, building the texture at the device scale.
 * Returns false when no texture could be made (caller paints directly).
 */
export function drawIrisTexture(ctx: CanvasRenderingContext2D, cx: number, cy: number, R: number, pupilR: number, o: IrisPaintOptions): boolean {
  const tex = irisTexture(R, pupilR, o, transformScale(ctx));
  if (!tex) return false;
  const Rq = Math.max(4, Math.round(R));
  const half = (Rq + 1) * (R / Rq);
  const prev = ctx.imageSmoothingQuality;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(tex as CanvasImageSource, cx - half, cy - half, half * 2, half * 2);
  ctx.imageSmoothingQuality = prev;
  return true;
}
