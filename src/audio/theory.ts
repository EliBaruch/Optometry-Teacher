/**
 * Pure music theory helpers. Everything in Lumen is tuned to D so SFX and the
 * generative score always harmonise: SFX favour D major pentatonic (D E F# A B),
 * which sits happily over both the lydian (wonder) and major (warmth) tracks.
 */

/** D4 — the tonal centre of the whole game. */
export const KEY_ROOT = 62;

export const SCALES = {
  lydian: [0, 2, 4, 6, 7, 9, 11],
  major: [0, 2, 4, 5, 7, 9, 11],
  pentatonic: [0, 2, 4, 7, 9],
  dorian: [0, 2, 3, 5, 7, 9, 10],
  aeolian: [0, 2, 3, 5, 7, 8, 10],
  phrygian: [0, 1, 3, 5, 7, 8, 10],
} as const satisfies Record<string, readonly number[]>;

export type ScaleName = keyof typeof SCALES;
export type Scale = readonly number[];

/** Equal-tempered MIDI note → Hz (A4 = 69 = 440 Hz). */
export function midiToHz(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12);
}

export function semitonesToRatio(st: number): number {
  return 2 ** (st / 12);
}

export function centsToRatio(cents: number): number {
  return 2 ** (cents / 1200);
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

/** Scale degree (0-based, may be negative or exceed one octave) → MIDI. */
export function degreeToMidi(scale: Scale, deg: number, root = KEY_ROOT): number {
  const n = scale.length;
  const oct = Math.floor(deg / n);
  return root + oct * 12 + scale[mod(deg, n)]!;
}

/** Is a MIDI note a member of `scale` built on `root` (any octave)? */
export function inScale(midi: number, scale: Scale, root = KEY_ROOT): boolean {
  return scale.includes(mod(Math.round(midi) - root, 12));
}

/** Snap any MIDI note to the nearest scale tone (ties resolve downward). */
export function quantize(midi: number, scale: Scale, root = KEY_ROOT): number {
  const m = Math.round(midi);
  for (let d = 0; d <= 6; d++) {
    if (inScale(m - d, scale, root)) return m - d;
    if (inScale(m + d, scale, root)) return m + d;
  }
  return m;
}

/**
 * Diatonic chord stacked in thirds on scale degree `deg`, e.g. size 4 on
 * degree 0 of D lydian → Dmaj7 (D F# A C#). Returned ascending.
 */
export function chordDegrees(deg: number, size = 4): number[] {
  return Array.from({ length: size }, (_, i) => deg + i * 2);
}

export function chordMidi(scale: Scale, deg: number, size = 4, root = KEY_ROOT): number[] {
  return chordDegrees(deg, size).map((d) => degreeToMidi(scale, d, root));
}

/**
 * Voice a chord so its lowest note lands in [floor, floor + 12): keeps pads in
 * a consistent register while the progression wanders (smooth voice leading).
 */
export function voiceNear(notes: readonly number[], floor: number): number[] {
  if (!notes.length) return [];
  const shift = 12 * Math.ceil((floor - notes[0]!) / 12);
  return notes.map((n) => n + shift);
}

/** All scale tones between lo and hi (inclusive), ascending. */
export function scaleRange(scale: Scale, lo: number, hi: number, root = KEY_ROOT): number[] {
  const out: number[] = [];
  for (let m = Math.ceil(lo); m <= hi; m++) if (inScale(m, scale, root)) out.push(m);
  return out;
}

export function clamp(v: number, lo: number, hi: number): number {
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : lo;
}

/**
 * Settings slider (0..1) → linear gain. A squared curve tracks perceived
 * loudness far better than linear and makes the bottom of the slider useful.
 */
export function sliderToGain(v: number): number {
  const c = clamp(v, 0, 1);
  return c * c;
}

export function dbToGain(db: number): number {
  return 10 ** (db / 20);
}

/**
 * Tempo-synced echo time: a dotted 8th (the classic "ping" that fills the gap
 * between pulses), falling back to an 8th / dotted 16th / 16th so the delay
 * never exceeds `max` seconds at slow tempi.
 */
export function echoTimeFor(bpm: number, max = 0.6): number {
  const beat = 60 / clamp(Number.isFinite(bpm) ? bpm : 120, 30, 300);
  for (const f of [0.75, 0.5, 0.375, 0.25]) if (beat * f <= max) return beat * f;
  return beat * 0.25;
}
