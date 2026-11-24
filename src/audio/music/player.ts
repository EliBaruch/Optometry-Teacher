import { createRng } from '@core';
import { clampHz, filter, gain, pan, type Kit } from '../dsp';
import { fadeParam, type BusInputs } from '../mixer';
import { StepClock, stepDuration } from '../scheduler';
import { Conductor } from './conductor';
import { INSTRUMENTS } from './instruments';
import { STEPS_PER_BEAT, type Composition, type MusicEvent } from './types';

/** Disconnects helper nodes once their notes have rung out. */
export class Reaper {
  private items: { node: AudioNode; at: number }[] = [];
  add(node: AudioNode, at: number): void {
    this.items.push({ node, at });
  }
  sweep(now: number): void {
    if (!this.items.length) return;
    const keep: { node: AudioNode; at: number }[] = [];
    for (const it of this.items) {
      if (it.at <= now) {
        try { it.node.disconnect(); } catch { /* ignore */ }
      } else keep.push(it);
    }
    this.items = keep;
  }
  flush(): void {
    this.sweep(Infinity);
  }
  get size(): number {
    return this.items.length;
  }
}

/** One playing composition: its own fader, filter and sends, driven by a lookahead clock. */
export class TrackPlayer {
  private readonly out: GainNode;
  private readonly sends: GainNode[];
  private readonly filt: BiquadFilterNode;
  private readonly clock: StepClock;
  private readonly conductor: Conductor;
  private readonly beat: number;
  private readonly reaper = new Reaper();
  private stopAt = Infinity;
  private disposed = false;

  constructor(private k: Kit, bus: BusInputs, readonly comp: Composition, seed: number) {
    const { ctx } = k;
    this.out = gain(ctx, bus.dry, 0);
    this.sends = [gain(ctx, bus.verb, comp.verb), gain(ctx, bus.echo, comp.echo)];
    for (const s of this.sends) this.out.connect(s);
    this.filt = filter(ctx, 'lowpass', comp.filterHz ?? 18000, 0.9, this.out);
    this.beat = 60 / comp.bpm;
    this.clock = new StepClock(stepDuration(comp.bpm, STEPS_PER_BEAT, comp.swing ?? 0));
    this.conductor = new Conductor(comp.harmony, createRng(seed));
  }

  start(at: number, fade: number): void {
    fadeParam(this.out.gain, this.comp.level, at, fade);
    this.clock.start(at + 0.06);
  }

  /** Fade out; scheduling continues through the fade so tails stay musical. */
  stop(at: number, fade: number): void {
    if (this.stopAt !== Infinity) return;
    fadeParam(this.out.gain, 0, at, fade);
    this.stopAt = at + fade;
  }

  get stopping(): boolean {
    return this.stopAt !== Infinity;
  }

  /** Has the fade finished (and the reverb tail of the last notes passed)? */
  done(now: number): boolean {
    return now > this.stopAt + 0.3;
  }

  tick(now: number): void {
    if (this.disposed) return;
    this.reaper.sweep(now);
    if (now >= this.stopAt) return;
    for (const d of this.clock.due(now)) {
      if (d.time >= this.stopAt) break;
      const info = this.conductor.info(d.step);
      let events: MusicEvent[];
      try {
        events = this.comp.step(info);
      } catch {
        events = [];
      }
      for (const e of events) this.render(e, d.time, d.dur);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    this.clock.stop();
    this.reaper.flush();
    for (const n of [this.out, this.filt, ...this.sends]) {
      try { n.disconnect(); } catch { /* ignore */ }
    }
  }

  private render(e: MusicEvent, stepTime: number, stepDur: number) {
    const { ctx } = this.k;
    if (e.kind === 'filter') {
      const f = this.filt.frequency;
      const hz = clampHz(ctx, e.hz);
      if (e.glide <= 0) {
        f.cancelScheduledValues(stepTime);
        f.setValueAtTime(hz, stepTime);
      } else {
        f.exponentialRampToValueAtTime(hz, stepTime + e.glide * this.beat);
      }
      return;
    }
    const inst = INSTRUMENTS[e.inst];
    if (!inst || !Number.isFinite(e.midi)) return;
    const t = stepTime + (e.at ?? 0) * stepDur;
    const base = e.filtered ? this.filt : this.out;
    const dest = e.pan ? pan(ctx, e.pan, base) : base;
    const end = inst(this.k, dest, t, e.midi, Math.max(0.05, e.len * this.beat), Math.max(0, Math.min(1, e.vel)));
    if (dest !== base) this.reaper.add(dest, end + 0.1);
  }
}
