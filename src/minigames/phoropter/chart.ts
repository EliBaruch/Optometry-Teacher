/**
 * The projected acuity chart as the PATIENT sees it, painted on canvas.
 * A sharp chart is rendered once per layout; the visible frame is a
 * convolution of it with an elliptical (astigmatic) defocus kernel, done by
 * averaging offset copies on a down-sampled canvas so large blurs stay smooth.
 */
import { CHART_LINES, type BlurKernel } from './optics';
import { drawSloan } from './sloan';

export type ChartLayout = 'full' | 'duochrome' | 'balance';

export interface ChartFrame {
  layout: ChartLayout;
  /** main kernel (full layout), or red half (duochrome), or bottom/OD (balance) */
  a: BlurKernel;
  /** green half (duochrome) or top/OS (balance) */
  b?: BlurKernel;
  /** spectacle magnification of the trial lens */
  scale: number;
  /** 0..1 contrast veil (media opacity) */
  haze: number;
  /** 0..1 "darker" impression when accommodating through over-minus */
  dim: number;
  /** occluded: nothing to see */
  dark?: boolean;
  /** which window of chart lines a short, wide frame shows (0 = big letters .. 2 = small letters) */
  win?: 0 | 1 | 2;
}

/** Index ranges of CHART_LINES shown in a compact (short, wide) frame, so letters stay legible. */
export const COMPACT_WINDOWS: readonly (readonly [number, number])[] = [[0, 4], [2, 7], [4, 9]];

/** Pick the compact window that brackets the patient's current acuity (logMAR; larger = worse). */
export function windowFor(logmar: number): 0 | 1 | 2 {
  return logmar > 0.5 ? 0 : logmar > 0.12 ? 1 : 2;
}

const SAMPLES = 28;
const GOLDEN = Math.PI * (3 - Math.sqrt(5));
const BALANCE_LINE = CHART_LINES[5]!; // 20/30

export class ChartPainter {
  private sharp = document.createElement('canvas');
  private small = document.createElement('canvas');
  private acc = document.createElement('canvas');
  private key = '';
  private win: 0 | 1 | 2 = 1;
  /** a short, wide frame (phone): show a window of lines at a larger size */
  compact = false;
  private w = 0;
  private h = 0;
  private dpr = 1;
  /** px per arcmin at the 20/20 line */
  pxPerArcmin = 1;
  private lineYs: { y: number; h: number; denom: number }[] = [];

  constructor(private canvas: HTMLCanvasElement) {}

  resize(w: number, h: number, dpr: number): void {
    this.w = Math.max(1, Math.round(w));
    this.h = Math.max(1, Math.round(h));
    this.dpr = Math.min(2, Math.max(1, dpr));
    this.compact = this.w / this.h > 1.5 && this.h < 300;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.key = '';
  }

  private build(layout: ChartLayout): void {
    const key = `${layout}:${this.w}x${this.h}@${this.dpr}:${this.compact ? this.win : '-'}`;
    if (key === this.key) return;
    this.key = key;
    const s = this.sharp;
    s.width = this.canvas.width;
    s.height = this.canvas.height;
    const c = s.getContext('2d')!;
    const d = this.dpr;
    c.setTransform(d, 0, 0, d, 0, 0);
    const W = this.w;
    const H = this.h;

    if (layout === 'duochrome') {
      c.fillStyle = '#b3122a';
      c.fillRect(0, 0, W / 2, H);
      c.fillStyle = '#0f7a3c';
      c.fillRect(W / 2, 0, W / 2, H);
    } else {
      const g = c.createRadialGradient(W / 2, H * 0.45, 10, W / 2, H / 2, Math.max(W, H) * 0.7);
      g.addColorStop(0, '#ffffff');
      g.addColorStop(1, '#eef2f8');
      c.fillStyle = g;
      c.fillRect(0, 0, W, H);
    }

    this.lineYs = [];
    if (layout === 'balance') {
      // Two dissociated images of the same line: OS on top, OD below.
      const hpx = Math.min(H * 0.16, (W * 0.8) / (BALANCE_LINE.letters.length * 2 - 1));
      const lineW = hpx * (BALANCE_LINE.letters.length * 2 - 1);
      for (const [i, y] of [H * 0.27 - hpx / 2, H * 0.73 - hpx / 2].entries()) {
        [...BALANCE_LINE.letters].forEach((ch, j) => drawSloan(c, ch, (W - lineW) / 2 + j * hpx * 2, y, hpx));
        this.lineYs.push({ y, h: hpx, denom: i === 0 ? -1 : -2 });
      }
      this.pxPerArcmin = (hpx / 5) * (20 / BALANCE_LINE.denom);
      return;
    }

    // Snellen-style layout; letter height ∝ denominator, letters one width apart.
    const [w0, w1] = COMPACT_WINDOWS[this.win]!;
    const lines = layout === 'duochrome' ? (this.compact ? CHART_LINES.slice(4, 8) : CHART_LINES.slice(3, 8)) : this.compact ? CHART_LINES.slice(w0, w1) : CHART_LINES;
    const gapK = 0.62;
    const sumH = lines.reduce((a, l) => a + l.denom * (1 + gapK), 0) - lines[lines.length - 1]!.denom * gapK;
    const widest = Math.max(...lines.map((l) => l.denom * (l.letters.length * 2 - 1)));
    const unit = Math.min((H * 0.9) / sumH, (W * 0.78) / widest);
    let y = (H - sumH * unit) / 2;
    for (const l of lines) {
      const hpx = l.denom * unit;
      const lw = hpx * (l.letters.length * 2 - 1);
      [...l.letters].forEach((ch, j) => drawSloan(c, ch, (W - lw) / 2 + j * hpx * 2, y, hpx));
      this.lineYs.push({ y, h: hpx, denom: l.denom });
      y += hpx * (1 + gapK);
    }
    this.pxPerArcmin = (unit * 20) / 5;
  }

