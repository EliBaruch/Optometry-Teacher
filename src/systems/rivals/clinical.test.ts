/**
 * Clinical and balance checks over the real case registry: every colleague on every case.
 * (Content is loaded with import.meta.glob so the system itself never depends on it; if the
 * content folders are removed these tests simply have nothing to check.)
 */
import { describe, expect, it } from 'vitest';
import { scoreCase, type ClinicalCase, type Diagnosis, type Grade, type MiniGameResult, type TestId } from '@core';
import { CONTRASTS, DECISIVE, contrastsFor, separatingLesson, skipLesson, testNameInline, urgencyLesson } from './clinical';
import { ROSTER, type RivalId } from './roster';
import { simulateRival, type RivalCaseResult } from './sim';

const caseMods = import.meta.glob<{ default: ClinicalCase | ClinicalCase[] }>(['../../content/cases/**/*.ts', '!**/*.test.ts'], { eager: true });
const dxMods = import.meta.glob<{ default: Diagnosis | Diagnosis[] }>(['../../content/diagnoses/**/*.ts', '!**/*.test.ts'], { eager: true });
const flat = <T,>(mods: Record<string, { default: T | T[] }>) =>
  Object.entries(mods).filter(([f]) => !f.includes('.test.')).flatMap(([, m]) => (Array.isArray(m.default) ? m.default : [m.default]));
const CASES = flat(caseMods);
const DX = new Map(flat(dxMods).map((d) => [d.id, d]));
const ctx = { diagnosisName: (id: string) => DX.get(id)?.name ?? id, diagnosis: (id: string) => DX.get(id) };

const BANNED = /\b(sins?|deadly|vices?|pride|greed|envy|envious|gluttony|lust|wrath|sloth)\b/i;
const all: { kase: ClinicalCase; rival: RivalId; r: RivalCaseResult }[] = CASES.flatMap((kase) =>
  ROSTER.map((rv) => ({ kase, rival: rv.id, r: simulateRival(rv, kase, ctx) })),
);

