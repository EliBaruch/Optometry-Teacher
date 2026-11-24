import type { Eye, PatientFindings } from './clinical';
import type { PatientProfile } from './case';
import type { AudioPort, FxPort } from './ports';
import type { Rng } from './rng';
import type { TestId } from './tests';
export type { TestId } from './tests';

/** A single line written into the patient chart after a test. */
export interface RevealedFinding {
  /** e.g. "VA sc", "IOP", "Cup:disc" */
  label: string;
  /** e.g. "20/80", "48 mmHg", "0.8" */
  value: string;
  eye?: Eye | 'OU';
  flag: 'normal' | 'abnormal' | 'critical';
}

export interface MiniGameResult {
  testId: TestId;
  /** 0..1 how skilfully the player performed the test */
  accuracy: number;
  timeMs: number;
  findings: RevealedFinding[];
  perfect?: boolean;
  /** true when the player delegated the test to the tech (Sloth) — reduced score */
  autoRun?: boolean;
}

export interface MiniGameContext {
  testId: TestId;
  patient: PatientProfile;
  findings: PatientFindings;
  /** 'case' = part of a diagnosis; 'practice' = arcade/standalone */
  mode: 'case' | 'practice';
  /** 0 (gentle) .. 1 (brutal) */
  difficulty: number;
  rng: Rng;
  audio: AudioPort;
  fx: FxPort;
  reducedMotion: boolean;
}

export type MiniGameDone = (result: MiniGameResult) => void;

export interface PracticeScenario {
  patient: PatientProfile;
  findings: PatientFindings;
  /** Human-readable correct answer shown after practice */
  answer: string;
}

export interface MiniGameModule {
  /** Must be a TestId from the catalogue */
  id: TestId;
  title: string;
  /** One-line instruction shown before the game starts */
  instructions: string;
  /** Emoji or short inline-SVG string used as the tool icon */
  icon: string;
  /** What the player learns from this mini-game */
  teaches: string[];
  /**
   * Mount the game into `host`. Must render everything inside host, call
   * `done` exactly once, and return a cleanup that removes listeners/RAF/timers.
   */
  mount(host: HTMLElement, ctx: MiniGameContext, done: MiniGameDone): () => void;
  /** Canonical chart entries for these findings — used for auto-run & reports. */
  report(findings: PatientFindings, patient: PatientProfile): RevealedFinding[];
  /** Generate a random standalone scenario for Arcade practice. */
  practice?(rng: Rng, difficulty: number): PracticeScenario;
}
