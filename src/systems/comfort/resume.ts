import { advanceRun, beginRun, dayKey, modeText, pickStrings, type GameServices, type ModeModule } from '@core';
import { S } from './strings';

/** What the one-tap "Continue" button will do. */
export type ResumePlan =
  | { kind: 'exam'; modeId: string; caseId: string; title: string; detail: string; accent: string }
  | { kind: 'next'; modeId: string; title: string; detail: string; accent: string }
  | { kind: 'mode'; modeId: string; title: string; detail: string; accent: string };

const FALLBACK_ACCENT = '#38bdf8';

function lockReason(services: GameServices, m: ModeModule | undefined): string | undefined {
  if (!m) return 'missing';
  try {
    return m.locked?.(services);
  } catch {
    return 'error';
  }
}

/**
 * The most suitable thing to do right now:
 *  1. back to the patient on the chair (a run is in progress),
 *  2. the next patient of the current run,
 *  3. Daily Rounds when not done today,
 *  4. a Clinic Shift,
 *  5. otherwise the first open mode.
 */
export function planResume(services: GameServices, dailyDoneDay: string | null): ResumePlan | null {
  const t = pickStrings(S, services.locale);
  const mt = (m: ModeModule) => modeText(m, services.locale);
  const run = services.run.state.get();
  const runMode = services.run.mode();
  if (run && runMode) {
    const s = services.session.state.get();
    const accent = runMode.accent || FALLBACK_ACCENT;
    if (s && !s.submitted && !s.failed) {
      return { kind: 'exam', modeId: runMode.id, caseId: s.caseId, title: t.backToPatient, detail: mt(runMode).title, accent };
    }
    const seen = run.completed.length + run.failed.length;
    return { kind: 'next', modeId: runMode.id, title: t.nextPatient, detail: t.seenSuffix(mt(runMode).title, seen), accent };
  }
  const modes = services.registries.modes;
  const daily = modes.get('daily');
  const today = dayKey(services.clock.now());
  if (daily && !lockReason(services, daily) && dailyDoneDay !== today) {
    return { kind: 'mode', modeId: 'daily', title: mt(daily).title, detail: t.dailyWaiting, accent: daily.accent || FALLBACK_ACCENT };
  }
  const shift = modes.get('shift');
  if (shift && !lockReason(services, shift)) {
    return { kind: 'mode', modeId: 'shift', title: mt(shift).title, detail: t.shiftReady, accent: shift.accent || FALLBACK_ACCENT };
  }
  const open = modes
    .all()
    .filter((m) => !lockReason(services, m))
    .sort((a, b) => a.order - b.order)[0];
  return open ? { kind: 'mode', modeId: open.id, title: mt(open).title, detail: mt(open).tagline, accent: open.accent || FALLBACK_ACCENT } : null;
}

/** Execute a plan. Returns false when nothing could be started. */
export function runPlan(services: GameServices, plan: ResumePlan): boolean {
  if (plan.kind === 'exam') {
    services.router.go('exam', { caseId: plan.caseId, modeId: plan.modeId });
    return true;
  }
  if (plan.kind === 'next') return advanceRun(services);
  return beginRun(services, plan.modeId);
}
