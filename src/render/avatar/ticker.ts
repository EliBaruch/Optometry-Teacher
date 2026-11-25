/**
 * One shared requestAnimationFrame loop for every animated portrait on screen,
 * so a leaderboard of 20 avatars costs one RAF, not 20. Stops when idle.
 */
export type TickFn = (timeSec: number, dtSec: number, frame: number) => void;

const subs = new Set<TickFn>();
let raf = 0;
let last = 0;
let frameNo = 0;

function frame(t: number) {
  raf = 0;
  const dt = last ? Math.min(0.05, (t - last) / 1000) : 1 / 60;
  last = t;
  frameNo++;
  for (const fn of [...subs]) {
    try {
      fn(t / 1000, dt, frameNo);
    } catch (e) {
      subs.delete(fn);
      console.error('[avatar] tick failed', e);
    }
  }
  if (subs.size) raf = requestAnimationFrame(frame);
  else last = 0;
}

export function onTick(fn: TickFn): () => void {
  subs.add(fn);
  if (!raf && typeof requestAnimationFrame === 'function') raf = requestAnimationFrame(frame);
  return () => {
    subs.delete(fn);
    if (!subs.size && raf) {
      cancelAnimationFrame(raf);
      raf = 0;
      last = 0;
    }
  };
}

/** For tests. */
export function activeTickers(): number {
  return subs.size;
}
