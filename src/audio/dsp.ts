/**
 * Tiny synthesis toolkit shared by SFX and music instruments. Every helper
 * schedules nodes on the AudioContext clock and stops its sources, so nothing
 * leaks; callers only choose times, pitches and envelopes.
 */

export interface Kit {
  ctx: BaseAudioContext;
  /** 2 s of white noise, shared. */
  white: AudioBuffer;
  /** 2 s of pink-ish noise (softer, warmer — for whooshes and brushes). */
  pink: AudioBuffer;
}

export function createKit(ctx: BaseAudioContext, rnd: () => number = Math.random): Kit {
  const len = Math.floor(ctx.sampleRate * 2);
  const white = ctx.createBuffer(1, len, ctx.sampleRate);
  const pink = ctx.createBuffer(1, len, ctx.sampleRate);
  const w = white.getChannelData(0);
  const p = pink.getChannelData(0);
  // Paul Kellet's economy pink filter.
  let b0 = 0, b1 = 0, b2 = 0;
  for (let i = 0; i < len; i++) {
    const x = rnd() * 2 - 1;
    w[i] = x;
    b0 = 0.99765 * b0 + x * 0.099046;
    b1 = 0.963 * b1 + x * 0.2965164;
    b2 = 0.57 * b2 + x * 1.0526913;
    p[i] = (b0 + b1 + b2 + x * 0.1848) * 0.2;
  }
  return { ctx, white, pink };
}

/** Percussive envelope: attack → optional hold → exponential-ish decay. Returns end time. */
export function perc(param: AudioParam, t: number, peak: number, attack: number, decay: number, hold = 0): number {
  const a = Math.max(0.0015, attack);
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(peak, t + a);
  if (hold > 0) param.setValueAtTime(peak, t + a + hold);
  param.setTargetAtTime(0, t + a + hold, Math.max(0.002, decay / 5));
  return t + a + hold + decay * 1.15;
}

/** ADSR for notes of a known length. Returns the time the release has finished. */
export function adsr(
  param: AudioParam, t: number, dur: number,
  e: { a: number; d: number; s: number; r: number; peak: number },
): number {
  const a = Math.max(0.002, e.a);
  const len = Math.max(dur, a + 0.01);
  param.setValueAtTime(0, t);
  param.linearRampToValueAtTime(e.peak, t + a);
  param.setTargetAtTime(e.peak * e.s, t + a, Math.max(0.005, e.d / 3));
  param.setTargetAtTime(0, t + len, Math.max(0.005, e.r / 5));
  return t + len + e.r * 1.1;
}

export function gain(ctx: BaseAudioContext, dest: AudioNode | null, value = 1): GainNode {
  const g = ctx.createGain();
  g.gain.value = value;
  if (dest) g.connect(dest);
  return g;
}

export function filter(
  ctx: BaseAudioContext, type: BiquadFilterType, hz: number, q: number, dest: AudioNode,
): BiquadFilterNode {
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.frequency.value = clampHz(ctx, hz);
  f.Q.value = q;
  f.connect(dest);
  return f;
}

/** Stereo pan (falls back to a pass-through where StereoPannerNode is missing). */
export function pan(ctx: BaseAudioContext, value: number, dest: AudioNode): AudioNode {
  if (typeof ctx.createStereoPanner !== 'function' || !value) return dest;
  const p = ctx.createStereoPanner();
  p.pan.value = Math.max(-1, Math.min(1, value));
  p.connect(dest);
  return p;
}

export function clampHz(ctx: BaseAudioContext, hz: number): number {
  const nyq = ctx.sampleRate / 2 - 100;
  return Number.isFinite(hz) ? Math.max(10, Math.min(nyq, hz)) : 1000;
}

export function osc(
  ctx: BaseAudioContext, type: OscillatorType, hz: number, t: number, end: number, dest: AudioNode, detune = 0,
): OscillatorNode {
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(clampHz(ctx, hz), t);
  if (detune) o.detune.setValueAtTime(detune, t);
  o.connect(dest);
  o.start(t);
  o.stop(end);
  return o;
}

