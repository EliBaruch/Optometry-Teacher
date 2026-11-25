import { describe, expect, it } from 'vitest';
import { buildFindings, createRng, EYES } from '@core';
import { classOf, normalizeAmsler } from './geometry';
import { buildChallenge, challengeEye, patientSays, plainWhere, practiceScenario } from './practice';
import { locationOf } from './report';

describe('practiceScenario', () => {
  it('produces coherent, on-grid findings across many seeds and difficulties', () => {
    const kinds = new Set<string>();
    for (let s = 0; s < 120; s++) {
      const d = (s % 5) / 4;
      const sc = practiceScenario(createRng(`amsler-${s}`), d);
      expect(sc.patient.age).toBeGreaterThanOrEqual(18);
      expect(sc.answer.length).toBeGreaterThan(20);
      expect(sc.answer).toMatch(/OD: .* · OS: /);
      for (const e of EYES) {
        const f = sc.findings.amsler[e];
        kinds.add(classOf(f));
        if (f.result === 'normal') continue;
        const n = normalizeAmsler(f);
        expect(Math.abs(n.center.x)).toBeLessThanOrEqual(10);
        expect(Math.abs(n.center.y)).toBeLessThanOrEqual(10);
        expect(n.radius).toBeGreaterThan(0.4);
        // the defect must actually sit on the 20° grid
        expect(Math.abs(n.center.x) - n.radius).toBeLessThan(10);
        expect(Math.abs(n.center.y) - n.radius).toBeLessThan(10);
      }
    }
    expect(kinds).toEqual(new Set(['normal', 'metamorphopsia', 'scotoma']));
  });

  it('is deterministic for a given seed', () => {
    const a = practiceScenario(createRng('same'), 0.4);
    const b = practiceScenario(createRng('same'), 0.4);
    expect(a.findings.amsler).toEqual(b.findings.amsler);
    expect(a.answer).toBe(b.answer);
  });
});

describe('buildChallenge', () => {
  it('asks about the abnormal eye and has exactly one correct, unique option', () => {
    const f = buildFindings(72, { amsler: { OS: { result: 'paracentral-scotoma', center: { x: -4, y: 3 }, radius: 1.5 } } });
    expect(challengeEye(f)).toBe('OS');
    for (let s = 0; s < 20; s++) {
      const c = buildChallenge(f, createRng(s));
      expect(c.eye).toBe('OS');
      expect(c.options.filter((o) => o.correct)).toHaveLength(1);
      expect(new Set(c.options.map((o) => o.label)).size).toBe(c.options.length);
      expect(c.options.length).toBeGreaterThanOrEqual(3);
      // patient's left on the card is the temporal field of the left eye
      expect(c.options.find((o) => o.correct)!.label).toBe('Missing patch — superotemporal');
      // the classic mirror error is offered as a distractor
      expect(c.options.some((o) => o.label === 'Missing patch — superonasal')).toBe(true);
    }
  });

  it('handles a normal exam', () => {
    const c = buildChallenge(buildFindings(50), createRng(1));
    expect(c.eye).toBe('OD');
    expect(c.options.find((o) => o.correct)!.label).toMatch(/^Normal/);
  });
});

describe('patientSays', () => {
  it('describes each perception in plain words', () => {
    expect(patientSays({ result: 'normal' })).toMatch(/straight/);
    expect(patientSays({ result: 'metamorphopsia', center: { x: 0, y: 0 }, radius: 3 })).toMatch(/wavy/);
    expect(patientSays({ result: 'central-scotoma', center: { x: 0, y: 0 }, radius: 1 })).toMatch(/can’t actually see the dot/);
    expect(patientSays({ result: 'paracentral-scotoma', center: { x: 3, y: 0 }, radius: 1.5 })).toMatch(/right of the dot/);
    expect(patientSays({ result: 'central-scotoma', center: { x: 0, y: 0 }, radius: 10 })).toMatch(/dark/);
  });
});

describe('patient words agree with the chart', () => {
  it('never says "above" when the chart says purely temporal/nasal (and vice versa)', () => {
    for (let x = -9; x <= 9; x += 0.5) {
      for (let y = -9; y <= 9; y += 0.5) {
        const f = { result: 'paracentral-scotoma' as const, center: { x, y }, radius: 1.5 };
        const loc = locationOf(f, 'OD');
        const said = plainWhere(f);
        expect(/supero|superior/.test(loc), `${x},${y}`).toBe(said.includes('above'));
        expect(/infero|inferior/.test(loc), `${x},${y}`).toBe(said.includes('below'));
        expect(/temporal/.test(loc), `${x},${y}`).toBe(said.includes('to the right'));
        expect(loc === 'central').toBe(said === 'right around the dot');
      }
    }
  });
});
