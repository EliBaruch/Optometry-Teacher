/**
 * Streaks — "one more patient" momentum, bent toward spaced, interleaved practice:
 *  - an in-run combo (×1 → ×1.5 → ×2 → ×3) for consecutive correct diagnoses, with a
 *    once-per-run "combo saved" grace for a thorough, safely-triaged miss;
 *  - a forgiving daily flame (freezes earned by solid work, used automatically; rekindle
 *    a broken streak with two correct diagnoses; milestones at 3/7/14/30 days);
 *  - near-miss nudges against your own personal bests per mode, and a natural stopping cue.
 */
import type { GameServices, SystemModule } from '@core';
import { attach, createController, register, streaksOf, unregister } from './controller';
import { ACCENT, SYSTEM_ID } from './state';
import { registerStreaksUi } from './ui/register';

const active = new WeakMap<GameServices, () => void>();

/** True while the system is installed for these services (widgets hide themselves otherwise). */
export function isStreaksActive(services: GameServices): boolean {
  return active.has(services);
}

const streaks: SystemModule = {
  id: SYSTEM_ID,
  name: 'Streaks',
  drive: 'gluttony',
  color: ACCENT,
  install(services) {
    // Idempotent: a second install replaces the first instead of doubling listeners.
    active.get(services)?.();
    const ctl = createController(services);
    register(ctl);
    const detach = attach(ctl);
    registerStreaksUi(services, isStreaksActive);
    const uninstall = () => {
      detach();
      unregister(ctl);
      if (active.get(services) === uninstall) active.delete(services);
    };
    active.set(services, uninstall);
    return uninstall;
  },
};

export default streaks;
export { streaksOf };
