import { filter, fm, glass, noise, tone } from '../dsp';
import { def, hz, rand, type SfxDef } from './types';

/**
 * Instrument family: precise optical hardware. Short, dry, and detailed —
 * a transient, a tiny metallic resonance, and a mechanical "seat".
 */
export const clinicalSfx = {
  'lens-click': def({
    max: 4, cooldown: 0.025, gain: 0.9, verb: 0.07, jitter: 30,
    play(v) {
      const r = v.rate;
      // Contact transient.
      noise(v.k, v.out, { t: v.t, type: 'highpass', hz: 6200 * r, q: 0.7, peak: 0.45, attack: 0.0005, decay: 0.004 });
      // Resonant ring of the lens cell (narrow band + two inharmonic partials).
      noise(v.k, v.out, { t: v.t + 0.003, hz: 3150 * r, q: 14, peak: 0.5, attack: 0.0006, decay: 0.035 });
      tone(v.k, v.out, { t: v.t + 0.003, hz: 2830 * r, peak: 0.035, attack: 0.0008, decay: 0.05 });
      tone(v.k, v.out, { t: v.t + 0.003, hz: 4410 * r, peak: 0.02, attack: 0.0008, decay: 0.03 });
      // The lens seating home in the phoropter.
      return tone(v.k, v.out, { t: v.t + 0.012, hz: 190 * r, glideTo: 140 * r, glideTime: 0.03, peak: 0.22, attack: 0.001, decay: 0.045 });
    },
  }),

  dial: def({
    max: 6, cooldown: 0.018, gain: 1, verb: 0.05, jitter: 45,
    play(v) {
      const r = v.rate;
      noise(v.k, v.out, { t: v.t, hz: 5200 * r, q: 3, peak: 0.32, attack: 0.0004, decay: 0.003 });
      tone(v.k, v.out, { t: v.t, hz: 900 * r, peak: 0.04, attack: 0.0006, decay: 0.006 });
      return tone(v.k, v.out, { t: v.t + 0.001, hz: 2600 * r, peak: 0.045, attack: 0.0006, decay: 0.014 });
    },
  }),

  flashlight: def({
    max: 2, cooldown: 0.1, gain: 1.3, verb: 0.2, echo: 0.05, jitter: 20,
    play(v) {
      // Penlight switch: press … release.
      noise(v.k, v.out, { t: v.t, hz: 3000, q: 4, peak: 0.32, attack: 0.0005, decay: 0.006 });
      tone(v.k, v.out, { t: v.t, hz: 1800, peak: 0.05, decay: 0.015 });
      noise(v.k, v.out, { t: v.t + 0.05, hz: 3600, q: 4, peak: 0.18, attack: 0.0005, decay: 0.005 });
      // The beam "blooms": airy brightness + a faint glint.
      noise(v.k, v.air, { t: v.t + 0.04, type: 'highpass', hz: 7500, q: 0.5, peak: 0.06, attack: 0.12, decay: 0.4 });
      return glass(v.k, v.air, { t: v.t + 0.06, hz: hz(v, 98), peak: 0.04, decay: 0.6, bright: 0.4 });
    },
  }),

  door: def({
    max: 1, cooldown: 0.5, gain: 0.85, verb: 0.3, echo: 0.05, jitter: 0,
    play(v) {
      // Handle + latch.
      noise(v.k, v.out, { t: v.t, hz: 1200, q: 2, peak: 0.28, decay: 0.03 });
      tone(v.k, v.out, { t: v.t, hz: 260, type: 'triangle', peak: 0.12, decay: 0.05 });
      // Air moving as the door swings.
      noise(v.k, v.out, { t: v.t + 0.04, kind: 'pink', type: 'lowpass', hz: 500, q: 0.6, peak: 0.12, attack: 0.25, decay: 0.35 });
      // Brass shop-bell above the door: ding … dong.
      const lp = filter(v.k.ctx, 'lowpass', 7000, 0.5, v.out);
      glass(v.k, lp, { t: v.t + 0.09, hz: hz(v, 90), peak: 0.14, decay: 1.3 });
      fm(v.k, lp, { t: v.t + 0.09, hz: hz(v, 78), ratio: 2.4, index: 0.6, indexEnd: 0.05, peak: 0.04, decay: 1.2 });
      glass(v.k, lp, { t: v.t + 0.38 + rand(v, 0, 0.02), hz: hz(v, 86), peak: 0.12, decay: 1.7 });
      return fm(v.k, lp, { t: v.t + 0.38, hz: hz(v, 74), ratio: 2.4, index: 0.6, indexEnd: 0.05, peak: 0.04, decay: 1.6 });
    },
  }),

  stamp: def({
    max: 2, cooldown: 0.15, gain: 0.75, verb: 0.12, jitter: 25,
    play(v) {
      const hit = v.t + 0.05;
      // The swing down.
      noise(v.k, v.out, { t: v.t, kind: 'pink', hz: 800, sweepTo: 300, sweepTime: 0.05, q: 1, peak: 0.1, attack: 0.04, decay: 0.02 });
      // Impact: body, paper slap, wooden handle, ink squish.
      tone(v.k, v.out, { t: hit, hz: 120 * v.rate, glideTo: 38 * v.rate, glideTime: 0.12, peak: 0.7, attack: 0.001, decay: 0.35 });
      noise(v.k, v.out, { t: hit, hz: 1600, q: 0.9, peak: 0.45, attack: 0.0008, decay: 0.06 });
      tone(v.k, v.out, { t: hit, hz: 420, type: 'triangle', peak: 0.18, decay: 0.05 });
      return noise(v.k, v.out, { t: hit + 0.01, kind: 'pink', type: 'lowpass', hz: 700, q: 0.7, peak: 0.15, decay: 0.12 });
    },
  }),
} satisfies Record<string, SfxDef>;
