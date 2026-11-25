/**
 * Pupil physiology. Pure and deterministic (aside from the injected phase).
 *
 * Afferent: light on an eye reaches the pretectum through that eye's optic
 * nerve, attenuated by `transmit` (1 = healthy; an RAPD lowers it). Both
 * pupils are driven by the SAME consensual signal (equal efferent output), so
 * a lit healthy eye constricts both, and lighting the RAPD eye makes both dilate.
 *
 * Efferent: each pupil moves between its own dark and light diameters with a
 * latency (~0.22 s) and eye-specific time constants (brisk, sluggish, tonic,
 * Horner dilation lag).
 */
import { EYES, type Eye, type PatientFindings } from '@core';

export type Room = 'bright' | 'dim';
export type Cond = 'light' | 'dark';

export interface EyeProfile {
  eye: Eye;
  /** True steady-state diameters (mm). */
  light: number;
  dark: number;
  /** Diameter on a near target (mm). */
  near: number;
  /** Afferent transmission 0..1 (1 = healthy optic nerve). */
  transmit: number;
  /** Afferent build-up time constant (s); slower for low-grade RAPD. */
  affUp: number;
  tauIn: number;
  tauOut: number;
  /** Sympathetic dilation lag (Horner-type). */
  lag: boolean;
  tonic: boolean;
  fixed: boolean;
}

export const LATENCY_S = 0.22;
const TRANSMIT_BY_GRADE: Record<number, number> = { 1: 0.5, 2: 0.25, 3: 0.1, 4: 0.015 };
const AFF_UP_BY_GRADE: Record<number, number> = { 1: 0.95, 2: 0.55, 3: 0.12, 4: 0.1 };

export function ptosisEyes(f: PatientFindings): Eye[] {
  const out = new Set<Eye>(f.external?.ptosis ?? []);
  for (const e of EYES) if (f.anterior?.[e]?.lids?.includes('ptosis')) out.add(e);
  return [...out];
}

/** Which pupil (if any) shows a dilation lag: smaller in the dark and anisocoric there. */
export function lagEye(f: PatientFindings): Eye | null {
  const { sizeDarkMm: d, sizeLightMm: l } = f.pupils;
  const darkAn = Math.abs(d.OD - d.OS);
  const lightAn = Math.abs(l.OD - l.OS);
  if (darkAn < 0.6 || darkAn - lightAn < 0.5) return null;
  const small: Eye = d.OD < d.OS ? 'OD' : 'OS';
  if (f.pupils.reactivity[small] !== 'brisk') return null;
  return ptosisEyes(f).includes(small) || darkAn >= 1.2 ? small : null;
}

export function profiles(f: PatientFindings): Record<Eye, EyeProfile> {
  const p = f.pupils;
  const lag = lagEye(f);
  const make = (eye: Eye): EyeProfile => {
    const r = p.reactivity[eye];
    const light = p.sizeLightMm[eye];
    const dark = p.sizeDarkMm[eye];
    const grade = p.rapd === eye ? p.rapdGrade ?? 2 : 0;
    const fixed = r === 'fixed';
    const nearConstricts = !fixed || p.nearResponse === 'light-near-dissociation';
    const nearBase = Math.min(light, 3.2) * 0.8;
    return {
      eye, light, dark,
      near: nearConstricts ? Math.max(1.6, Math.min(light, nearBase)) : dark,
      transmit: grade ? TRANSMIT_BY_GRADE[grade] ?? 0.25 : 1,
      affUp: grade ? AFF_UP_BY_GRADE[grade] ?? 0.5 : 0.14,
      tauIn: r === 'tonic' ? 3.4 : r === 'sluggish' ? 0.75 : 0.3,
      tauOut: r === 'tonic' ? 7 : lag === eye ? 5.5 : r === 'sluggish' ? 1.6 : 1.0,
      lag: lag === eye,
      tonic: r === 'tonic',
      fixed,
    };
  };
  return { OD: make('OD'), OS: make('OS') };
}

/** Response compression: a modest drop in drive barely moves the pupil, a big one does. */
export const response = (drive: number): number => 1 - Math.pow(1 - Math.max(0, Math.min(1, drive)), 3);

export interface SimInput {
  room: Room;
  /** Penlight coverage on each eye, 0..1. */
  cov: Record<Eye, number>;
  near: boolean;
}

export interface SimOptions {
  /** Hippus amplitude in mm. */
  hippus?: number;
  phase?: number;
}

export class PupilSim {
  readonly size: Record<Eye, number>;
  drive = 0;
  t = 0;
  private aff: Record<Eye, number> = { OD: 0, OS: 0 };
  private queue: { t: number; target: Record<Eye, number> }[] = [];
  private lastTarget: Record<Eye, number>;
  /** Mean absolute speed (mm/s), low-pass filtered, to tell when pupils have settled. */
  speed = 0;

