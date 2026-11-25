/**
 * Fluorescein view: dye strip + falling drop, meniscus, blink-spread tear film,
 * cobalt excitation, the yellow barrier filter, stain patterns and TBUT break-up.
 */
import { createRng, type StainPattern } from '@core';
import { drawEye, eyeGeometry, eyeState, type EyeState } from '@render';
import { BLINK_SECONDS, SPREAD_SECONDS } from './fluo-model';
import { mmToScreen, type Pan } from './geo';
import { ZOOM, type Mag } from './model';

const WS = 1200;
const TAU = Math.PI * 2;
const ease = (u: number) => 1 - (1 - Math.max(0, Math.min(1, u))) ** 3;
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export interface FluoFrame {
  base: EyeState;
  stain: StainPattern;
  d: number;
  mag: Mag;
  pan: Pan;
  /** ms timestamps (performance.now clock), -1 = never */
  now: number;
  dyeAt: number;
  blinkAt: number;
  spreadAt: number;
  cobalt: boolean;
  barrier: boolean;
  /** seconds since the first dark spot formed; < 0 = tear film intact */
  breakAge: number;
  seed: number;
  reduced: boolean;
  /** seconds of timing so far (for the "tear film thinning" shimmer) */
  hasTimer: boolean;
}

export interface FluoPainter { paint(f: FluoFrame): void; dispose(): void; lowerLidMm(): { x: number; y: number }[] }

