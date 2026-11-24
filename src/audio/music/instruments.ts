import {
  adsr, clampHz, filter, fm, gain, glass, noise, osc, perc, releaseOnEnd, tone, type Kit,
} from '../dsp';
import { midiToHz } from '../theory';
import type { InstrumentId } from './types';

/**
 * Music instruments. Each renders one note into `dest` and returns when it is
 * silent. Kept deliberately light (2–4 oscillators per voice) so long ambient
 * sessions stay cheap on laptops and phones.
 */
export type Instrument = (k: Kit, dest: AudioNode, t: number, midi: number, dur: number, vel: number) => number;

/** Lush detuned-saw pad with a slowly blooming filter. */
const pad: Instrument = (k, dest, t, midi, dur, vel) => {
  const { ctx } = k;
  const hz = midiToHz(midi);
  const g = gain(ctx, dest, 0);
  const end = adsr(g.gain, t, dur, { a: 1.6, d: 1.2, s: 0.75, r: 2.4, peak: 0.05 * vel });
  const f = filter(ctx, 'lowpass', 400, 0.6, g);
  f.frequency.setValueAtTime(clampHz(ctx, Math.min(500, hz * 2)), t);
  f.frequency.linearRampToValueAtTime(clampHz(ctx, 700 + 1400 * vel), t + 1.8);
  f.frequency.setTargetAtTime(clampHz(ctx, 600 + 800 * vel), t + 1.8, 2);
  const a = osc(ctx, 'sawtooth', hz, t, end, f, -9);
  const b = osc(ctx, 'sawtooth', hz, t, end, f, 8);
  const c = osc(ctx, 'triangle', hz, t, end, f, 2);
  releaseOnEnd(a, g, f, b, c);
  return end;
};

/** Celesta: harmonic FM (4:1) with a quick hammer brightness. */
const celesta: Instrument = (k, dest, t, midi, dur, vel) =>
  fm(k, dest, { t, hz: midiToHz(midi), ratio: 4, index: 1.1, indexEnd: 0.15, indexDecay: 0.25, peak: 0.11 * vel, decay: Math.min(2.2, 0.9 + dur) });

const glassInst: Instrument = (k, dest, t, midi, dur, vel) =>
  glass(k, dest, { t, hz: midiToHz(midi), peak: 0.1 * vel, decay: Math.min(2.6, 1.2 + dur * 0.5), bright: 0.7 });

const bell: Instrument = (k, dest, t, midi, _dur, vel) =>
  glass(k, dest, { t, hz: midiToHz(midi), peak: 0.09 * vel, decay: 3, bright: 0.35 });

/** Warm electric piano: 1:1 FM body plus a short tine. */
const keys: Instrument = (k, dest, t, midi, dur, vel) => {
  const hz = midiToHz(midi);
  tone(k, dest, { t, hz: hz * 4, peak: 0.012 * vel, decay: 0.09 });
  return fm(k, dest, { t, hz, ratio: 1, index: 1.6 * vel + 0.3, indexEnd: 0.25, indexDecay: 0.7, peak: 0.075 * vel, attack: 0.004, decay: Math.min(2.4, 0.8 + dur) });
};

/** Muted pluck for pulses and ostinati. */
const pluck: Instrument = (k, dest, t, midi, dur, vel) => {
  const { ctx } = k;
  const hz = midiToHz(midi);
  const g = gain(ctx, dest, 0);
  const end = perc(g.gain, t, 0.09 * vel, 0.003, Math.min(0.5, 0.15 + dur * 0.3));
  const f = filter(ctx, 'lowpass', hz * 8, 1.5, g);
  f.frequency.setTargetAtTime(clampHz(ctx, hz * 1.5), t, 0.05);
  const a = osc(ctx, 'square', hz, t, end, f, -4);
  const b = osc(ctx, 'triangle', hz, t, end, f, 4);
  releaseOnEnd(a, g, f, b);
  return end;
};

