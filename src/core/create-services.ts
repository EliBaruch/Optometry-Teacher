import type { ClinicalCase, Diagnosis } from './case';
import { createEventBus } from './events';
import type { MiniGameModule } from './minigame';
import type { ModeModule } from './mode';
import { nullAudio, nullFx, nullLearning, type AudioPort, type FxPort, type LearningPort } from './ports';
import { createRegistry } from './registry';
import { createRng } from './rng';
import { createRouter } from './router';
import { createSaveService, memoryStorage, type StorageAdapter } from './save';
import { createCaseSession, createRunController } from './session';
import type { GameServices, Registries } from './services';
import { DEFAULT_SETTINGS, type Settings } from './settings';
import type { SystemModule } from './systems';
import type { HubEntry, HudWidget, SceneModule } from './ui';

export interface ServiceOverrides {
  storage?: StorageAdapter;
  audio?: AudioPort;
  fx?: FxPort;
  learning?: LearningPort;
  seed?: number | string;
  now?: () => number;
  initialScene?: string;
  locale?: import('./i18n').Locale;
}

/**
 * Builds a complete services container with null adapters by default.
 * The app composition root passes real adapters; tests use the defaults.
 */
export function createServices(o: ServiceOverrides = {}): GameServices {
  const bus = createEventBus();
  const now = o.now ?? (() => Date.now());
  const registries: Registries = {
    minigames: createRegistry<MiniGameModule>('minigames'),
    cases: createRegistry<ClinicalCase>('cases'),
    diagnoses: createRegistry<Diagnosis>('diagnoses'),
    systems: createRegistry<SystemModule>('systems'),
    scenes: createRegistry<SceneModule>('scenes'),
    modes: createRegistry<ModeModule>('modes'),
    hud: createRegistry<HudWidget>('hud'),
    hub: createRegistry<HubEntry>('hub'),
  };
  const save = createSaveService(o.storage ?? memoryStorage());
  const settings = save.slot<Settings>('settings', DEFAULT_SETTINGS);
  const services: GameServices = {
    bus,
    save,
    rng: createRng(o.seed ?? 'lumen'),
    clock: { now },
    audio: o.audio ?? nullAudio,
    fx: o.fx ?? nullFx,
    learning: o.learning ?? nullLearning,
    router: createRouter(bus, { id: o.initialScene ?? 'title', params: {} }),
    registries,
    session: createCaseSession(bus, registries.cases, now),
    run: createRunController(bus, () => services),
    settings,
    locale: o.locale ?? 'en',
  };
  return services;
}
