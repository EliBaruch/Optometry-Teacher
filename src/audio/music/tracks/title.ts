import { SCALES, KEY_ROOT } from '../../theory';
import { note, type Composition, type MusicEvent } from '../types';
import { chordEvents, chordLadder, humanVel, walk } from './util';

/** Title: wonder. D lydian, lush detuned pads, a celesta/glass arpeggio drifting overhead. */
export const title: Composition = {
  id: 'title',
  bpm: 66,
  level: 1.25,
  verb: 0.55,
  echo: 0.28,
  harmony: {
    scale: SCALES.lydian,
    root: KEY_ROOT,
    // I – II – I – vi, etc.: the raised 4th (G#) in II is the "wonder" colour.
    progressions: [[0, 1, 0, 5], [0, 5, 6, 1], [0, 2, 5, 1], [5, 6, 0, 1], [0, 4, 1, 0]],
    barsPerChord: 2,
    chordSize: 4,
  },
  step(s) {
    const ev: MusicEvent[] = [];
    if (s.chordStart) {
      ev.push(...chordEvents(s, 'pad', 55, 9.5, 0.75));
      ev.push(note('sub', s.chord[0]! - 24, 8, 0.6));
      if (s.rng.chance(0.6)) ev.push(note('bell', s.chord[s.rng.int(1, 3)]! + 24, 2, 0.35, { pan: s.rng.float(-0.5, 0.5) }));
    }
    // Arpeggio on 8ths; timbre alternates by phrase.
    if (s.sub % 2 === 0 && s.rng.chance(s.phraseBar % 4 === 3 ? 0.35 : 0.62)) {
      const inst = Math.floor(s.bar / 8) % 2 ? 'glass' : 'celesta';
      const m = walk(s, 'arp', chordLadder(s, 67, 2));
      ev.push(note(inst, m, 1, humanVel(s, s.beat === 0 && s.sub === 0 ? 0.6 : 0.42), { pan: s.rng.float(-0.6, 0.6) }));
    }
    // Rare high twinkles.
    if (s.rng.chance(0.025)) ev.push(note('bell', s.deg(14 + s.rng.int(0, 6)) + 12, 1, 0.25, { pan: s.rng.float(-0.8, 0.8) }));
    return ev;
  },
};