const bass: Instrument = (k, dest, t, midi, dur, vel) => {
  const { ctx } = k;
  const hz = midiToHz(midi);
  const g = gain(ctx, dest, 0);
  const end = adsr(g.gain, t, dur, { a: 0.012, d: 0.25, s: 0.7, r: 0.18, peak: 0.22 * vel });
  const f = filter(ctx, 'lowpass', Math.max(260, hz * 4), 0.7, g);
  const a = osc(ctx, 'sine', hz, t, end, f);
  const b = osc(ctx, 'triangle', hz, t, end, f, 3);
  releaseOnEnd(a, g, f, b);
  return end;
};

const sub: Instrument = (k, dest, t, midi, dur, vel) => {
  const { ctx } = k;
  const g = gain(ctx, dest, 0);
  const end = adsr(g.gain, t, dur, { a: 0.4, d: 0.5, s: 0.9, r: 1, peak: 0.2 * vel });
  releaseOnEnd(osc(ctx, 'sine', midiToHz(midi), t, end, g), g);
  return end;
};

/** Dark, beating low drone for tension. */
const drone: Instrument = (k, dest, t, midi, dur, vel) => {
  const { ctx } = k;
  const hz = midiToHz(midi);
  const g = gain(ctx, dest, 0);
  const end = adsr(g.gain, t, dur, { a: 2.5, d: 1, s: 0.9, r: 3, peak: 0.08 * vel });
  const f = filter(ctx, 'lowpass', hz * 5, 2.5, g);
  const a = osc(ctx, 'sawtooth', hz, t, end, f, -5);
  const b = osc(ctx, 'sawtooth', hz * 1.002, t, end, f, 5);
  const c = osc(ctx, 'sine', hz / 2, t, end, g);
  releaseOnEnd(a, g, f, b, c);
  return end;
};

const kick: Instrument = (k, dest, t, _m, _d, vel) => {
  noise(k, dest, { t, type: 'lowpass', hz: 900, q: 0.7, peak: 0.08 * vel, decay: 0.01 });
  return tone(k, dest, { t, hz: 130, glideTo: 45, glideTime: 0.08, peak: 0.55 * vel, attack: 0.002, decay: 0.3 });
};

const heart: Instrument = (k, dest, t, _m, _d, vel) => {
  tone(k, dest, { t, hz: 60, glideTo: 42, glideTime: 0.08, peak: 0.6 * vel, attack: 0.004, decay: 0.15 });
  noise(k, dest, { t, type: 'lowpass', hz: 150, q: 0.8, peak: 0.18 * vel, decay: 0.04 });
  return tone(k, dest, { t: t + 0.17, hz: 52, glideTo: 38, glideTime: 0.1, peak: 0.42 * vel, attack: 0.004, decay: 0.18 });
};

const hat: Instrument = (k, dest, t, _m, _d, vel) =>
  noise(k, dest, { t, type: 'highpass', hz: 7200, q: 0.7, peak: 0.12 * vel, attack: 0.0008, decay: 0.035 });

const snap: Instrument = (k, dest, t, _m, _d, vel) => {
  tone(k, dest, { t, hz: 210, type: 'triangle', peak: 0.06 * vel, decay: 0.04 });
  return noise(k, dest, { t, hz: 1800, q: 1.1, peak: 0.2 * vel, attack: 0.001, decay: 0.09 });
};

const brush: Instrument = (k, dest, t, _m, _d, vel) =>
  noise(k, dest, { t, kind: 'pink', hz: 3200, q: 0.6, peak: 0.12 * vel, attack: 0.015, decay: 0.12 });

const crackle: Instrument = (k, dest, t, _m, _d, vel) =>
  noise(k, dest, { t, type: 'highpass', hz: 2600, q: 0.7, peak: 0.07 * vel, attack: 0.0004, decay: 0.0025 });

const riser: Instrument = (k, dest, t, _m, dur, vel) =>
  noise(k, dest, { t, kind: 'pink', hz: 300, sweepTo: 5200, sweepTime: dur, q: 1.4, peak: 0.16 * vel, attack: dur * 0.92, decay: 0.08 });

export const INSTRUMENTS: Record<InstrumentId, Instrument> = {
  pad, celesta, glass: glassInst, bell, keys, pluck, bass, sub, drone, kick, heart, hat, snap, brush, crackle, riser,
};
