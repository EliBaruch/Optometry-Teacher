/**
 * Ports: interfaces for cross-cutting services. Concrete adapters live in
 * src/audio, src/render (fx) and src/learning; null adapters live here so any
 * module can be tested or run with the real one removed.
 */
import type { DiagnosisId } from './case';

export type SfxId =
  | 'click' | 'hover' | 'select' | 'back' | 'success' | 'fail' | 'error' | 'coin' | 'coins'
  | 'levelup' | 'whoosh' | 'heartbeat' | 'alarm' | 'tick' | 'combo' | 'pop' | 'sparkle'
  | 'thud' | 'unlock' | 'drumroll' | 'reveal' | 'lens-click' | 'dial' | 'flashlight'
  | 'door' | 'stamp' | 'chest-open' | 'rare' | 'legendary' | 'streak-fire' | 'countdown';

export type TrackId = 'title' | 'hub' | 'exam' | 'emergency' | 'results' | 'zen';

export interface AudioPort {
  play(id: SfxId, opts?: { volume?: number; pitch?: number }): void;
  music(track: TrackId | null): void;
  /** Must be called from a user gesture to unlock WebAudio. */
  unlock(): void;
  setVolumes(v: { master: number; sfx: number; music: number }): void;
}

export interface BurstOptions {
  kind?: 'confetti' | 'sparks' | 'coins' | 'stars' | 'hearts' | 'embers';
  count?: number;
  color?: string;
}

export interface FxPort {
  shake(strength?: number, ms?: number): void;
  flash(color?: string, ms?: number): void;
  burst(x: number, y: number, opts?: BurstOptions): void;
  floatText(text: string, x: number, y: number, opts?: { color?: string; size?: number }): void;
  /** Brief global freeze-frame for impact */
  hitstop(ms?: number): void;
  vignette(color: string, ms?: number): void;
}

export interface MasteryStats {
  seen: number;
  mastered: number;
  due: number;
}

export interface LearningPort {
  /** quality: 0 (blackout) .. 5 (perfect, fast) — SM-2 style */
  record(diagnosisId: DiagnosisId, quality: number): void;
  /** Diagnoses due for review, most overdue first */
  due(limit?: number): DiagnosisId[];
  /** 0..1 mastery estimate */
  mastery(diagnosisId: DiagnosisId): number;
  stats(): MasteryStats;
}

export const nullAudio: AudioPort = { play() {}, music() {}, unlock() {}, setVolumes() {} };
export const nullFx: FxPort = { shake() {}, flash() {}, burst() {}, floatText() {}, hitstop() {}, vignette() {} };
export const nullLearning: LearningPort = {
  record() {},
  due: () => [],
  mastery: () => 0,
  stats: () => ({ seen: 0, mastered: 0, due: 0 }),
};
