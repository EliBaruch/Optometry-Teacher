import type { GameServices } from './services';

export type SinId = 'pride' | 'greed' | 'envy' | 'gluttony' | 'lust' | 'wrath' | 'sloth';
export const SINS: readonly SinId[] = ['pride', 'greed', 'envy', 'gluttony', 'lust', 'wrath', 'sloth'];

/**
 * An engagement system themed on one of the seven deadly sins. A sin module:
 *  - listens to bus events (never calls other modules),
 *  - keeps its own persisted state via services.save.slot('sin:<id>', ...),
 *  - contributes UI through the hud / hub / scene registries,
 *  - announces rewards via 'reward:granted' so the results screen can show them.
 * Removing a sin's folder must leave the game fully playable.
 */
export interface SinModule {
  id: SinId;
  name: string;
  /** The playful in-game title, e.g. "Pride — The Hall of Mirrors" */
  title: string;
  tagline: string;
  color: string;
  glyph: string;
  install(services: GameServices): () => void;
}
