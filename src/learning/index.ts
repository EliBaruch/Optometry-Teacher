/**
 * Learning adapter: SM-2-style spaced repetition per diagnosis.
 * The composition root does `services.learning = createLearning(save, now)` and
 * `attachLearning(services)`; everything else talks to the core LearningPort.
 */
export { createLearning, isLumenLearning, LEARNING_SLOT, MASTERED_AT } from './learning';
export type { CardView, LearningState, LumenLearning } from './learning';
export { attachLearning, CONFUSION_QUALITY, TIMEOUT_QUALITY } from './attach';
export {
  DAY, MINUTE, DEFAULT_EASE, MIN_EASE, LAPSE_DELAY_MS, CONFUSION_DELAY_MS, MASTERY_REPS,
  masteryOf, review, confuse, newCard, nextEase, isOnTime,
} from './sm2';
export type { Card } from './sm2';
