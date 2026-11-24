import { SCALES, KEY_ROOT } from '../../theory';
import { note, type Composition, type MusicEvent } from '../types';
import { chordEvents, chordLadder, humanVel } from './util';

/** Results: triumph. Bright D major, rising celesta shimmer, bells, a confident pulse. */
export const results: Composition = {
  id: 'results',
  bpm: 84,
  level: 0.85,
  verb: 0.45,
  echo: 0.22,
  harmony: {
    scale: SCALES.major,
    root: KEY_ROOT,
    progressions: [[0, 3, 4, 0], [0, 4, 5, 3], [3, 4, 0, 0], [0, 5, 3, 4]],
    barsPerChord: 1,
    chordSize: 3,
  },
  step(s) {
    const ev: MusicEvent[] = [];
    if (s.chordStart) {
      ev.push(...chordEvents(s, 'pad', 60, 4.4, 0.6));
      ev.push(...chordEvents(s, 'keys', 62, 1, 0.45));
      ev.push(note('bass', s.chord[0]! - 24, 3.5, 0.6));
      ev.push(note('kick', 0, 1, 0.5));
    }
    if (s.stepInBar === 8) ev.push(note('kick', 0, 1, 0.35));
    // Rising shimmer through the first half of every bar.
    if (s.stepInBar < 8) {
      const ladder = chordLadder(s, 74, 3);
      const m = ladder[s.stepInBar % ladder.length]!;
      ev.push(note('celesta', m, 0.5, humanVel(s, 0.5 - s.stepInBar * 0.03), { pan: -0.5 + s.stepInBar * 0.12 }));
    } else if (s.sub % 2 === 0 && s.rng.chance(0.3)) {
      ev.push(note('bell', s.deg(14 + [0, 1, 2, 4, 5][s.rng.int(0, 4)]!), 1, 0.4, { pan: s.rng.float(-0.6, 0.6) }));
    }
    if (s.sub % 2 === 0) ev.push(note('hat', 0, 1, humanVel(s, 0.18, 0.3)));
    return ev;
  },
};