export function createFluoPainter(canvas: HTMLCanvasElement): FluoPainter {
  const mk = () => { const c = document.createElement('canvas'); c.width = WS; c.height = WS; return c; };
  const w0 = mk();
  const wb = mk();
  const g0 = eyeGeometry(WS, WS, eyeState());
  const pxmm = g0.pxmm;
  const keys = { w0: '', wb: '' };
  let lower: { x: number; y: number }[] = [];
  const vctx = canvas.getContext('2d')!;

  const sanitize = (b: EyeState, lid: number, stain: StainPattern): EyeState => ({
    ...b, gaze: { x: 0, y: 0 }, reflex: null, lidAperture: lid, stain,
    dendrite: false, abrasion: false, ulcer: stain === 'round-ulcer' ? 'ulcer' : 'none', punctateKeratitis: false, foreignBody: stain === 'focal', rustRing: false, keraticPrecipitates: false,
  });

  const paint = (f: FluoFrame) => {
    const { d, mag, pan, now } = f;
    const dpr = canvas.width / d;
    // blink animation + spread of dye over the cornea
    const bu = f.blinkAt >= 0 && !f.reduced ? (now - f.blinkAt) / 1000 / BLINK_SECONDS : 2;
    const lid = f.base.lidAperture * (bu >= 0 && bu < 1 ? Math.abs(Math.cos(bu * Math.PI)) ** 0.7 : 1);
    const meniscus = f.dyeAt >= 0 ? ease((now - f.dyeAt - (f.reduced ? 99999 : 1000)) / 1100) : 0;
    const spread = f.spreadAt >= 0 ? ease((now - f.spreadAt - (f.reduced ? -99999 : BLINK_SECONDS * 1000)) / (SPREAD_SECONDS * 1000)) : 0;
    const dye = f.dyeAt >= 0;

    const k0 = `${lid.toFixed(2)}`;
    if (keys.w0 !== k0) {
      keys.w0 = k0;
      const st = sanitize(f.base, lid, 'none');
      const c = w0.getContext('2d')!;
      c.clearRect(0, 0, WS, WS);
      drawEye(c, WS, WS, { ...st, lighting: 'room' }, 0);
      const g = eyeGeometry(WS, WS, st);
      lower = g.lower.map(([x, y]) => ({ x: (x - g.ix) / g.pxmm, y: (y - g.iy) / g.pxmm }));
    }
    const needB = dye && f.cobalt && spread > 0.01;
    const kb = `${lid.toFixed(2)}|${f.stain}`;
    if (needB && keys.wb !== kb) {
      keys.wb = kb;
      const c = wb.getContext('2d')!;
      c.clearRect(0, 0, WS, WS);
      drawEye(c, WS, WS, { ...sanitize(f.base, lid, f.stain), lighting: 'cobalt' }, 0);
    }

    const c = vctx;
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, d, d);
    c.save();
    c.beginPath();
    c.arc(d / 2, d / 2, d / 2, 0, TAU);
    c.clip();
    c.fillStyle = '#030208';
    c.fillRect(0, 0, d, d);
    const z = ZOOM[mag];
    const side = WS / z;
    const cx = g0.ix + pan.x * pxmm;
    const cy = g0.iy + pan.y * pxmm;
    const sc = (d / 34) * z;
    const toS = (x: number, y: number) => mmToScreen(x, y, pan, d, mag);
    c.imageSmoothingQuality = 'high';

    // ── base image
    c.drawImage(w0, cx - side / 2, cy - side / 2, side, side, 0, 0, d, d);
    if (f.cobalt) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = 'rgb(54,70,200)';
      c.fillRect(0, 0, d, d);
      c.restore();
      if (needB) {
        c.save();
        c.globalAlpha = spread;
        c.drawImage(wb, cx - side / 2, cy - side / 2, side, side, 0, 0, d, d);
        c.restore();
      }
    }

    // ── dye on the surface
    const cornea = toS(0, 0);
    const R = 5.75 * sc;
    if (dye) {
      // tear meniscus along the lower lid
      const pts = lower.slice(4, -4);
      if (pts.length > 2 && meniscus > 0) {
        c.save();
        c.globalCompositeOperation = f.cobalt ? 'lighter' : 'source-over';
        c.lineCap = 'round';
        c.lineJoin = 'round';
        const col = f.cobalt ? '110,255,70' : '255,226,40';
        const lw = Math.max(2, 0.42 * sc);
        for (const [w, a] of [[lw * 2.6, 0.12], [lw * 1.5, 0.22], [lw, 0.7]] as const) {
          c.strokeStyle = `rgba(${col},${a * meniscus})`;
          c.lineWidth = w;
          c.beginPath();
          pts.forEach((p, i) => { const s = toS(p.x, p.y - 0.18); i ? c.lineTo(s.x, s.y) : c.moveTo(s.x, s.y); });
          c.stroke();
        }
        c.restore();
      }
      if (!f.cobalt && spread > 0) {
        // in white light dye gives the tears a pale yellow-green cast
        c.save();
        c.globalCompositeOperation = 'source-over';
        c.fillStyle = `rgba(255,232,60,${0.16 * spread})`;
        c.beginPath();
        c.ellipse(cornea.x, cornea.y, 14 * sc, Math.max(1, 5.2 * sc * Math.min(1, lid)), 0, 0, TAU);
        c.fill();
        c.restore();
      }
    }

    // ── yellow barrier filter: blue glare is blocked, only fluorescence passes
    if (f.barrier) {
      c.save();
      c.globalCompositeOperation = 'multiply';
      c.fillStyle = f.cobalt ? 'rgb(255,255,14)' : 'rgb(255,240,150)';
      c.fillRect(0, 0, d, d);
      c.restore();
      if (f.cobalt && dye) {
        c.save();
        c.globalCompositeOperation = 'screen';
        c.fillStyle = 'rgba(20,60,10,0.55)';
        c.fillRect(0, 0, d, d);
        c.restore();
      }
    }

    // ── tear film over the cornea: a faint green wash with break-up spots
    if (dye && f.cobalt && spread > 0.4) {
      c.save();
      c.beginPath();
      c.arc(cornea.x, cornea.y, R * 1.01, 0, TAU);
      c.clip();
      c.globalCompositeOperation = 'lighter';
      const wash = c.createRadialGradient(cornea.x, cornea.y, 0, cornea.x, cornea.y, R);
      const a = (f.barrier ? 0.2 : 0.09) * spread;
      wash.addColorStop(0, `rgba(90,220,60,${a})`);
      wash.addColorStop(0.82, `rgba(90,220,60,${a * 1.15})`);
      wash.addColorStop(1, `rgba(90,220,60,${a * 0.35})`);
      c.fillStyle = wash;
      c.fillRect(cornea.x - R, cornea.y - R, R * 2, R * 2);
      c.globalCompositeOperation = 'source-over';
      if (f.breakAge >= 0) drawBreakUp(c, f, cornea.x, cornea.y, sc);
      c.restore();
    }

    // ── strip & drop
    if (dye && !f.reduced) drawDrop(c, (now - f.dyeAt) / 1000, toS, lower, sc, f.base.eye);

    // vignette
    const v = c.createRadialGradient(d / 2, d / 2, d * 0.34, d / 2, d / 2, d * 0.5);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(0.75, 'rgba(2,1,6,0.5)');
    v.addColorStop(1, 'rgba(2,1,6,0.95)');
    c.fillStyle = v;
    c.fillRect(0, 0, d, d);
    c.restore();
  };

  return { paint, dispose() { w0.width = 1; wb.width = 1; }, lowerLidMm: () => lower };
}

/** Dark spots forming and growing in the green tear film. */
function drawBreakUp(c: CanvasRenderingContext2D, f: FluoFrame, ox: number, oy: number, sc: number): void {
  const rng = createRng(f.seed ^ 0x7b07);
  const age = f.breakAge;
  const n = Math.min(9, 1 + Math.floor(age * 1.4));
  const cx0 = rng.float(-1.2, 1.2);
  const cy0 = rng.float(0.2, 2.0);
  for (let i = 0; i < 9; i++) {
    const x = cx0 + rng.float(-2.3, 2.3) * (i ? 1 : 0.2);
    const y = cy0 + rng.float(-1.6, 2.2) * (i ? 1 : 0.2);
    const r0 = rng.float(0.28, 0.6);
    const ar = rng.float(0.55, 1.4);
    const rot = rng.float(0, Math.PI);
    if (i >= n) continue;
    const born = i / 1.4;
    const t = Math.max(0, age - born);
    const grow = 0.55 + 0.9 * Math.min(1, t / 3.5);
    const fade = clamp01(t / 0.45);
    const r = r0 * grow * sc;
    const px = ox + x * sc;
    const py = oy + y * sc;
    const g = c.createRadialGradient(px, py, 0, px, py, r * 1.35);
    g.addColorStop(0, `rgba(2,8,2,${0.95 * fade})`);
    g.addColorStop(0.55, `rgba(4,14,4,${0.82 * fade})`);
    g.addColorStop(1, 'rgba(4,14,4,0)');
    c.save();
    c.translate(px, py);
    c.rotate(rot);
    c.scale(1, ar);
    c.translate(-px, -py);
    c.fillStyle = g;
    c.beginPath();
    c.arc(px, py, r * 1.35, 0, TAU);
    c.fill();
    c.restore();
  }
}

