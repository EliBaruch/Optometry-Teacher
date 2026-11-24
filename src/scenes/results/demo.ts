import {
  createRng, URGENCIES,
  type ClinicalCase, type Confidence, type GameServices, type Grade, type RewardGrant, type RunSnapshot, type TestId, type Urgency,
} from '@core';
import type { RunLogEntry } from './run-log';

/**
 * Preview helpers for the sandbox (`?sandbox=scene/results&demo=wrong`).
 * Only used when a route carries a `demo` param; real play never does.
 *   demo = correct | wrong | timeout | certain-wrong | guess-right
 *   run=1 also starts a run so "Next patient" is live.
 */
export type DemoKind = 'correct' | 'wrong' | 'timeout' | 'certain-wrong' | 'guess-right';
const KINDS: DemoKind[] = ['correct', 'wrong', 'timeout', 'certain-wrong', 'guess-right'];

export function demoKind(params: Record<string, unknown>): DemoKind | null {
  const d = params.demo;
  if (d === undefined || d === null || d === false) return null;
  return KINDS.includes(d as DemoKind) ? (d as DemoKind) : 'correct';
}

function pickCase(services: GameServices, caseId: unknown): ClinicalCase | undefined {
  const reg = services.registries.cases;
  if (typeof caseId === 'string' && reg.has(caseId)) return reg.get(caseId);
  const all = reg.all();
  return all.find((c) => c.id === 'ant-microbial-keratitis-dj') ?? all.find((c) => c.difficulty >= 3) ?? all[0];
}

const SAMPLE_REWARDS: RewardGrant[] = [
  { source: 'core', label: 'Lumens', value: '+140', icon: 'coin', color: '#f5b942', rarity: 'common' },
  { source: 'core', label: 'Career XP', value: '+260', icon: 'star', color: '#a78bfa', rarity: 'common' },
  { source: 'core', label: 'Iris card', value: 'NEW', icon: 'gem', rarity: 'epic' },
];

/** Plays a whole case through the real session controller so systems react as in play. Returns the case id. */
export function prepareDemo(services: GameServices, params: Record<string, unknown>): string | null {
  const kind = demoKind(params);
  const kase = kind ? pickCase(services, params.caseId) : undefined;
  if (!kind || !kase) return null;
  const s = services.session.state.get();
  if (s && s.caseId === kase.id && (s.submitted || s.failed)) return kase.id;

  const modeId = typeof params.modeId === 'string' ? params.modeId : 'shift';
  if (params.run && !services.run.state.get()) {
    const mode = services.registries.modes.get(modeId);
    if (mode) services.run.start(mode, `${modeId}:demo`);
  }
  services.session.clear();
  services.session.start(kase, modeId);
  const keys = kase.history.filter((h) => h.relevance === 'key');
  keys.slice(0, Math.ceil(keys.length / 2)).forEach((h) => services.session.ask(h.id));
  kase.history.filter((h) => h.relevance === 'red-herring').slice(0, 1).forEach((h) => services.session.ask(h.id));

  const tests: TestId[] = [...kase.essentialTests.slice(0, Math.max(1, kase.essentialTests.length - 1)), ...kase.helpfulTests.slice(0, 1)];
  const extra = (['color-vision', 'amsler', 'keratometry'] as TestId[]).find((t) => !kase.essentialTests.includes(t) && !kase.helpfulTests.includes(t));
  if (extra) tests.push(extra);
  for (const t of tests) {
    const mg = services.registries.minigames.get(t);
    services.session.recordTest({ testId: t, accuracy: 0.82, timeMs: 30000, findings: mg ? safeReport(() => mg.report(kase.findings, kase.patient)) : [] });
  }

  const quiet = !services.registries.systems.all().length;
  if (kind === 'timeout') {
    services.session.fail('timeout');
    return kase.id;
  }
  const wrong = kind === 'wrong' || kind === 'certain-wrong';
  const dx = wrong ? kase.differentials[0] ?? 'healthy-eyes' : kase.diagnosis;
  const ui = URGENCIES.indexOf(kase.urgency);
  const urgency: Urgency = wrong ? URGENCIES[Math.max(0, ui - 1)]! : kase.urgency;
  const confidence: Confidence = kind === 'certain-wrong' || kind === 'correct' ? 'certain' : kind === 'guess-right' ? 'guessing' : 'fairly-sure';
  services.session.submit(dx, urgency, confidence);
  if (quiet) {
    // No engagement systems installed: show what the reward cascade looks like.
    for (const r of SAMPLE_REWARDS.slice(0, wrong ? 1 : 2)) services.bus.emit('reward:granted', r);
    if (!wrong) setTimeout(() => services.bus.emit('reward:granted', SAMPLE_REWARDS[2]!), 5200);
  }
  return kase.id;
}

function safeReport<T>(fn: () => T[]): T[] {
  try {
    return fn();
  } catch {
    return [];
  }
}

const DEMO_GRADES: Grade[] = ['A', 'S', 'D', 'B', 'A'];

/** A fabricated finished run for the run-summary preview (pure; writes nothing). */
export function demoRun(services: GameServices, modeId: string): { snapshot: RunSnapshot; entries: RunLogEntry[] } {
  const rng = createRng('run-summary-demo');
  const cases = rng.shuffle([...services.registries.cases.all()]).slice(0, 5);
  const entries: RunLogEntry[] = cases.map((c, i) => {
    const grade = DEMO_GRADES[i % DEMO_GRADES.length]!;
    const correct = grade !== 'D' && grade !== 'F';
    const total = { S: 1240, A: 1080, B: 900, C: 720, D: 420, F: 120 }[grade];
    return { caseId: c.id, diagnosisId: c.diagnosis, grade, total, points: Math.round(total * (correct ? 1 + i * 0.1 : 1)), correct, timeout: false, confidence: correct ? 'certain' : 'fairly-sure' };
  });
  const snapshot: RunSnapshot = {
    modeId,
    completed: entries.filter((e) => e.correct).map((e) => e.caseId),
    failed: entries.filter((e) => !e.correct).map((e) => e.caseId),
    totalScore: entries.reduce((s, e) => s + e.points, 0),
    lives: null,
    combo: 2,
    seed: `${modeId}:demo`,
  };
  return { snapshot, entries };
}
