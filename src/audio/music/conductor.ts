import type { Rng } from '@core';
import { chordMidi, degreeToMidi } from '../theory';
import { STEPS_PER_BAR, STEPS_PER_BEAT, type Harmony, type StepInfo } from './types';

/**
 * Walks the harmony forward one 16th at a time. Each phrase picks a fresh
 * progression (never the same one twice in a row), so the music never loops
 * audibly while staying anchored in the track's key.
 */
export class Conductor {
  private prog: readonly number[] = [];
  private progIndex = -1;
  private phraseStartBar = 0;
  private mem: Record<string, number> = {};

  constructor(private h: Harmony, private rng: Rng) {}

  info(step: number): StepInfo {
    const bar = Math.floor(step / STEPS_PER_BAR);
    const stepInBar = step - bar * STEPS_PER_BAR;
    const phraseLen = Math.max(1, this.prog.length * this.h.barsPerChord);
    let phraseStart = false;
    if (this.progIndex < 0 || bar - this.phraseStartBar >= phraseLen) {
      if (stepInBar === 0 || this.progIndex < 0) {
        this.choose();
        this.phraseStartBar = bar;
        phraseStart = stepInBar === 0;
      }
    }
    const phraseBar = bar - this.phraseStartBar;
    const chordIdx = Math.min(this.prog.length - 1, Math.floor(phraseBar / this.h.barsPerChord));
    const chordDeg = this.prog[chordIdx] ?? 0;
    const chordStart = stepInBar === 0 && phraseBar % this.h.barsPerChord === 0;
    const { scale, root } = this.h;
    return {
      step, bar, stepInBar,
      beat: Math.floor(stepInBar / STEPS_PER_BEAT),
      sub: stepInBar % STEPS_PER_BEAT,
      phraseBar, phraseStart, chordStart, chordDeg,
      chord: chordMidi(scale, chordDeg, this.h.chordSize, root),
      deg: (d) => degreeToMidi(scale, d, root),
      rng: this.rng,
      mem: this.mem,
    };
  }

  private choose() {
    const all = this.h.progressions;
    let i = Math.floor(this.rng.next() * all.length);
    if (all.length > 1 && i === this.progIndex) i = (i + 1 + Math.floor(this.rng.next() * (all.length - 1))) % all.length;
    this.progIndex = i;
    this.prog = all[i] ?? [0];
  }
}
