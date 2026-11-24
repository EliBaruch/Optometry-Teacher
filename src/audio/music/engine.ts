import type { TrackId } from '@core';
import type { Kit } from '../dsp';
import type { BusInputs } from '../mixer';
import { TrackPlayer } from './player';
import { COMPOSITIONS } from './tracks';

export const CROSSFADE = 1.8;

/**
 * Owns the current track and any tracks still fading out. `tick()` is driven
 * by the engine's wake-up timer; all timing comes from the AudioContext clock.
 */
export class MusicEngine {
  private current: TrackPlayer | null = null;
  private currentId: TrackId | null = null;
  private fading: TrackPlayer[] = [];
  private seed: number;

  /**
   * @param onTempo called when a new track starts, so tempo-synced effects
   *   (the mixer's echo) can glide onto the new grid over the crossfade.
   */
  constructor(
    private k: Kit,
    private bus: BusInputs,
    seed = Date.now(),
    private onTempo?: (bpm: number, glide: number) => void,
  ) {
    this.seed = seed >>> 0;
  }

  get track(): TrackId | null {
    return this.currentId;
  }

  /** Anything (playing or fading) that needs the scheduler to keep ticking? */
  get active(): boolean {
    return !!this.current || this.fading.length > 0;
  }

  set(track: TrackId | null, fade = CROSSFADE): void {
    if (track === this.currentId) return;
    const now = this.k.ctx.currentTime;
    if (this.current) {
      this.current.stop(now, fade);
      this.fading.push(this.current);
    }
    this.current = null;
    this.currentId = track;
    const comp = track ? COMPOSITIONS[track] : undefined;
    if (!comp) return;
    this.seed = (this.seed * 1664525 + 1013904223) >>> 0;
    this.onTempo?.(comp.bpm, fade);
    const p = new TrackPlayer(this.k, this.bus, comp, this.seed);
    p.start(now, fade);
    this.current = p;
    // Schedule the first notes immediately rather than waiting for the next wake-up.
    p.tick(now);
  }

  tick(): void {
    const now = this.k.ctx.currentTime;
    this.current?.tick(now);
    if (this.fading.length) {
      for (const p of this.fading) p.tick(now);
      const alive: TrackPlayer[] = [];
      for (const p of this.fading) {
        if (p.done(now)) p.dispose();
        else alive.push(p);
      }
      this.fading = alive;
    }
  }

  dispose(): void {
    this.current?.dispose();
    for (const p of this.fading) p.dispose();
    this.current = null;
    this.currentId = null;
    this.fading = [];
  }
}
