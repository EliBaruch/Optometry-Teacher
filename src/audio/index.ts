import type { AudioPort } from '@core';
import { createAudioEngine } from './engine';

export { createAudioEngine, browserAudioEnv, type AudioEngine, type AudioEnv, type AudioStatus } from './engine';
export { SFX } from './sfx';
export { COMPOSITIONS } from './music/tracks';

/**
 * Lumen's procedural audio: every sound effect and all music are synthesised
 * live with WebAudio (no audio files). Safe to call anywhere — degrades to a
 * silent no-op where WebAudio is unavailable.
 */
export function createAudio(): AudioPort {
  return createAudioEngine();
}
