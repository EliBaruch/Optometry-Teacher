/**
 * Minimal, strict fake of the WebAudio graph for unit tests (happy-dom has no
 * WebAudio). Every AudioParam automation and source start/stop is validated
 * the way browsers do, and violations are recorded in `errors` (and thrown),
 * so tests catch NaN frequencies, negative times or illegal ramps.
 */
/* eslint-disable @typescript-eslint/no-explicit-any */

export class FakeParam {
  value: number;
  events: { type: string; time: number; value: number }[] = [];
  constructor(private ctx: FakeAudioContext, v = 0) {
    this.value = v;
  }
  private check(type: string, value: number, time: number) {
    // Browsers reject any automation that lands inside an active value curve.
    const curve = this.events.find((e) => e.type === 'curve');
    if (curve && type !== 'curve') {
      const end = this.events.find((e) => e.type === 'curve-end')?.time ?? curve.time;
      if (time >= curve.time && time < end) this.ctx.fail(`${type} at ${time} overlaps a value curve`);
    }
    if (!Number.isFinite(value)) this.ctx.fail(`${type}: non-finite value ${value}`);
    if (!Number.isFinite(time) || time < 0) this.ctx.fail(`${type}: bad time ${time}`);
    this.events.push({ type, time, value });
    this.ctx.automations++;
  }
  setValueAtTime(v: number, t: number) { this.check('set', v, t); this.value = v; return this; }
  linearRampToValueAtTime(v: number, t: number) { this.check('lin', v, t); return this; }
  exponentialRampToValueAtTime(v: number, t: number) {
    if (v === 0) this.ctx.fail('exp ramp to 0');
    this.check('exp', v, t);
    return this;
  }
  setTargetAtTime(v: number, t: number, tc: number) {
    if (!(tc > 0)) this.ctx.fail(`setTarget: bad time constant ${tc}`);
    this.check('target', v, t);
    return this;
  }
  setValueCurveAtTime(c: Float32Array, t: number, d: number) {
    if (!(d > 0) || c.length < 2) this.ctx.fail('bad curve');
    for (const x of c) if (!Number.isFinite(x)) this.ctx.fail('curve NaN');
    if (this.events.some((e) => e.time >= t && e.time < t + d)) throw new Error('NotSupportedError: curve overlaps');
    this.check('curve', c[c.length - 1]!, t);
    this.events.push({ type: 'curve-end', time: t + d, value: c[c.length - 1]! });
    return this;
  }
  cancelScheduledValues(t: number) {
    if (!Number.isFinite(t) || t < 0) this.ctx.fail('cancel: bad time');
    // Like browsers: events at/after t are removed (a curve that started earlier survives).
    this.events = this.events.filter((e) => e.time < t || (e.type === 'curve-end' && this.events.some((c) => c.type === 'curve' && c.time < t)));
    return this;
  }
}

export class FakeNode {
  outputs = new Set<FakeNode | FakeParam>();
  constructor(public ctx: FakeAudioContext, public kind: string) {
    ctx.created++;
    ctx.byKind[kind] = (ctx.byKind[kind] ?? 0) + 1;
  }
  connect(dest: any) {
    if (!dest) this.ctx.fail(`${this.kind}.connect(undefined)`);
    this.outputs.add(dest);
    return dest;
  }
  disconnect() {
    this.outputs.clear();
  }
}

class FakeSource extends FakeNode {
  onended: (() => void) | null = null;
  started = false;
  startAt = 0;
  stopAt = Infinity;
  start(t = 0, offset = 0) {
    if (this.started) this.ctx.fail(`${this.kind}: start twice`);
    if (!Number.isFinite(t) || t < 0 || !Number.isFinite(offset)) this.ctx.fail(`${this.kind}: bad start ${t}`);
    this.started = true;
    this.startAt = t;
    this.ctx.sources.push(this);
  }
  stop(t = 0) {
    if (!this.started) this.ctx.fail(`${this.kind}: stop before start`);
    if (!Number.isFinite(t) || t < 0) this.ctx.fail(`${this.kind}: bad stop ${t}`);
    this.stopAt = t;
  }
}

export class FakeAudioContext {
  static instances: FakeAudioContext[] = [];
  /** When false, resume() leaves the context suspended (a resume outside a user activation on iOS). */
  static allowResume = true;
  currentTime = 0;
  sampleRate = 8000;
  state: 'suspended' | 'running' | 'closed' = 'suspended';
  destination: FakeNode;
  errors: string[] = [];
  created = 0;
  automations = 0;
  byKind: Record<string, number> = {};
  sources: FakeSource[] = [];
  private listeners = new Map<string, Set<() => void>>();

  constructor() {
    this.destination = new FakeNode(this, 'destination');
    FakeAudioContext.instances.push(this);
  }

