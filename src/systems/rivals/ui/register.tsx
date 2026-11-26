/** Contributes the Rivals HUD widgets, hub tile and scene. Registries have no unregister, so
 * widgets render nothing once the system is uninstalled. */
import type { FunctionComponent } from 'preact';
import type { GameServices, SceneProps } from '@core';
import { ACCENT, SYSTEM_ID, rivalsFor } from '../controller';
import { playerRank, standings } from '../league';
import { HubCard } from './HubCard';
import { MiniStanding } from './MiniStanding';
import { ProfileSection } from './ProfileSection';
import { ResultsPanel } from './ResultsPanel';
import { RivalsScene } from './RivalsScene';
import { text } from '../strings';

type Active = (s: GameServices) => boolean;

export function registerRivalsUi(services: GameServices, isActive: Active): void {
  const r = services.registries;
  const add = <T extends { id: string }>(reg: { has(id: string): boolean; register(x: T): void }, item: T) => {
    if (!reg.has(item.id)) reg.register(item);
  };

  add(r.hud, { id: 'rivals:standing', slot: 'topbar-right', order: 20, system: SYSTEM_ID, component: guardComponent(MiniStanding, isActive) });
  add(r.hud, { id: 'rivals:hub', slot: 'hub-sidebar', order: 30, system: SYSTEM_ID, component: guardComponent(HubCard, isActive) });
  add(r.hud, { id: 'rivals:profile', slot: 'profile', order: 30, system: SYSTEM_ID, component: guardComponent(ProfileSection, isActive) });
  add(r.hud, { id: 'rivals:results', slot: 'results-extra', order: 30, system: SYSTEM_ID, component: guardComponent(ResultsPanel, isActive) });

  add(r.hub, {
    id: 'rivals',
    title: text(services.locale).hubTitle,
    subtitle: text(services.locale).hubSubtitle,
    icon: 'users',
    accent: ACCENT,
    order: 30,
    system: SYSTEM_ID,
    sceneId: SYSTEM_ID,
    badge: (s: GameServices) => {
      const st = rivalsFor(s).state.get();
      if (st.cases === 0) return text(s.locale).badgeNew;
      return `#${playerRank(standings(st, s.clock.now()))}`;
    },
  });

  add(r.scenes, { id: SYSTEM_ID, component: (p: SceneProps) => <RivalsScene {...p} />, music: 'hub' });
}

/** Wrap a component so it renders only while the system is installed. */
function guardComponent(Comp: FunctionComponent<{ services: GameServices }>, isActive: Active) {
  return (p: { services: GameServices }) => (isActive(p.services) ? <Comp services={p.services} /> : null);
}
