import { equalPowerCurve, makeImpulse } from './curves';
import { echoTimeFor, sliderToGain } from './theory';

/**
 * Mixer graph:
 *
 *   sfx.dry ──┐                      ┌──────────────┐
 *   music.dry ┼──────────────────────►              │
 *   *.verb ───┼─► highpass ► convolver ► return ───►  master ► compressor ► analyser ► out
 *   *.echo ───┴─► ping-pong delay (lowpassed feedback) ─┬─►  │
 *                                         └─► reverb (shimmer smear)
 *
 * Every category input already carries its own volume, so a send can never
 * leak a muted category into the reverb.
 */
export interface BusInputs {
  dry: GainNode;
  verb: GainNode;
  echo: GainNode;
}

export interface Volumes {
  master: number;
  sfx: number;
  music: number;
}

export class Mixer {
  readonly sfx: BusInputs;
  readonly music: BusInputs;
  readonly analyser: AnalyserNode;
  private readonly master: GainNode;
  private readonly delays: DelayNode[];
  private readonly nodes: AudioNode[] = [];

  constructor(private ctx: BaseAudioContext, vols: Volumes, rnd: () => number = Math.random) {
    const g = (v = 1) => this.track(ctx.createGain(), (n) => (n.gain.value = v));

    const sum = g();
    this.master = g(sliderToGain(vols.master));
    const comp = this.track(ctx.createDynamicsCompressor(), (c) => {
      c.threshold.value = -16;
      c.knee.value = 14;
      c.ratio.value = 3.5;
      c.attack.value = 0.004;
      c.release.value = 0.22;
    });
    this.analyser = this.track(ctx.createAnalyser(), (a) => {
      a.fftSize = 1024;
      a.smoothingTimeConstant = 0.82;
    });
    sum.connect(this.master).connect(comp).connect(this.analyser).connect(ctx.destination);

    // Reverb: a procedural glass hall.
    const verbIn = g();
    const hp = this.track(ctx.createBiquadFilter(), (f) => {
      f.type = 'highpass';
      f.frequency.value = 200;
    });
    const conv = this.track(ctx.createConvolver(), (c) => {
      const ir = makeImpulse(ctx.sampleRate, { seconds: 3.4, decay: 3.2, damping: 0.62, rnd });
      const buf = ctx.createBuffer(ir.length, ir[0]!.length, ctx.sampleRate);
      ir.forEach((ch, i) => buf.getChannelData(i).set(ch));
      c.buffer = buf;
    });
    const verbRet = g(0.85);
    verbIn.connect(hp).connect(conv).connect(verbRet).connect(sum);

    // Ping-pong echo with darkening feedback (each repeat softer and warmer).
    const echoIn = g();
    const dl = this.track(ctx.createDelay(2), (d) => (d.delayTime.value = 0.375));
    const dr = this.track(ctx.createDelay(2), (d) => (d.delayTime.value = 0.375));
    this.delays = [dl, dr];
    const fb = g(0.42);
    const damp = this.track(ctx.createBiquadFilter(), (f) => {
      f.type = 'lowpass';
      f.frequency.value = 3400;
      f.Q.value = 0.3;
    });
    const echoOut = g(0.55);
    const pl = this.pan(-0.7, echoOut);
    const pr = this.pan(0.7, echoOut);
    echoIn.connect(dl);
    dl.connect(pl);
    dl.connect(dr);
    dr.connect(pr);
    dr.connect(damp).connect(fb).connect(dl);
    echoOut.connect(sum);
    const echoToVerb = g(0.35);
    echoOut.connect(echoToVerb).connect(verbIn);

    const bus = (vol: number): BusInputs => {
      const dry = g(vol);
      const verb = g(vol);
      const echo = g(vol);
      dry.connect(sum);
      verb.connect(verbIn);
      echo.connect(echoIn);
      return { dry, verb, echo };
    };
    this.sfx = bus(sliderToGain(vols.sfx));
    this.music = bus(sliderToGain(vols.music));
  }

  /** Smoothly ramp to new volumes (no zipper noise). */
  setVolumes(v: Volumes, ramp = 0.12): void {
    const t = this.ctx.currentTime;
    glide(this.master.gain, sliderToGain(v.master), t, ramp);
    for (const n of [this.sfx.dry, this.sfx.verb, this.sfx.echo]) glide(n.gain, sliderToGain(v.sfx), t, ramp);
    for (const n of [this.music.dry, this.music.verb, this.music.echo]) glide(n.gain, sliderToGain(v.music), t, ramp);
  }

  /**
   * Glide the ping-pong echo onto a new tempo grid (see echoTimeFor). The glide
   * is smooth, so repeats already in the line bend gently like tape rather
   * than clicking.
   */
  setEchoTempo(bpm: number, time = 1.5): void {
    const t = this.ctx.currentTime;
    const d = echoTimeFor(bpm);
    for (const n of this.delays) glide(n.delayTime, d, t, Math.max(0.1, time));
  }

  dispose(): void {
    for (const n of this.nodes) {
      try { n.disconnect(); } catch { /* ignore */ }
    }
    this.nodes.length = 0;
  }

  private pan(v: number, dest: AudioNode): AudioNode {
    if (typeof this.ctx.createStereoPanner !== 'function') return dest;
    const p = this.track(this.ctx.createStereoPanner(), (n) => (n.pan.value = v));
    p.connect(dest);
    return p;
  }

  private track<T extends AudioNode>(n: T, init: (n: T) => unknown): T {
    init(n);
    this.nodes.push(n);
    return n;
  }
}

/** Glide an AudioParam to `value` without clicks, from wherever it is now. */
export function glide(p: AudioParam, value: number, t: number, time: number): void {
  p.cancelScheduledValues(t);
  p.setValueAtTime(p.value, t);
  p.setTargetAtTime(value, t, Math.max(0.005, time / 3));
}

/**
 * Equal-power fade of an AudioParam from its current value, as a short chain
 * of linear ramps. Unlike setValueCurveAtTime, ramps can be cancelled cleanly
 * mid-fade, so switching tracks rapidly never throws or sticks.
 */
export function fadeParam(p: AudioParam, to: number, t: number, dur: number, segments = 8): void {
  const from = p.value;
  const d = Math.max(0.05, dur);
  const curve = equalPowerCurve(from, to, segments + 1);
  p.cancelScheduledValues(t);
  p.setValueAtTime(from, t);
  for (let i = 1; i < curve.length; i++) p.linearRampToValueAtTime(curve[i]!, t + (d * i) / segments);
}
