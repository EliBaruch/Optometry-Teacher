import { SCALES, KEY_ROOT } from '../../theory';
import { note, type Composition, type MusicEvent } from '../types';
import { chordEvents, humanVel } from './util';

/** Exam: focus. Minimal pulse, a quiet pad bed, a soft clock-like tick. Nothing to distract. */
export const exam: Composition = {
  id: 'exam',
  bpm: 88,
  level: 0.75,
  verb: 0.3,
  echo: 0.15,
  filterHz: 1900,
  harmony: {
    scale: SCALES.lydian,
    root: KEY_ROOT,
    progressions: [[0, 0, 1, 1], [0, 5, 0, 1], [5, 5, 0, 0], [0, 6, 5, 1]],
    barsPerChord: 2,
    chordSize: 3,
  },
  step(s) {
    const ev: MusicEvent[] = [];
    if (s.chordStart) {
      ev.push(...chordEvents(s, 'pad', 52, 8.5, 0.45, { filtered: true }));
      ev.push(note('sub', s.chord[0]! - 24, 8, 0.45));
    }
    if (s.sub % 2 === 0) {
      const lo = s.chord[0]! - 12;
      const m = s.sub === 0 ? lo : s.chord[s.beat % 2 ? 2 : 1]! - 12;
      ev.push(note('pluck', m, 0.4, humanVel(s, s.stepInBar === 0 ? 0.55 : s.sub === 0 ? 0.4 : 0.28, 0.1), { filtered: true, pan: s.sub === 0 ? -0.15 : 0.15 }));
    }
    if (s.sub === 0) ev.push(note('hat', 0, 1, humanVel(s, s.beat % 2 ? 0.12 : 0.2)));
    if (s.sub % 2 === 0 && s.rng.chance(0.05)) ev.push(note('glass', s.chord[s.rng.int(0, 2)]! + 12, 1, 0.3, { pan: s.rng.float(-0.5, 0.5) }));
    return ev;
  },
};
