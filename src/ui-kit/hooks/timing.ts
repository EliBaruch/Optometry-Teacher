import { useEffect, useRef } from 'preact/hooks';

/** Keep a ref pointed at the latest value (lets effects call fresh callbacks without resubscribing). */
export function useLatest<T>(value: T) {
  const ref = useRef(value);
  ref.current = value;
  return ref;
}

/** setInterval that always calls the latest callback. Pass `null` to pause. Cleans up on unmount. */
export function useInterval(fn: () => void, ms: number | null): void {
  const cb = useLatest(fn);
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => cb.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}

/** setTimeout that always calls the latest callback. Pass `null` to cancel. Restarts when `ms` changes. */
export function useTimeout(fn: () => void, ms: number | null): void {
  const cb = useLatest(fn);
  useEffect(() => {
    if (ms === null) return;
    const id = setTimeout(() => cb.current(), ms);
    return () => clearTimeout(id);
  }, [ms]);
}

/**
 * requestAnimationFrame loop. `fn(dtSeconds, elapsedSeconds)`; dt is clamped
 * to 1/15s so a backgrounded tab doesn't teleport animations. Pauses while
 * `active` is false and while the document is hidden.
 */
export function useAnimationFrame(fn: (dt: number, elapsed: number) => void, active = true): void {
  const cb = useLatest(fn);
  useEffect(() => {
    if (!active || typeof requestAnimationFrame !== 'function') return;
    let raf = 0;
    let last = -1;
    let elapsed = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      if (typeof document !== 'undefined' && document.hidden) {
        last = -1;
        return;
      }
      const dt = last < 0 ? 0 : Math.min((now - last) / 1000, 1 / 15);
      last = now;
      elapsed += dt;
      cb.current(dt, elapsed);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [active]);
}