  fail(msg: string): never {
    this.errors.push(msg);
    throw new Error(msg);
  }

  /** Advance the audio clock and fire `onended` for sources that finished. */
  advance(dt: number) {
    if (this.state !== 'running') return;
    this.currentTime += dt;
    for (const s of this.sources) {
      if (s.stopAt <= this.currentTime && s.onended) {
        const fn = s.onended;
        s.onended = null;
        fn();
      }
    }
    this.sources = this.sources.filter((s) => s.stopAt > this.currentTime);
  }

  resume() {
    if (!FakeAudioContext.allowResume) return Promise.resolve();
    this.state = 'running';
    this.emit();
    return Promise.resolve();
  }
  suspend() { this.state = 'suspended'; this.emit(); return Promise.resolve(); }
  close() { this.state = 'closed'; this.emit(); return Promise.resolve(); }
  addEventListener(t: string, fn: () => void) {
    const set = this.listeners.get(t) ?? new Set();
    set.add(fn);
    this.listeners.set(t, set);
  }
  removeEventListener(t: string, fn: () => void) { this.listeners.get(t)?.delete(fn); }
  private emit() { for (const fn of this.listeners.get('statechange') ?? []) fn(); }

  createGain() { const n = new FakeNode(this, 'gain') as any; n.gain = new FakeParam(this, 1); return n; }
  createOscillator() {
    const n = new FakeSource(this, 'osc') as any;
    n.type = 'sine';
    n.frequency = new FakeParam(this, 440);
    n.detune = new FakeParam(this, 0);
    return n;
  }
  createBiquadFilter() {
    const n = new FakeNode(this, 'filter') as any;
    n.type = 'lowpass';
    n.frequency = new FakeParam(this, 350);
    n.Q = new FakeParam(this, 1);
    n.gain = new FakeParam(this, 0);
    return n;
  }
  createBufferSource() { const n = new FakeSource(this, 'buffer') as any; n.buffer = null; n.loop = false; n.playbackRate = new FakeParam(this, 1); return n; }
  createStereoPanner() { const n = new FakeNode(this, 'panner') as any; n.pan = new FakeParam(this, 0); return n; }
  createDelay() { const n = new FakeNode(this, 'delay') as any; n.delayTime = new FakeParam(this, 0); return n; }
  createConvolver() { const n = new FakeNode(this, 'convolver') as any; n.buffer = null; return n; }
  createAnalyser() {
    const n = new FakeNode(this, 'analyser') as any;
    n.fftSize = 2048;
    n.smoothingTimeConstant = 0.8;
    n.frequencyBinCount = 1024;
    n.getByteFrequencyData = () => {};
    n.getByteTimeDomainData = () => {};
    return n;
  }
  createDynamicsCompressor() {
    const n = new FakeNode(this, 'compressor') as any;
    for (const k of ['threshold', 'knee', 'ratio', 'attack', 'release']) n[k] = new FakeParam(this, 0);
    return n;
  }
  createBuffer(channels: number, length: number, sampleRate: number) {
    if (!(length > 0) || !(channels > 0)) this.fail('bad buffer');
    const data = Array.from({ length: channels }, () => new Float32Array(length));
    return { numberOfChannels: channels, length, sampleRate, duration: length / sampleRate, getChannelData: (i: number) => data[i]! };
  }
}

/** A manual timer so tests drive the scheduler deterministically. */
export function manualTimers() {
  const fns = new Map<number, () => void>();
  let id = 0;
  return {
    setInterval: (fn: () => void) => { fns.set(++id, fn); return id; },
    clearInterval: (i: unknown) => { fns.delete(i as number); },
    fire: () => { for (const fn of [...fns.values()]) fn(); },
    get count() { return fns.size; },
  };
}

export function fakeDoc() {
  const fns = new Set<() => void>();
  return {
    hidden: false,
    addEventListener: (_: string, fn: () => void) => fns.add(fn),
    removeEventListener: (_: string, fn: () => void) => fns.delete(fn),
    setHidden(h: boolean) { this.hidden = h; for (const fn of fns) fn(); },
    get listeners() { return fns.size; },
  };
}

/** A fake window that records listeners so gesture re-arming can be tested. */
export function fakeWin() {
  const fns = new Map<string, Set<() => void>>();
  return {
    addEventListener: (t: string, fn: () => void) => {
      const set = fns.get(t) ?? new Set();
      set.add(fn);
      fns.set(t, set);
    },
    removeEventListener: (t: string, fn: () => void) => { fns.get(t)?.delete(fn); },
    dispatch(t: string) { for (const fn of [...(fns.get(t) ?? [])]) fn(); },
    get listeners() { let n = 0; for (const s of fns.values()) n += s.size; return n; },
  };
}
