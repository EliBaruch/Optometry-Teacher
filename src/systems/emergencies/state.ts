import { signal, type GameServices, type Signal } from '@core';
import { INITIAL_STATS, STATS_VERSION, migrateStats, type EmergencyStats } from './logic';

export const SYSTEM_ID = 'emergencies';
export const ACCENT = '#ef4444';
export const SLOT = `sys:${SYSTEM_ID}`;

/** The persisted Code Red slice (the save service caches it per namespace). */
export function statsSlot(services: GameServices): Signal<EmergencyStats> {
  return services.save.slot<EmergencyStats>(SLOT, INITIAL_STATS, {
    version: STATS_VERSION,
    migrate: (old) => migrateStats(old),
  });
}

/**
 * Which services containers currently have Code Red installed. The core HUD registry
 * has no unregister, so widgets consult this gate and render nothing after uninstall.
 */
const live = new WeakSet<GameServices>();
/** Bumped on every install/uninstall so widgets re-render. */
export const installEpoch = signal(0);
export function setInstalled(services: GameServices, on: boolean) {
  if (on) live.add(services);
  else live.delete(services);
  installEpoch.update((n) => n + 1);
}
export const isInstalled = (services: GameServices) => live.has(services);
