/**
 * Canvas painters for each particle kind. Glow halos and hearts are cached as
 * small offscreen sprites per colour so a full-screen burst stays cheap.
 */
import { parseColor, rgba, shade } from './color';
import { ADDITIVE, type Particle } from './particles';

type Ctx = CanvasRenderingContext2D;

const glowCache = new Map<string, HTMLCanvasElement>();
const heartCache = new Map<string, HTMLCanvasElement>();
const GLOW = 64;
const HEART = 64;

function makeCanvas(w: number, h: number): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function glowSprite(color: string): HTMLCanvasElement | null {
  let c = glowCache.get(color);
  if (c) return c;
  c = makeCanvas(GLOW, GLOW);
  const g = c.getContext('2d');
  if (!g) return null;
  const [r, gg, b] = parseColor(color);
  const grad = g.createRadialGradient(GLOW / 2, GLOW / 2, 0, GLOW / 2, GLOW / 2, GLOW / 2);
  grad.addColorStop(0, `rgba(255,255,255,1)`);
  grad.addColorStop(0.14, `rgba(${r},${gg},${b},0.95)`);
  grad.addColorStop(0.4, `rgba(${r},${gg},${b},0.35)`);
  grad.addColorStop(1, `rgba(${r},${gg},${b},0)`);
  g.fillStyle = grad;
  g.fillRect(0, 0, GLOW, GLOW);
  glowCache.set(color, c);
  return c;
}

function heartPath(g: Ctx | Path2D, s: number): void {
  // unit heart centred on 0,0, width ~2s
  g.moveTo(0, s * 0.75);
  g.bezierCurveTo(-s * 1.15, -s * 0.05, -s * 0.9, -s * 0.95, 0, -s * 0.45);
  g.bezierCurveTo(s * 0.9, -s * 0.95, s * 1.15, -s * 0.05, 0, s * 0.75);
}

function heartSprite(color: string): HTMLCanvasElement | null {
  let c = heartCache.get(color);
  if (c) return c;
  c = makeCanvas(HEART, HEART);
  const g = c.getContext('2d');
  if (!g) return null;
  const s = HEART * 0.36;
  g.translate(HEART / 2, HEART / 2 + 2);
  g.shadowColor = rgba(color, 0.8);
  g.shadowBlur = 8;
  const grad = g.createLinearGradient(-s, -s, s, s);
  grad.addColorStop(0, shade(color, 0.45));
  grad.addColorStop(0.55, color);
  grad.addColorStop(1, shade(color, -0.35));
  g.fillStyle = grad;
  g.beginPath();
  heartPath(g, s);
  g.fill();
  g.shadowBlur = 0;
  // glossy highlight
  g.fillStyle = 'rgba(255,255,255,0.55)';
  g.beginPath();
  g.ellipse(-s * 0.42, -s * 0.38, s * 0.2, s * 0.12, -0.7, 0, Math.PI * 2);
  g.fill();
  heartCache.set(color, c);
  return c;
}

const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
};

function alphaOf(p: Particle): number {
  const left = 1 - p.age / p.life;
  return Math.max(0, Math.min(1, left / 0.3));
}

function popScale(p: Particle): number {
  const t = Math.min(1, p.age / 0.12);
  return Math.max(0.01, easeOutBack(t));
}

function drawConfetti(g: Ctx, p: Particle, a: number): void {
  const flip = Math.cos(p.phase);
  g.globalAlpha = a;
  g.translate(p.x, p.y);
  g.rotate(p.rot);
  const s = p.size * popScale(p);
  if (p.variant === 1) {
    // curling ribbon
    g.strokeStyle = flip > 0 ? p.color : p.color2;
    g.lineWidth = Math.max(1.2, s * 0.32);
    g.lineCap = 'round';
    g.beginPath();
    const curl = Math.sin(p.phase * 0.7) * s * 0.9;
    g.moveTo(-s * 1.3, 0);
    g.bezierCurveTo(-s * 0.4, -curl, s * 0.4, curl, s * 1.3, 0);
    g.stroke();
  } else {
    g.scale(1, Math.max(0.08, Math.abs(flip)));
    g.fillStyle = flip > 0 ? p.color : p.color2;
    g.fillRect(-s * 0.7, -s * 0.32, s * 1.4, s * 0.64);
    if (flip > 0.6) {
      g.fillStyle = 'rgba(255,255,255,0.35)';
      g.fillRect(-s * 0.7, -s * 0.32, s * 1.4, s * 0.16);
    }
  }
}

