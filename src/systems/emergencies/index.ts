/**
 * Code Red — the emergency layer. Countdown + heartbeat during timed cases,
 * an arrival klaxon, the "sight saved" finale with learning-scaled rewards,
 * sober red-flag teaching after a miss, the weekly Grand Rounds case and an
 * emergency record for the profile. Delete this folder and the game still plays.
 */
import type { GameServices, HudWidget, SystemModule } from '@core';
import { startEngine } from './engine';
import { ACCENT, SYSTEM_ID } from './state';
import { CountdownWidget } from './ui/Countdown';
import { DebriefWidget } from './ui/Debrief';
import { GrandRoundsBanner } from './ui/GrandRounds';
import { RecordWidget } from './ui/Record';
import { createDomStage } from './ui/Stage';

const WIDGETS: HudWidget[] = [
  { id: 'emergencies:countdown', slot: 'exam-overlay', order: 5, system: SYSTEM_ID, component: CountdownWidget },
  { id: 'emergencies:grand-rounds', slot: 'hub-banner', order: 30, system: SYSTEM_ID, component: GrandRoundsBanner },
  { id: 'emergencies:debrief', slot: 'results-extra', order: 20, system: SYSTEM_ID, component: DebriefWidget },
  { id: 'emergencies:record', slot: 'profile', order: 40, system: SYSTEM_ID, component: RecordWidget },
];

/** One live install per services container (install() may be called again safely). */
const installs = new WeakMap<GameServices, () => void>();

function install(services: GameServices): () => void {
  if (installs.has(services)) return () => {};
  for (const w of WIDGETS) if (!services.registries.hud.has(w.id)) services.registries.hud.register(w);
  const stop = startEngine(services, { stage: createDomStage() });
  const uninstall = () => {
    if (installs.get(services) !== uninstall) return;
    installs.delete(services);
    stop();
  };
  installs.set(services, uninstall);
  return uninstall;
}

const emergencies: SystemModule = {
  id: SYSTEM_ID,
  name: 'Code Red',
  drive: 'wrath',
  color: ACCENT,
  install,
};

export default emergencies;
