/**
 * Cover-test model. Pure + deterministic given an rng.
 *
 * Conventions (match core/clinical.ts):
 *   horizontal  + eso / - exo (prism dioptres)
 *   vertical    + right hyper / - left hyper
 * Eye positions inside the simulator are per-eye turn angles in prism
 * dioptres relative to the fixation target: h + = turned nasally (in), v + = up.
 */
import type { Deviation, Eye, PatientFindings, Rng } from '@core';
import { prismToGaze, nasalSign } from '@render';

export type Target = 'distance' | 'near';
export const TARGETS: readonly Target[] = ['distance', 'near'];
export type Kind = 'ortho' | 'phoria' | 'tropia' | 'intermittent';
export type Dir = 'none' | 'eso' | 'exo' | 'hyperR' | 'hyperL';
export type Base = 'BO' | 'BI' | 'BU' | 'BD';
export interface Prism { mag: number; base: Base; eye: Eye }
export const MAX_PRISM = 40;
/** Convergence demand shown at 33 cm for a 63 mm PD, per eye, in prism dioptres. */
export const NEAR_CONVERGENCE = 9.5;

export interface Truth {
  kind: Kind;
  dir: Dir;
  /** Deviating eye for tropias; undefined for phorias / ortho. */
  eye?: Eye | 'alternating';
  h: number;
  v: number;
  /** Magnitude of the primary component, the number the player should find. */
  mag: number;
}

const r1 = (n: number) => Math.round(n * 10) / 10;

export function resolve(dev: Deviation): Truth {
  const h = dev.type === 'ortho' ? 0 : dev.horizontal;
  const v = dev.type === 'ortho' ? 0 : dev.vertical;
  const mag = Math.max(Math.abs(h), Math.abs(v));
  if (mag < 1 || dev.type === 'ortho') return { kind: 'ortho', dir: 'none', h, v, mag: 0 };
  const kind: Kind = dev.type === 'phoria' ? 'phoria' : dev.type === 'tropia' ? 'tropia' : 'intermittent';
  const dir: Dir = Math.abs(h) >= Math.abs(v) ? (h > 0 ? 'eso' : 'exo') : v > 0 ? 'hyperR' : 'hyperL';
  let eye: Truth['eye'];
  if (kind === 'tropia' || kind === 'intermittent') {
    eye = dev.deviatingEye ?? (dir === 'hyperR' ? 'OD' : 'OS');
  }
  return { kind, dir, eye, h, v, mag: Math.round(mag) };
}

export function truthOf(f: PatientFindings, target: Target): Truth {
  return resolve(target === 'near' ? f.motility.near : f.motility.distance);
}

// ───────────────────────── wording
const side = (e: Eye) => (e === 'OD' ? 'R' : 'L');
const DIR_TROPIA: Record<Exclude<Dir, 'none'>, string> = { eso: 'esotropia', exo: 'exotropia', hyperR: 'hypertropia', hyperL: 'hypertropia' };
const DIR_PHORIA: Record<Exclude<Dir, 'none'>, string> = { eso: 'esophoria', exo: 'exophoria', hyperR: 'R hyperphoria', hyperL: 'L hyperphoria' };

/** Name of the finding without the prism number: "Constant L esotropia". */
export function kindLabel(k: Kind, dir: Dir, eye?: Eye | 'alternating'): string {
  if (k === 'ortho' || dir === 'none') return 'Orthophoria';
  if (k === 'phoria') return cap(DIR_PHORIA[dir]);
  const who = eye === 'alternating' ? 'alternating' : eye ? side(eye) : '';
  const vertical = dir === 'hyperR' || dir === 'hyperL';
  // a vertical tropia is named for the higher eye
  const name = vertical ? `${dir === 'hyperR' ? 'R' : 'L'} ${DIR_TROPIA[dir]}` : `${who} ${DIR_TROPIA[dir]}`.trim();
  return k === 'tropia' ? `Constant ${name}` : `Intermittent ${name}`;
}

/** Lower-case only the leading word of a label ("Constant L esotropia" -> "constant L esotropia"). */
export function lowerLabel(label: string): string {
  return label.replace(/^(Constant|Intermittent|[A-Z](?=[a-z]+phoria))/, (x) => x.toLowerCase());
}

