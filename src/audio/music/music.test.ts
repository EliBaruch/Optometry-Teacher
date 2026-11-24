import { describe, expect, it } from 'vitest';
import { createRng, type TrackId } from '@core';
import { inScale } from '../theory';
import { Conductor } from './conductor';
import { COMPOSITIONS } from './tracks';
import { STEPS_PER_BAR, type NoteEvent } from './types';

const UNPITCHED = new Set(['kick', 'heart', 'hat', 'snap', 'brush', 'crackle', 'riser']);

function render(id: TrackId, bars: number, seed = 7) {
  const comp = COMPOSITIONS[id];
  const c = new Conductor(comp.harmony, createRng(seed));
  const notes: (NoteEvent & { step: number })[] = [];
  const chords: number[] = [];
  for (let step = 0; step < bars * STEPS_PER_BAR; step++) {
    const info = c.info(step);
    if (info.stepInBar === 0) chords.push(info.chordDeg);
    for (const e of comp.step(info)) if (e.kind === 'note') notes.push({ ...e, step });
  }
  return { comp, notes, chords };
}

describe('Conductor', () => {
  it('changes chords on bar boundaries and follows a progression', () => {
    const h = { scale: [0, 2, 4, 5, 7, 9, 11], root: 62, progressions: [[0, 3, 4, 0]], barsPerChord: 2, chordSize: 3 };
    const c = new Conductor(h, createRng(1));
    const degs: number[] = [];
    for (let s = 0; s < 16 * STEPS_PER_BAR; s += STEPS_PER_BAR) degs.push(c.info(s).chordDeg);
    expect(degs).toEqual([0, 0, 3, 3, 4, 4, 0, 0, 0, 0, 3, 3, 4, 4, 0, 0]);
    expect(c.info(0 + 16 * STEPS_PER_BAR).phraseStart).toBe(true);
  });

  it('never repeats the same progression twice in a row', () => {
    const comp = COMPOSITIONS.title;
    const c = new Conductor(comp.harmony, createRng(3));
    const phrases: string[] = [];
    let cur: number[] = [];
    for (let bar = 0; bar < 8 * 40; bar++) {
      const info = c.info(bar * STEPS_PER_BAR);
      if (info.phraseStart && cur.length) { phrases.push(cur.join()); cur = []; }
      if (info.chordStart) cur.push(info.chordDeg);
    }
    expect(phrases.length).toBeGreaterThan(10);
    expect(new Set(phrases).size).toBeGreaterThan(2);
  });

  it('is deterministic for a seed', () => {
    expect(render('hub', 16, 5).notes).toEqual(render('hub', 16, 5).notes);
    expect(render('hub', 16, 5).notes).not.toEqual(render('hub', 16, 6).notes);
  });
});

describe('compositions', () => {
  const ids = Object.keys(COMPOSITIONS) as TrackId[];

  it.each(ids)('%s: pitched notes stay in key and in a sane register', (id) => {
    const { comp, notes } = render(id, 64);
    const pitched = notes.filter((n) => !UNPITCHED.has(n.inst));
    expect(pitched.length).toBeGreaterThan(20);
    for (const n of pitched) {
      expect(inScale(n.midi, comp.harmony.scale, comp.harmony.root)).toBe(true);
      expect(n.midi).toBeGreaterThanOrEqual(24);
      expect(n.midi).toBeLessThanOrEqual(112);
      expect(n.len).toBeGreaterThan(0);
      expect(n.vel).toBeGreaterThan(0);
      expect(n.vel).toBeLessThanOrEqual(1);
    }
  });

  it.each(ids)('%s: note density stays CPU-friendly', (id) => {
    const bars = 32;
    const { notes } = render(id, bars);
    const perBar = notes.length / bars;
    expect(perBar).toBeLessThan(40);
    // No step ever spawns an absurd pile of voices.
    const perStep = new Map<number, number>();
    for (const n of notes) perStep.set(n.step, (perStep.get(n.step) ?? 0) + 1);
    expect(Math.max(...perStep.values())).toBeLessThanOrEqual(14);
  });

  it('every track is distinct in tempo or mode', () => {
    const sig = ids.map((id) => `${COMPOSITIONS[id].bpm}/${COMPOSITIONS[id].harmony.scale.join()}`);
    expect(new Set(sig).size).toBe(ids.length);
  });

  it('emergency sweeps its filter upward each phrase and keeps a heartbeat on every beat', () => {
    const comp = COMPOSITIONS.emergency;
    const c = new Conductor(comp.harmony, createRng(1));
    const filters: number[] = [];
    let hearts = 0;
    for (let step = 0; step < 8 * STEPS_PER_BAR; step++) {
      for (const e of comp.step(c.info(step))) {
        if (e.kind === 'filter') filters.push(e.hz);
        else if (e.inst === 'heart') hearts++;
      }
    }
    expect(filters[0]).toBeLessThan(filters[1]!);
    expect(hearts).toBe(8 * 4);
  });
});