describe.skipIf(CASES.length === 0)('colleagues on the real case registry', () => {
  it('every wrong diagnosis carries a lesson that names the mimic and the real diagnosis', () => {
    const wrong = all.filter((x) => !x.r.diagnosisCorrect);
    expect(wrong.length).toBeGreaterThan(0);
    for (const { kase, r } of wrong) {
      expect(r.chosenDiagnosisId).not.toBe(kase.diagnosis);
      expect(kase.differentials).toContain(r.chosenDiagnosisId);
      expect(r.slip, `${r.rivalId} on ${kase.id}`).toBeDefined();
      expect(r.slip!.text).toContain(ctx.diagnosisName(r.chosenDiagnosisId));
      expect(r.slip!.text).toContain(ctx.diagnosisName(kase.diagnosis));
      expect(r.slip!.lesson.length).toBeGreaterThan(30);
    }
  });

  it('a skipped test is only blamed for a miss when it is the curated discriminator for that pair', () => {
    for (const { kase, r } of all) {
      if (!r.slip?.text.startsWith('Skipped') || !r.slip.text.includes('missed the')) continue;
      const c = contrastsFor(kase).find((x) => x.mimic === r.chosenDiagnosisId);
      expect(c?.skip, `${r.rivalId} on ${kase.id}: ${r.slip.text}`).toBe(true);
      expect(r.tests).not.toContain(c!.test);
    }
  });

  it('nobody calls a mimic that a test they actually ran rules out', () => {
    for (const { kase, r } of all) {
      if (r.diagnosisCorrect) continue;
      const c = contrastsFor(kase).find((x) => x.mimic === r.chosenDiagnosisId);
      if (c?.skip) expect(r.tests, `${r.rivalId} on ${kase.id}`).not.toContain(c.test);
    }
  });

  it('a correct diagnosis always rests on the tests that define it', () => {
    for (const { kase, r } of all) {
      if (!r.diagnosisCorrect) continue;
      const defining = (DECISIVE[kase.diagnosis] ?? kase.essentialTests).filter((t) => kase.essentialTests.includes(t));
      for (const t of defining) expect(r.tests, `${r.rivalId} on ${kase.id} without ${t}`).toContain(t);
    }
  });

  it('curated contrasts point at real diagnoses and real tests', () => {
    for (const [dx, list] of Object.entries(CONTRASTS)) {
      expect(DX.has(dx), dx).toBe(true);
      for (const c of list) {
        expect(DX.has(c.mimic), `${dx} vs ${c.mimic}`).toBe(true);
        expect(c.mimic).not.toBe(dx);
        expect(testNameInline(c.test).length).toBeGreaterThan(2);
      }
    }
    // Every registered case has at least one curated contrast for its listed differentials.
    for (const kase of CASES) expect(contrastsFor(kase).length, kase.id).toBeGreaterThan(0);
  });

  it('grades fit each personality and a solid player is not routinely out-classed', () => {
    const dist = (id: RivalId) => {
      const d: Record<Grade, number> = { S: 0, A: 0, B: 0, C: 0, D: 0, F: 0 };
      for (const x of all) if (x.rival === id) d[x.r.grade]++;
      return d;
    };
    const n = CASES.length;
    const share = (d: Record<Grade, number>, ...gs: Grade[]) => gs.reduce((s, g) => s + d[g], 0) / n;
    const vex = dist('vex');
    const okafor = dist('okafor');
    const mori = dist('mori');
    const reyes = dist('reyes');
    const lind = dist('lindqvist');
    // Dr. Vex: brilliant, mostly A/S, but his shortcuts sometimes cost him the diagnosis.
    expect(share(vex, 'S', 'A')).toBeGreaterThanOrEqual(0.75);
    expect(share(vex, 'S')).toBeGreaterThanOrEqual(0.3);
    expect(share(vex, 'D', 'F')).toBeGreaterThan(0);
    // Dr. Okafor: meticulous and slow, A/B, rarely S.
    expect(share(okafor, 'A', 'B')).toBeGreaterThanOrEqual(0.85);
    expect(share(okafor, 'B')).toBeGreaterThanOrEqual(0.15);
    expect(share(okafor, 'S')).toBeLessThanOrEqual(0.15);
    // Dr. Mori and Dr. Reyes: A/B with a real B share.
    for (const d of [mori, reyes]) {
      expect(share(d, 'A', 'B')).toBeGreaterThanOrEqual(0.75);
      expect(share(d, 'B')).toBeGreaterThanOrEqual(0.15);
      expect(share(d, 'S')).toBeLessThanOrEqual(0.15);
    }
    // Dr. Lindqvist, first-year resident: mostly B/C when right, never S, often wrong.
    const lindRight = n - lind.D - lind.F;
    expect((lind.B + lind.C) / lindRight).toBeGreaterThanOrEqual(0.6);
    expect(lind.S).toBe(0);
    expect(share(lind, 'D', 'F')).toBeGreaterThanOrEqual(0.15);
    expect(share(lind, 'D', 'F')).toBeLessThanOrEqual(0.45);

    // A solid player: every essential test at 0.75 technique, half the key questions, four minutes.
    let beatenBy = 0;
    for (const kase of CASES) {
      const testsDone: Partial<Record<TestId, MiniGameResult>> = {};
      for (const t of kase.essentialTests) testsDone[t] = { testId: t, accuracy: 0.75, timeMs: 0, findings: [] };
      const keys = kase.history.filter((h) => h.relevance === 'key').map((h) => h.id);
      const solid = scoreCase({ kase, diagnosisId: kase.diagnosis, urgency: kase.urgency, testsDone, askedQuestions: keys.slice(0, Math.ceil(keys.length / 2)), elapsedSec: 240, hintsUsed: 0 });
      beatenBy += all.filter((x) => x.kase === kase && x.r.total > solid.total).length;
    }
    const avg = beatenBy / n;
    expect(avg).toBeGreaterThanOrEqual(1);
    expect(avg).toBeLessThanOrEqual(2.5);
  });

  it('lessons and slip lines read cleanly and stay clinic-themed', () => {
    for (const { kase, r } of all) {
      if (!r.slip) continue;
      const text = `${r.slip.text} ${r.slip.lesson}`;
      expect(text).not.toMatch(BANNED);
      expect(text).not.toMatch(/\{iop\}|undefined|NaN|\bamsler\b/);
      expect(text, kase.id).not.toMatch(/called it (.+) and missed the \1/);
    }
  });

  it('builds case-specific lessons from real findings', () => {
    const aac = CASES.find((k) => k.diagnosis === 'acute-angle-closure');
    if (aac) {
      const c = contrastsFor(aac).find((x) => x.mimic === 'anterior-uveitis');
      expect(c?.finding).toMatch(/\d+ mmHg/);
    }
    const crao = CASES.find((k) => k.diagnosis === 'crao');
    if (crao) {
      expect(skipLesson(crao, 'pupils')).toMatch(/RAPD/);
      expect(skipLesson(crao, 'visual-acuity')).toMatch(/best-corrected|baseline/);
      expect(urgencyLesson(crao, 'CRAO', 'immediate emergency care')).toMatch(/stroke/i);
    }
    const brvo = CASES.find((k) => k.diagnosis === 'brvo');
    if (brvo) expect(separatingLesson(brvo, 'crvo', ctx).finding).toMatch(/four quadrants/);
  });
});
