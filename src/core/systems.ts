import type { GameServices } from './services';

/**
 * INTERNAL design lens — never shown to players.
 * Each engagement system is designed around the feeling one of the classic
 * "seven deadly sins" evokes (pride → mastery & status, greed → loot & rewards,
 * envy → rivals & comparison, gluttony → "one more", lust → desire for beautiful
 * collectibles, wrath → adrenaline & urgency, sloth → comfort & effortless rewards).
 * Player-facing text must use neutral, clinic-themed names only.
 */
export type DesignDrive = 'pride' | 'greed' | 'envy' | 'gluttony' | 'lust' | 'wrath' | 'sloth';
export const DESIGN_DRIVES: readonly DesignDrive[] = ['pride', 'greed', 'envy', 'gluttony', 'lust', 'wrath', 'sloth'];

/** Stable ids of the engagement systems (folder names under src/systems). */
export type SystemId = string;

/**
 * An engagement system (ranks, economy, rivals, streaks, collection, emergencies, comfort…):
 *  - listens to bus events (never calls other modules),
 *  - keeps its own persisted state via services.save.slot('sys:<id>', ...),
 *  - contributes UI through the hud / hub / scene registries,
 *  - announces rewards via 'reward:granted' so the results screen can show them.
 * Removing a system's folder must leave the game fully playable.
 */
export interface SystemModule {
  id: SystemId;
  /** Player-facing name, e.g. "Rank & Mastery" */
  name: string;
  /** Internal only: which psychological drive this system is designed around */
  drive: DesignDrive;
  color: string;
  install(services: GameServices): () => void;
}
