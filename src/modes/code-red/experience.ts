import type { EventBus, GameServices } from '@core';

/** Persisted in save slot 'mode:code-red'. */
export interface CodeRedSave {
  /** Cases completed in any mode since this tracker first saw the bus. */
  casesCompleted: number;
}

export const CODE_RED_SLOT = 'mode:code-red';
const tracked = new WeakSet<EventBus>();

function slot(services: GameServices) {
  return services.save.slot<CodeRedSave>(CODE_RED_SLOT, { casesCompleted: 0 }, { version: 1 });
}

/** Lazily count completed cases (modes have no install hook). Idempotent per bus. */
export function ensureTracking(services: GameServices): void {
  if (tracked.has(services.bus)) return;
  tracked.add(services.bus);
  const s = slot(services);
  services.bus.on('case:completed', () => s.update((v) => ({ casesCompleted: v.casesCompleted + 1 })));
}

/** Cases completed: own counter, floored by distinct diagnoses the learning port has seen. */
export function casesCompleted(services: GameServices): number {
  ensureTracking(services);
  return Math.max(slot(services).get().casesCompleted, services.learning.stats().seen);
}
