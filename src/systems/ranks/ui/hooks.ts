import { useMemo } from 'preact/hooks';
import type { GameServices } from '@core';
import { useSignal } from '@ui-kit';
import { levelInfo, type LevelInfo } from '../model/ladder';
import { ranksSlot, type RanksState } from '../model/state';

/** Services the Career system is currently installed on (widgets render nothing otherwise). */
export const ACTIVE = new WeakSet<GameServices>();

export function useRanks(services: GameServices): { s: RanksState; info: LevelInfo } {
  const s = useSignal(ranksSlot(services));
  const info = useMemo(() => levelInfo(s.xp, services.locale), [s.xp, services.locale]);
  return { s, info };
}

/** Deterministic 0..1 hash for procedural layouts. */
export function hash01(str: string, salt = 0): number {
  let h = 2166136261 ^ salt;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  h ^= h >>> 13;
  h = Math.imul(h, 0x5bd1e995);
  h ^= h >>> 15;
  return (h >>> 0) / 4294967296;
}
