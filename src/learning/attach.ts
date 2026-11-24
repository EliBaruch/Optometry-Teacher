import type { GameServices } from '@core';
import { learningQuality } from '@core';
import { isLumenLearning } from './learning';

/** Quality recorded when a timed case runs out of clock (a miss, but not a blackout). */
export const TIMEOUT_QUALITY = 1;
/** Fallback "small lapse" for adapters without a dedicated confusion API. */
export const CONFUSION_QUALITY = 2;

/**
 * Wires the learning port to game events. Reads `services.learning` at event
 * time, so the adapter can be swapped after attaching. Returns an uninstall fn.
 *
 *  - case:completed → record the correct diagnosis with learningQuality(score);
 *    if the player chose a different diagnosis, that one gets a soft lapse so
 *    the confusion pair resurfaces in Second Opinion.
 *  - case:failed (timeout) → a lapse on the case's diagnosis. Abandoned cases
 *    are not graded.
 */
export function attachLearning(services: GameServices): () => void {
  const { bus } = services;
  const offs = [
    bus.on('case:completed', ({ score }) => {
      const learning = services.learning;
      const id = score.correctDiagnosisId;
      const quality = learningQuality(score);
      learning.record(id, quality);
      const chosen = score.chosenDiagnosisId;
      if (!score.diagnosisCorrect && chosen && chosen !== id) {
        if (isLumenLearning(learning)) learning.confuse(chosen);
        else learning.record(chosen, CONFUSION_QUALITY);
      }
      bus.emit('learning:reviewed', { diagnosisId: id, quality });
    }),
    bus.on('case:failed', ({ caseId, reason }) => {
      if (reason !== 'timeout') return;
      const kase = services.registries.cases.get(caseId);
      if (!kase) return;
      services.learning.record(kase.diagnosis, TIMEOUT_QUALITY);
      bus.emit('learning:reviewed', { diagnosisId: kase.diagnosis, quality: TIMEOUT_QUALITY });
    }),
  ];
  return () => offs.forEach((off) => off());
}