/** The fluorescein strip approaches, a bead forms, falls and splashes into the meniscus. */
function drawDrop(
  c: CanvasRenderingContext2D, a: number, toS: (x: number, y: number) => { x: number; y: number },
  lower: { x: number; y: number }[], sc: number, eye: 'OD' | 'OS',
): void {
  if (a < 0 || a > 3.2 || !lower.length) return;
  const side = eye === 'OD' ? -1 : 1; // temporal side
  const tgt = lower.reduce((best, p) => (Math.abs(p.x - side * 4) < Math.abs(best.x - side * 4) ? p : best), lower[0]!);
  const T = toS(tgt.x, tgt.y);
  const hold = { x: T.x + 6, y: T.y - 30 };
  const away = { x: T.x + 190, y: T.y + 120 };
  let tip = away;
  if (a < 0.6) tip = { x: away.x + (hold.x - away.x) * ease(a / 0.6), y: away.y + (hold.y - away.y) * ease(a / 0.6) };
  else if (a < 1.7) tip = hold;
  else tip = { x: hold.x + (away.x - hold.x) * ease((a - 1.7) / 0.7), y: hold.y + (away.y - hold.y) * ease((a - 1.7) / 0.7) };
  const ang = Math.atan2(away.y - hold.y, away.x - hold.x);
  c.save();
  // strip
  c.translate(tip.x, tip.y);
  c.rotate(ang);
  c.shadowColor = 'rgba(0,0,0,0.55)';
  c.shadowBlur = 10;
  c.shadowOffsetY = 5;
  const len = 190;
  const wd = 18;
  const body = c.createLinearGradient(0, -wd / 2, 0, wd / 2);
  body.addColorStop(0, '#fff9ec');
  body.addColorStop(1, '#d9cdb6');
  c.fillStyle = body;
  c.beginPath();
  c.roundRect(0, -wd / 2, len, wd, 3);
  c.fill();
  c.shadowColor = 'transparent';
  const tipG = c.createLinearGradient(0, 0, 46, 0);
  tipG.addColorStop(0, '#ff9d12');
  tipG.addColorStop(0.6, '#ffc233');
  tipG.addColorStop(1, 'rgba(255,214,90,0)');
  c.fillStyle = tipG;
  c.beginPath();
  c.roundRect(0, -wd / 2, 46, wd, 3);
  c.fill();
  c.restore();

  // bead → fall → splash
  const bx = hold.x;
  if (a >= 0.5 && a < 1.12) {
    let by = hold.y + 4;
    let r = 8 * ease((a - 0.5) / 0.35);
    if (a > 0.9) { const t = a - 0.9; by += 0.5 * 2600 * t * t; r *= 1 - (a - 0.9) * 0.9 * 0; }
    if (by > T.y - 2) by = T.y - 2;
    const g = c.createRadialGradient(bx - r * 0.3, by - r * 0.35, 0, bx, by, r * (a > 0.9 ? 1.2 : 1));
    g.addColorStop(0, 'rgba(255,255,200,0.95)');
    g.addColorStop(0.4, 'rgba(255,214,40,0.92)');
    g.addColorStop(1, 'rgba(255,150,10,0.9)');
    c.fillStyle = g;
    c.shadowColor = 'rgba(255,210,40,0.8)';
    c.shadowBlur = 14;
    c.beginPath();
    c.ellipse(bx, by, r, r * (a > 0.9 ? 1.45 : 1.08), 0, 0, TAU);
    c.fill();
  }
  const sp = a - 1.1;
  if (sp > 0 && sp < 0.9) {
    c.shadowColor = 'transparent';
    for (let k = 0; k < 2; k++) {
      const u = clamp01((sp - k * 0.12) / 0.7);
      c.strokeStyle = `rgba(255,236,110,${(1 - u) * 0.8})`;
      c.lineWidth = 2.2 * (1 - u) + 0.6;
      c.beginPath();
      c.ellipse(bx, T.y, 5 + u * 44 * (sc / 40 + 0.5), 2 + u * 11, 0, 0, TAU);
      c.stroke();
    }
    const g = c.createRadialGradient(bx, T.y, 0, bx, T.y, 40);
    g.addColorStop(0, `rgba(255,230,70,${0.6 * (1 - sp)})`);
    g.addColorStop(1, 'rgba(255,230,70,0)');
    c.fillStyle = g;
    c.fillRect(bx - 40, T.y - 40, 80, 80);
  }
}
