import { brass, filter, fm, gain, glass, noise, osc, perc, tone, releaseOnEnd } from '../dsp';
import { def, hz, pick, rand, SPARKLE_NOTES, type SfxDef, type SfxVoice } from './types';

/** Rising glass arpeggio — the shared "magic" gesture used across rewards. */
function arpeggio(v: SfxVoice, notes: readonly number[], start: number, gap: number, peak: number, decay: number, dest = v.out): number {
  let end = start;
  notes.forEach((n, i) => {
    const p = peak * (0.75 + 0.25 * (i / Math.max(1, notes.length - 1)));
    end = Math.max(end, glass(v.k, dest, { t: start + i * gap, hz: hz(v, n), peak: p, decay }));
  });
  return end;
}

/** A few random high glass twinkles into the reverb/echo. */
function twinkles(v: SfxVoice, start: number, count: number, spread: number, peak = 0.06): number {
  let end = start;
  for (let i = 0; i < count; i++) {
    const t = start + rand(v, 0, spread);
    end = Math.max(end, glass(v.k, v.air, { t, hz: hz(v, pick(v, SPARKLE_NOTES)), peak: peak * rand(v, 0.5, 1), decay: rand(v, 0.3, 0.6), bright: 0.5 }));
  }
  return end;
}

/** Warm coin: square body through a lowpass + FM metal + glass glint. */
function coinTink(v: SfxVoice, t: number, a: number, b: number, peak: number, hold = 0.065): number {
  const lp = filter(v.k.ctx, 'lowpass', 4800, 0.7, v.out);
  tone(v.k, lp, { t, hz: hz(v, a), type: 'square', peak: peak * 0.45, attack: 0.001, hold, decay: 0.02 });
  fm(v.k, v.out, { t, hz: hz(v, a), ratio: 3.5, index: 1.4, indexEnd: 0.2, peak: peak * 0.35, decay: 0.08 });
  const t2 = t + hold;
  tone(v.k, lp, { t: t2, hz: hz(v, b), type: 'square', peak: peak * 0.45, attack: 0.001, decay: 0.42 });
  glass(v.k, v.air, { t: t2, hz: hz(v, b + 12), peak: peak * 0.18, decay: 0.4 });
  return fm(v.k, v.out, { t: t2, hz: hz(v, b), ratio: 3.5, index: 1.6, indexEnd: 0.15, indexDecay: 0.3, peak: peak * 0.4, decay: 0.55 });
}

/** Low boom used under big moments. */
function boom(v: SfxVoice, t: number, peak: number, decay = 1.2): number {
  noise(v.k, v.out, { t, type: 'lowpass', hz: 200, q: 0.7, peak: peak * 0.4, decay: 0.12 });
  return tone(v.k, v.out, { t, hz: 98 * v.rate, glideTo: 36.7 * v.rate, glideTime: 0.4, peak, decay });
}

