/**
 * "Has the player actually seen it?" — the results screen fades its extra
 * panels in late (opacity 0 → 1) and may sit below the fold, so the card
 * sleeve must not auto-open until it has been genuinely visible for a beat.
 */
import { useEffect, type MutableRef } from 'preact/hooks';

/** Product of the opacities along an ancestor chain (element first). */
export function effectiveOpacity(chain: readonly number[]): number {
  let o = 1;
  for (const v of chain) o *= Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
  return o;
}

/** Fraction (0..1) of a rect's height that lies inside the viewport. */
export function visibleFraction(top: number, bottom: number, viewportHeight: number): number {
  const h = bottom - top;
  if (h <= 0 || viewportHeight <= 0) return 0;
  return Math.max(0, Math.min(bottom, viewportHeight) - Math.max(top, 0)) / h;
}

function isSeen(el: HTMLElement): boolean {
  if (typeof document !== 'undefined' && document.visibilityState === 'hidden') return false;
  const r = el.getBoundingClientRect();
  if (!r.width || visibleFraction(r.top, r.bottom, window.innerHeight) < 0.5) return false;
  const chain: number[] = [];
  for (let n: HTMLElement | null = el; n; n = n.parentElement) {
    const cs = getComputedStyle(n);
    if (cs.visibility === 'hidden' || cs.display === 'none') return false;
    chain.push(parseFloat(cs.opacity));
  }
  return effectiveOpacity(chain) > 0.6;
}

/**
 * Calls `onSeen` once the element has been continuously visible for `ms`.
 * Polls gently (no layout thrash) and cleans up on unmount or when disabled.
 */
export function useSeenFor(ref: MutableRef<HTMLElement | null>, ms: number, onSeen: () => void, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const STEP = 200;
    let seenFor = 0;
    const id = setInterval(() => {
      const el = ref.current;
      if (!el) return;
      seenFor = isSeen(el) ? seenFor + STEP : 0;
      if (seenFor >= ms) {
        clearInterval(id);
        onSeen();
      }
    }, STEP);
    return () => clearInterval(id);
  }, [enabled, ms]);
}
