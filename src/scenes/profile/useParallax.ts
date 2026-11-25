import { useEffect, type MutableRef } from 'preact/hooks';

/** Pointer parallax for the hero: writes --mx / --my (-1..1) on the element. Off for touch and reduced motion. */
export function useParallax(ref: MutableRef<HTMLElement | null>, reduced: boolean) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (reduced) {
      el.style.setProperty('--mx', '0');
      el.style.setProperty('--my', '0');
      return;
    }
    let raf = 0;
    let x = 0;
    let y = 0;
    const onMove = (e: PointerEvent) => {
      if (e.pointerType === 'touch') return;
      x = (e.clientX / window.innerWidth) * 2 - 1;
      y = (e.clientY / window.innerHeight) * 2 - 1;
      if (raf) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        el.style.setProperty('--mx', x.toFixed(3));
        el.style.setProperty('--my', y.toFixed(3));
      });
    };
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, [reduced]);
}
