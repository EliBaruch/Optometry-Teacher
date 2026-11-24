/**
 * Backdrop particle simulation (light motes / bokeh + rain on glass).
 * Pure: no DOM, deterministic with a seeded random — unit-tested, drawn by <Backdrop>.
 */
export type BackdropVariant = 'title' | 'hub' | 'exam' | 'emergency' | 'results' | 'calm';

export interface VariantSpec {
  /** Mote colours (hex) */
  colors: string[];
  /** Motes per 1e6 px² of canvas (scaled to size, capped) */
  density: number;
  /** Base drift speed px/s */
  speed: number;
  /** Vertical bias: negative rises, positive falls */
  rise: number;
  /** Size range in CSS px */
  size: [number, number];
  rain: boolean;
}

export const VARIANTS: Record<BackdropVariant, VariantSpec> = {
  title: { colors: ['#ffd27a', '#f6c486', '#a78bfa', '#f472b6'], density: 34, speed: 9, rise: -4, size: [2, 26], rain: true },
  hub: { colors: ['#ffd27a', '#f5b942', '#fbbf7a', '#a78bfa'], density: 30, speed: 7, rise: -3, size: [2, 22], rain: false },
  exam: { colors: ['#5eead4', '#7dd3fc', '#c4b5fd', '#ffd27a'], density: 20, speed: 5, rise: -2, size: [2, 18], rain: false },
  emergency: { colors: ['#f43f5e', '#ef4444', '#fb923c', '#ffd27a'], density: 26, speed: 16, rise: -10, size: [1.5, 16], rain: true },
  results: { colors: ['#ffd27a', '#fff1c9', '#f5b942', '#c084fc'], density: 38, speed: 12, rise: -14, size: [1.5, 20], rain: false },
  calm: { colors: ['#38bdf8', '#a5f3fc', '#c4b5fd', '#f6efe4'], density: 18, speed: 4, rise: -1.5, size: [2, 24], rain: true },
};

export interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  color: number;
  /** 0..1 base alpha */
  a: number;
  /** twinkle phase & rate */
  ph: number;
  tw: number;
  /** bokeh (large soft disc) vs sharp sparkle */
  bokeh: boolean;
}

export interface Drop {
  x: number;
  y: number;
  len: number;
  v: number;
  /** pause timer: drops on glass stall, then slide */
  hold: number;
  a: number;
}

export type Rand = () => number;

export function moteCount(spec: VariantSpec, w: number, h: number, max = 90): number {
  return Math.max(6, Math.min(max, Math.round((w * h) / 1e6 * spec.density)));
}

export function createMote(spec: VariantSpec, w: number, h: number, rand: Rand, anywhere = true): Mote {
  const bokeh = rand() < 0.38;
  const [lo, hi] = spec.size;
  const r = bokeh ? lo + (hi - lo) * (0.45 + rand() * 0.55) : lo + rand() * Math.min(4, hi - lo);
  const ang = rand() * Math.PI * 2;
  const sp = spec.speed * (0.35 + rand() * 0.9) * (bokeh ? 0.6 : 1);
  return {
    x: rand() * w,
    y: anywhere ? rand() * h : spec.rise < 0 ? h + r : -r,
    vx: Math.cos(ang) * sp,
    vy: Math.sin(ang) * sp * 0.5 + spec.rise * (0.5 + rand()),
    r,
    color: Math.floor(rand() * spec.colors.length),
    a: bokeh ? 0.05 + rand() * 0.12 : 0.35 + rand() * 0.55,
    ph: rand() * Math.PI * 2,
    tw: 0.4 + rand() * 1.6,
    bokeh,
  };
}

/** Advance motes by dt seconds, wrapping around the edges. Mutates in place. */
export function stepMotes(motes: Mote[], dt: number, w: number, h: number, t: number): void {
  for (const m of motes) {
    // gentle curl so paths meander instead of travelling in straight lines
    const curl = Math.sin(t * 0.3 + m.ph) * 0.6;
    m.x += (m.vx + curl * 3) * dt;
    m.y += m.vy * dt;
    m.ph += m.tw * dt;
    const pad = m.r * 2;
    if (m.x < -pad) m.x = w + pad;
    else if (m.x > w + pad) m.x = -pad;
    if (m.y < -pad) m.y = h + pad;
    else if (m.y > h + pad) m.y = -pad;
  }
}

/** Current alpha of a mote (twinkle). */
export function moteAlpha(m: Mote): number {
  const k = m.bokeh ? 0.75 + 0.25 * Math.sin(m.ph) : 0.45 + 0.55 * Math.max(0, Math.sin(m.ph));
  return m.a * k;
}

export function createDrop(w: number, h: number, rand: Rand, anywhere = true): Drop {
  return {
    x: rand() * w,
    y: anywhere ? rand() * h : -20 - rand() * h * 0.3,
    len: 6 + rand() * 26,
    v: 0,
    hold: rand() * 2.5,
    a: 0.08 + rand() * 0.16,
  };
}

/** Rain on glass: drops cling, then slide with acceleration, then reset at the top. */
export function stepDrops(drops: Drop[], dt: number, w: number, h: number, rand: Rand): void {
  for (const d of drops) {
    if (d.hold > 0) {
      d.hold -= dt;
      continue;
    }
    d.v = Math.min(d.v + 260 * dt, 420);
    d.y += d.v * dt;
    if (rand() < dt * 0.6) {
      d.hold = 0.2 + rand() * 0.9; // snag on the glass
      d.v *= 0.2;
    }
    if (d.y - d.len > h) Object.assign(d, createDrop(w, h, rand, false));
  }
}
