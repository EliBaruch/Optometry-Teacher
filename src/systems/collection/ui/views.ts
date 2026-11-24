import type { Diagnosis } from '@core';
import { cardNumber } from '../catalog';
import type { CollectionState } from '../model';
import type { CardView } from './IrisCard';

/** CardView for an owned card (undefined when not collected). */
export function viewFor(state: CollectionState, catalog: readonly Diagnosis[], dxId: string): CardView | undefined {
  const card = state.cards[dxId];
  if (!card) return undefined;
  const dx = catalog.find((d) => d.id === dxId);
  return { dxId, dx, card, number: cardNumber(catalog, dxId), total: Math.max(catalog.length, 1) };
}
