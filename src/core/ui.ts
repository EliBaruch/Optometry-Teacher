import type { GameServices } from './services';
import type { SinId } from './sins';

/**
 * Framework-neutral view type. Preact function components satisfy it.
 * ui-kit provides helpers to render a View inside Preact.
 */
export type View<P> = (props: P) => unknown;

export interface SceneProps {
  services: GameServices;
  params: Record<string, unknown>;
}

export interface SceneModule {
  id: string;
  component: View<SceneProps>;
  /** Background music for this scene (optional) */
  music?: import('./ports').TrackId;
}

export type HudSlot =
  | 'topbar-left'   // currency, level
  | 'topbar-right'  // streak, rivals
  | 'hub-banner'    // large banner in clinic hub (daily, events)
  | 'hub-sidebar'   // small cards in hub
  | 'exam-overlay'  // over the exam room (timers, combo)
  | 'results-extra' // extra panels on results screen
  | 'profile';      // player profile page sections

export interface HudWidget {
  id: string;
  slot: HudSlot;
  order: number;
  sin?: SinId;
  component: View<{ services: GameServices }>;
}

/** A tile in the clinic hub that opens a scene (mode, collection, shop, rivals…). */
export interface HubEntry {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  accent: string;
  order: number;
  sin?: SinId;
  sceneId: string;
  params?: Record<string, unknown>;
  /** Optional badge text, e.g. "3 NEW" or "LIVE" */
  badge?: (services: GameServices) => string | undefined;
  /** Player level required (Pride rank gate); undefined = always open */
  locked?: (services: GameServices) => string | undefined;
}
