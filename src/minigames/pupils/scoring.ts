/** Technique + measurement scoring. Pure. */
import type { Eye, PatientFindings } from '@core';
import type { Cond } from './model';

export const DWELL_FULL_S = 2;
export const DWELL_MIN_S = 1.2;
export const SWINGS_NEEDED = 3;
export const NEAR_MIN_S = 2;

export interface Measure { mm: number; settled: boolean }
export type Measures = Record<Cond, Partial<Record<Eye, Measure>>>;
export interface Swing { from: Eye; to: Eye; dwell: number; transit: number }
export interface Call { side: 'none' | Eye | null; grade: 1 | 2 | 3 | 4 | null }

export interface Tech {
  measures: Measures;
  swings: Swing[];
  nearSeconds: number;
  call: Call;
  timeMs: number;
}

export const emptyMeasures = (): Measures => ({ light: {}, dark: {} });

export const sizeScore = (err: number): number => (err <= 0.3 ? 1 : err >= 1.2 ? 0 : 1 - (err - 0.3) / 0.9);
export const swingScore = (s: Swing): number => {
  const d = s.dwell >= DWELL_FULL_S ? 1 : s.dwell <= DWELL_MIN_S ? 0 : (s.dwell - DWELL_MIN_S) / (DWELL_FULL_S - DWELL_MIN_S);
  return d * (s.transit > 1.6 ? 0.7 : 1);
};
export const goodSwings = (swings: Swing[]): number => swings.filter((s) => s.dwell >= DWELL_FULL_S).length;

export function truthCall(f: PatientFindings): Call {
  return f.pupils.rapd === 'none' ? { side: 'none', grade: null } : { side: f.pupils.rapd, grade: (f.pupils.rapdGrade ?? 2) as 1 | 2 | 3 | 4 };
}

export function callScore(call: Call, f: PatientFindings): number {
  if (call.side === null) return 0;
  const t = truthCall(f);
  if (call.side !== t.side) return 0;
  if (t.side === 'none') return 1;
  if (!call.grade || !t.grade) return 0.7;
  return Math.abs(call.grade - t.grade) === 0 ? 1 : Math.abs(call.grade - t.grade) === 1 ? 0.85 : 0.65;
}

export interface Assessment {
  accuracy: number;
  perfect: boolean;
  parts: { sizes: number; swing: number; near: number; call: number; time: number };
  sizeErrors: { cond: Cond; eye: Eye; mm: number | null; truth: number; err: number | null; settled: boolean }[];
  tasksDone: number;
}

export function assess(f: PatientFindings, t: Tech): Assessment {
  const sizeErrors: Assessment['sizeErrors'] = [];
  let sum = 0;
  for (const cond of ['light', 'dark'] as Cond[]) {
    for (const eye of ['OD', 'OS'] as Eye[]) {
      const m = t.measures[cond][eye];
      const truth = cond === 'light' ? f.pupils.sizeLightMm[eye] : f.pupils.sizeDarkMm[eye];
      const err = m ? Math.abs(m.mm - truth) : null;
      sum += err === null ? 0 : sizeScore(err);
      sizeErrors.push({ cond, eye, mm: m?.mm ?? null, truth, err, settled: m?.settled ?? false });
    }
  }
  const sizes = sum / 4;
  const sw = [...t.swings].sort((a, b) => swingScore(b) - swingScore(a)).slice(0, SWINGS_NEEDED);
  const swing = sw.reduce((a, s) => a + swingScore(s), 0) / SWINGS_NEEDED;
  const near = Math.min(1, t.nearSeconds / NEAR_MIN_S);
  const call = callScore(t.call, f);
  const sec = t.timeMs / 1000;
  const time = sec <= 100 ? 1 : sec >= 260 ? 0 : 1 - (sec - 100) / 160;
  const accuracy = Math.max(0, Math.min(1, sizes * 0.3 + swing * 0.3 + near * 0.1 + call * 0.25 + time * 0.05));
  const tasksDone =
    (Object.keys(t.measures.light).length >= 2 ? 1 : 0) + (Object.keys(t.measures.dark).length >= 2 ? 1 : 0) +
    (goodSwings(t.swings) >= SWINGS_NEEDED ? 1 : 0) + (near >= 1 ? 1 : 0) + (t.call.side !== null ? 1 : 0);
  return {
    accuracy, tasksDone, parts: { sizes, swing, near, call, time }, sizeErrors,
    perfect: accuracy >= 0.93 && call === 1 && goodSwings(t.swings) >= SWINGS_NEEDED && sizes >= 0.9,
  };
}
