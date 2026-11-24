import type { GameServices, SystemModule } from '@core';
import { CAREER_COLOR, SYSTEM_ID, startEngine } from './engine';
import { ranksSlot } from './model/state';
import { CareerScene } from './ui/CareerScene';
import { ACTIVE } from './ui/hooks';
import { createMomentStage } from './ui/Moments';
import { NextTrophyCard, ProfileSection } from './ui/ProfileSection';
import { RankBadge } from './ui/RankBadge';
import { ResultsPanel } from './ui/ResultsPanel';
import './ui/widgets.css';

/**
 * Career — XP & rank ladder, mastery stars per diagnosis, trophy wall.
 * Plugs in only through the bus, its own save slot and the UI registries.
 */
const installed = new WeakMap<GameServices, () => void>();

function registerUi(services: GameServices) {
  const { hud, hub, scenes } = services.registries;
  const once = <T extends { id: string }>(reg: { has(id: string): boolean; register(x: T): void }, item: T) => {
    if (!reg.has(item.id)) reg.register(item);
  };
  once(scenes, { id: 'career', component: CareerScene, music: 'hub' });
  once(hud, { id: 'ranks:badge', slot: 'topbar-left', order: 10, system: SYSTEM_ID, component: RankBadge });
  once(hud, { id: 'ranks:results', slot: 'results-extra', order: 10, system: SYSTEM_ID, component: ResultsPanel });
  once(hud, { id: 'ranks:profile', slot: 'profile', order: 10, system: SYSTEM_ID, component: ProfileSection });
  once(hud, { id: 'ranks:next-trophy', slot: 'hub-sidebar', order: 30, system: SYSTEM_ID, component: NextTrophyCard });
  once(hub, {
    id: 'career',
    title: 'Career',
    subtitle: 'Your rank, mastery sky and trophy wall',
    icon: 'crown',
    accent: CAREER_COLOR,
    order: 10,
    system: SYSTEM_ID,
    sceneId: 'career',
    badge: (s) => {
      const n = ranksSlot(s).get().unseen.length;
      return n ? `${n} NEW` : undefined;
    },
  });
}

const ranks: SystemModule = {
  id: SYSTEM_ID,
  name: 'Career',
  drive: 'pride',
  color: CAREER_COLOR,
  install(services) {
    const existing = installed.get(services);
    if (existing) return existing;
    const stage = createMomentStage(services);
    const engine = startEngine(services, { present: stage.present });
    registerUi(services);
    ACTIVE.add(services);
    const uninstall = () => {
      if (installed.get(services) !== uninstall) return;
      installed.delete(services);
      ACTIVE.delete(services);
      engine.stop();
      stage.destroy();
    };
    installed.set(services, uninstall);
    return uninstall;
  },
};

export default ranks;
