/**
 * The perimeter's timeline — pure, time-driven (call update(now) every frame).
 * Jobs (one tested location each) are queued; each plays its stimulus flashes
 * with realistic timing, the patient buzzes after a reaction delay when a
 * flash is seen, and the point's result is emitted when its last flash ends.
 * A blind-spot catch trial is slipped in every CATCH_EVERY stimuli.
 */
import type { Eye, Rng } from '@core';
import { catchTrial, screenPoint, thresholdStaircase, type Flash, type PointResult, type Responder, type TestMode } from './patient';
import { pointKey, type FieldPoint } from './model';

export const FLASH_MS = 150;
export const ISI_MS = 330;
export const CATCH_EVERY = 14;
/** Auto-sweep pacing: one visible flash per location, then the next. */
export const FAST_POINT_MS = 240;

export interface Job {
  eye: Eye;
  point: FieldPoint;
  mode: TestMode;
  flashes: Flash[];
  result: PointResult | null;
}

export type RunnerEvent =
  | { type: 'flash'; eye: Eye; flash: Flash; at: number; until: number; n?: number }
  | { type: 'buzz'; eye: Eye; flash: Flash; at: number }
  | { type: 'result'; eye: Eye; result: PointResult }
  | { type: 'catch'; eye: Eye; lost: boolean }
  | { type: 'idle' };

interface Pending {
  at: number;
  ev: RunnerEvent;
}

export class Runner {
  private queue: Job[] = [];
  private current: Job | null = null;
  private idx = 0;
  private nextAt = 0;
  private pending: Pending[] = [];
  private sinceCatch = 0;
  private stimuliByEye: Record<Eye, number> = { OD: 0, OS: 0 };
  speed = 1;
  /** Fast (auto-sweep) mode: each location is condensed into one visible flash. */
  fast = false;
  fastMs = FAST_POINT_MS;

  constructor(private readonly rng: Rng) {}

  get busy(): boolean {
    return !!this.current || this.queue.length > 0;
  }

  /** Locations waiting (including the one in progress). */
  queued(): FieldPoint[] {
    const out = this.queue.map((j) => j.point);
    if (this.current) out.unshift(this.current.point);
    return out;
  }

  isQueued(p: FieldPoint): boolean {
    const k = pointKey(p);
    return this.queued().some((q) => pointKey(q) === k);
  }

  stimuli(eye: Eye): number {
    return this.stimuliByEye[eye];
  }

  enqueue(responder: Responder, point: FieldPoint, mode: TestMode, screenOffset: number): boolean {
    if (this.isQueued(point)) return false;
    const run = mode === 'threshold' ? thresholdStaircase(responder, point, this.rng) : screenPoint(responder, point, screenOffset, this.rng);
    const flashes = [...run.flashes];
    // Interleave a blind-spot catch trial now and then (fixation monitoring).
    this.sinceCatch += flashes.length;
    if (this.sinceCatch >= CATCH_EVERY) {
      this.sinceCatch = 0;
      flashes.splice(Math.min(1, flashes.length), 0, catchTrial(responder, this.rng));
    }
    this.queue.push({ eye: responder.eye, point, mode, flashes, result: run.result });
    return true;
  }

  /** Drop everything (eye switch / unmount). */
  cancel(): void {
    this.queue = [];
    this.current = null;
    this.pending = [];
    this.idx = 0;
  }

  update(now: number): RunnerEvent[] {
    const out: RunnerEvent[] = [];
    // deliver delayed events (buzzes) that are due
    if (this.pending.length) {
      const due = this.pending.filter((p) => p.at <= now);
      if (due.length) {
        this.pending = this.pending.filter((p) => p.at > now);
        for (const d of due) out.push(d.ev);
      }
    }
    if (now < this.nextAt) return out;
    if (!this.current) {
      const next = this.queue.shift();
      if (!next) return out;
      this.current = next;
      this.idx = 0;
    }
    const job = this.current;
    if (this.fast && this.idx === 0 && job.flashes.length) {
      // condensed presentation: one representative flash, the full staircase is still counted
      const shown = job.flashes[job.flashes.length - 1]!;
      this.idx = job.flashes.length;
      this.stimuliByEye[job.eye] += job.flashes.length;
      for (const f of job.flashes) if (f.catchTrial) out.push({ type: 'catch', eye: job.eye, lost: f.seen });
      out.push({ type: 'flash', eye: job.eye, flash: shown, at: now, until: now + this.fastMs * 0.55, n: job.flashes.length });
      if (shown.seen) this.pending.push({ at: now + this.fastMs * 0.3, ev: { type: 'buzz', eye: job.eye, flash: shown, at: now + this.fastMs * 0.3 } });
      this.nextAt = now + this.fastMs;
      return out;
    }
    const isi = ISI_MS / this.speed;
    const flashMs = FLASH_MS / Math.min(this.speed, 1.6);
    if (this.idx < job.flashes.length) {
      const f = job.flashes[this.idx++]!;
      this.stimuliByEye[job.eye]++;
      out.push({ type: 'flash', eye: job.eye, flash: f, at: now, until: now + flashMs });
      if (f.seen) {
        const latency = (260 + this.rng.next() * 190) / Math.min(this.speed, 1.5);
        this.pending.push({ at: now + latency, ev: { type: 'buzz', eye: job.eye, flash: f, at: now + latency } });
      }
      if (f.catchTrial) out.push({ type: 'catch', eye: job.eye, lost: f.seen });
      this.nextAt = now + flashMs + isi * (0.85 + this.rng.next() * 0.3);
      return out;
    }
    // job complete
    if (job.result) out.push({ type: 'result', eye: job.eye, result: job.result });
    this.current = null;
    this.nextAt = now;
    if (!this.queue.length) out.push({ type: 'idle' });
    return out;
  }
}
