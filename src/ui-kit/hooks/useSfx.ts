import { useCallback } from 'preact/hooks';
import { nullFx, type FxPort, type SfxId } from '@core';
import { useOptionalServices } from '../context';

export type PlaySfx = (id: SfxId, opts?: { volume?: number; pitch?: number }) => void;

/**
 * `const play = useSfx(); play('click')` — routes to services.audio inside a
 * ServicesProvider and is a silent no-op outside one (tests, isolated previews).
 */
export function useSfx(): PlaySfx {
  const services = useOptionalServices();
  return useCallback<PlaySfx>(
    (id, opts) => {
      if (!services) return;
      try {
        services.audio.play(id, opts);
      } catch {
        /* audio must never break UI */
      }
    },
    [services],
  );
}

/** Screen-space juice (shake, flash, bursts). Null adapter outside a ServicesProvider. */
export function useFx(): FxPort {
  return useOptionalServices()?.fx ?? nullFx;
}
