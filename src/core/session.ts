import type { ClinicalCase, DiagnosisId, Urgency } from './case';
import type { EventBus } from './events';
import type { MiniGameResult, RevealedFinding, TestId } from './minigame';
import type { ModeModule, RunSnapshot } from './mode';
import type { Registry } from './registry';
import { scoreCase, type ScoreBreakdown } from './scoring';
import { signal, type ReadSignal } from './signal';
import { TEST_CATALOG } from './tests';

/** Live state of the case currently on the exam chair. */
export interface CaseSession {
  caseId: string;
  modeId: string;
  startedAt: number;
  askedQuestions: string[];
  testsDone: Partial<Record<TestId, MiniGameResult>>;
  chart: RevealedFinding[];
  hintsUsed: number;
  /** In-game clinic minutes consumed */
  clinicMinutes: number;
  timeLimitSec?: number;
  submitted?: { diagnosisId: DiagnosisId; urgency: Urgency; score: ScoreBreakdown };
}

export interface CaseSessionController {
  state: ReadSignal<CaseSession | null>;
  start(kase: ClinicalCase, modeId: string, timeLimitSec?: number): void;
  ask(questionId: string): void;
  recordTest(result: MiniGameResult): void;
  useHint(): void;
  submit(diagnosisId: DiagnosisId, urgency: Urgency): ScoreBreakdown;
  fail(reason: 'timeout' | 'abandoned'): void;
  elapsedSec(): number;
  clear(): void;
}

export function createCaseSession(
  bus: EventBus,
  cases: Registry<ClinicalCase>,
  now: () => number,
): CaseSessionController {
  const state = signal<CaseSession | null>(null);
  const need = () => {
    const s = state.get();
    if (!s) throw new Error('No active case');
    return s;
  };
  const ctl: CaseSessionController = {
    state,
    start(kase, modeId, timeLimitSec) {
      const limit = timeLimitSec ?? kase.emergency?.timeLimitSec;
      state.set({
        caseId: kase.id, modeId, startedAt: now(), askedQuestions: [], testsDone: {}, chart: [],
        hintsUsed: 0, clinicMinutes: 0, timeLimitSec: limit,
      });
      bus.emit('case:started', { caseId: kase.id, modeId, emergency: !!limit, timeLimitSec: limit });
    },
    ask(questionId) {
      const s = need();
      if (s.askedQuestions.includes(questionId)) return;
      const kase = cases.require(s.caseId);
      const q = kase.history.find((h) => h.id === questionId);
      state.set({ ...s, askedQuestions: [...s.askedQuestions, questionId], clinicMinutes: s.clinicMinutes + 1 });
      if (q) bus.emit('history:asked', { caseId: s.caseId, questionId, relevance: q.relevance });
    },
    recordTest(result) {
      const s = need();
      const chart = [...s.chart.filter((f) => !result.findings.some((n) => n.label === f.label && n.eye === f.eye)), ...result.findings];
      state.set({
        ...s,
        testsDone: { ...s.testsDone, [result.testId]: result },
        chart,
        clinicMinutes: s.clinicMinutes + (TEST_CATALOG[result.testId]?.minutes ?? 2),
      });
      bus.emit('test:completed', { caseId: s.caseId, result });
    },
    useHint() {
      const s = need();
      state.set({ ...s, hintsUsed: s.hintsUsed + 1 });
    },
    submit(diagnosisId, urgency) {
      const s = need();
      const kase = cases.require(s.caseId);
      const score = scoreCase({
        kase, diagnosisId, urgency, testsDone: s.testsDone, askedQuestions: s.askedQuestions,
        elapsedSec: ctl.elapsedSec(), hintsUsed: s.hintsUsed,
      });
      state.set({ ...s, submitted: { diagnosisId, urgency, score } });
      bus.emit('diagnosis:submitted', {
        caseId: s.caseId, diagnosisId, correct: score.diagnosisCorrect, urgency, urgencyCorrect: score.urgencyCorrect,
      });
      bus.emit('case:completed', { caseId: s.caseId, modeId: s.modeId, score });
      return score;
    },
    fail(reason) {
      const s = need();
      bus.emit('case:failed', { caseId: s.caseId, modeId: s.modeId, reason });
    },
    elapsedSec() {
      const s = state.get();
      return s ? Math.max(0, (now() - s.startedAt) / 1000) : 0;
    },
    clear() {
      state.set(null);
    },
  };
  return ctl;
}

/** Controls a multi-patient run (a clinic shift, rush mode, code red, ...). */
export interface RunController {
  state: ReadSignal<RunSnapshot | null>;
  start(mode: ModeModule, seed: string): void;
  /** Next case for the current run, or null if the run is over */
  next(): ClinicalCase | null;
  /** Report a finished case; returns updated snapshot */
  report(caseId: string, score: ScoreBreakdown | null): RunSnapshot;
  end(): RunSnapshot | null;
  mode(): ModeModule | null;
}

export function createRunController(bus: EventBus, getServices: () => import('./services').GameServices): RunController {
  const state = signal<RunSnapshot | null>(null);
  let mode: ModeModule | null = null;
  const ctl: RunController = {
    state,
    start(m, seed) {
      mode = m;
      state.set({ modeId: m.id, completed: [], failed: [], totalScore: 0, lives: m.rules.lives ?? null, combo: 0, seed });
      bus.emit('mode:started', { modeId: m.id });
    },
    next() {
      const s = state.get();
      if (!s || !mode) return null;
      if (s.lives !== null && s.lives <= 0) return null;
      const len = mode.rules.length;
      if (len !== 'endless' && s.completed.length + s.failed.length >= len) return null;
      return mode.pickNext(getServices(), s);
    },
    report(caseId, score) {
      const s = state.get();
      if (!s) throw new Error('No active run');
      const ok = !!score?.diagnosisCorrect;
      const mult = mode?.rules.scoreMultiplier ?? 1;
      const next: RunSnapshot = {
        ...s,
        completed: ok ? [...s.completed, caseId] : s.completed,
        failed: ok ? s.failed : [...s.failed, caseId],
        totalScore: s.totalScore + Math.round((score?.total ?? 0) * mult),
        lives: s.lives === null ? null : ok ? s.lives : s.lives - 1,
        combo: ok ? s.combo + 1 : 0,
      };
      state.set(next);
      return next;
    },
    end() {
      const s = state.get();
      if (s) bus.emit('mode:ended', { modeId: s.modeId, casesCompleted: s.completed.length, totalScore: s.totalScore });
      state.set(null);
      mode = null;
      return s;
    },
    mode: () => mode,
  };
  return ctl;
}