function drawSpark(g: Ctx, p: Particle, a: number): void {
  const tail = 0.035;
  const x2 = p.x - p.vx * tail;
  const y2 = p.y - p.vy * tail;
  g.lineCap = 'round';
  g.globalAlpha = a * 0.45;
  g.strokeStyle = p.color;
  g.lineWidth = p.size * 2.6;
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(p.x, p.y);
  g.stroke();
  g.globalAlpha = a;
  g.strokeStyle = p.color2;
  g.lineWidth = p.size;
  g.beginPath();
  g.moveTo(x2, y2);
  g.lineTo(p.x, p.y);
  g.stroke();
  const glow = glowSprite(p.color);
  if (glow) {
    const r = p.size * 6;
    g.globalAlpha = a * 0.8;
    g.drawImage(glow, p.x - r, p.y - r, r * 2, r * 2);
  }
}

function starPath(g: Ctx, s: number): void {
  const k = s * 0.22;
  g.moveTo(0, -s);
  g.quadraticCurveTo(k, -k, s, 0);
  g.quadraticCurveTo(k, k, 0, s);
  g.quadraticCurveTo(-k, k, -s, 0);
  g.quadraticCurveTo(-k, -k, 0, -s);
}

function drawStar(g: Ctx, p: Particle, a: number): void {
  const tw = 0.55 + 0.45 * Math.sin(p.phase);
  const s = p.size * popScale(p) * (0.7 + 0.3 * tw);
  const glow = glowSprite(p.color);
  if (glow) {
    const r = s * 2.4;
    g.globalAlpha = a * 0.55 * tw;
    g.drawImage(glow, p.x - r, p.y - r, r * 2, r * 2);
  }
  g.globalAlpha = a * (0.6 + 0.4 * tw);
  g.translate(p.x, p.y);
  g.rotate(p.rot * 0.25);
  g.fillStyle = '#fffdf3';
  g.beginPath();
  starPath(g, s);
  g.fill();
  g.fillStyle = rgba(p.color, 0.9);
  g.beginPath();
  starPath(g, s * 0.55);
  g.fill();
}

function drawCoin(g: Ctx, p: Particle, a: number): void {
  const r = p.size * popScale(p);
  const sx = Math.cos(p.phase);
  const w = Math.max(0.9, r * Math.abs(sx));
  g.globalAlpha = a;
  g.translate(p.x, p.y);
  g.rotate(p.rot);
  // edge / thickness
  const edge = Math.sign(sx || 1) * Math.min(2.4, r * 0.2) * (1 - Math.abs(sx) * 0.4);
  g.fillStyle = '#9a6412';
  g.beginPath();
  g.ellipse(edge, 0, w, r, 0, 0, Math.PI * 2);
  g.fill();
  g.fillRect(Math.min(0, edge), -r, Math.abs(edge), r * 2);
  // face
  const front = sx > 0;
  const grad = g.createLinearGradient(-w, -r, w, r);
  grad.addColorStop(0, front ? '#fff4c4' : '#ffe08a');
  grad.addColorStop(0.45, front ? '#ffd27a' : '#e9ad3a');
  grad.addColorStop(1, front ? '#c98a1d' : '#a86d12');
  g.fillStyle = grad;
  g.beginPath();
  g.ellipse(0, 0, w, r, 0, 0, Math.PI * 2);
  g.fill();
  // inner ring
  g.strokeStyle = 'rgba(122,72,8,0.55)';
  g.lineWidth = Math.max(0.6, r * 0.09);
  g.beginPath();
  g.ellipse(0, 0, w * 0.74, r * 0.74, 0, 0, Math.PI * 2);
  g.stroke();
  // embossed four-point star (a "lumen")
  if (Math.abs(sx) > 0.25) {
    g.save();
    g.scale(Math.abs(sx), 1);
    g.fillStyle = front ? 'rgba(150,92,10,0.75)' : 'rgba(255,240,190,0.6)';
    g.beginPath();
    starPath(g, r * 0.48);
    g.fill();
    g.restore();
  }
  // glint
  const glint = Math.max(0, Math.cos(p.phase * 2 + 0.6));
  g.globalAlpha = a * (0.25 + glint * 0.6);
  g.fillStyle = '#ffffff';
  g.beginPath();
  g.ellipse(-w * 0.35, -r * 0.4, w * 0.22, r * 0.14, -0.6, 0, Math.PI * 2);
  g.fill();
}

