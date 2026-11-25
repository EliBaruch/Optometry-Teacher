/**
 * Hebrew content gate: overlays must match the English clinical content exactly by id,
 * be written in Hebrew, and cover every case/diagnosis of a group once that group is started.
 *   npx vitest run tests/content-he.test.ts
 */
import { describe, expect, it } from 'vitest';
import type { CaseText, ClinicalCase, Diagnosis, DiagnosisText } from '../src/core';

type Mod = { default?: unknown };
const items = <T>(glob: Record<string, Mod>) =>
  Object.entries(glob).flatMap(([file, m]) =>
    m.default === undefined ? [] : (Array.isArray(m.default) ? m.default : [m.default]).map((item) => ({ file, item: item as T })),
  );

const cases = items<ClinicalCase>(import.meta.glob(['../src/content/cases/**/*.ts', '!**/*.test.ts'], { eager: true }));
const diagnoses = items<Diagnosis>(import.meta.glob(['../src/content/diagnoses/**/*.ts', '!**/*.test.ts'], { eager: true }));
const caseText = items<CaseText>(import.meta.glob(['../src/content/he/cases/**/*.ts', '!**/*.test.ts'], { eager: true }));
const dxText = items<DiagnosisText>(import.meta.glob(['../src/content/he/diagnoses/**/*.ts', '!**/*.test.ts'], { eager: true }));

const HEBREW = /[֐-׿]/;
const SIN_HE = /(חטא|חטאים|שבעת החטאים|גרגרנות|תאוותנות|חמדנות)/;
const group = (file: string) => file.replace(/^.*\/cases\/([^/]+)\/.*$/, '$1');

describe('Hebrew diagnosis overlays', () => {
  const ids = new Set(diagnoses.map((d) => d.item.id));
  it('match English ids, are Hebrew and complete', () => {
    for (const { file, item: t } of dxText) {
      const w = `${file}:${t.id}`;
      expect(ids.has(t.id), `${w} unknown diagnosis id`).toBe(true);
      expect(t.name, w).toMatch(HEBREW);
      expect(t.summary, w).toMatch(HEBREW);
      expect(t.keyFindings.length, w).toBeGreaterThanOrEqual(2);
      expect(t.pearls.length, w).toBeGreaterThanOrEqual(1);
      expect(JSON.stringify(t), `${w} sin language`).not.toMatch(SIN_HE);
    }
    if (dxText.length) expect(dxText.length, 'every diagnosis needs a Hebrew overlay').toBe(ids.size);
  });
});

describe('Hebrew case overlays', () => {
  const byId = new Map(cases.map((c) => [c.item.id, c]));
  it('match English ids and history keys, and are Hebrew', () => {
    for (const { file, item: t } of caseText) {
      const w = `${file}:${t.id}`;
      const en = byId.get(t.id);
      expect(en, `${w} unknown case id`).toBeDefined();
      if (!en) continue;
      expect(t.chiefComplaint, w).toMatch(HEBREW);
      expect(t.management, w).toMatch(HEBREW);
      expect(t.teachingPoints.length, `${w} teaching points`).toBe(en.item.teachingPoints.length);
      const keys = Object.keys(t.history).sort();
      expect(keys, `${w} history ids must match the English case`).toEqual(en.item.history.map((h) => h.id).sort());
      for (const [id, h] of Object.entries(t.history)) {
        expect(h.q, `${w} q ${id}`).toMatch(HEBREW);
        expect(h.a, `${w} a ${id}`).toMatch(HEBREW);
      }
      if (en.item.redFlags?.length) expect(t.redFlags?.length, `${w} red flags`).toBe(en.item.redFlags.length);
      expect(JSON.stringify(t), `${w} sin language`).not.toMatch(SIN_HE);
    }
  });
  it('cover every case of each started group', () => {
    const started = new Set(caseText.map((c) => byId.get(c.item.id)).filter(Boolean).map((c) => group(c!.file)));
    for (const g of started) {
      const need = cases.filter((c) => group(c.file) === g).map((c) => c.item.id).sort();
      const have = caseText.map((c) => c.item.id).filter((id) => need.includes(id)).sort();
      expect(have, `group ${g} must be fully covered`).toEqual(need);
    }
  });
});
