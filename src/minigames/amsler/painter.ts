/**
 * Canvas painter for the Amsler card: ivory grid on a black glass card, the
 * patient's perception (warped lines / missing patch), a refracting lens
 * ripple when the patient first fixates, the clinician's marked map, and the
 * true defect outline during the debrief.
 */
import type { AmslerFinding, Eye, Locale } from '@core';
import { T } from './strings';
import { HALF_DEG, maskContours, normalizeAmsler, regionRadiusAt, scotomaEdge, smoothLoop, warpOffset, type Loop, type Mask } from './geometry';

export interface CardState {
  finding: AmslerFinding;
  eye: Eye | null;
  /** 0..1 — how much of the patient's perception is shown */
  perception: number;
  /** 0..1 — perception strength (subtler at high difficulty) */
  strength: number;
  /** 0..1 progress of the lens ripple, or -1 when idle */
  ripple: number;
  mask: Mask;
  /** changes whenever the mask's contents (or the eye it belongs to) change */
  maskKey: string;
  /**
   * Side margin labels: 'field' = TEMPORAL / NASAL for this eye (teaching),
   * 'patient' = the patient's LEFT / RIGHT only (when the flip is being tested).
   */
  sideLabels: 'field' | 'patient';
  /** 0..1 — alpha of the true-region outline (debrief) */
  truth: number;
  cursor: { x: number; y: number; r: number; erase: boolean; keyboard: boolean } | null;
  /** 0..1 dims the card before the patient is asked */
  idle: number;
  /** edition language for the margin labels (default English) */
  locale?: Locale;
}

export interface CardLayout {
  size: number; // css px (square)
  dpr: number;
  gx: number; // grid origin (device px)
  gy: number;
  g: number; // grid side (device px)
}

export function layoutFor(size: number, dpr: number): CardLayout {
  const margin = Math.round(size * 0.085);
  return { size, dpr, gx: margin * dpr, gy: margin * dpr, g: (size - margin * 2) * dpr };
}

/** CSS-pixel point inside the card → degrees on the grid. */
export function toDeg(l: CardLayout, px: number, py: number): { x: number; y: number } {
  const x = ((px * l.dpr - l.gx) / l.g) * 2 * HALF_DEG - HALF_DEG;
  const y = HALF_DEG - ((py * l.dpr - l.gy) / l.g) * 2 * HALF_DEG;
  return { x, y };
}

const MARK_RGB = [244, 114, 182] as const; // rose
const TRUTH = '#5eead4';

export class CardPainter {
  private lines = document.createElement('canvas');
  private tintA = document.createElement('canvas');
  private tintB = document.createElement('canvas');
  private maskDrawn = '';
  private loops: Loop[] = [];
  private maskPath: Path2D | null = null;
  private maskPathKey = '';
  private hasFilter: boolean;

  constructor(private canvas: HTMLCanvasElement) {
    const probe = canvas.getContext('2d');
    this.hasFilter = !!probe && 'filter' in probe;
  }

  resize(l: CardLayout) {
    const px = Math.round(l.size * l.dpr);
    for (const c of [this.canvas, this.lines, this.tintA, this.tintB]) {
      if (c.width !== px) c.width = px;
      if (c.height !== px) c.height = px;
    }
  }

  draw(l: CardLayout, s: CardState) {
    const ctx = this.canvas.getContext('2d');
    const lc = this.lines.getContext('2d');
    if (!ctx || !lc) return;
    const W = this.canvas.width;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, W, W);
    this.paintCard(ctx, l, s);
    this.paintLines(lc, l, s);