  /** Paint one frame. Returns the chart's line positions (CSS px) for labels. */
  draw(f: ChartFrame): { y: number; h: number; denom: number }[] {
    const ctx = this.canvas.getContext('2d')!;
    const W = this.canvas.width;
    const H = this.canvas.height;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (f.dark) {
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, W, H);
      return [];
    }
    this.win = f.win ?? 1;
    this.build(f.layout);
    ctx.save();
    // magnification about the centre
    ctx.translate(W / 2, H / 2);
    ctx.scale(f.scale, f.scale);
    ctx.translate(-W / 2, -H / 2);
    if (f.scale < 1) {
      ctx.fillStyle = f.layout === 'duochrome' ? '#222' : '#eef2f8';
      ctx.fillRect(-W, -H, W * 3, H * 3);
    }
    if (f.layout === 'full') {
      this.blurInto(ctx, f.a, null);
    } else if (f.layout === 'duochrome') {
      this.blurInto(ctx, f.a, [0, 0, W / 2, H]);
      this.blurInto(ctx, f.b ?? f.a, [W / 2, 0, W / 2, H]);
    } else {
      this.blurInto(ctx, f.b ?? f.a, [0, 0, W, H / 2]);
      this.blurInto(ctx, f.a, [0, H / 2, W, H / 2]);
    }
    ctx.restore();
    if (f.haze > 0) {
      ctx.fillStyle = `rgba(238, 242, 248, ${Math.min(0.75, f.haze)})`;
      ctx.fillRect(0, 0, W, H);
    }
    if (f.dim > 0) {
      ctx.fillStyle = `rgba(10, 22, 51, ${Math.min(0.16, f.dim * 0.16)})`;
      ctx.fillRect(0, 0, W, H);
    }
    return this.lineYs.map((l) => ({
      y: (l.y - this.h / 2) * f.scale + this.h / 2,
      h: l.h * f.scale,
      denom: l.denom,
    }));
  }

  private blurInto(ctx: CanvasRenderingContext2D, k: BlurKernel, clip: [number, number, number, number] | null): void {
    const W = this.canvas.width;
    const H = this.canvas.height;
    const px = this.pxPerArcmin * this.dpr;
    const maj = (k.major * px) / 2;
    const min = (k.minor * px) / 2;
    ctx.save();
    if (clip) {
      ctx.beginPath();
      ctx.rect(clip[0], clip[1], clip[2], clip[3]);
      ctx.clip();
    }
    if (Math.max(maj, min) < 0.35) {
      ctx.drawImage(this.sharp, 0, 0);
      ctx.restore();
      return;
    }
    // Down-sample so the kernel is ~10 px wide: smooth, cheap, no ghost copies.
    const f = Math.max(1, Math.max(maj, min) / 5);
    const sw = Math.max(1, Math.round(W / f));
    const sh = Math.max(1, Math.round(H / f));
    if (this.small.width !== sw || this.small.height !== sh) {
      this.small.width = sw;
      this.small.height = sh;
      this.acc.width = sw;
      this.acc.height = sh;
    }
    const sc = this.small.getContext('2d')!;
    sc.imageSmoothingQuality = 'high';
    sc.clearRect(0, 0, sw, sh);
    sc.drawImage(this.sharp, 0, 0, sw, sh);
    const ac = this.acc.getContext('2d')!;
    ac.globalAlpha = 1;
    ac.drawImage(this.small, 0, 0);
    const rad = (k.angle * Math.PI) / 180;
    const ca = Math.cos(rad);
    const sa = -Math.sin(rad); // screen y is down
    for (let i = 0; i < SAMPLES; i++) {
      const r = Math.sqrt((i + 0.5) / SAMPLES);
      const t = i * GOLDEN;
      const u = r * Math.cos(t) * (maj / f);
      const v = r * Math.sin(t) * (min / f);
      const dx = u * ca - v * sa;
      const dy = u * sa + v * ca;
      ac.globalAlpha = 1 / (i + 2);
      ac.drawImage(this.small, dx, dy);
    }
    ac.globalAlpha = 1;
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(this.acc, 0, 0, sw, sh, 0, 0, W, H);
    ctx.restore();
  }
}
