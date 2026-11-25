/**
 * Render-quality governor.
 *
 * Live glass (backdrop-filter) over an animated canvas is cheap on a GPU but
 * expensive on software or low-end compositors: every canvas frame forces each
 * panel to re-blur what is behind it. The Backdrop samples how often the
 * browser actually delivers animation frames while it runs, in ~1.5s windows
 * after a warm-up. Two slow windows in a row (not one: app boot and scene
 * mounts are the heaviest moments) switch the page to "lite" rendering
 * (`html.lm-lite`): glass becomes near-opaque with no live blur and the
 * backdrop animates at a lower frame rate. Every new Backdrop (each scene)
 * re-probes, and three comfortably fast windows lift an automatic verdict once
 * per session (no flapping). setLiteRendering() overrides all of it.
 */

export const LITE_CLASS = 'lm-lite';

export interface FrameSampler {
  /**
   * Feed one rAF timestamp. Returns the median frame interval (ms) each time a
   * sampling window completes, otherwise null.
   */
  tick(now: number): number | null;
  /** Forget the previous timestamp (call after a pause, e.g. tab hidden / off screen). */
  reset(): void;
  /** True once every window has been sampled. */
  readonly done: boolean;
}

export interface FrameSamplerOptions {
  /** Ignore frames for this long after start (scene mount, fonts, first paint). */
  warmupMs?: number;
  /** Each window spans at least this much sampled time… */
  windowMs?: number;
  /** …and at least this many intervals (or closes early at maxSamples). */
  minSamples?: number;
  maxSamples?: number;
  /** How many consecutive windows to sample before stopping. */
  windows?: number;
}

/** Median of a numeric list (0 for an empty list). */
export function median(values: readonly number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((a, b) => a - b);
  const mid = s.length >> 1;
  return s.length % 2 ? s[mid]! : (s[mid - 1]! + s[mid]!) / 2;
}

/** Pure sampler: no DOM access, easy to unit test. */
export function createFrameSampler({
  warmupMs = 1200, windowMs = 1500, minSamples = 8, maxSamples = 90, windows = 6,
}: FrameSamplerOptions = {}): FrameSampler {
  let prev = -1;
  let warm = 0;
  let sampled = 0;
  let left = windows;
  let intervals: number[] = [];
  return {
    tick(now) {
      if (left <= 0) return null;
      const dt = prev < 0 ? -1 : now - prev;
      prev = now;
      // Long gaps are pauses (tab switch, debugger), not slowness.
      if (dt < 0 || dt > 500) return null;
      if (warm < warmupMs) {
        warm += dt;
        return null;
      }
      intervals.push(dt);
      sampled += dt;
      if (intervals.length < maxSamples && (sampled < windowMs || intervals.length < minSamples)) return null;
      const m = median(intervals);
      intervals = [];
      sampled = 0;
      left--;
      return m;
    },
    reset() {
      prev = -1;
    },
    get done() {
      return left <= 0;
    },
  };
}

/* ── governor ─────────────────────────────────────────────────────────── */

export interface GovernorState {
  lite: boolean;
  /** Consecutive slow / fast windows seen. */
  slow: number;
  fast: number;
  /** How many times an automatic lite verdict has been lifted this session. */
  lifts: number;
  /** Set by setLiteRendering(): automatic verdicts are ignored from then on. */
  forced: boolean;
}

export interface GovernorOptions {
  /** Median interval (ms) above which a window counts as slow. 40ms ≈ 25 fps. */
  slowMs?: number;
  /** Median interval (ms) below which a window (in lite) counts as comfortably fast. 22ms ≈ 45 fps. */
  liftMs?: number;
  /** Consecutive slow windows before lite engages (hysteresis against a one-off hitch, e.g. app boot). */
  engageAfter?: number;
  /** Consecutive fast windows before an automatic lite verdict is lifted. */
  liftAfter?: number;
  /** Lift at most this many times per session (prevents flapping on borderline devices). */
  maxLifts?: number;
}

export const GOVERNOR_INITIAL: GovernorState = { lite: false, slow: 0, fast: 0, lifts: 0, forced: false };

/** Pure reducer: fold one window's median frame interval into the governor state. */
export function governorStep(s: GovernorState, medianMs: number, o: GovernorOptions = {}): GovernorState {
  const { slowMs = 40, liftMs = 22, engageAfter = 2, liftAfter = 3, maxLifts = 1 } = o;
  if (s.forced) return s;
  const slow = medianMs > slowMs ? s.slow + 1 : 0;
  const fast = medianMs < liftMs ? s.fast + 1 : 0;
  if (!s.lite && slow >= engageAfter) return { ...s, lite: true, slow: 0, fast: 0 };
  if (s.lite && fast >= liftAfter && s.lifts < maxLifts) return { ...s, lite: false, slow: 0, fast: 0, lifts: s.lifts + 1 };
  return { ...s, slow, fast };
}

/** Whether the governor can still change its mind (so a sampler is worth running). */
export function governorOpen(s: GovernorState, o: GovernorOptions = {}): boolean {
  if (s.forced) return false;
  return !s.lite || s.lifts < (o.maxLifts ?? 1);
}

// Seeded from the html class so a hot module reload mid-session keeps the verdict.
let state: GovernorState = {
  ...GOVERNOR_INITIAL,
  lite: typeof document !== 'undefined' && document.documentElement.classList.contains(LITE_CLASS),
};
const listeners = new Set<(lite: boolean) => void>();

function apply(next: GovernorState): void {
  const changed = next.lite !== state.lite;
  state = next;
  if (typeof document !== 'undefined') document.documentElement.classList.toggle(LITE_CLASS, state.lite);
  if (changed) for (const fn of [...listeners]) fn(state.lite);
}

/** Subscribe to lite-rendering changes. Returns the unsubscribe function. */
export function onLiteRenderingChange(fn: (lite: boolean) => void): () => void {
  listeners.add(fn);
  return () => void listeners.delete(fn);
}

/** True while the session renders in lite mode. */
export function isLiteRendering(): boolean {
  return state.lite;
}

/** Whether a frame sampler should run (each Backdrop mount, i.e. each scene, re-probes while this is true). */
export function needsQualityProbe(): boolean {
  return governorOpen(state);
}

/** Feed one sampled window (median frame interval in ms) to the governor. */
export function reportFrameWindow(medianMs: number): void {
  apply(governorStep(state, medianMs));
}

/** Force lite rendering on or off (e.g. from a graphics setting); disables the automatic governor. */
export function setLiteRendering(on: boolean): void {
  apply({ ...state, lite: on, forced: true, slow: 0, fast: 0 });
}

/** Test helper: back to the initial, unjudged state. */
export function resetQualityForTests(): void {
  state = { ...GOVERNOR_INITIAL };
  if (typeof document !== 'undefined') document.documentElement.classList.remove(LITE_CLASS);
}
