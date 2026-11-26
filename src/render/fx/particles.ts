/**
 * Pooled particle simulation (no DOM). The FX layer owns one pool; drawing is
 * in ./draw.ts. Particles are recycled — `spawn` never allocates once the pool
 * is warm, and the pool is hard-capped so a runaway caller can't tank fps.
 */
import { shade } from './color';
import { noise1 } from './noise';

export type ParticleKind = 'confetti' | 'sparks' | 'coins' | 'stars' | 'hearts' | 'embers';
/** Internal-only kinds spawned alongside bursts for extra juice. */
export type InternalKind = ParticleKind | 'ring';

export interface Particle {
  alive: boolean;
  kind: InternalKind;
  x: number;
  y: number;
  vx: number;
  vy: number;
  gravity: number;
  drag: number;
  rot: number;
  vr: number;
  /** generic oscillator (tumble / spin / twinkle / flicker) */
  phase: number;
  phaseV: number;
  wobble: number;
  size: number;
  age: number;
  life: number;
  color: string;
  color2: string;
  /** 0 = rect, 1 = ribbon (confetti); seed for the rest */
  variant: number;
  seed: number;
}

export const PALETTE = ['#3b6bff', '#a78bfa', '#fb7185', '#38bdf8', '#34d399', '#f59e0b', '#7aa2ff', '#f472b6'] as const;

export const DEFAULT_COUNT: Record<ParticleKind, number> = {
  confetti: 70,
  sparks: 32,
  coins: 14,
  stars: 16,
  hearts: 10,
  embers: 26,
};

export const DEFAULT_COLOR: Record<ParticleKind, string> = {
  confetti: '#3b6bff',
  sparks: '#f59e0b',
  coins: '#f5a524',
  stars: '#f59e0b',
  hearts: '#fb7185',
  embers: '#f97316',
};

/** Kinds drawn with additive blending. */
export const ADDITIVE: ReadonlySet<InternalKind> = new Set<InternalKind>(['sparks', 'stars', 'embers', 'ring']);

export type Rand = () => number;

function blank(): Particle {
  return {
    alive: false, kind: 'sparks', x: 0, y: 0, vx: 0, vy: 0, gravity: 0, drag: 0, rot: 0, vr: 0,
    phase: 0, phaseV: 0, wobble: 0, size: 1, age: 0, life: 1, color: '#fff', color2: '#fff', variant: 0, seed: 0,
  };
}

export class ParticlePool {
  readonly max: number;
  private items: Particle[] = [];
  private live = 0;

  constructor(max = 1400) {
    this.max = max;
  }

  get count(): number {
    return this.live;
  }

  /** Iterate alive particles. */
  forEach(fn: (p: Particle) => void): void {
    for (const p of this.items) if (p.alive) fn(p);
  }

  clear(): void {
    for (const p of this.items) p.alive = false;
    this.live = 0;
  }

  private acquire(): Particle | null {
    for (const p of this.items) if (!p.alive) return p;
    if (this.items.length >= this.max) return null;
    const p = blank();
    this.items.push(p);
    return p;
  }

  /**
   * Spawn `count` particles of `kind` at (x, y). Returns how many were created
   * (may be fewer when the pool is full). `scale` lets callers adapt velocity to
   * small screens.
   */
  spawn(kind: ParticleKind, x: number, y: number, count: number, color: string | undefined, rand: Rand = Math.random, scale = 1): number {
    let made = 0;
    const base = color ?? DEFAULT_COLOR[kind];
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      init(p, kind, x, y, base, color === undefined, rand, scale, i, count);
      p.alive = true;
      this.live++;
      made++;
    }
    if (made > 0 && kind !== 'embers' && kind !== 'hearts') {
      const r = this.acquire();
      if (r) {
        init(r, 'ring', x, y, kind === 'coins' ? '#f5a524' : base, false, rand, scale, 0, 1);
        r.alive = true;
        this.live++;
      }
    }
    return made;
  }

  /** Advance the simulation by dt seconds. */
  step(dt: number): void {
    if (dt <= 0) return;
    for (const p of this.items) {
      if (!p.alive) continue;
      p.age += dt;
      if (p.age >= p.life) {
        p.alive = false;
        this.live--;
        continue;
      }
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy = p.vy * k + p.gravity * dt;
      if (p.kind === 'confetti') {
        // flutter: sideways drift that grows as the ribbon slows down
        p.vx += Math.sin(p.phase * 0.5 + p.seed) * p.wobble * dt;
      } else if (p.kind === 'embers') {
        p.vx += noise1(p.seed + p.age * 1.7) * p.wobble * dt;
      } else if (p.kind === 'hearts') {
        p.x += Math.sin(p.age * 3 + p.seed) * p.wobble * dt;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.phase += p.phaseV * dt;
    }
  }
}

