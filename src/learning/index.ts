import type { LearningPort, SaveService } from '@core';
import { nullLearning } from '@core';

/** Placeholder — replaced by the learning builder. */
export function createLearning(_save: SaveService, _now: () => number): LearningPort {
  return nullLearning;
}
