/**
 * Boutique & coins — the lumen (✦) economy.
 * Pays fees per case scaled by clinical quality, awards surprise supply crates,
 * and runs the Boutique (cosmetics only; no real money anywhere).
 */
import type { GameServices, SystemModule } from '@core';
import { ECONOMY_COLOR } from './catalog';
import { SYSTEM_ID, economyFor } from './store';
import { registerUi } from './ui/register';

const installs = new WeakMap<GameServices, number>();

const economy: SystemModule = {
  id: SYSTEM_ID,
  name: 'Boutique & coins',
  drive: 'greed',
  color: ECONOMY_COLOR,
  install(services) {
    const store = economyFor(services);
    registerUi(services);
    installs.set(services, (installs.get(services) ?? 0) + 1);
    store.start();
    let done = false;
    return () => {
      if (done) return;
      done = true;
      const n = (installs.get(services) ?? 1) - 1;
      installs.set(services, n);
      if (n <= 0) store.stop();
    };
  },
};

export default economy;
export { economyFor, activeEconomy, type Economy, type EconomyState } from './store';
