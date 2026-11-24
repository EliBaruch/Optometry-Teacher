import { voiceNear } from '../../theory';
import { note, type InstrumentId, type NoteEvent, type StepInfo } from '../types';

/** Chord voiced with its lowest note in [floor, floor+12), spread across the stereo field. */
export function chordEvents(s: StepInfo, inst: InstrumentId, floor: number, len: number, vel: number, extra: Partial<NoteEvent> = {}): NoteEvent[] {
  const notes = voiceNear(s.chord, floor);
  return notes.map((m, i) => note(inst, m, len, vel * (0.85 + 0.15 * s.rng.next()), {
    pan: notes.length > 1 ? (i / (notes.length - 1)) * 0.8 - 0.4 : 0,
    at: i * 0.04 * s.rng.next(),
    ...extra,
  }));
}

/** Chord tones extended over `octaves` octaves starting at `floor`. */
export function chordLadder(s: StepInfo, floor: number, octaves: number): number[] {
  const base = voiceNear(s.chord, floor);
  const out: number[] = [];
  for (let o = 0; o < octaves; o++) for (const m of base) out.push(m + 12 * o);
  return out;
}

/**
 * Gentle random walk over `tones` (mostly steps, occasional leaps, bouncing
 * off the ends) — reads as melodic rather than random.
 */
export function walk(s: StepInfo, key: string, tones: readonly number[]): number {
  const n = tones.length;
  if (!n) return 60;
  let i = s.mem[key] ?? Math.floor(n / 2);
  const r = s.rng.next();
  const stepBy = r < 0.4 ? 1 : r < 0.75 ? -1 : r < 0.88 ? 2 : -2;
  i += stepBy;
  if (i < 0) i = -i;
  if (i >= n) i = 2 * (n - 1) - i;
  i = Math.max(0, Math.min(n - 1, i));
  s.mem[key] = i;
  return tones[i]!;
}

export const humanVel = (s: StepInfo, v: number, spread = 0.15) => Math.max(0.05, Math.min(1, v * (1 - spread / 2 + spread * s.rng.next())));