function init(p: Particle, kind: InternalKind, x: number, y: number, color: string, paletteMode: boolean, rand: Rand, scale: number, i: number, n: number): void {
  const r = (a: number, b: number) => a + (b - a) * rand();
  p.kind = kind;
  p.x = x;
  p.y = y;
  p.age = 0;
  p.rot = r(0, Math.PI * 2);
  p.seed = r(0, 1000);
  p.variant = 0;
  p.wobble = 0;
  p.color = color;
  p.color2 = shade(color, -0.35);
  switch (kind) {
    case 'confetti': {
      const a = -Math.PI / 2 + r(-1.25, 1.25);
      const s = r(380, 1050) * scale;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.gravity = 620 * scale;
      p.drag = r(2.2, 3.4);
      p.vr = r(-7, 7);
      p.phase = r(0, Math.PI * 2);
      p.phaseV = r(7, 15);
      p.wobble = r(80, 220) * scale;
      p.size = r(5, 9) * Math.min(1.2, Math.max(0.75, scale));
      p.life = r(2.2, 3.4);
      p.variant = rand() < 0.3 ? 1 : 0;
      if (paletteMode) p.color = PALETTE[Math.floor(rand() * PALETTE.length)]!;
      else p.color = rand() < 0.35 ? shade(color, 0.35) : rand() < 0.2 ? '#7aa2ff' : color;
      p.color2 = shade(p.color, -0.38);
      break;
    }
    case 'sparks': {
      const a = (i / Math.max(1, n)) * Math.PI * 2 + r(-0.3, 0.3);
      const s = r(420, 1150) * scale;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s - 120 * scale;
      p.gravity = 900 * scale;
      p.drag = r(2.6, 3.8);
      p.vr = 0;
      p.phase = 0;
      p.phaseV = 0;
      p.size = r(1.4, 2.8);
      p.life = r(0.45, 0.95);
      p.color2 = shade(color, 0.7);
      break;
    }
    case 'coins': {
      const s = r(0.85, 1.15) * scale;
      p.vx = r(-420, 420) * scale;
      p.vy = r(-1150, -720) * s;
      p.gravity = 2300 * scale;
      p.drag = 0.35;
      p.vr = r(-2, 2);
      p.rot = r(-0.4, 0.4);
      p.phase = r(0, Math.PI * 2);
      p.phaseV = r(9, 16) * (rand() < 0.5 ? -1 : 1);
      p.size = r(9, 13) * Math.min(1.15, Math.max(0.8, scale));
      p.life = r(1.25, 1.8);
      break;
    }
    case 'stars': {
      const a = r(0, Math.PI * 2);
      const s = r(90, 420) * scale;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.gravity = -30 * scale;
      p.drag = r(2.4, 3.2);
      p.vr = r(-1.5, 1.5);
      p.phase = r(0, Math.PI * 2);
      p.phaseV = r(9, 16);
      p.size = r(6, 14);
      p.life = r(0.9, 1.7);
      break;
    }
    case 'hearts': {
      const a = -Math.PI / 2 + r(-0.9, 0.9);
      const s = r(160, 420) * scale;
      p.vx = Math.cos(a) * s;
      p.vy = Math.sin(a) * s;
      p.gravity = -70 * scale;
      p.drag = r(1.6, 2.4);
      p.vr = 0;
      p.rot = r(-0.35, 0.35);
      p.phase = 0;
      p.phaseV = 0;
      p.wobble = r(20, 60) * scale;
      p.size = r(10, 18);
      p.life = r(1.4, 2.2);
      if (rand() < 0.3) p.color = shade(color, 0.3);
      break;
    }
    case 'embers': {
      const a = r(0, Math.PI * 2);
      const d = r(0, 34) * scale;
      p.x = x + Math.cos(a) * d;
      p.y = y + Math.sin(a) * d * 0.6;
      p.vx = r(-50, 50) * scale;
      p.vy = r(-170, -50) * scale;
      p.gravity = -110 * scale;
      p.drag = r(0.6, 1.1);
      p.vr = 0;
      p.phase = r(0, Math.PI * 2);
      p.phaseV = r(10, 22);
      p.wobble = r(120, 260) * scale;
      p.size = r(1.6, 3.6);
      p.life = r(1.4, 3);
      p.color2 = shade(color, 0.55);
      break;
    }
    case 'ring': {
      p.vx = 0;
      p.vy = 0;
      p.gravity = 0;
      p.drag = 0;
      p.vr = 0;
      p.phase = 0;
      p.phaseV = 0;
      p.size = 90 * Math.min(1.3, Math.max(0.7, scale));
      p.life = 0.55;
      break;
    }
  }
}
