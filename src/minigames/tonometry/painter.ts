/**
 * Canvas painters for the slit-lamp field: the cobalt-blue Goldmann view with
 * fluorescein semicircles, and the iCare aiming view. Pure drawing; the Game
 * owns all state.
 */
import type { Eye, PatientFindings } from '@core';
import { drawEye, eyeStateFromFindings } from '@render';
import { clamp, mireWidth, SHIFT_PER_MMHG } from './optics';

export interface Scene {
  t: number;
  /** ring centre relative to the reticle, -1..1 of the view radius */
  cx: number;
  cy: number;
  /** apparent separation in mmHg (>0 overlap, <0 apart) */
  offset: number;
  dye: number;
  /** 0 open .. 1 closed */
  blink: number;
  /** iCare probe travel 0..1..0 */
  shot: number;
  reduced: boolean;
}

const RING_R = 0.245;

export class FieldPainter {
  private bg: HTMLCanvasElement | null = null;
  private key = '';

  private ensureBg(f: PatientFindings, eye: Eye, mode: 'goldmann' | 'icare', S: number) {
    const key = `${eye}|${mode}|${S}|${f.anterior[eye].cornea.join()}|${f.anterior[eye].conjunctiva.join()}`;
    if (this.key === key && this.bg) return;
    const bg = this.bg ?? document.createElement('canvas');
    bg.width = bg.height = S;
    const g = bg.getContext('2d');
    if (g) {
      g.fillStyle = '#000';
      g.fillRect(0, 0, S, S);
      try {
        drawEye(g, S, S, eyeStateFromFindings(f, eye, { lighting: mode === 'goldmann' ? 'cobalt' : 'room' }), 0);
      } catch { /* painter must never take the game down */ }
    }
    this.bg = bg;
    this.key = key;
  }

