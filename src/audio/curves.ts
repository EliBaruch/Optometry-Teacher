/**
 * Pure signal generators used by the mixer: a procedural reverb impulse
 * response (no audio files!) and equal-power crossfade curves.
 */

export interface ImpulseOptions {
  seconds?: number;
  /** Exponential decay steepness (higher = shorter tail). */
  decay?: number;
  /** 0..1 how quickly highs die away relative to lows (warm halls ≈ 0.6). */
  damping?: number;
  /** Pre-delay before the diffuse tail (s). */
  preDelay?: number;
  channels?: number;
  rnd?: () => number;
}

/**
 * Stereo "glass hall" impulse: a few sparse early reflections followed by a
 * dense, decorrelated noise tail whose high frequencies are progressively
 * damped by a time-varying one-pole lowpass.
 */
export function makeImpulse(sampleRate: number, o: ImpulseOptions = {}): Float32Array[] {
  const seconds = o.seconds ?? 3.2;
  const decay = o.decay ?? 3.4;
  const damping = o.damping ?? 0.6;
  const pre = o.preDelay ?? 0.018;
  const channels = o.channels ?? 2;
  const rnd = o.rnd ?? Math.random;
  const len = Math.max(1, Math.floor(sampleRate * seconds));
  const preN = Math.floor(sampleRate * pre);
  const out: Float32Array[] = [];
  for (let c = 0; c < channels; c++) {
    const data = new Float32Array(len);
    let lp = 0;
    for (let i = preN; i < len; i++) {
      const x = (i - preN) / (len - preN);
      const env = Math.pow(1 - x, decay) * Math.exp(-x * 2);
      // Lowpass coefficient slides from bright (1) to dark as the tail ages.
      const a = 1 - damping * Math.min(1, x * 1.6) * 0.92;
      lp += a * (rnd() * 2 - 1 - lp);
      data[i] = lp * env;
    }
    // Early reflections (different per channel for width).
    for (let k = 0; k < 6; k++) {
      const t = pre + 0.004 + rnd() * 0.07;
      const idx = Math.floor(t * sampleRate);
      if (idx < len) data[idx] = (data[idx] ?? 0) + (rnd() > 0.5 ? 1 : -1) * (0.5 - k * 0.06);
    }
    out.push(normalise(data, 0.6));
  }
  return out;
}

function normalise(d: Float32Array, peak: number): Float32Array {
  let m = 0;
  for (let i = 0; i < d.length; i++) m = Math.max(m, Math.abs(d[i]!));
  if (m > 0) {
    const k = peak / m;
    for (let i = 0; i < d.length; i++) d[i] = d[i]! * k;
  }
  return d;
}

/**
 * Equal-power fade from `from` to `to` (gains). Keeps perceived loudness
 * constant across a crossfade, unlike a linear ramp which dips in the middle.
 */
export function equalPowerCurve(from: number, to: number, points = 64): Float32Array {
  const n = Math.max(2, points);
  const c = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const x = i / (n - 1);
    const fadeIn = Math.sin((x * Math.PI) / 2);
    const fadeOut = Math.cos((x * Math.PI) / 2);
    c[i] = from * fadeOut + to * fadeIn;
  }
  c[0] = from;
  c[n - 1] = to;
  return c;
}
