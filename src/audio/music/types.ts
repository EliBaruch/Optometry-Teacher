import type { Rng, TrackId } from '@core';
import type { Scale } from '../theory';

export type InstrumentId =
  | 'pad' | 'glass' | 'celesta' | 'keys' | 'pluck' | 'bass' | 'sub' | 'drone' | 'bell'
  | 'kick' | 'heart' | 'hat' | 'snap' | 'brush' | 'crackle' | 'riser';

export interface NoteEvent {
  kind: 'note';
  inst: InstrumentId;
  midi: number;
  /** Length in beats. */
  len: number;
  /** 0..1 */
  vel: number;
  /** Offset within the step, as a fraction of a step (for flams / humanising). */
  at?: number;
  pan?: number;
  /** Route through the track's sweepable filter instead of straight to the bus. */
  filtered?: boolean;
}

/** Automate the track filter (e.g. the emergency track's rising cutoff). */
export interface FilterEvent {
  kind: 'filter';
  hz: number;
  /** Glide time in beats (0 = jump). */
  glide: number;
}

export type MusicEvent = NoteEvent | FilterEvent;

export interface Harmony {
  scale: Scale;
  root: number;
  /** Progressions of scale degrees; a new one is chosen at each phrase. */
  progressions: readonly (readonly number[])[];
  barsPerChord: number;
  chordSize: number;
}

/** What a composition sees on every 16th step. */
export interface StepInfo {
  step: number;
  bar: number;
  stepInBar: number;
  beat: number;
  /** 16th within the beat, 0..3. */
  sub: number;
  phraseBar: number;
  phraseStart: boolean;
  chordStart: boolean;
  /** Degree of the current chord root. */
  chordDeg: number;
  /** Chord tones (MIDI) in root position from the harmony's root octave. */
  chord: number[];
  /** Scale degree → MIDI for the track's scale. */
  deg(d: number): number;
  rng: Rng;
  /** Free per-track memory (melody position etc.). */
  mem: Record<string, number>;
}

export interface Composition {
  id: TrackId;
  bpm: number;
  swing?: number;
  /** Track gain before the music bus. */
  level: number;
  verb: number;
  echo: number;
  /** Initial cutoff of the sweepable filter. */
  filterHz?: number;
  harmony: Harmony;
  step(s: StepInfo): MusicEvent[];
}

export const STEPS_PER_BEAT = 4;
export const BEATS_PER_BAR = 4;
export const STEPS_PER_BAR = STEPS_PER_BEAT * BEATS_PER_BAR;

export const note = (inst: InstrumentId, midi: number, len: number, vel: number, extra: Partial<NoteEvent> = {}): NoteEvent => ({
  kind: 'note', inst, midi, len, vel, ...extra,
});
