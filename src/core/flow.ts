import type { GameServices } from './services';

/**
 * Shared run flow used by several scenes (hub, results, run summary) so they
 * never import each other:  hub → beginRun → exam → results → advanceRun → … → run-summary
 */

/** Start a run of the given mode and send the first patient to the exam room. Returns false if locked/empty. */
export function beginRun(services: GameServices, modeId: string): boolean {
  const mode = services.registries.modes.get(modeId);
  if (!mode) return false;
  if (mode.locked?.(services)) return false;
  services.run.start(mode, `${modeId}:${services.clock.now()}`);
  return advanceRun(services);
}

/**
 * Move to the next patient of the current run, or to the run summary when the
 * run is over. Returns true if a new patient was started.
 */
export function advanceRun(services: GameServices): boolean {
  const mode = services.run.mode();
  if (!mode) {
    services.router.go('hub');
    return false;
  }
  const kase = services.run.next();
  if (!kase) {
    const snapshot = services.run.end();
    services.session.clear();
    services.router.go('run-summary', { modeId: snapshot?.modeId ?? mode.id, snapshot });
    return false;
  }
  services.session.clear();
  services.bus.emit('patient:arriving', { caseId: kase.id, modeId: mode.id });
  services.session.start(kase, mode.id, kase.emergency?.timeLimitSec ?? mode.rules.timeLimitSec);
  services.router.go('exam', { caseId: kase.id, modeId: mode.id });
  return true;
}

/** Play a single specific case outside any run (codex "replay", deep links). */
export function playSingleCase(services: GameServices, caseId: string): boolean {
  const kase = services.registries.cases.get(caseId);
  if (!kase) return false;
  services.session.clear();
  services.session.start(kase, 'single', kase.emergency?.timeLimitSec);
  services.router.go('exam', { caseId: kase.id, modeId: 'single' });
  return true;
}

/** Abandon the current run and return to the hub. */
export function abandonRun(services: GameServices): void {
  services.run.end();
  services.session.clear();
  services.router.go('hub');
}
