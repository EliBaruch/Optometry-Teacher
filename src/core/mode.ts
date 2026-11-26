import type { ClinicalCase } from './case';
import type { GameServices } from './services';

export interface ModeRules {
  /** Number of patients in the run; 'endless' until lives run out */
  length: number | 'endless';
  /** Wrong diagnoses allowed before the run ends (endless modes) */
  lives?: number;
  /** Fallback timer (seconds) for cases that have no emergency timer of their own */
  timeLimitSec?: number;
  /** Multiplier applied to case scores for this mode */
  scoreMultiplier?: number;
  /** Whether the player may use hints */
  hints?: boolean;
  /** Whether "let the tech do it" auto-run is allowed */
  autoRun?: boolean;
  /** Score multiplier as a function of the current combo (applied by RunController.report) */
  comboMultiplier?: (combo: number) => number;
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
  /** Internal design note only */
  drive?: import('./systems').DesignDrive;
  rules: ModeRules;
  /** Pick the next case, or null to end the run. Must not repeat within a run unless pool exhausted. */
  pickNext(services: GameServices, run: RunSnapshot): ClinicalCase | null;
  /** Title/tagline written natively for other editions (see modeText). */
  text?: Partial<Record<import('./i18n').Locale, import('./i18n').ModeText>>;
  /** Optional gate: return a reason string when locked */
  locked?(services: GameServices): string | undefined;
  /** Optional: subscribe to events / set up state once at boot. Returns uninstall. */
  install?(services: GameServices): () => void;
}
