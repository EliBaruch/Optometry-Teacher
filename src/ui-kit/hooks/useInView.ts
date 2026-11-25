import { useEffect, useState, type MutableRef } from 'preact/hooks';

/**
 * True while `ref`'s element is on (or within `rootMargin` of) the screen.
 * Decorative infinite loops use it to pause when scrolled away, so long pages
 * (codex, galleries, results) don't repaint animations nobody can see.
 * Defaults to true where IntersectionObserver is unavailable (tests, SSR).
 */
export function useInView(ref: MutableRef<Element | null>, rootMargin = '160px'): boolean {
  const [inView, setInView] = useState(true);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver !== 'function') return;
    const io = new IntersectionObserver(
      (entries) => {
        const e = entries[entries.length - 1];
        if (e) setInView(e.isIntersecting);
      },
      { rootMargin },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [rootMargin]);
  return inView;
}
