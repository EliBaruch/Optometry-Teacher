import type { EventBus, GameServices } from '@core';

/** Persisted in save slot 'mode:shift'. */
export interface ShiftSave {
  /** Cases completed in any mode since this tracker first saw the bus. */
  casesCompleted: number;
}

export const SHIFT_SLOT = 'mode:shift';
const tracked = new WeakSet<EventBus>();

function slot(services: GameServices) {
  return services.save.slot<ShiftSave>(SHIFT_SLOT, { casesCompleted: 0 }, { version: 1 });
}

/**
 * Modes have no install hook, so the case counter subscribes lazily the first
 * time the mode is consulted (the hub calls `locked()` for every mode card).
 * Idempotent per bus.
 */
export function ensureTracking(services: GameServices): void {
  if (tracked.has(services.bus)) return;
  tracked.add(services.bus);
  const s = slot(services);
  services.bus.on('case:completed', () => s.update((v) => ({ casesCompleted: v.casesCompleted + 1 })));
}

/**
 * Experience points used to size the difficulty window. Takes the larger of our
 * own case counter and the learning port's distinct-diagnoses-seen (which also
 * covers cases completed before the counter was attached), plus a bonus for
 * every mastered diagnosis.
 */
export function experience(services: GameServices): number {
  ensureTracking(services);
  const stats = services.learning.stats();
  return Math.max(slot(services).get().casesCompleted, stats.seen) + stats.mastered * 2;
}
