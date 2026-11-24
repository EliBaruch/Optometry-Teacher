import type { DiagnosisId, LearningPort, MasteryStats, ReadSignal, SaveService } from '@core';
import { CONFUSION_DELAY_MS, confuse, masteryOf, newCard, review, sanitizeCard, type Card } from './sm2';

export const LEARNING_SLOT = 'learning';
export const MASTERED_AT = 0.8;

export interface LearningState {
  cards: Record<DiagnosisId, Card>;
}

export interface CardView extends Card {
  id: DiagnosisId;
  mastery: number;
  isDue: boolean;
}

/**
 * The concrete learning adapter. Extends the core LearningPort with a few
 * extras the composition root / dev tools may use (feature-detected with
 * `isLumenLearning`, so other adapters remain swappable).
 */
export interface LumenLearning extends LearningPort {
  readonly kind: 'lumen-learning';
  /** Soft lapse: the player chose this diagnosis for a case that was something else. */
  confuse(diagnosisId: DiagnosisId): void;
  card(diagnosisId: DiagnosisId): CardView | undefined;
  /** Every tracked diagnosis, most overdue first, then least mastered. */
  cards(): CardView[];
  state: ReadSignal<LearningState>;
  reset(): void;
}

export function isLumenLearning(p: LearningPort): p is LumenLearning {
  return (p as Partial<LumenLearning>).kind === 'lumen-learning';
}

function migrate(old: unknown): LearningState {
  const cards = (old && typeof old === 'object' && (old as { cards?: unknown }).cards) || {};
  return { cards: cards as Record<string, Card> };
}

export function createLearning(save: SaveService, now: () => number): LumenLearning {
  const slot = save.slot<LearningState>(LEARNING_SLOT, { cards: {} }, { version: 1, migrate });

  // Defensive: drop/repair anything malformed that came back from storage.
  {
    const t = now();
    const clean: Record<string, Card> = {};
    for (const [id, raw] of Object.entries(slot.get().cards ?? {})) {
      const c = sanitizeCard(raw, t);
      if (c) clean[id] = c;
    }
    slot.set({ cards: clean });
  }

  const put = (id: DiagnosisId, fn: (c: Card | undefined, t: number) => Card) => {
    if (!id) return;
    const t = now();
    slot.update((s) => ({ cards: { ...s.cards, [id]: fn(s.cards[id], t) } }));
  };

  const view = (id: DiagnosisId, c: Card, t: number): CardView => ({
    ...c, id, mastery: masteryOf(c, t), isDue: c.due <= t,
  });

  const port: LumenLearning = {
    kind: 'lumen-learning',
    state: slot,
    record(id, quality) {
      put(id, (c, t) => review(c ?? newCard(t), quality, t));
    },
    confuse(id) {
      put(id, (c, t) => (c ? confuse(c, t) : { ...confuse(newCard(t), t), due: t + CONFUSION_DELAY_MS }));
    },
    due(limit) {
      const t = now();
      const due = Object.entries(slot.get().cards)
        .filter(([, c]) => c.due <= t)
        .sort(([, a], [, b]) => a.due - b.due || a.ease - b.ease);
      const ids = due.map(([id]) => id);
      return limit === undefined ? ids : ids.slice(0, Math.max(0, limit));
    },
    mastery(id) {
      return masteryOf(slot.get().cards[id], now());
    },
    stats(): MasteryStats {
      const t = now();
      let seen = 0, mastered = 0, due = 0;
      for (const c of Object.values(slot.get().cards)) {
        if (c.seen > 0) seen++;
        if (masteryOf(c, t) >= MASTERED_AT) mastered++;
        if (c.due <= t) due++;
      }
      return { seen, mastered, due };
    },
    card(id) {
      const c = slot.get().cards[id];
      return c ? view(id, c, now()) : undefined;
    },
    cards() {
      const t = now();
      return Object.entries(slot.get().cards)
        .map(([id, c]) => view(id, c, t))
        .sort((a, b) => Number(b.isDue) - Number(a.isDue) || (a.isDue ? a.due - b.due : a.mastery - b.mastery));
    },
    reset() {
      slot.set({ cards: {} });
    },
  };
  return port;
}
