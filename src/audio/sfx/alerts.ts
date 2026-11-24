import { filter, fm, noise, tone } from '../dsp';
import { def, hz, type SfxDef } from './types';

/**
 * Feedback & urgency family. Mistakes are gentle and warm (a sigh, never a
 * buzzer); emergencies are clear and rhythmic, modelled on patient monitors
 * but rounded off so they never pierce.
 */
export const alertSfx = {
  fail: def({
    max: 1, cooldown: 0.15, gain: 0.9, verb: 0.25, jitter: 0,
    play(v) {
      // A soft descending sigh B4 → F#4 (the relative minor's colour), felt-muted.
      const lp = filter(v.k.ctx, 'lowpass', 1400, 0.6, v.out);
      tone(v.k, lp, { t: v.t, hz: hz(v, 71), type: 'triangle', peak: 0.28, attack: 0.02, decay: 0.45 });
      tone(v.k, lp, { t: v.t, hz: hz(v, 59), type: 'sine', peak: 0.12, attack: 0.02, decay: 0.45 });
      const t2 = v.t + 0.2;
      tone(v.k, lp, { t: t2, hz: hz(v, 54), type: 'sine', peak: 0.14, attack: 0.03, decay: 0.8 });
      noise(v.k, v.out, { t: v.t, type: 'lowpass', hz: 240, q: 0.7, peak: 0.12, decay: 0.1 });
      return tone(v.k, lp, { t: t2, hz: hz(v, 66), glideTo: hz(v, 65.6), glideTime: 0.6, type: 'triangle', peak: 0.26, attack: 0.03, decay: 0.8 });
    },
  }),

  error: def({
    max: 1, cooldown: 0.12, gain: 0.8, verb: 0.12, jitter: 0,
    play(v) {
      // Two short, rounded "nope" bonks on E4.
      const lp = filter(v.k.ctx, 'lowpass', 950, 2, v.out);
      let end = v.t;
      for (const dt of [0, 0.13]) {
        const t = v.t + dt;
        tone(v.k, lp, { t, hz: hz(v, 64), glideTo: hz(v, 63.5), glideTime: 0.1, type: 'square', peak: 0.2, attack: 0.004, decay: 0.12 });
        end = tone(v.k, lp, { t, hz: hz(v, 52), type: 'sine', peak: 0.15, attack: 0.004, decay: 0.12 });
      }
      return end;
    },
  }),

  heartbeat: def({
    max: 2, cooldown: 0.25, gain: 0.8, verb: 0.1, jitter: 20,
    play(v) {
      const r = v.rate;
      // lub
      tone(v.k, v.out, { t: v.t, hz: 58 * r, glideTo: 42 * r, glideTime: 0.09, peak: 0.8, attack: 0.004, decay: 0.16 });
      noise(v.k, v.out, { t: v.t, type: 'lowpass', hz: 140, q: 0.8, peak: 0.25, decay: 0.05 });
      // dub
      const t2 = v.t + 0.2;
      noise(v.k, v.out, { t: t2, type: 'lowpass', hz: 160, q: 0.8, peak: 0.18, decay: 0.05 });
      return tone(v.k, v.out, { t: t2, hz: 52 * r, glideTo: 38 * r, glideTime: 0.1, peak: 0.6, attack: 0.004, decay: 0.2 });
    },
  }),

  /**
   * High-priority monitor alarm, IEC 60601-1-8 burst shape: 3 + 2 pulses
   * (pulse 100 ms, spacing 60 ms, the 3rd→4th gap = 2·spacing + pulse).
   * Each pulse is a harmonically rich FM tone (the standard asks for ≥4
   * harmonics so it localises), rounded at the edges so it is urgent, not
   * shrill. Call it repeatedly (e.g. every 2–3 s) for an ongoing emergency.
   */
  alarm: def({
    max: 1, cooldown: 0.5, gain: 0.72, verb: 0.15, jitter: 0,
    play(v) {
      const tp = 0.1;
      const ts = 0.06;
      const step = tp + ts;
      const fourth = 2 * step + tp + (2 * ts + tp);
      const onsets = [0, step, 2 * step, fourth, fourth + step];
      const n = 81; // A5 — the dominant of D, sits above the score
      let end = v.t;
      onsets.forEach((dt) => {
        const t = v.t + dt;
        fm(v.k, v.out, { t, hz: hz(v, n), ratio: 1, index: 1.4, indexEnd: 0.9, peak: 0.19, attack: 0.012, hold: tp - 0.03, decay: 0.05 });
        end = tone(v.k, v.out, { t, hz: hz(v, n + 12), type: 'triangle', peak: 0.04, attack: 0.012, hold: tp - 0.03, decay: 0.05 });
      });
      return end;
    },
  }),

  countdown: def({
    max: 2, cooldown: 0.1, gain: 0.8, verb: 0.15, echo: 0.05, jitter: 0,
    play(v) {
      tone(v.k, v.out, { t: v.t, hz: hz(v, 93), peak: 0.05, attack: 0.004, hold: 0.07, decay: 0.12 });
      noise(v.k, v.out, { t: v.t, type: 'highpass', hz: 4000, q: 0.7, peak: 0.08, decay: 0.006 });
      return tone(v.k, v.out, { t: v.t, hz: hz(v, 81), peak: 0.26, attack: 0.004, hold: 0.08, decay: 0.16 });
    },
  }),
} satisfies Record<string, SfxDef>;