function drawHeart(g: Ctx, p: Particle, a: number): void {
  const spr = heartSprite(p.color);
  if (!spr) return;
  const s = (p.size / (HEART * 0.36)) * popScale(p);
  const beat = 1 + Math.max(0, Math.sin(p.age * 9)) * 0.06;
  g.globalAlpha = a;
  g.translate(p.x, p.y);
  g.rotate(p.rot + Math.sin(p.age * 3 + p.seed) * 0.15);
  g.scale(s * beat, s * beat);
  g.drawImage(spr, -HEART / 2, -HEART / 2);
}

function drawEmber(g: Ctx, p: Particle, a: number): void {
  const t = p.age / p.life;
  const fadeIn = Math.min(1, p.age / 0.2);
  const flick = 0.65 + 0.35 * Math.sin(p.phase);
  const alpha = a * fadeIn * flick;
  const glow = glowSprite(p.color);
  const r = p.size * (5 - t * 1.5);
  if (glow) {
    g.globalAlpha = alpha;
    g.drawImage(glow, p.x - r, p.y - r, r * 2, r * 2);
  }
  g.globalAlpha = alpha;
  g.fillStyle = p.color2;
  g.beginPath();
  g.arc(p.x, p.y, p.size * 0.55, 0, Math.PI * 2);
  g.fill();
}

function drawRing(g: Ctx, p: Particle): void {
  const t = p.age / p.life;
  const e = 1 - Math.pow(1 - t, 3);
  g.globalAlpha = (1 - t) * 0.7;
  g.strokeStyle = p.color;
  g.lineWidth = 6 * (1 - t) + 0.5;
  g.beginPath();
  g.arc(p.x, p.y, p.size * e, 0, Math.PI * 2);
  g.stroke();
}

function drawOne(g: Ctx, p: Particle): void {
  const a = alphaOf(p);
  if (a <= 0) return;
  g.save();
  switch (p.kind) {
    case 'confetti': drawConfetti(g, p, a); break;
    case 'sparks': drawSpark(g, p, a); break;
    case 'coins': drawCoin(g, p, a); break;
    case 'stars': drawStar(g, p, a); break;
    case 'hearts': drawHeart(g, p, a); break;
    case 'embers': drawEmber(g, p, a); break;
    case 'ring': drawRing(g, p); break;
  }
  g.restore();
}

/** Paint every alive particle: normal-blend kinds first, then additive light. */
export function drawParticles(g: Ctx, list: { forEach(fn: (p: Particle) => void): void }): void {
  g.globalCompositeOperation = 'source-over';
  list.forEach((p) => {
    if (!ADDITIVE.has(p.kind)) drawOne(g, p);
  });
  g.globalCompositeOperation = 'lighter';
  list.forEach((p) => {
    if (ADDITIVE.has(p.kind)) drawOne(g, p);
  });
  g.globalCompositeOperation = 'source-over';
  g.globalAlpha = 1;
}
