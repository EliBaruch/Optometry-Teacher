/**
 * Lookahead step clock (the "tale of two clocks" pattern). A coarse JS timer
 * merely wakes us up; every note is placed on the sample-accurate AudioContext
 * clock, so timer jitter never reaches the ear. Pure — no WebAudio — so it is
 * unit-testable with a fake `now`.
 */
export interface DueStep {
  step: number;
  time: number;
  dur: number;
}

export interface StepClockOptions {
  /** How far ahead of `now` to schedule (s). */
  lookahead?: number;
  /** If we fall further behind than this (tab throttled, GC pause), skip ahead instead of bursting. */
  maxLag?: number;
  /** Safety valve for a single call. */
  maxPerCall?: number;
}

export class StepClock {
  readonly lookahead: number;
  readonly maxLag: number;
  readonly maxPerCall: number;
  private nextTime = 0;
  private nextStep = 0;
  private running = false;

  constructor(private stepDur: (step: number) => number, opts: StepClockOptions = {}) {
    this.lookahead = opts.lookahead ?? 0.15;
    this.maxLag = opts.maxLag ?? 0.2;
    this.maxPerCall = opts.maxPerCall ?? 64;
  }

  start(at: number, step = 0): void {
    this.nextTime = at;
    this.nextStep = step;
    this.running = true;
  }

  stop(): void {
    this.running = false;
  }

  get isRunning(): boolean {
    return this.running;
  }

  /** Steps that must be scheduled now: every step whose start < now + lookahead. */
  due(now: number): DueStep[] {
    if (!this.running) return [];
    const out: DueStep[] = [];
    if (this.nextTime < now - this.maxLag) {
      // Fell behind: silently skip the missed steps, keeping the step counter
      // (and therefore bar/phrase alignment) consistent.
      while (this.nextTime < now) {
        this.nextTime += this.safeDur(this.nextStep);
        this.nextStep++;
      }
    }
    const horizon = now + this.lookahead;
    while (this.nextTime < horizon && out.length < this.maxPerCall) {
      const dur = this.safeDur(this.nextStep);
      out.push({ step: this.nextStep, time: this.nextTime, dur });
      this.nextTime += dur;
      this.nextStep++;
    }
    return out;
  }

  private safeDur(step: number): number {
    const d = this.stepDur(step);
    return Number.isFinite(d) && d > 0.005 ? d : 0.005;
  }
}

/**
 * Step duration for a tempo with optional swing. Swing lengthens even 16ths
 * and shortens odd ones by the same amount, so beats stay exactly on time.
 */
export function stepDuration(bpm: number, stepsPerBeat: number, swing = 0): (step: number) => number {
  const base = 60 / bpm / stepsPerBeat;
  return (step) => base * (step % 2 === 0 ? 1 + swing : 1 - swing);
}
