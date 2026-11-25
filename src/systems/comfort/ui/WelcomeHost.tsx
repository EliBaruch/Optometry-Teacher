import type { GameServices } from '@core';
import { Portal } from './Portal';
import { WelcomeBack } from './WelcomeBack';
import './comfort.css';

/**
 * Invisible top-bar widget: lets the "Welcome back" note greet a returning
 * player on whichever screen they land, not only in the lobby. It yields to
 * the hub banner / lounge hosts and stays quiet while a run is in progress.
 */
export function WelcomeHostWidget(props: { services: GameServices }) {
  return (
    <Portal>
      <WelcomeBack services={props.services} host="global" />
    </Portal>
  );
}
