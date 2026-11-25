/** Contributes the Streaks HUD widgets. Registries have no unregister, so widgets render
 * nothing once the system is uninstalled. (No hub tile: the flame chip opens the details.) */
import type { FunctionComponent } from 'preact';
import type { GameServices } from '@core';
import { SYSTEM_ID } from '../state';
import { ComboMeter } from './ComboMeter';
import { FlameChip } from './FlameChip';
import { MomentumPanel } from './MomentumPanel';
import { StreakCard } from './StreakCard';
import './streaks.css';

type Active = (s: GameServices) => boolean;

export function registerStreaksUi(services: GameServices, isActive: Active): void {
  const hud = services.registries.hud;
  const add = (id: string, slot: 'topbar-right' | 'exam-overlay' | 'results-extra' | 'hub-sidebar', order: number, C: FunctionComponent<{ services: GameServices }>) => {
    if (hud.has(id)) return;
    hud.register({ id, slot, order, system: SYSTEM_ID, component: (p: { services: GameServices }) => (isActive(p.services) ? <C services={p.services} /> : null) });
  };
  add('streaks:flame', 'topbar-right', 10, FlameChip);
  add('streaks:combo', 'exam-overlay', 20, ComboMeter);
  add('streaks:momentum', 'results-extra', 15, MomentumPanel);
  add('streaks:card', 'hub-sidebar', 20, StreakCard);
}
