import { SCALES, KEY_ROOT } from '../../theory';
import { note, BEATS_PER_BAR, type Composition, type MusicEvent } from '../types';
import { chordEvents, humanVel } from './util';

const BARS_PER_CHORD = 2;
const CHORDS = 4;
const PHRASE_BARS = BARS_PER_CHORD * CHORDS;

/**
 * Emergency: tension. D phrygian (the flat 2nd, Eb, is the dread), a beating
 * low drone, a 104 bpm heartbeat, and a filter that rises across every phrase.
 */
export const emergency: Composition = {
  id: 'emergency',
  bpm: 104,
  level: 0.85,
  verb: 0.25,
  echo: 0.1,
  filterHz: 380,
  harmony: {
    scale: SCALES.phrygian,
    root: KEY_ROOT,
    progressions: [[0, 1, 0, 6], [0, 0, 1, 6], [0, 6, 5, 1]],
    barsPerChord: BARS_PER_CHORD,
    chordSize: 3,
  },
  step(s) {
    const ev: MusicEvent[] = [];
    if (s.phraseStart) {
      ev.push({ kind: 'filter', hz: 380, glide: 0 });
      ev.push({ kind: 'filter', hz: 4800, glide: PHRASE_BARS * BEATS_PER_BAR - 0.5 });
      ev.push(note('kick', 0, 1, 0.9));
      ev.push(note('sub', KEY_ROOT - 24, 3, 0.8));
    }
    if (s.stepInBar === 0 && s.bar % 4 === 0) {
      ev.push(note('drone', KEY_ROOT - 24, 16.5, 0.85, { filtered: true, pan: -0.2 }));
      ev.push(note('drone', KEY_ROOT - 17, 16.5, 0.6, { filtered: true, pan: 0.2 }));
    }
    if (s.chordStart) ev.push(...chordEvents(s, 'pad', 50, 8.5, 0.55, { filtered: true }));
    if (s.sub === 0) ev.push(note('heart', 0, 1, humanVel(s, s.beat === 0 ? 0.85 : 0.65, 0.1)));
    // Ostinato enters after two bars: root, root, upper neighbour (Eb over D), root.
    if (s.phraseBar >= 2) {
      const root = s.chord[0]! - 12;
      const pattern = [root, root, s.deg(s.chordDeg + 1) - 12, root];
      const accents = [0.5, 0.22, 0.38, 0.25];
      ev.push(note('pluck', pattern[s.sub]!, 0.25, humanVel(s, accents[s.sub]!, 0.1), { filtered: true }));
    }
    if (s.phraseBar >= 4) ev.push(note('hat', 0, 1, humanVel(s, s.sub % 2 ? 0.1 : 0.18, 0.3), { pan: 0.3 }));
    if (s.phraseBar === PHRASE_BARS - 1 && s.stepInBar === 0) ev.push(note('riser', 0, BEATS_PER_BAR, 0.8));
    return ev;
  },
};
