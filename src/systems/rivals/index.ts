/**
 * Rivals — AI colleagues on a weekly board. Each patient you finish is compared with how
 * five colleagues handled the very same case; their classic slips double as teaching points.
 */
import type { GameServices, SystemModule } from '@core';
import { ACCENT, SYSTEM_ID, bindRivals, rivalsFor } from './controller';
import { registerRivalsUi } from './ui/register';

const active = new WeakMap<GameServices, () => void>();

/** True while the system is installed for these services (widgets hide themselves otherwise). */
export function isRivalsActive(services: GameServices): boolean {
  return active.has(services);
}

const rivals: SystemModule = {
  id: SYSTEM_ID,
  name: 'Rivals',
  drive: 'envy',
  color: ACCENT,
  install(services) {
    // Idempotent: a second install replaces the first instead of doubling listeners.
    active.get(services)?.();
    rivalsFor(services);
    const unbind = bindRivals(services);
    registerRivalsUi(services, isRivalsActive);
    const uninstall = () => {
      unbind();
      if (active.get(services) === uninstall) active.delete(services);
    };
    active.set(services, uninstall);
    return uninstall;
  },
};

export default rivals;
export { rivalsFor } from './controller';
