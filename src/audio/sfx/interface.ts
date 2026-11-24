import { filter, fm, glass, noise, tone } from '../dsp';
import { def, hz, pick, type SfxDef } from './types';

/** UI family: tactile, quiet, glassy — heard hundreds of times, so never fatiguing. */
export const interfaceSfx = {
  click: def({
    max: 4, cooldown: 0.02, gain: 0.8, verb: 0.08, jitter: 40,
    play(v) {
      const e1 = noise(v.k, v.out, { t: v.t, hz: 3800 * v.rate, q: 2.5, peak: 0.32, attack: 0.0008, decay: 0.012 });
      const e2 = tone(v.k, v.out, { t: v.t, hz: hz(v, 86), peak: 0.07, decay: 0.05 });
      return Math.max(e1, e2);
    },
  }),

  hover: def({
    max: 2, cooldown: 0.06, gain: 0.55, verb: 0.25, jitter: 6,
    play(v) {
      return glass(v.k, v.out, { t: v.t, hz: hz(v, pick(v, [93, 98])), peak: 0.07, decay: 0.22, bright: 0.6 });
    },
  }),

  select: def({
    max: 3, cooldown: 0.04, gain: 0.8, verb: 0.25, echo: 0.08, jitter: 5,
    play(v) {
      noise(v.k, v.out, { t: v.t, hz: 4200, q: 2, peak: 0.18, attack: 0.0008, decay: 0.01 });
      fm(v.k, v.out, { t: v.t, hz: hz(v, 86), ratio: 3, index: 1.2, indexEnd: 0.1, peak: 0.16, decay: 0.35 });
      return fm(v.k, v.out, { t: v.t + 0.055, hz: hz(v, 93), ratio: 3, index: 1.2, indexEnd: 0.1, peak: 0.16, decay: 0.55 });
    },
  }),

  back: def({
    max: 2, cooldown: 0.05, gain: 0.7, verb: 0.2, jitter: 5,
    play(v) {
      const lp = filter(v.k.ctx, 'lowpass', 2400, 0.5, v.out);
      fm(v.k, lp, { t: v.t, hz: hz(v, 81), ratio: 2, index: 0.9, indexEnd: 0.1, peak: 0.15, decay: 0.22 });
      return fm(v.k, lp, { t: v.t + 0.06, hz: hz(v, 74), ratio: 2, index: 0.9, indexEnd: 0.1, peak: 0.14, decay: 0.35 });
    },
  }),

  pop: def({
    max: 5, cooldown: 0.015, gain: 0.8, verb: 0.12, jitter: 80,
    play(v) {
      noise(v.k, v.out, { t: v.t, hz: 2400, q: 1.5, peak: 0.15, decay: 0.008 });
      return tone(v.k, v.out, { t: v.t, hz: 360 * v.rate, glideTo: 1150 * v.rate, glideTime: 0.045, peak: 0.32, attack: 0.002, decay: 0.07 });
    },
  }),

  whoosh: def({
    max: 3, cooldown: 0.05, gain: 0.9, verb: 0.2, jitter: 60,
    play(v) {
      noise(v.k, v.out, { t: v.t, kind: 'pink', type: 'lowpass', hz: 180, q: 0.7, peak: 0.12, attack: 0.1, decay: 0.25 });
      return noise(v.k, v.out, {
        t: v.t, kind: 'pink', hz: 350 * v.rate, sweepTo: 2600 * v.rate, sweepTime: 0.3, q: 1.4,
        peak: 0.45, attack: 0.13, decay: 0.28, pan: -0.7, panTo: 0.7,
      });
    },
  }),

  thud: def({
    max: 3, cooldown: 0.04, gain: 1, verb: 0.12, jitter: 50,
    play(v) {
      noise(v.k, v.out, { t: v.t, type: 'lowpass', hz: 320, q: 0.8, peak: 0.35, decay: 0.08 });
      noise(v.k, v.out, { t: v.t, hz: 620, q: 3, peak: 0.12, decay: 0.04 });
      return tone(v.k, v.out, { t: v.t, hz: 110 * v.rate, glideTo: 42 * v.rate, glideTime: 0.18, peak: 0.6, decay: 0.34 });
    },
  }),

  tick: def({
    max: 3, cooldown: 0.03, gain: 0.7, verb: 0.08, jitter: 25,
    play(v) {
      noise(v.k, v.out, { t: v.t, type: 'highpass', hz: 5200 * v.rate, q: 0.7, peak: 0.3, attack: 0.0006, decay: 0.008 });
      return tone(v.k, v.out, { t: v.t, hz: hz(v, 98), peak: 0.06, decay: 0.025 });
    },
  }),
} satisfies Record<string, SfxDef>;