/** Disconnect a node graph once its source has ended (frees the whole voice). */
export function releaseOnEnd(src: AudioScheduledSourceNode, ...nodes: AudioNode[]): void {
  src.onended = () => {
    for (const n of nodes) {
      try { n.disconnect(); } catch { /* already gone */ }
    }
  };
}

// ---------------------------------------------------------------- voices

export interface ToneOpts {
  hz: number;
  t: number;
  type?: OscillatorType;
  peak?: number;
  attack?: number;
  decay?: number;
  hold?: number;
  /** Glide the pitch to this frequency over `glideTime`. */
  glideTo?: number;
  glideTime?: number;
  detune?: number;
}

/** A single enveloped oscillator. */
export function tone(k: Kit, dest: AudioNode, o: ToneOpts): number {
  const { ctx } = k;
  const g = gain(ctx, dest, 0);
  const end = perc(g.gain, o.t, o.peak ?? 0.3, o.attack ?? 0.004, o.decay ?? 0.3, o.hold ?? 0);
  const s = osc(ctx, o.type ?? 'sine', o.hz, o.t, end, g, o.detune ?? 0);
  if (o.glideTo) s.frequency.exponentialRampToValueAtTime(clampHz(ctx, o.glideTo), o.t + (o.glideTime ?? 0.1));
  releaseOnEnd(s, g);
  return end;
}

export interface FmOpts {
  hz: number;
  t: number;
  ratio: number;
  /** Modulation index at the strike and what it relaxes to. */
  index: number;
  indexEnd?: number;
  indexDecay?: number;
  peak?: number;
  attack?: number;
  decay?: number;
  hold?: number;
  type?: OscillatorType;
}

/** Two-operator FM: bells (inharmonic ratios), celesta (ratio 4), e-piano (ratio 1 + tine). */
export function fm(k: Kit, dest: AudioNode, o: FmOpts): number {
  const { ctx } = k;
  const g = gain(ctx, dest, 0);
  const end = perc(g.gain, o.t, o.peak ?? 0.3, o.attack ?? 0.003, o.decay ?? 1, o.hold ?? 0);
  const modHz = o.hz * o.ratio;
  const depth = gain(ctx, null, 0);
  depth.gain.setValueAtTime(o.index * modHz, o.t);
  depth.gain.setTargetAtTime((o.indexEnd ?? 0) * modHz, o.t + 0.002, Math.max(0.005, (o.indexDecay ?? 0.25) / 4));
  const car = osc(ctx, o.type ?? 'sine', o.hz, o.t, end, g);
  const mod = osc(ctx, 'sine', modHz, o.t, end, depth);
  depth.connect(car.frequency);
  releaseOnEnd(car, g, depth, mod);
  return end;
}

/** Inharmonic partials of a free glass/metal bar — the signature "Lumen glass". */
const GLASS_PARTIALS: ReadonlyArray<readonly [ratio: number, amp: number, decayMul: number]> = [
  [1, 1, 1],
  [2.756, 0.45, 0.55],
  [5.404, 0.22, 0.32],
  [8.933, 0.1, 0.18],
];

export function glass(k: Kit, dest: AudioNode, o: { hz: number; t: number; peak?: number; decay?: number; bright?: number }): number {
  const { ctx } = k;
  const peak = o.peak ?? 0.25;
  const decay = o.decay ?? 1.2;
  const bright = o.bright ?? 1;
  let end = o.t;
  for (const [ratio, amp, dm] of GLASS_PARTIALS) {
    const hz = o.hz * ratio;
    if (hz > ctx.sampleRate / 2 - 200) continue;
    const a = amp * (ratio === 1 ? 1 : bright);
    end = Math.max(end, tone(k, dest, { hz, t: o.t, peak: peak * a, attack: 0.0015, decay: decay * dm }));
  }
  return end;
}

