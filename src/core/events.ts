import type { DiagnosisId, Urgency } from './case';
import type { MiniGameResult, TestId } from './minigame';
import type { ScoreBreakdown } from './scoring';
import type { SinId } from './sins';

/** A reward granted by any engagement system; the results scene lists these. */
export interface RewardGrant {
  source: SinId | 'core';
  label: string;
  /** Short display value, e.g. "+120", "x3", "NEW!" */
  value: string;
  icon?: string;
  /** Accent colour for the chip (CSS colour). */
  color?: string;
  rarity?: 'common' | 'rare' | 'epic' | 'legendary';
}

/**
 * The game-wide event catalogue. Modules communicate ONLY through these events
 * and the registries — never by importing each other.
 *
 * Modules may add their own events via declaration merging:
 *   declare module '@core/events' { interface GameEvents { 'mymod:thing': {...} } }
 */
export interface GameEvents {
  'app:ready': {};
  'scene:changed': { id: string; params: Record<string, unknown> };

  'mode:started': { modeId: string };
  'mode:ended': { modeId: string; casesCompleted: number; totalScore: number };

  'case:started': { caseId: string; modeId: string; emergency: boolean; timeLimitSec?: number };
  'history:asked': { caseId: string; questionId: string; relevance: 'key' | 'helpful' | 'neutral' | 'red-herring' };
  'test:started': { caseId: string; testId: TestId };
  'test:completed': { caseId: string; result: MiniGameResult };
  'diagnosis:submitted': {
    caseId: string;
    diagnosisId: DiagnosisId;
    correct: boolean;
    urgency: Urgency;
    urgencyCorrect: boolean;
  };
  'case:completed': { caseId: string; modeId: string; score: ScoreBreakdown };
  'case:failed': { caseId: string; modeId: string; reason: 'timeout' | 'abandoned' };

  'practice:completed': { testId: TestId; result: MiniGameResult };

  'reward:granted': RewardGrant;
  'achievement:unlocked': { id: string; title: string; description: string; icon: string; sin?: SinId };
  'toast': { message: string; icon?: string; tone?: 'info' | 'good' | 'bad' | 'epic' };

  'learning:reviewed': { diagnosisId: DiagnosisId; quality: number };
}

export type EventName = keyof GameEvents;
export type Handler<K extends EventName> = (payload: GameEvents[K]) => void;

export interface EventBus {
  on<K extends EventName>(event: K, handler: Handler<K>): () => void;
  once<K extends EventName>(event: K, handler: Handler<K>): () => void;
  emit<K extends EventName>(event: K, payload: GameEvents[K]): void;
  /** Subscribe to every event (debug overlays, analytics). */
  onAny(handler: (event: EventName, payload: unknown) => void): () => void;
}

export function createEventBus(): EventBus {
  const map = new Map<EventName, Set<(p: unknown) => void>>();
  const any = new Set<(e: EventName, p: unknown) => void>();
  const bus: EventBus = {
    on(event, handler) {
      let set = map.get(event);
      if (!set) map.set(event, (set = new Set()));
      const h = handler as (p: unknown) => void;
      set.add(h);
      return () => set!.delete(h);
    },
    once(event, handler) {
      const off = bus.on(event, (p) => {
        off();
        handler(p);
      });
      return off;
    },
    emit(event, payload) {
      const set = map.get(event);
      if (set) {
        for (const h of [...set]) {
          try {
            h(payload);
          } catch (err) {
            // One misbehaving module must never break the others.
            console.error(`[bus] handler for "${String(event)}" threw`, err);
          }
        }
      }
      for (const h of [...any]) {
        try {
          h(event, payload);
        } catch (err) {
          console.error('[bus] onAny handler threw', err);
        }
      }
    },
    onAny(handler) {
      any.add(handler);
      return () => any.delete(handler);
    },
  };
  return bus;
}
