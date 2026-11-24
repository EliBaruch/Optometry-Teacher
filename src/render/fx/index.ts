import type { FxPort } from '@core';
import { nullFx } from '@core';

/** Placeholder — replaced by the FX builder. */
export function createFx(_layer: HTMLElement, _shakeTarget: HTMLElement, _opts: { reducedMotion: () => boolean }): FxPort {
  return nullFx;
}