export interface NoiseOpts {
  t: number;
  kind?: 'white' | 'pink';
  type?: BiquadFilterType;
  hz: number;
  q?: number;
  peak?: number;
  attack?: number;
  decay?: number;
  hold?: number;
  /** Sweep the filter to this frequency across the sound. */
  sweepTo?: number;
  sweepTime?: number;
  pan?: number;
  panTo?: number;
}

/** Filtered noise burst — clicks, whooshes, brushes, paper, breath. */
export function noise(k: Kit, dest: AudioNode, o: NoiseOpts): number {
  const { ctx } = k;
  const g = gain(ctx, null, 0);
  let out: AudioNode = dest;
  let panner: StereoPannerNode | null = null;
  if (o.pan !== undefined && typeof ctx.createStereoPanner === 'function') {
    panner = ctx.createStereoPanner();
    panner.pan.setValueAtTime(o.pan, o.t);
    panner.connect(dest);
    out = panner;
  }
  g.connect(out);
  const end = perc(g.gain, o.t, o.peak ?? 0.3, o.attack ?? 0.002, o.decay ?? 0.1, o.hold ?? 0);
  const f = filter(ctx, o.type ?? 'bandpass', o.hz, o.q ?? 1, g);
  if (o.sweepTo) {
    f.frequency.setValueAtTime(clampHz(ctx, o.hz), o.t);
    f.frequency.exponentialRampToValueAtTime(clampHz(ctx, o.sweepTo), o.t + (o.sweepTime ?? end - o.t));
  }
  if (panner && o.panTo !== undefined) panner.pan.linearRampToValueAtTime(o.panTo, end);
  const src = ctx.createBufferSource();
  src.buffer = o.kind === 'pink' ? k.pink : k.white;
  src.loop = true;
  src.connect(f);
  const offset = (o.t * 7.31) % 1.5;
  src.start(o.t, offset);
  src.stop(end);
  releaseOnEnd(src, f, g, ...(panner ? [panner] : []));
  return end;
}

export interface BrassOpts {
  hz: number;
  t: number;
  dur: number;
  peak?: number;
  /** Filter brightness multiplier (1 = mellow horn, 2 = bright trumpet). */
  bright?: number;
  attack?: number;
  release?: number;
  vibrato?: boolean;
}

/**
 * Soft brass: detuned saws through a lowpass whose cutoff blooms with the
 * attack (the "bwah" of a horn) plus a late, gentle vibrato.
 */
export function brass(k: Kit, dest: AudioNode, o: BrassOpts): number {
  const { ctx } = k;
  const g = gain(ctx, dest, 0);
  const attack = o.attack ?? 0.06;
  const end = adsr(g.gain, o.t, o.dur, { a: attack, d: 0.25, s: 0.7, r: o.release ?? 0.35, peak: o.peak ?? 0.16 });
  const bright = o.bright ?? 1;
  const f = filter(ctx, 'lowpass', o.hz * 1.5, 1.2, g);
  f.frequency.setValueAtTime(clampHz(ctx, o.hz * 1.2), o.t);
  f.frequency.linearRampToValueAtTime(clampHz(ctx, o.hz * 6 * bright), o.t + attack * 1.4);
  f.frequency.setTargetAtTime(clampHz(ctx, o.hz * 3.2 * bright), o.t + attack * 1.4, 0.18);
  const a = osc(ctx, 'sawtooth', o.hz, o.t, end, f, -6);
  const b = osc(ctx, 'sawtooth', o.hz, o.t, end, f, 6);
  const c = osc(ctx, 'triangle', o.hz / 2, o.t, end, f);
  const nodes: AudioNode[] = [g, f, b, c];
  if (o.vibrato !== false && o.dur > 0.35) {
    const depth = gain(ctx, null, 0);
    const lfo = osc(ctx, 'sine', 5.2, o.t, end, depth);
    depth.gain.setValueAtTime(0, o.t);
    depth.gain.linearRampToValueAtTime(9, o.t + Math.min(o.dur, 0.6));
    depth.connect(a.detune);
    depth.connect(b.detune);
    nodes.push(lfo, depth);
  }
  releaseOnEnd(a, ...nodes);
  return end;
}
