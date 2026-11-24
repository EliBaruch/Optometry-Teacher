import type { ClinicalCase, Diagnosis } from './case';
import type { EventBus } from './events';
import type { MiniGameModule } from './minigame';
import type { ModeModule } from './mode';
import type { AudioPort, FxPort, LearningPort } from './ports';
import type { Registry } from './registry';
import type { Rng } from './rng';
import type { Router } from './router';
import type { SaveService } from './save';
import type { CaseSessionController, RunController } from './session';
import type { Settings } from './settings';
import type { Signal } from './signal';
import type { SinModule } from './sins';
import type { HubEntry, HudWidget, SceneModule } from './ui';

export interface Registries {
  minigames: Registry<MiniGameModule>;
  cases: Registry<ClinicalCase>;
  diagnoses: Registry<Diagnosis>;
  sins: Registry<SinModule>;
  scenes: Registry<SceneModule>;
  modes: Registry<ModeModule>;
  hud: Registry<HudWidget>;
  hub: Registry<HubEntry>;
}

/**
 * Everything a module may touch, passed explicitly (no globals).
 * Adapters are swappable: e.g. replace `audio` with nullAudio to mute the game.
 */
export interface GameServices {
  bus: EventBus;
  save: SaveService;
  rng: Rng;
  clock: { now(): number };
  audio: AudioPort;
  fx: FxPort;
  learning: LearningPort;
  router: Router;
  registries: Registries;
  session: CaseSessionController;
  run: RunController;
  settings: Signal<Settings>;
}
