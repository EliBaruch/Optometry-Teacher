import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { ARCHETYPE_KEYS, practiceScenario } from './practice';
import { localise, patternOf } from './interpret';

describe('practice scenarios', () => {
  it('every archetype builds a coherent scenario', () => {
    for (const key of ARCHETYPE_KEYS) {
      const s = practiceScenario(createRng(key), 0.5, key);
      expect(s.patient.name).toMatch(/\w+ \w+/);
      expect(s.answer).toContain('OD:');
      expect(s.answer).not.toMatch(/\bsins?\b|deadly|vice/i);
    }
  });
  it('pituitary is chiasmal and stroke is retrochiasmal', () => {
    const p = practiceScenario(createRng(1), 0.2, 'pituitary').findings.fields;
    expect(localise(patternOf(p.OD, 'OD'), patternOf(p.OS, 'OS'))).toBe('chiasm');
    const s = practiceScenario(createRng(2), 0.2, 'stroke').findings.fields;
    expect(localise(patternOf(s.OD, 'OD'), patternOf(s.OS, 'OS'))).toMatch(/^retro-/);
  });
  it('optic neuritis has an RAPD in the scotoma eye', () => {
    const s = practiceScenario(createRng(9), 0.5, 'optic-neuritis');
    const eye = s.findings.fields.OD === 'central-scotoma' ? 'OD' : 'OS';
    expect(s.findings.fields[eye]).toBe('central-scotoma');
    expect(s.findings.pupils.rapd).toBe(eye);
  });
  it('mixes normal and pathological across seeds, with variety', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 80; i++) {
      const f = practiceScenario(createRng(i * 31 + 5), i / 80).findings.fields;
      seen.add(`${f.OD}|${f.OS}`);
    }
    expect(seen.has('full|full')).toBe(true);
    expect(seen.size).toBeGreaterThan(10);
  });
});