export const rewardSfx = {
  success: def({
    max: 2, cooldown: 0.08, gain: 0.9, verb: 0.35, echo: 0.15, jitter: 4,
    play(v) {
      fm(v.k, v.out, { t: v.t, hz: hz(v, 74), ratio: 1, index: 0.8, indexEnd: 0.1, peak: 0.1, decay: 1.2 });
      fm(v.k, v.out, { t: v.t, hz: hz(v, 81), ratio: 1, index: 0.6, indexEnd: 0.1, peak: 0.07, decay: 1.2 });
      const e = arpeggio(v, [86, 90, 93, 98], v.t, 0.06, 0.17, 0.9);
      return Math.max(e, twinkles(v, v.t + 0.25, 3, 0.4));
    },
  }),

  coin: def({
    max: 4, cooldown: 0.03, gain: 0.75, verb: 0.15, echo: 0.06, jitter: 6,
    play(v) {
      return coinTink(v, v.t, 93, 98, 0.32);
    },
  }),

  coins: def({
    max: 2, cooldown: 0.1, gain: 0.7, verb: 0.2, echo: 0.1, jitter: 6,
    play(v) {
      let t = v.t;
      let end = t;
      const n = 6 + Math.floor(v.rnd() * 4);
      for (let i = 0; i < n; i++) {
        const note = pick(v, [93, 95, 98, 100, 102, 105]);
        end = Math.max(end, fm(v.k, v.out, { t, hz: hz(v, note), ratio: 3.5, index: 1.5, indexEnd: 0.2, peak: rand(v, 0.07, 0.12), decay: 0.3 }));
        noise(v.k, v.out, { t, type: 'highpass', hz: 7000, q: 0.7, peak: 0.05, decay: 0.04, pan: rand(v, -0.6, 0.6) });
        t += rand(v, 0.035, 0.085);
      }
      return Math.max(end, coinTink(v, t + 0.02, 93, 98, 0.26));
    },
  }),

  combo: def({
    max: 3, cooldown: 0.04, gain: 0.8, verb: 0.25, echo: 0.15, jitter: 3,
    play(v) {
      noise(v.k, v.out, { t: v.t, kind: 'pink', hz: 1500, sweepTo: 5000, sweepTime: 0.1, q: 1, peak: 0.1, attack: 0.03, decay: 0.08 });
      return arpeggio(v, [86, 93, 100], v.t, 0.035, 0.15, 0.45);
    },
  }),

  sparkle: def({
    max: 3, cooldown: 0.05, gain: 0.8, verb: 0.4, echo: 0.3, jitter: 3,
    play(v) {
      let end = v.t;
      for (let i = 0; i < 6; i++) {
        const t = v.t + i * 0.05 + rand(v, 0, 0.04);
        end = Math.max(end, glass(v.k, v.out, { t, hz: hz(v, pick(v, SPARKLE_NOTES.slice(4))), peak: rand(v, 0.04, 0.09), decay: 0.4, bright: 0.5 }));
      }
      return end;
    },
  }),

  levelup: def({
    max: 1, cooldown: 0.3, gain: 0.9, verb: 0.35, echo: 0.12, jitter: 0,
    play(v) {
      const t = v.t;
      boom(v, t, 0.35, 0.6);
      // "ta-ta-taa" pickup on A, landing on a full D major brass chord.
      brass(v.k, v.out, { t, hz: hz(v, 69), dur: 0.09, peak: 0.12, bright: 1.4, attack: 0.02, release: 0.08, vibrato: false });
      brass(v.k, v.out, { t: t + 0.12, hz: hz(v, 69), dur: 0.09, peak: 0.12, bright: 1.4, attack: 0.02, release: 0.08, vibrato: false });
      const land = t + 0.24;
      boom(v, land, 0.4, 1);
      let end = land;
      for (const [n, p] of [[62, 0.07], [66, 0.07], [69, 0.08], [74, 0.12]] as const)
        end = Math.max(end, brass(v.k, v.out, { t: land, hz: hz(v, n), dur: 0.95, peak: p, bright: 1.5 }));
      arpeggio(v, [86, 90, 93, 98, 100], land + 0.02, 0.05, 0.12, 1, v.out);
      return Math.max(end, twinkles(v, land + 0.4, 5, 0.6));
    },
  }),

  rare: def({
    max: 1, cooldown: 0.3, gain: 0.85, verb: 0.45, echo: 0.3, jitter: 0,
    play(v) {
      noise(v.k, v.out, { t: v.t, kind: 'pink', type: 'highpass', hz: 1500, sweepTo: 7000, sweepTime: 0.32, q: 0.7, peak: 0.12, attack: 0.3, decay: 0.08 });
      const hit = v.t + 0.3;
      fm(v.k, v.out, { t: hit, hz: hz(v, 74), ratio: 1, index: 0.7, indexEnd: 0.15, peak: 0.08, attack: 0.02, decay: 1.6 });
      fm(v.k, v.out, { t: hit, hz: hz(v, 81), ratio: 1, index: 0.5, indexEnd: 0.1, peak: 0.06, attack: 0.02, decay: 1.6 });
      const e = arpeggio(v, [86, 93, 100, 105], hit, 0.03, 0.15, 1.3);
      return Math.max(e, twinkles(v, hit + 0.2, 6, 0.8));
    },
  }),

  legendary: def({
    max: 1, cooldown: 0.5, gain: 0.95, verb: 0.5, echo: 0.25, jitter: 0,
    play(v) {
      const t = v.t;
      // Long riser that "sucks in" before the drop.
      noise(v.k, v.out, { t, kind: 'pink', hz: 400, sweepTo: 6500, sweepTime: 0.6, q: 1.2, peak: 0.22, attack: 0.55, decay: 0.06 });
      tone(v.k, v.air, { t, hz: hz(v, 50), glideTo: hz(v, 74), glideTime: 0.6, type: 'triangle', peak: 0.05, attack: 0.5, decay: 0.1 });
      const drop = t + 0.6;
      boom(v, drop, 0.55, 1.6);
      noise(v.k, v.air, { t: drop, type: 'highpass', hz: 6000, q: 0.5, peak: 0.12, decay: 1.8 });
      let end = drop;
      for (const [n, p] of [[50, 0.06], [62, 0.07], [69, 0.07], [74, 0.09], [78, 0.08], [81, 0.07]] as const)
        end = Math.max(end, brass(v.k, v.out, { t: drop, hz: hz(v, n), dur: 1.6, peak: p, bright: 1.7, release: 0.8 }));
      arpeggio(v, [74, 78, 81, 86, 90, 93, 98, 102, 105, 110], drop, 0.045, 0.12, 1.4);
      // Descending sparkle rain.
      [110, 105, 102, 98, 93, 90].forEach((n, i) =>
        glass(v.k, v.air, { t: drop + 0.8 + i * 0.09, hz: hz(v, n), peak: 0.07, decay: 0.9, bright: 0.5 }));
      return Math.max(end, twinkles(v, drop + 1.2, 8, 1.2, 0.07));
    },
  }),

  unlock: def({
    max: 1, cooldown: 0.2, gain: 0.85, verb: 0.3, echo: 0.15, jitter: 0,
    play(v) {
      // Mechanism: click … clack.
      noise(v.k, v.out, { t: v.t, hz: 2500, q: 5, peak: 0.35, decay: 0.015 });
      noise(v.k, v.out, { t: v.t + 0.07, hz: 1400, q: 4, peak: 0.4, decay: 0.025 });
      tone(v.k, v.out, { t: v.t + 0.07, hz: 420, type: 'triangle', peak: 0.15, decay: 0.06 });
      const t = v.t + 0.13;
      tone(v.k, v.air, { t, hz: hz(v, 74), glideTo: hz(v, 98), glideTime: 0.25, peak: 0.04, attack: 0.05, decay: 0.3 });
      return arpeggio(v, [86, 93, 100], t, 0.04, 0.16, 1.1);
    },
  }),

  reveal: def({
    max: 1, cooldown: 0.2, gain: 0.9, verb: 0.45, echo: 0.2, jitter: 0,
    play(v) {
      noise(v.k, v.out, { t: v.t, kind: 'pink', type: 'lowpass', hz: 300, sweepTo: 5200, sweepTime: 0.45, q: 2, peak: 0.25, attack: 0.44, decay: 0.06 });
      tone(v.k, v.air, { t: v.t, hz: hz(v, 62), glideTo: hz(v, 74), glideTime: 0.45, type: 'triangle', peak: 0.05, attack: 0.4, decay: 0.1 });
      const hit = v.t + 0.45;
      boom(v, hit, 0.35, 0.9);
      let end = hit;
      for (const n of [74, 81, 88, 90]) end = Math.max(end, glass(v.k, v.out, { t: hit, hz: hz(v, n), peak: 0.12, decay: 1.6 }));
      return Math.max(end, twinkles(v, hit + 0.1, 4, 0.6));
    },
  }),

  drumroll: def({
    max: 1, cooldown: 0.4, gain: 0.85, verb: 0.2, jitter: 0,
    play(v) {
      const len = 1.35;
      const rate = 26;
      let end = v.t;
      for (let i = 0; i < len * rate; i++) {
        const t = v.t + i / rate + rand(v, -0.004, 0.004);
        const x = i / (len * rate);
        end = Math.max(end, noise(v.k, v.out, {
          t, hz: 1900, q: 0.9, peak: (0.05 + 0.2 * x * x) * rand(v, 0.75, 1), decay: 0.06, pan: i % 2 ? 0.25 : -0.25,
        }));
        if (i % 3 === 0) tone(v.k, v.out, { t, hz: 98, peak: 0.05 + 0.15 * x, decay: 0.12 });
      }
      return end;
    },
  }),

  'chest-open': def({
    max: 1, cooldown: 0.4, gain: 0.9, verb: 0.35, echo: 0.15, jitter: 0,
    play(v) {
      const { ctx } = v.k;
      // Wooden creak: a bandpassed saw whose pitch wanders.
      const g = gain(ctx, v.out, 0);
      const creakEnd = perc(g.gain, v.t, 0.09, 0.05, 0.12, 0.3);
      const bp = filter(ctx, 'bandpass', 900, 6, g);
      const saw = osc(ctx, 'sawtooth', 110, v.t, creakEnd, bp);
      for (let i = 1; i < 10; i++) saw.frequency.linearRampToValueAtTime(rand(v, 85, 150), v.t + i * 0.05);
      releaseOnEnd(saw, g, bp);
      // Latch.
      const latch = v.t + 0.46;
      noise(v.k, v.out, { t: latch, hz: 1600, q: 3, peak: 0.35, decay: 0.03 });
      tone(v.k, v.out, { t: latch, hz: 150, glideTo: 70, glideTime: 0.1, peak: 0.35, decay: 0.15 });
      // Light pours out: glissando + warm "aah".
      const open = latch + 0.05;
      for (const n of [62, 69, 78]) fm(v.k, v.out, { t: open, hz: hz(v, n), ratio: 1, index: 0.5, indexEnd: 0.1, peak: 0.05, attack: 0.25, decay: 1.4 });
      const e = arpeggio(v, [74, 76, 78, 81, 83, 86, 88, 90, 93, 95, 98], open, 0.03, 0.1, 0.8);
      return Math.max(e, twinkles(v, open + 0.4, 6, 0.7));
    },
  }),

  'streak-fire': def({
    max: 2, cooldown: 0.15, gain: 0.9, verb: 0.2, echo: 0.1, jitter: 30,
    play(v) {
      noise(v.k, v.out, { t: v.t, kind: 'pink', type: 'lowpass', hz: 220, q: 0.7, peak: 0.28, attack: 0.1, decay: 0.5 });
      const end = noise(v.k, v.out, { t: v.t, kind: 'pink', hz: 250, sweepTo: 3200, sweepTime: 0.45, q: 0.7, peak: 0.4, attack: 0.18, decay: 0.35, pan: -0.4, panTo: 0.4 });
      for (let i = 0; i < 12; i++)
        noise(v.k, v.out, { t: v.t + rand(v, 0.05, 0.6), hz: rand(v, 2500, 6500), q: 2, peak: rand(v, 0.05, 0.13), attack: 0.0005, decay: 0.006, pan: rand(v, -0.8, 0.8) });
      const lp = filter(v.k.ctx, 'lowpass', 2200, 0.7, v.air);
      tone(v.k, lp, { t: v.t, hz: hz(v, 74), glideTo: hz(v, 86), glideTime: 0.35, type: 'sawtooth', peak: 0.05, attack: 0.15, decay: 0.3 });
      return end;
    },
  }),
} satisfies Record<string, SfxDef>;
