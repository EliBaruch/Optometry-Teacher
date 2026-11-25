import { pickStrings, type GameServices } from '@core';
import { S } from '../strings';
import { ECONOMY_COLOR } from '../catalog';
import { SYSTEM_ID, activeEconomy } from '../store';
import { BoutiqueScene } from './Boutique';
import { CoinCounter } from './CoinCounter';
import { ProfileCard } from './ProfileCard';
import { ResultsPanel } from './ResultsPanel';
import './economy.css';
import './crate.css';
import './boutique.css';

const registered = new WeakSet<GameServices>();

/**
 * Contribute HUD widgets, the hub tile and the Boutique scene — once per
 * services container (registries have no unregister; widgets render nothing
 * while the system is uninstalled).
 */
export function registerUi(services: GameServices): void {
  if (registered.has(services)) return;
  registered.add(services);
  const { hud, hub, scenes } = services.registries;
  const t = pickStrings(S, services.locale);
  hud.register({ id: 'economy:wallet', slot: 'topbar-left', order: 20, system: SYSTEM_ID, component: CoinCounter });
  hud.register({ id: 'economy:receipt', slot: 'results-extra', order: 20, system: SYSTEM_ID, component: ResultsPanel });
  hud.register({ id: 'economy:wardrobe', slot: 'profile', order: 30, system: SYSTEM_ID, component: ProfileCard });
  hub.register({
    id: 'economy:boutique',
    title: t.hubTitle,
    subtitle: t.hubSubtitle,
    icon: 'gem',
    accent: ECONOMY_COLOR,
    order: 20,
    system: SYSTEM_ID,
    sceneId: 'boutique',
    badge: (s) => {
      const n = activeEconomy(s)?.state.get().crates.length ?? 0;
      return n ? t.hubBadge(n) : undefined;
    },
  });
  scenes.register({ id: 'boutique', component: BoutiqueScene, music: 'hub' });
}
