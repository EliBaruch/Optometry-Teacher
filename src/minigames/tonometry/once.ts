import type { MiniGameDone } from '@core';

/**
 * Wrap a mini-game `done` so it fires at most once, and never after `cancel()`
 * (the mount's cleanup) — the contract the exam room relies on.
 */
export function onceDone(done: MiniGameDone): { done: MiniGameDone; cancel: () => void } {
  let closed = false;
  return {
    done: (r) => {
      if (closed) return;
      closed = true;
      done(r);
    },
    cancel: () => {
      closed = true;
    },
  };
}
