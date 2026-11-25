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
import type { SystemModule } from './systems';
import type { HubEntry, HudWidget, SceneModule } from './ui';
import type { Locale } from './i18n';

export interface Registries {
  minigames: Registry<MiniGameModule>;
  cases: Registry<ClinicalCase>;
  diagnoses: Registry<Diagnosis>;
  systems: Registry<SystemModule>;
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
  /** The edition's language (fixed per build: the Hebrew edition is a separate site). */
  locale: Locale;
}
