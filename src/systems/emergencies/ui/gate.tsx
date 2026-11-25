import type { FunctionComponent } from 'preact';
import type { GameServices } from '@core';
import { useSignal } from '@ui-kit';
import { installEpoch, isInstalled } from '../state';

type WidgetProps = { services: GameServices };

/** Wraps a HUD widget so it renders nothing once Code Red is uninstalled from these services. */
export function gated(Inner: FunctionComponent<WidgetProps>): FunctionComponent<WidgetProps> {
  function Gated({ services }: WidgetProps) {
    useSignal(installEpoch);
    return isInstalled(services) ? <Inner services={services} /> : null;
  }
  Gated.displayName = `CodeRed(${Inner.displayName ?? Inner.name ?? 'Widget'})`;
  return Gated;
}
