import type { GameServices, SystemModule } from '@core';
import { ACCENT, SYSTEM_ID, attach, comfortOf, createController, register, unregister } from './controller';
import { collectable, giftReady } from './logic';
import { LoungeBanner } from './ui/LoungeBanner';
import { LoungeScene } from './ui/LoungeScene';
import { WelcomeHostWidget } from './ui/WelcomeHost';

export { comfortOf } from './controller';

/**
 * Lounge — effortless comfort & return rewards:
 * a daily gift calendar, clinic earnings while away (rate set by case quality),
 * a warm comeback bonus, one-tap Continue and a cosy lounge scene with clinical pearls.
 */
const comfort: SystemModule = {
  id: SYSTEM_ID,
  name: 'Lounge',
  drive: 'sloth',
  color: ACCENT,
  install(services: GameServices) {
    if (comfortOf(services)) return () => {}; // already installed on these services
    const ctl = createController(services);
    register(ctl);
    const detach = attach(ctl);

    const r = services.registries;
    r.hud.register({ id: 'comfort:banner', slot: 'hub-banner', order: 10, system: SYSTEM_ID, component: LoungeBanner });
    // invisible: hosts the welcome-back note on screens without the banner
    r.hud.register({ id: 'comfort:welcome', slot: 'topbar-right', order: 99, system: SYSTEM_ID, component: WelcomeHostWidget });
    r.scenes.register({ id: 'lounge', component: LoungeScene });
    r.hub.register({
      id: 'lounge',
      title: 'Lounge',
      subtitle: 'Daily gift, clinic earnings & pearls',
      icon: 'gift',
      accent: ACCENT,
      order: 70,
      system: SYSTEM_ID,
      sceneId: 'lounge',
      badge: (s) => {
        const c = comfortOf(s);
        if (!c) return undefined;
        const st = c.state.get();
        if (giftReady(st, s.clock.now())) return 'GIFT';
        const c2 = collectable(st);
        return c2 >= 1 ? `✦ ${c2}` : undefined;
      },
    });

    return () => {
      detach();
      unregister(ctl);
    };
  },
};

export default comfort;
