import type { ClinicalCase } from './case';
import type { GameServices } from './services';
import type { SinId } from './sins';

export interface ModeRules {
  /** Number of patients in the run; 'endless' until lives run out */
  length: number | 'endless';
  /** Wrong diagnoses allowed before the run ends (endless modes) */
  lives?: number;
  /** Overrides each case's own timer, seconds */
  timeLimitSec?: number;
  /** Multiplier applied to case scores for this mode */
  scoreMultiplier?: number;
  /** Whether the player may use hints */
  hints?: boolean;
  /** Whether "let the tech do it" auto-run is allowed */
  autoRun?: boolean;
}

export interface RunSnapshot {
  modeId: string;
  completed: string[];
  failed: string[];
  totalScore: number;
  lives: number | null;
  combo: number;
  seed: string;
}

export interface ModeModule {
  id: string;
  title: string;
  tagline: string;
  icon: string;
  accent: string;
  order: number;
  sin?: SinId;
  rules: ModeRules;
  /** Pick the next case, or null to end the run. Must not repeat within a run unless pool exhausted. */
  pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null;
  /** Optional gate: return a reason string when locked */
  locked?(services: GameServices): string | undefined;
}