  draw(ctx: CanvasRenderingContext2D, S: number, f: PatientFindings, eye: Eye, mode: 'goldmann' | 'icare', sc: Scene) {
    this.ensureBg(f, eye, mode, Math.round(S));
    const R = S * 0.49;
    const mid = S / 2;
    ctx.save();
    ctx.clearRect(0, 0, S, S);
    ctx.fillStyle = '#01030f';
    ctx.fillRect(0, 0, S, S);
    // field of view
    ctx.beginPath();
    ctx.arc(mid, mid, R, 0, Math.PI * 2);
    ctx.clip();
    // magnified eye, shifting with the head position
    const zoom = 1.9;
    const ox = sc.cx * R * 0.9;
    const oy = sc.cy * R * 0.9;
    if (this.bg) {
      ctx.save();
      ctx.translate(mid + ox, mid + oy);
      ctx.scale(zoom, zoom);
      ctx.drawImage(this.bg, -S / 2, -S / 2, S, S);
      ctx.restore();
    }
    if (mode === 'goldmann') {
      ctx.fillStyle = 'rgba(6, 22, 150, 0.46)';
      ctx.fillRect(0, 0, S, S);
      this.mires(ctx, S, mid + ox, mid + oy, sc);
    } else {
      ctx.fillStyle = 'rgba(8, 4, 24, 0.22)';
      ctx.fillRect(0, 0, S, S);
      this.probe(ctx, S, mid + ox, mid + oy, sc);
    }
    // lid blink
    if (sc.blink > 0.01) {
      const h = (S / 2) * sc.blink;
      const lg = ctx.createLinearGradient(0, 0, 0, h);
      lg.addColorStop(0, '#05030a');
      lg.addColorStop(0.85, '#0c0716');
      lg.addColorStop(1, 'rgba(12,7,22,0)');
      ctx.fillStyle = lg;
      ctx.fillRect(0, 0, S, h);
      const lg2 = ctx.createLinearGradient(0, S, 0, S - h);
      lg2.addColorStop(0, '#05030a');
      lg2.addColorStop(0.85, '#0c0716');
      lg2.addColorStop(1, 'rgba(12,7,22,0)');
      ctx.fillStyle = lg2;
      ctx.fillRect(0, S - h, S, h);
    }
    // vignette
    const vg = ctx.createRadialGradient(mid, mid, R * 0.55, mid, mid, R);
    vg.addColorStop(0, 'rgba(0,0,0,0)');
    vg.addColorStop(1, 'rgba(0,0,10,0.78)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, S, S);
    ctx.restore();
    this.reticle(ctx, S, mode);
  }

  private mires(ctx: CanvasRenderingContext2D, S: number, rx: number, ry: number, sc: Scene) {
    const r = RING_R * S;
    const w = mireWidth(sc.dye) * r;
    const ri = r - w / 2;
    const P = clamp(ri + sc.offset * SHIFT_PER_MMHG * S, -0.2 * S, 0.75 * S);
    const alpha = 1 - sc.blink * 0.95;
    const mid = S / 2;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.globalAlpha = alpha;
    for (const half of [-1, 1] as const) {
      // half = -1 upper arc (shifted right), +1 lower arc (shifted left)
      ctx.save();
      ctx.beginPath();
      if (half < 0) ctx.rect(0, 0, S, mid);
      else ctx.rect(0, mid, S, S - mid);
      ctx.clip();
      const sx = -half * P;
      // glow
      ctx.shadowColor = 'rgba(120, 255, 90, 0.95)';
      ctx.shadowBlur = S * 0.035;
      ctx.lineWidth = w * 1.5;
      ctx.strokeStyle = 'rgba(70, 230, 80, 0.13)';
      ctx.beginPath();
      ctx.arc(rx + sx, ry, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.shadowBlur = S * 0.012;
      ctx.lineWidth = w;
      const g = ctx.createLinearGradient(rx + sx - r, ry, rx + sx + r, ry);
      g.addColorStop(0, '#4fc23a');
      g.addColorStop(0.5, '#9be236');
      g.addColorStop(1, '#46c85a');
      ctx.strokeStyle = g;
      ctx.beginPath();
      ctx.arc(rx + sx, ry, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    // biprism seam
    ctx.save();
    ctx.strokeStyle = 'rgba(160, 200, 255, 0.10)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, mid);
    ctx.lineTo(S, mid);
    ctx.stroke();
    ctx.restore();
  }

  private probe(ctx: CanvasRenderingContext2D, S: number, cx: number, cy: number, sc: Scene) {
    // corneal apex marker (where a shot would land) and the probe tip approaching from the right
    const mid = S / 2;
    ctx.save();
    const pupilR = S * 0.07;
    ctx.strokeStyle = 'rgba(255, 220, 150, 0.35)';
    ctx.setLineDash([4, 5]);
    ctx.beginPath();
    ctx.arc(cx, cy, pupilR * 1.9, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
    const travel = sc.shot;
    const tipX = mid + S * 0.42 - travel * (S * 0.42);
    const tipY = mid;
    const body = ctx.createLinearGradient(0, tipY - S * 0.03, 0, tipY + S * 0.03);
    body.addColorStop(0, '#cfd6e6');
    body.addColorStop(0.5, '#6f7a94');
    body.addColorStop(1, '#2a3248');
    ctx.fillStyle = body;
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 14;
    ctx.beginPath();
    ctx.roundRect(tipX, tipY - S * 0.022, S * 0.6, S * 0.044, S * 0.02);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#f6efe4';
    ctx.beginPath();
    ctx.arc(tipX, tipY, S * 0.012, 0, Math.PI * 2);
    ctx.fill();
    if (travel > 0.9) {
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(mid, mid, S * 0.05, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private reticle(ctx: CanvasRenderingContext2D, S: number, mode: 'goldmann' | 'icare') {
    const mid = S / 2;
    const R = S * 0.49;
    ctx.save();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(255, 215, 130, 0.22)';
    ctx.beginPath();
    ctx.arc(mid, mid, mode === 'goldmann' ? RING_R * S : S * 0.133, 0, Math.PI * 2);
    ctx.setLineDash([3, 7]);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.strokeStyle = 'rgba(255, 215, 130, 0.5)';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as const) {
      ctx.beginPath();
      ctx.moveTo(mid + dx * R * 0.93, mid + dy * R * 0.93);
      ctx.lineTo(mid + dx * R * 0.99, mid + dy * R * 0.99);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(mid - 7, mid);
    ctx.lineTo(mid + 7, mid);
    ctx.moveTo(mid, mid - 7);
    ctx.lineTo(mid, mid + 7);
    ctx.stroke();
    // brass eyepiece rim
    const rim = ctx.createLinearGradient(0, 0, S, S);
    rim.addColorStop(0, '#f5d58a');
    rim.addColorStop(0.5, '#6b4a1a');
    rim.addColorStop(1, '#e9bf6a');
    ctx.strokeStyle = rim;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(mid, mid, R + 2.5, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}