export function cap(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Chart wording with the magnitude: "12Δ constant L esotropia". */
export function describe(t: Truth): string {
  if (t.kind === 'ortho') return 'Orthophoria (no deviation)';
  const label = kindLabel(t.kind, t.dir, t.eye);
  let out = `${t.mag}Δ ${lowerLabel(label)}`;
  const sec = t.dir === 'eso' || t.dir === 'exo' ? t.v : t.h;
  if (Math.abs(sec) >= 2) {
    const w = t.dir === 'eso' || t.dir === 'exo' ? `${Math.round(Math.abs(sec))}Δ ${sec > 0 ? 'R' : 'L'} hyper` : `${Math.round(Math.abs(sec))}Δ ${sec > 0 ? 'eso' : 'exo'}`;
    out += ` with ${w}`;
  }
  return out;
}

// ───────────────────────── prism
/** Deviation left after a prism is held in front of an eye. */
export function residual(h: number, v: number, p: Prism | null): { h: number; v: number } {
  if (!p || p.mag <= 0) return { h, v };
  switch (p.base) {
    case 'BO': return { h: h - p.mag, v };
    case 'BI': return { h: h + p.mag, v };
    case 'BD': return { h, v: v + (p.eye === 'OD' ? -p.mag : p.mag) };
    case 'BU': return { h, v: v + (p.eye === 'OD' ? p.mag : -p.mag) };
  }
}

/** True when the prism base is the one that neutralises this direction. */
export function baseMatches(dir: Dir, p: Pick<Prism, 'base' | 'eye'>): boolean {
  switch (dir) {
    case 'none': return true;
    case 'eso': return p.base === 'BO';
    case 'exo': return p.base === 'BI';
    case 'hyperR': return (p.base === 'BD' && p.eye === 'OD') || (p.base === 'BU' && p.eye === 'OS');
    case 'hyperL': return (p.base === 'BD' && p.eye === 'OS') || (p.base === 'BU' && p.eye === 'OD');
  }
}

export function baseWord(b: Base): string {
  return { BO: 'base-out', BI: 'base-in', BU: 'base-up', BD: 'base-down' }[b];
}

// ───────────────────────── eye geometry helpers
/** Image-space gaze (−1..1) for a per-eye turn in prism dioptres. */
export function turnToGaze(eye: Eye, h: number, v: number): { x: number; y: number } {
  return { x: prismToGaze(h) * nasalSign(eye), y: -prismToGaze(v) };
}

// ───────────────────────── simulator
interface Mover { fx: number; fy: number; tx: number; ty: number; start: number; dur: number; kind: 'sacc' | 'drift' | 'recover' }
export interface CoverStats {
  held: Record<Eye, number>;
  uncovered: Record<Eye, number>;
  alt: number;
  prismUsed: boolean;
  neutralised: boolean;
  overshot: boolean;
}
const newStats = (): CoverStats => ({ held: { OD: 0, OS: 0 }, uncovered: { OD: 0, OS: 0 }, alt: 0, prismUsed: false, neutralised: false, overshot: false });

export const SACCADE_LATENCY = 0.16;
const vs = (e: Eye) => (e === 'OD' ? 1 : -1);

export class CoverSim {
  t = 0;
  readonly truth: Truth;
  cover: Eye | null = null;
  fix: Eye;
  prism: Prism | null = null;
  pos: Record<Eye, { h: number; v: number }> = { OD: { h: 0, v: 0 }, OS: { h: 0, v: 0 } };
  stats: CoverStats = newStats();
  /** Slow-motion factor applied to refixation timing (1 = real time). */
  slow = 1;
  /** Last visible refixation: eye + vector (for scoring hints / audio). */
  lastMove: { eye: Eye; dh: number; dv: number; at: number } | null = null;

  private mv: Record<Eye, Mover | null> = { OD: null, OS: null };
  private manifest: boolean;
  private breakAt = Infinity;
  private manifestUntil = Infinity;
  private noneSince = -1;
  private coverStart = 0;
  private pref: Eye | null;
  private readonly rng: Rng;
  private readonly poor: number;

  constructor(truth: Truth, rng: Rng, difficulty = 0.4) {
    this.truth = truth;
    this.rng = rng;
    this.poor = difficulty;
    const dev = truth.eye;
    this.pref = dev === 'OD' ? 'OS' : dev === 'OS' ? 'OD' : null;
    this.fix = this.pref ?? 'OD';
    this.manifest = truth.kind === 'tropia';
    if (truth.kind === 'intermittent') this.breakAt = 3.5 + rng.float(0, 2.5);
    this.snap();
  }

  private res() { return residual(this.truth.h, this.truth.v, this.prism); }
  private dissoc(e: Eye) { const r = this.res(); return { h: r.h, v: r.v * vs(e) }; }

  private goal(e: Eye): { h: number; v: number } {
    if (this.cover === e) return this.dissoc(e);
    if (this.cover) return { h: 0, v: 0 };
    if (this.manifest && e !== this.fix) return this.dissoc(e);
    return { h: 0, v: 0 };
  }

  private snap() {
    for (const e of ['OD', 'OS'] as Eye[]) { const g = this.goal(e); this.pos[e] = { ...g }; this.mv[e] = null; }
  }

  /** Move eye toward its goal; kind decides the kinematics. */
  private retarget(e: Eye, kind: Mover['kind'], delay: number, dur: number) {
    const g = this.goal(e);
    const cur = this.pos[e];
    const m = this.mv[e];
    if (!m && Math.abs(g.h - cur.h) < 0.05 && Math.abs(g.v - cur.v) < 0.05) return;
    const k = this.slow;
    this.mv[e] = { fx: cur.h, fy: cur.v, tx: g.h, ty: g.v, start: this.t + delay * k, dur: dur * k, kind };
    if (kind === 'sacc' && this.cover !== e && Math.hypot(g.h - cur.h, g.v - cur.v) >= 1.5) {
      this.lastMove = { eye: e, dh: g.h - cur.h, dv: g.v - cur.v, at: this.t + delay * k };
    }
  }

  setPrism(p: Prism | null) {
    this.prism = p && p.mag > 0 ? p : null;
    const after = this.res();
    if (this.prism) this.stats.prismUsed = true;
    const t = this.truth;
    if (t.kind !== 'ortho' && this.prism && baseMatches(t.dir, this.prism)) {
      const horiz = t.dir === 'eso' || t.dir === 'exo';
      const primary = horiz ? after.h : after.v;
      const sign = t.dir === 'eso' || t.dir === 'hyperR' ? 1 : -1;
      if (Math.abs(primary) <= 1.5) this.stats.neutralised = true;
      if (primary * sign < -1.5) this.stats.overshot = true;
    }
    for (const e of ['OD', 'OS'] as Eye[]) this.retarget(e, 'drift', 0, 0.28);
  }

  /** Raw paddle state; uncovering is debounced so alternate cover has no phantom uncover. */
  setRawCover(c: Eye | null) {
    if (c) { this.noneSince = -1; if (c !== this.cover) this.commit(c); } else if (this.noneSince < 0) this.noneSince = this.t;
  }

  private commit(c: Eye | null) {
    const prev = this.cover;
    const held = this.t - this.coverStart;
    if (prev && held >= 0.45) {
      if (c) { if (c !== prev) this.stats.alt++; } else this.stats.uncovered[prev]++;
    }
    if (prev && held >= 0.45) this.stats.held[prev] = 1;
    this.cover = c;
    this.coverStart = this.t;
    const k = this.truth.kind;
    if (c) {
      const other: Eye = c === 'OD' ? 'OS' : 'OD';
      // The other eye must take up fixation.
      this.fix = other;
      this.retarget(other, 'sacc', SACCADE_LATENCY + this.rng.float(0, 0.06), 0.11);
      this.retarget(c, 'drift', 0.08, 0.5);
    } else if (prev) {
      const other: Eye = prev === 'OD' ? 'OS' : 'OD';
      if (k === 'tropia' || k === 'intermittent') {
        if (this.pref) this.fix = this.pref;
        // intermittent: occlusion breaks down control, deviation shows, then refuses fusion
        if (k === 'intermittent') {
          this.manifest = true;
          this.manifestUntil = this.t + 0.9 + this.rng.float(0, 0.8) + this.poor * 1.2;
        }
        const fixEye = this.fix;
        const devEye: Eye = fixEye === 'OD' ? 'OS' : 'OD';
        this.retarget(fixEye, 'sacc', 0.22, 0.11);
        this.retarget(devEye, 'sacc', 0.22, 0.11);
      } else {
        // phoria / ortho: the covered eye recovers (fusion) -> larger phorias recover slower
        const dur = 0.3 + Math.min(0.7, this.truth.mag * 0.03);
        this.retarget(prev, 'recover', 0.12, dur);
        this.retarget(other, 'sacc', 0.05, 0.1);
      }
    }
  }

  private recoverFromBreak() {
    this.manifest = false;
    this.manifestUntil = Infinity;
    this.breakAt = this.t + this.rng.float(6, 10) - this.poor * 2;
    for (const e of ['OD', 'OS'] as Eye[]) this.retarget(e, 'recover', 0, 0.9);
  }

  step(dt: number) {
    this.t += dt;
    if (this.noneSince >= 0 && this.t - this.noneSince >= 0.17 && this.cover) { this.noneSince = -1; this.commit(null); }
    if (this.truth.kind === 'intermittent' && !this.cover) {
      if (!this.manifest && this.t >= this.breakAt) {
        this.manifest = true;
        this.manifestUntil = this.t + 2.4 + this.rng.float(0, 1.2) + this.poor * 1.5;
        this.breakAt = Infinity;
        for (const e of ['OD', 'OS'] as Eye[]) this.retarget(e, 'drift', 0, 0.3);
      } else if (this.manifest && this.t >= this.manifestUntil) this.recoverFromBreak();
    }
    for (const e of ['OD', 'OS'] as Eye[]) {
      const m = this.mv[e];
      if (!m) continue;
      const u = Math.max(0, Math.min(1, (this.t - m.start) / m.dur));
      const s = m.kind === 'sacc' ? 1 - (1 - u) ** 3 : u * u * (3 - 2 * u);
      this.pos[e] = { h: m.fx + (m.tx - m.fx) * s, v: m.fy + (m.ty - m.fy) * s };
      if (u >= 1) this.mv[e] = null;
    }
  }

  /** Is any eye currently moving visibly? (for audio / UI hints) */
  moving(): boolean { return !!(this.mv.OD || this.mv.OS); }
  isManifest(): boolean { return this.manifest; }
}

export function newSim(t: Truth, rng: Rng, difficulty: number): CoverSim { return new CoverSim(t, rng, difficulty); }
export { r1 };
