import type { GameServices, Signal } from '@core';
import { INITIAL_STATS, STATS_VERSION, type EmergencyStats } from './logic';

export const SYSTEM_ID = 'emergencies';
export const ACCENT = '#ef4444';
export const SLOT = `sys:${SYSTEM_ID}`;

/** The persisted Code Red slice (the save service caches it per namespace). */
export function statsSlot(services: GameServices): Signal<EmergencyStats> {
  return services.save.slot<EmergencyStats>(SLOT, INITIAL_STATS, {
    version: STATS_VERSION,
    migrate: () => INITIAL_STATS,
  });
}