  constructor(readonly prof: Record<Eye, EyeProfile>, private opts: SimOptions = {}) {
    this.size = { OD: prof.OD.dark, OS: prof.OS.dark };
    this.lastTarget = { ...this.size };
  }

  /** Afferent drive reaching the pretectum right now (0..1). */
  private computeDrive(inp: SimInput): number {
    let keep = 1;
    for (const e of EYES) {
      const lit = inp.room === 'bright' ? 1 : inp.cov[e];
      const want = lit * this.prof[e].transmit;
      const up = this.prof[e].affUp;
      const k = want > this.aff[e] ? up : 0.2;
      this.aff[e] += (want - this.aff[e]) * (1 - Math.exp(-this.dtCur / Math.max(0.02, k)));
      keep *= 1 - Math.max(0, Math.min(1, this.aff[e]));
    }
    return 1 - keep;
  }
  private dtCur = 0;

  step(dt: number, inp: SimInput): Record<Eye, number> {
    this.dtCur = dt;
    this.t += dt;
    this.drive = this.computeDrive(inp);
    const f = response(this.drive);
    const target = { OD: 0, OS: 0 };
    for (const e of EYES) {
      const p = this.prof[e];
      target[e] = inp.near ? p.near : p.dark - (p.dark - p.light) * f;
    }
    this.queue.push({ t: this.t, target });
    while (this.queue.length > 1 && this.queue[1]!.t <= this.t - LATENCY_S) this.queue.shift();
    this.lastTarget = this.queue[0]!.target;
    let sp = 0;
    for (const e of EYES) {
      const p = this.prof[e];
      const tgt = this.lastTarget[e];
      const tau = tgt < this.size[e] ? p.tauIn : p.tauOut;
      const next = this.size[e] + (tgt - this.size[e]) * (1 - Math.exp(-dt / tau));
      sp += Math.abs(next - this.size[e]) / Math.max(1e-3, dt);
      this.size[e] = next;
    }
    this.speed += (sp / 2 - this.speed) * (1 - Math.exp(-dt / 0.4));
    return this.size;
  }

  /** What the eye shows, with a touch of hippus (physiologic unrest). */
  shown(eye: Eye): number {
    const a = this.opts.hippus ?? 0.1;
    const ph = (this.opts.phase ?? 0) + (eye === 'OD' ? 0 : 1.7);
    const h = Math.sin(this.t * 2.1 + ph) * 0.6 + Math.sin(this.t * 4.9 + ph * 2) * 0.4;
    return this.size[eye] + h * a;
  }

  /** Pupils are no longer changing appreciably. */
  get settled(): boolean {
    return this.speed < 0.06;
  }
  /** Target currently being approached (after latency). */
  get targets(): Record<Eye, number> {
    return this.lastTarget;
  }
}

/** Steady-state size for a condition. */
export const trueSize = (f: PatientFindings, eye: Eye, cond: Cond): number =>
  cond === 'light' ? f.pupils.sizeLightMm[eye] : f.pupils.sizeDarkMm[eye];

/** Penlight coverage (0..1) from distance, in units of the eye radius. */
export function coverage(distPx: number, fullPx: number, fadePx: number): number {
  if (distPx <= fullPx) return 1;
  if (distPx >= fullPx + fadePx) return 0;
  const u = 1 - (distPx - fullPx) / fadePx;
  return u * u * (3 - 2 * u);
}

// ─────────────────────────── pattern recognition (shared by report/practice)

export type AnisoPattern = 'none' | 'physiologic' | 'greater-dark' | 'greater-light';
export interface Aniso {
  light: number;
  dark: number;
  pattern: AnisoPattern;
  /** Eye with the larger pupil in the condition where anisocoria is greater. */
  larger: Eye | null;
  smaller: Eye | null;
}

export function anisocoria(f: PatientFindings): Aniso {
  const { sizeLightMm: l, sizeDarkMm: d } = f.pupils;
  const light = +Math.abs(l.OD - l.OS).toFixed(2);
  const dark = +Math.abs(d.OD - d.OS).toFixed(2);
  const mx = Math.max(light, dark);
  if (mx < 0.4) return { light, dark, pattern: 'none', larger: null, smaller: null };
  const inDark = dark >= light;
  const sz = inDark ? d : l;
  const larger: Eye = sz.OD > sz.OS ? 'OD' : 'OS';
  const smaller: Eye = larger === 'OD' ? 'OS' : 'OD';
  const pathologic = mx > 1 || Math.abs(dark - light) >= 0.5;
  return {
    light, dark, larger, smaller,
    pattern: !pathologic ? 'physiologic' : inDark ? 'greater-dark' : 'greater-light',
  };
}

export function rapdText(f: PatientFindings): string {
  const g = f.pupils.rapdGrade ?? 2;
  return f.pupils.rapd === 'none' ? 'none' : `${f.pupils.rapd} ${g === 4 ? '4+ (amaurotic range)' : g + '+'}`;
}
