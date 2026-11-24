import type { GameServices, LearningPort, SaveService } from '@core';
import { nullLearning } from '@core';

/** Placeholder — replaced by the learning builder. */
export function createLearning(_save: SaveService, _now: () => number): LearningPort {
  return nullLearning;
}

/** Wires the learning port to game events. Returns an uninstall function. */
export function attachLearning(_services: GameServices): () => void {
  return () => {};
}
