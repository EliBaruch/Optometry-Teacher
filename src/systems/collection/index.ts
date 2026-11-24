/**
 * Gallery — collectible holographic iris cards. Every correct diagnosis leaves
 * the patient's iris behind as a card that doubles as a flash-card.
 * Player-facing name: "Gallery". Talks to the rest of the game only through
 * the bus and the registries.
 */
import type { GameServices, SystemModule } from '@core';
import { GALLERY_COLOR, SYSTEM_ID, createStore, wireStore } from './store';
import { registerUi } from './ui/register';

const installed = new WeakMap<GameServices, () => void>();

const collection: SystemModule = {
  id: SYSTEM_ID,
  name: 'Gallery',
  drive: 'lust',
  color: GALLERY_COLOR,
  install(services) {
    // Idempotent: a second install replaces the first instead of double-subscribing.
    installed.get(services)?.();
    const store = createStore(services);
    const unwire = wireStore(store);
    registerUi(store);
    const uninstall = () => {
      unwire();
      store.active.set(false);
      if (installed.get(services) === uninstall) installed.delete(services);
    };
    installed.set(services, uninstall);
    return uninstall;
  },
};

export default collection;
