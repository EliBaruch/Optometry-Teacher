import type { GameServices } from '@core';
import { useSignal } from '@ui-kit';
import { economyFor, type Economy, type EconomyState } from '../store';

/** The economy store while the system is installed, else null (widgets then render nothing). */
export function useEconomy(services: GameServices): Economy | null {
  const store = economyFor(services);
  const active = useSignal(store.active);
  return active ? store : null;
}

export function useEconomyState(store: Economy): EconomyState {
  return useSignal(store.state);
}
