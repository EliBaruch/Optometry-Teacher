/**
 * Holographic tilt: pointer (and optionally device tilt) drives CSS custom
 * properties on the card — no re-renders, one rAF per frame at most.
 *   --gc-rx/--gc-ry  rotation in deg    --gc-mx/--gc-my  light position in %
 *   --gc-hyp  0..1 distance of the light from centre
 */
import { useEffect, type MutableRef } from 'preact/hooks';

export interface HoloOptions {
  /** Max tilt in degrees (0 = glare only, e.g. reduced motion). */
  maxTilt?: number;
  /** Also follow device orientation (phones) when available. */
  device?: boolean;
  enabled?: boolean;
}

export function holoVars(px: number, py: number, maxTilt: number): Record<string, string> {
  const cx = Math.max(0, Math.min(1, px));
  const cy = Math.max(0, Math.min(1, py));
  const dx = cx - 0.5;
  const dy = cy - 0.5;
  return {
    '--gc-rx': `${(-dy * 2 * maxTilt).toFixed(2)}deg`,
    '--gc-ry': `${(dx * 2 * maxTilt).toFixed(2)}deg`,
    '--gc-mx': `${(cx * 100).toFixed(1)}%`,
    '--gc-my': `${(cy * 100).toFixed(1)}%`,
    '--gc-hyp': Math.min(1, Math.hypot(dx, dy) * 2).toFixed(3),
  };
}

const RESET = holoVars(0.5, 0.5, 0);

export function useHolo(ref: MutableRef<HTMLElement | null>, { maxTilt = 14, device = false, enabled = true }: HoloOptions = {}): void {
  useEffect(() => {
    const el = ref.current;
    if (!el || !enabled) return;
    let raf = 0;
    let pending: Record<string, string> | null = null;
    const apply = (vars: Record<string, string>) => {
      pending = vars;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        if (!pending) return;
        for (const [k, v] of Object.entries(pending)) el.style.setProperty(k, v);
        pending = null;
      });
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      if (!r.width || !r.height) return;
      el.classList.add('is-live');
      apply(holoVars((e.clientX - r.left) / r.width, (e.clientY - r.top) / r.height, maxTilt));
    };
    const onLeave = () => {
      el.classList.remove('is-live');
      apply(RESET);
    };
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    el.addEventListener('pointercancel', onLeave);

    let onTilt: ((e: DeviceOrientationEvent) => void) | null = null;
    if (device && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      let base: { b: number; g: number } | null = null;
      onTilt = (e) => {
        if (e.beta == null || e.gamma == null) return;
        if (!base) base = { b: e.beta, g: e.gamma };
        const px = 0.5 + Math.max(-1, Math.min(1, (e.gamma - base.g) / 30)) * 0.5;
        const py = 0.5 + Math.max(-1, Math.min(1, (e.beta - base.b) / 30)) * 0.5;
        el.classList.add('is-live');
        apply(holoVars(px, py, maxTilt));
      };
      window.addEventListener('deviceorientation', onTilt);
    }
    return () => {
      cancelAnimationFrame(raf);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      el.removeEventListener('pointercancel', onLeave);
      if (onTilt) window.removeEventListener('deviceorientation', onTilt);
    };
  }, [enabled, maxTilt, device]);
}
