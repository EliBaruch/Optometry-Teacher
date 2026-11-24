import type { Kit } from '../dsp';
import { midiToHz } from '../theory';

/** Everything a sound needs to render one instance. */
export interface SfxVoice {
  k: Kit;
  /** Main (dry + per-definition sends) input for this instance. */
  out: AudioNode;
  /** "Air" input: reverb + echo only — for tails, sparkles and shimmer. */
  air: AudioNode;
  /** Start time on the AudioContext clock. */
  t: number;
  /** Pitch multiplier (caller pitch × random humanisation). */
  rate: number;
  rnd: () => number;
}

export interface SfxDef {
  /** Render the sound; return the time it has fully decayed. */
  play(v: SfxVoice): number;
  /** Max simultaneous instances of this id (oldest is stolen). */
  max: number;
  /** Minimum seconds between triggers (spam guard). */
  cooldown: number;
  /** Instance gain. */
  gain: number;
  /** Reverb / echo send amounts for the main input. */
  verb: number;
  echo: number;
  /** Random humanisation (± cents). Tonal sounds stay nearly in tune. */
  jitter: number;
}

/** Hz of a MIDI note, scaled by the voice's pitch. */
export const hz = (v: SfxVoice, midi: number) => midiToHz(midi) * v.rate;

/** Random element. */
export const pick = <T>(v: SfxVoice, arr: readonly T[]): T => arr[Math.floor(v.rnd() * arr.length)]!;

/** Random float in [a, b). */
export const rand = (v: SfxVoice, a: number, b: number) => a + v.rnd() * (b - a);

/** D major pentatonic, high register (D6 … A7) — the sparkle palette. */
export const SPARKLE_NOTES = [86, 88, 90, 93, 95, 98, 100, 102, 105] as const;

export const def = (d: Partial<SfxDef> & Pick<SfxDef, 'play'>): SfxDef => ({
  max: 4, cooldown: 0.02, gain: 1, verb: 0.15, echo: 0, jitter: 10, ...d,
});
