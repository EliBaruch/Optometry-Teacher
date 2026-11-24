import { SCALES, KEY_ROOT } from '../../theory';
import { note, type Composition, type MusicEvent } from '../types';
import { chordEvents, humanVel, walk } from './util';

const PENTA = [0, 1, 2, 4, 5]; // major-scale degrees forming the pentatonic

/** Hub: a warm lo-fi clinic. Swung e-piano, brushed kit, round bass, vinyl dust. */
export const hub: Composition = {
  id: 'hub',
  bpm: 76,
  swing: 0.14,
  level: 0.85,
  verb: 0.3,
  echo: 0.12,
  filterHz: 2600,
  harmony: {
    scale: SCALES.major,
    root: KEY_ROOT,
    progressions: [[0, 5, 3, 4], [3, 4, 2, 5], [0, 3, 1, 4], [3, 2, 1, 4], [0, 2, 3, 4]],
    barsPerChord: 1,
    chordSize: 4,
  },
  step(s) {
    const ev: MusicEvent[] = [];
    const root = s.chord[0]! - 24;
    if (s.chordStart) {
      ev.push(...chordEvents(s, 'keys', 57, 1.6, 0.55, { filtered: true }));
      ev.push(...chordEvents(s, 'pad', 57, 4.2, 0.35, { filtered: true }));
      ev.push(note('bass', root, 1.5, 0.7));
      ev.push(note('kick', 0, 1, 0.55));
    }
    switch (s.stepInBar) {
      case 6:
        if (s.rng.chance(0.65)) ev.push(...chordEvents(s, 'keys', 60, 1, 0.38, { filtered: true }).slice(1));
        break;
      case 8:
        if (s.rng.chance(0.75)) ev.push(note('bass', s.chord[2]! - 24, 1, 0.55));
        break;
      case 10:
        if (s.rng.chance(0.5)) ev.push(note('kick', 0, 1, 0.38));
        break;
      case 14:
        if (s.rng.chance(0.4)) ev.push(note('bass', s.deg(s.chordDeg + 4) - 24, 0.5, 0.4));
        break;
    }
    if (s.stepInBar === 4 || s.stepInBar === 12) ev.push(note('snap', 0, 1, humanVel(s, 0.45)));
    if (s.sub % 2 === 0) ev.push(note('hat', 0, 1, humanVel(s, s.sub === 0 ? 0.25 : 0.4, 0.4)));
    if (s.sub === 2 && s.rng.chance(0.5)) ev.push(note('brush', 0, 1, humanVel(s, 0.4)));
    // Little celesta melody, two bars on, two bars off.
    if (s.bar % 4 >= 2 && s.sub % 2 === 0 && s.rng.chance(0.4)) {
      const tones = [...PENTA.map((d) => s.deg(d + 7)), ...PENTA.map((d) => s.deg(d + 14))];
      ev.push(note('celesta', walk(s, 'mel', tones), 0.5, humanVel(s, 0.45), { pan: 0.25 }));
    }
    if (s.rng.chance(0.12)) ev.push(note('crackle', 0, 1, s.rng.float(0.3, 1), { pan: s.rng.float(-0.9, 0.9) }));
    return ev;
  },
};
