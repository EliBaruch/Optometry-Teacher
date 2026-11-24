import type { FxPort } from '@core';
import { createFxController } from './engine';

export { createFxController, type FxController, type FxOptions } from './engine';

/**
 * The game's FxPort adapter: particles, floating numbers, flashes, vignettes,
 * camera shake and hit-stop. `layer` is a fixed full-screen, pointer-events:none
 * element; `shakeTarget` is the element shaken (its inline transform is restored).
 */
export function createFx(layer: HTMLElement, shakeTarget: HTMLElement, opts: { reducedMotion: () => boolean }): FxPort {
  return createFxController(layer, shakeTarget, opts);
}
