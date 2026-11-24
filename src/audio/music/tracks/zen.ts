import { SCALES, KEY_ROOT } from '../../theory';
import { note, type Composition, type MusicEvent } from '../types';
import { chordEvents } from './util';

const PENTA = [0, 1, 2, 4, 5];

/** Zen: breath. Slow lydian pads and sparse, far-away bells with lots of air. */
export const zen: Composition = {
  id: 'zen',
  bpm: 52,
  level: 0.8,
  verb: 0.6,
  echo: 0.35,
  harmony: {
    scale: SCALES.lydian,
    root: KEY_ROOT,
    progressions: [[0, 4], [0, 1], [5, 1], [0, 6]],
    barsPerChord: 2,
    chordSize: 4,
  },
  step(s) {
    const ev: MusicEvent[] = [];
    if (s.chordStart) {
      ev.push(...chordEvents(s, 'pad', 55, 8.5, 0.5));
      if (s.rng.chance(0.7)) ev.push(note('sub', s.chord[0]! - 24, 8, 0.35));
    }
    if (s.sub % 2 === 0 && s.rng.chance(s.beat === 0 && s.sub === 0 ? 0.3 : 0.09)) {
      const d = PENTA[s.rng.int(0, PENTA.length - 1)]! + 7 * s.rng.int(1, 2);
      ev.push(note('bell', s.deg(d), 2, s.rng.float(0.35, 0.6), { pan: s.rng.float(-0.7, 0.7) }));
    }
    return ev;
  },
};
