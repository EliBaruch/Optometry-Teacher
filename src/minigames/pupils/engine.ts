/** Real-time exam engine: owns the pupil simulation, the penlight beam and the swing/dwell bookkeeping. No DOM. */
import { EYES, type Eye } from '@core';
import { nasalSign, type EyeState } from '@render';
import { coverage, PupilSim, type EyeProfile, type Room } from './model';
import { DWELL_FULL_S, type Swing } from './scoring';
import type { TracePoint } from './trace';

export const DWELL_RING_S = 3;
/** Penlight coverage above which an eye counts as "lit" for dwell and swing tracking. */
export const LIT_COVERAGE = 0.55;
/** A swing counts only if the light leaves one eye and reaches the other within this many seconds. */
const MAX_TRANSIT_S = 4;
const TRACE_SPAN_S = 14;
const TRACE_STEP_S = 0.05;
const SIM_STEP_S = 0.04;
const MAX_FRAME_S = 0.25;

export interface Live {
  room: Room;
  near: boolean;
  tutorial: boolean;
  phase: 'exam' | 'debrief';
  eye: Eye;
  gauge: number;
  eyeW: number;
  eyeH: number;
  stack: boolean;
}
export interface Pt { x: number; y: number }
export interface Geometry { fw: number; fh: number; centers: Record<Eye, Pt> }
export interface EngineHooks { onSwing(sw: Swing): void; onDwellCue(): void }

export class Engine {
  readonly beam = { x: -999, y: -999, tx: -999, ty: -999 };
  geo: Geometry = { fw: 800, fh: 240, centers: { OD: { x: 0, y: 0 }, OS: { x: 0, y: 0 } } };
  cov: Record<Eye, number> = { OD: 0, OS: 0 };
  readonly swings: Swing[] = [];
  readonly trace: TracePoint[] = [];
  t = 0;
  active = 0;
  stable = 0;
  nearAmt = 0;
  nearSecs = 0;
  curEye: Eye | null = null;
  dwell = 0;
  penOn = false;
  dragging = false;
  placed = false;
  private dwellCued = false;
  private leftEye: Eye | null = null;
  private leftDwell = 0;
  private leftAt = 0;
  private traceAt = 0;

  constructor(
    readonly sim: PupilSim,
    private eyeStates: Record<Eye, EyeState>,
    private reduced: boolean,
    private hooks: EngineHooks,
  ) {}

  aimAt(x: number, y: number): void { this.beam.tx = x; this.beam.ty = y; }
  aimEye(e: Eye): void { const c = this.geo.centers[e]; this.aimAt(c.x, c.y); }

  /** Swing to the other eye (or to the first eye if the light is on neither). */
  swingOver(): void {
    const from = this.curEye ?? this.leftEye;
    this.aimEye(from === 'OD' ? 'OS' : 'OD');
  }

  /** Put the beam midway between the eyes the first time geometry is known. */
  private place(L: Live): void {
    if (this.placed || this.geo.centers.OD.x <= 0) return;
    this.placed = true;
    const { OD, OS } = this.geo.centers;
    this.beam.x = this.beam.tx = (OD.x + OS.x) / 2;
    this.beam.y = this.beam.ty = L.stack ? (OD.y + OS.y) / 2 : this.geo.fh - 8;
  }

  /** Advance the world by dt seconds. Returns the eye currently lit (if any). */
  update(rawDt: number, L: Live): Eye | null {
    const dt = Math.min(MAX_FRAME_S, rawDt);
    this.t += dt;
    this.place(L);
    const b = this.beam;
    const k = this.reduced ? 1 : 1 - Math.exp(-dt * 16);
    b.x += (b.tx - b.x) * k;
    b.y += (b.ty - b.y) * k;

    this.penOn = L.room === 'dim' && !L.near;
    const cov: Record<Eye, number> = { OD: 0, OS: 0 };
    if (this.penOn) for (const e of EYES) cov[e] = coverage(Math.hypot(b.x - this.geo.centers[e].x, b.y - this.geo.centers[e].y), L.eyeW * 0.1, L.eyeW * 0.13);
    this.cov = cov;

    const n = Math.max(1, Math.ceil(dt / SIM_STEP_S));
    for (let i = 0; i < n; i++) this.sim.step(dt / n, { room: L.room, cov, near: L.near });
    this.nearAmt += ((L.near ? 1 : 0) - this.nearAmt) * (1 - Math.exp(-dt * (this.reduced ? 40 : 3)));
    this.stable = this.sim.settled ? this.stable + dt : 0;

    const running = !L.tutorial && L.phase === 'exam';
    if (running) this.active += dt;
    const lit: Eye | null = this.penOn ? (cov.OD > LIT_COVERAGE && cov.OD >= cov.OS ? 'OD' : cov.OS > LIT_COVERAGE ? 'OS' : null) : null;
    if (running) this.track(dt, lit, L);

    for (const e of EYES) {
      const st = this.eyeStates[e];
      st.pupilMm = this.sim.size[e];
      st.lighting = L.room === 'bright' ? 'room' : cov[e] > 0.5 ? 'penlight' : 'dim';
      st.gaze = { x: nasalSign(e) * 0.3 * this.nearAmt, y: 0.04 * this.nearAmt };
    }
    this.sampleTrace(L, lit);
    return lit;
  }

  private track(dt: number, lit: Eye | null, L: Live): void {
    if (lit !== this.curEye) {
      if (this.curEye) { this.leftEye = this.curEye; this.leftDwell = this.dwell; this.leftAt = this.t; }
      if (lit) {
        const gap = this.t - this.leftAt;
        if (this.leftEye && this.leftEye !== lit && gap < MAX_TRANSIT_S) {
          const sw: Swing = { from: this.leftEye, to: lit, dwell: this.leftDwell, transit: gap };
          this.leftEye = null;
          this.swings.push(sw);
          this.hooks.onSwing(sw);
        } else if (this.leftEye === lit) this.leftEye = null;
        this.dwell = 0;
        this.dwellCued = false;
      }
      this.curEye = lit;
    }
    if (this.curEye) {
      this.dwell += dt;
      if (!this.dwellCued && this.dwell >= DWELL_FULL_S) { this.dwellCued = true; this.hooks.onDwellCue(); }
    }
    if (L.near && L.room === 'dim') this.nearSecs += dt;
  }

  private sampleTrace(L: Live, lit: Eye | null): void {
    if (this.t - this.traceAt <= TRACE_STEP_S) return;
    this.traceAt = this.t;
    this.trace.push({ t: this.t, od: this.sim.size.OD, os: this.sim.size.OS, lit: L.near ? 'near' : L.room === 'bright' ? 'bright' : lit });
    while (this.trace.length && this.trace[0]!.t < this.t - TRACE_SPAN_S) this.trace.shift();
  }

  /** Re-profile hook for tests: pupil profiles in use. */
  get profiles(): Record<Eye, EyeProfile> { return this.sim.prof; }
}