    // chromatic fringe while the "lens" settles
    const rip = s.ripple >= 0 ? 1 - s.ripple : 0;
    if (rip > 0.02) {
      const off = 2.2 * l.dpr * rip;
      this.tint(this.tintA, '#ff7a9a');
      this.tint(this.tintB, '#7ad8ff');
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = 0.55 * rip;
      ctx.drawImage(this.tintA, -off, 0);
      ctx.drawImage(this.tintB, off, 0);
      ctx.restore();
    }
    ctx.drawImage(this.lines, 0, 0);
    this.paintScotomaHaze(ctx, l, s);
    this.paintRippleRing(ctx, l, s);
    this.paintMask(ctx, l, s);
    this.paintTruth(ctx, l, s);
    this.paintCursor(ctx, l, s);
  }

  private tint(c: HTMLCanvasElement, color: string) {
    const t = c.getContext('2d');
    if (!t) return;
    t.globalCompositeOperation = 'copy';
    t.drawImage(this.lines, 0, 0);
    t.globalCompositeOperation = 'source-in';
    t.fillStyle = color;
    t.fillRect(0, 0, c.width, c.height);
    t.globalCompositeOperation = 'source-over';
  }

  private px(l: CardLayout, x: number, y: number): [number, number] {
    return [l.gx + ((x + HALF_DEG) / (2 * HALF_DEG)) * l.g, l.gy + ((HALF_DEG - y) / (2 * HALF_DEG)) * l.g];
  }

  private paintCard(ctx: CanvasRenderingContext2D, l: CardLayout, s: CardState) {
    const W = this.canvas.width;
    // black card with a faint lacquer gradient
    const bg = ctx.createRadialGradient(W * 0.42, W * 0.36, W * 0.05, W * 0.5, W * 0.5, W * 0.78);
    bg.addColorStop(0, '#16111f');
    bg.addColorStop(0.55, '#0a0710');
    bg.addColorStop(1, '#040306');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, W);
    // field labels in the margin
    if (s.eye) {
      const temporalRight = s.eye === 'OD';
      const field = s.sideLabels === 'field';
      const fs = Math.max(8, Math.round(l.g * 0.026));
      ctx.save();
      ctx.font = `600 ${fs}px "Space Grotesk", "Inter Variable", sans-serif`;
      ctx.fillStyle = 'rgba(169,155,189,0.55)';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const midY = l.gy + l.g / 2;
      const tx = T(s.locale ?? 'en');
      const he = s.locale === 'he';
      const left = !field ? tx.patientsLeft : temporalRight ? tx.nasal : tx.temporal;
      const right = !field ? tx.patientsRight : temporalRight ? tx.temporal : tx.nasal;
      const mx = l.gx / 2;
      for (const [x, label, rot] of [[mx, left, -Math.PI / 2], [W - mx, right, Math.PI / 2]] as const) {
        ctx.save();
        ctx.translate(x, midY);
        ctx.rotate(rot);
        spaced(ctx, label, 0, 0, he ? 0 : fs * 0.28);
        ctx.restore();
      }
      spaced(ctx, tx.superior, W / 2, l.gy / 2, he ? 0 : fs * 0.28);
      spaced(ctx, tx.inferior, W / 2, W - l.gy / 2, he ? 0 : fs * 0.28);
      ctx.restore();
    }
  }

  private paintLines(lc: CanvasRenderingContext2D, l: CardLayout, s: CardState) {
    const W = this.lines.width;
    lc.setTransform(1, 0, 0, 1, 0, 0);
    lc.globalCompositeOperation = 'source-over';
    lc.clearRect(0, 0, W, W);
    const warpK = s.perception * s.strength;
    const n = normalizeAmsler(s.finding);
    const rip = s.ripple >= 0 ? s.ripple : -1;
    const ringR = rip * 17;
    const ringA = rip >= 0 ? 0.75 * (1 - rip) : 0;
    const step = 0.25;
    const point = (x: number, y: number): [number, number] => {
      let wx = x;
      let wy = y;
      if (warpK > 0) {
        const o = warpOffset(x, y, s.finding, warpK);
        wx += o.dx;
        wy += o.dy;
      }
      if (ringA > 0) {
        const d = Math.hypot(x, y);
        const k = ringA * Math.exp(-((d - ringR) ** 2) / 2.2);
        if (d > 1e-3) {
          wx += (x / d) * k;
          wy += (y / d) * k;
        }
      }
      return this.px(l, wx, wy);
    };
    const path = new Path2D();
    for (let i = 0; i <= 20; i++) {
      const c = -HALF_DEG + i;
      for (let t = -HALF_DEG, first = true; t <= HALF_DEG + 1e-6; t += step, first = false) {
        const [a, b] = point(c, t);
        if (first) path.moveTo(a, b);
        else path.lineTo(a, b);
      }
      for (let t = -HALF_DEG, first = true; t <= HALF_DEG + 1e-6; t += step, first = false) {
        const [a, b] = point(t, c);
        if (first) path.moveTo(a, b);
        else path.lineTo(a, b);
      }
    }
    const lw = Math.max(1, l.g / 420);
    const dim = 1 - 0.45 * s.idle;
    lc.lineCap = 'round';
    lc.lineJoin = 'round';
    lc.strokeStyle = `rgba(255, 214, 150, ${0.1 * dim})`;
    lc.lineWidth = lw * 4.5;
    lc.stroke(path);
    lc.strokeStyle = `rgba(246, 239, 228, ${0.9 * dim})`;
    lc.lineWidth = lw * 1.15;
    lc.stroke(path);
    // outer frame of the grid, a touch heavier
    const [fx0, fy0] = this.px(l, -HALF_DEG, HALF_DEG);
    lc.strokeStyle = `rgba(246, 239, 228, ${0.95 * dim})`;
    lc.lineWidth = lw * 1.9;
    lc.strokeRect(fx0, fy0, l.g, l.g);

    // fixation dot
    const [cx, cy] = point(0, 0);
    const dr = l.g * 0.012;
    const glow = lc.createRadialGradient(cx, cy, 0, cx, cy, dr * 5);
    glow.addColorStop(0, 'rgba(255, 226, 160, 0.55)');
    glow.addColorStop(1, 'rgba(255, 210, 122, 0)');
    lc.fillStyle = glow;
    lc.beginPath();
    lc.arc(cx, cy, dr * 5, 0, Math.PI * 2);
    lc.fill();
    lc.fillStyle = '#fff4da';
    lc.beginPath();
    lc.arc(cx, cy, dr, 0, Math.PI * 2);
    lc.fill();

    // scotoma: lines are simply not perceived there
    if (s.perception > 0 && (n.result === 'central-scotoma' || n.result === 'paracentral-scotoma')) {
      const a = Math.min(1, s.perception * (0.55 + 0.45 * s.strength));
      lc.globalCompositeOperation = 'destination-out';
      this.blob(lc, l, n.center.x, n.center.y, n.radius, a, [0, 0, 0]);
      lc.globalCompositeOperation = 'source-over';
    }
  }

  /**
   * Organic soft blob in degrees: the outline is the same organic edge the
   * truth mask uses; a gaussian feather straddles it (50% on the line), so the
   * patch has no hard rim. Big defects get a proportionally tighter feather.
   */
  private blob(c: CanvasRenderingContext2D, l: CardLayout, x: number, y: number, r: number, alpha: number, rgb: readonly [number, number, number], seed?: number) {
    const [px, py] = this.px(l, x, y);
    const scale = l.g / (2 * HALF_DEG);
    const col = (a: number) => `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
    const featherDeg = Math.min(r * 0.2, 0.9);
    c.save();
    if (this.hasFilter) {
      c.filter = `blur(${Math.max(1, featherDeg * 0.5 * scale).toFixed(1)}px)`;
      c.fillStyle = col(alpha);
      c.beginPath();
      for (let k = 0; k <= 72; k++) {
        const th = (k / 72) * Math.PI * 2;
        const rr = r * scale * scotomaEdge(th, seed);
        const ax = px + Math.cos(th) * rr;
        const ay = py - Math.sin(th) * rr;
        if (k === 0) c.moveTo(ax, ay);
        else c.lineTo(ax, ay);
      }
      c.closePath();
      c.fill();
    } else {
      const R = (r + featherDeg) * scale;
      const g = c.createRadialGradient(px, py, 0, px, py, R);
      const mid = r / (r + featherDeg);
      g.addColorStop(0, col(alpha));
      g.addColorStop(Math.max(0, mid - (featherDeg / (r + featherDeg))), col(alpha));
      g.addColorStop(mid, col(alpha * 0.5));
      g.addColorStop(1, col(0));
      c.fillStyle = g;
      c.beginPath();
      c.arc(px, py, R, 0, Math.PI * 2);
      c.fill();
    }
    c.restore();
  }

  private paintScotomaHaze(ctx: CanvasRenderingContext2D, l: CardLayout, s: CardState) {
    const n = normalizeAmsler(s.finding);
    if (s.perception <= 0 || (n.result !== 'central-scotoma' && n.result !== 'paracentral-scotoma')) return;
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.gx - 2, l.gy - 2, l.g + 4, l.g + 4);
    ctx.clip();
    // a dense loss (artery occlusion, large atrophy) reads dark; a small one as a grey smudge
    const big = Math.max(0, Math.min(1, (n.radius - 5) / 4));
    const haze: [number, number, number] = [Math.round(92 - 64 * big), Math.round(86 - 62 * big), Math.round(104 - 66 * big)];
    this.blob(ctx, l, n.center.x, n.center.y, n.radius, (0.42 + 0.45 * big) * s.perception * (0.6 + 0.4 * s.strength), haze);
    this.blob(ctx, l, n.center.x, n.center.y, n.radius * 0.7, 0.18 * (1 - big * 0.7) * s.perception, [150, 140, 160], 2.1);
    ctx.restore();
  }

  private paintRippleRing(ctx: CanvasRenderingContext2D, l: CardLayout, s: CardState) {
    if (s.ripple < 0 || s.ripple >= 1) return;
    const [cx, cy] = this.px(l, 0, 0);
    const scale = l.g / (2 * HALF_DEG);
    const R = s.ripple * 17 * scale;
    const a = 0.5 * (1 - s.ripple) ** 1.4;
    const g = ctx.createRadialGradient(cx, cy, Math.max(0, R - 14 * l.dpr), cx, cy, R + 14 * l.dpr);
    g.addColorStop(0, 'rgba(255,210,122,0)');
    g.addColorStop(0.5, `rgba(255,226,170,${a})`);
    g.addColorStop(1, 'rgba(255,210,122,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(cx, cy, R + 14 * l.dpr, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private paintMask(ctx: CanvasRenderingContext2D, l: CardLayout, s: CardState) {
    if (this.maskDrawn !== s.maskKey) {
      this.maskDrawn = s.maskKey;
      this.loops = maskContours(s.mask).map((lp) => smoothLoop(lp, 3));
      this.maskPath = null;
    }
    if (!this.loops.length) return;
    const geomKey = `${l.g}:${l.gx}`;
    if (!this.maskPath || this.maskPathKey !== geomKey) {
      const path = new Path2D();
      for (const loop of this.loops) {
        loop.forEach((pt, k) => {
          const [x, y] = this.px(l, pt.x, pt.y);
          if (k === 0) path.moveTo(x, y);
          else path.lineTo(x, y);
        });
        path.closePath();
      }
      this.maskPath = path;
      this.maskPathKey = geomKey;
    }
    const path = this.maskPath;
    const [r, g, b] = MARK_RGB;
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.gx - 1, l.gy - 1, l.g + 2, l.g + 2);
    ctx.clip();
    // translucent wash
    ctx.fillStyle = `rgba(${r},${g},${b},0.2)`;
    ctx.fill(path, 'evenodd');
    // clinician's pen hatching, clipped to the marked region
    ctx.save();
    ctx.clip(path, 'evenodd');
    const gap = Math.max(5, l.g / 90);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.32)`;
    ctx.lineWidth = Math.max(1, l.dpr);
    ctx.beginPath();
    for (let d = -l.g; d < l.g * 2; d += gap) {
      ctx.moveTo(l.gx + d, l.gy);
      ctx.lineTo(l.gx + d - l.g, l.gy + l.g);
    }
    ctx.stroke();
    ctx.restore();
    // luminous outline: soft halo + crisp rim
    ctx.lineJoin = 'round';
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = `rgba(${r},${g},${b},0.28)`;
    ctx.lineWidth = 7 * l.dpr;
    ctx.stroke(path);
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = '#ffc6e6';
    ctx.shadowColor = `rgba(${r},${g},${b},0.95)`;
    ctx.shadowBlur = 10 * l.dpr;
    ctx.lineWidth = 1.7 * l.dpr;
    ctx.stroke(path);
    ctx.restore();
  }

  private paintTruth(ctx: CanvasRenderingContext2D, l: CardLayout, s: CardState) {
    if (s.truth <= 0 || s.finding.result === 'normal') return;
    const n = normalizeAmsler(s.finding);
    const [cx, cy] = this.px(l, n.center.x, n.center.y);
    const scale = l.g / (2 * HALF_DEG);
    ctx.save();
    ctx.beginPath();
    ctx.rect(l.gx, l.gy, l.g, l.g);
    ctx.clip();
    ctx.globalAlpha = s.truth;
    ctx.strokeStyle = TRUTH;
    ctx.shadowColor = TRUTH;
    ctx.shadowBlur = 12 * l.dpr;
    ctx.lineWidth = 2.2 * l.dpr;
    ctx.setLineDash([7 * l.dpr, 6 * l.dpr]);
    ctx.beginPath();
    for (let k = 0; k <= 96; k++) {
      const th = (k / 96) * Math.PI * 2;
      const R = regionRadiusAt(s.finding, th) * scale;
      const x = cx + Math.cos(th) * R;
      const y = cy - Math.sin(th) * R;
      if (k === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();
  }

  private paintCursor(ctx: CanvasRenderingContext2D, l: CardLayout, s: CardState) {
    const c = s.cursor;
    if (!c) return;
    const [x, y] = this.px(l, c.x, c.y);
    const R = c.r * (l.g / (2 * HALF_DEG));
    ctx.save();
    ctx.lineWidth = 1.5 * l.dpr;
    ctx.strokeStyle = c.erase ? 'rgba(169,155,189,0.95)' : 'rgba(255,190,225,0.95)';
    ctx.shadowColor = c.erase ? 'rgba(169,155,189,0.8)' : 'rgba(244,114,182,0.9)';
    ctx.shadowBlur = 8 * l.dpr;
    if (c.erase) ctx.setLineDash([4 * l.dpr, 4 * l.dpr]);
    ctx.beginPath();
    ctx.arc(x, y, R, 0, Math.PI * 2);
    ctx.stroke();
    if (c.keyboard) {
      ctx.setLineDash([]);
      ctx.beginPath();
      ctx.moveTo(x - 5 * l.dpr, y);
      ctx.lineTo(x + 5 * l.dpr, y);
      ctx.moveTo(x, y - 5 * l.dpr);
      ctx.lineTo(x, y + 5 * l.dpr);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, gap: number) {
  if (gap === 0) {
    // unspaced run (Hebrew): letters must stay joined in reading order
    ctx.save();
    ctx.textAlign = 'center';
    ctx.direction = /[\u0590-\u05FF]/.test(text) ? 'rtl' : 'ltr';
    ctx.fillText(text, x, y);
    ctx.restore();
    return;
  }
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((a, b) => a + b, 0) + gap * (text.length - 1);
  let cx = x - total / 2;
  ctx.save();
  ctx.textAlign = 'left';
  [...text].forEach((ch, i) => {
    ctx.fillText(ch, cx, y);
    cx += widths[i]! + gap;
  });
  ctx.restore();
}
