import { useEffect, type MutableRef } from 'preact/hooks';
import { getTabbables, nextInTrap } from '../lib/focus';

/**
 * Trap Tab focus inside `ref` while `active`; focuses the first tabbable (or
 * `initial` selector) on activation and restores the previously focused
 * element on deactivation.
 */
export function useFocusTrap(ref: MutableRef<HTMLElement | null>, active: boolean, initial?: string): void {
  useEffect(() => {
    const root = ref.current;
    if (!active || !root) return;
    const previous = document.activeElement as HTMLElement | null;
    const first = (initial && root.querySelector<HTMLElement>(initial)) || getTabbables(root)[0] || root;
    // Defer so entrance animations / autofocus inside children settle first.
    const t = setTimeout(() => first.focus({ preventScroll: true }), 30);
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return;
      const list = getTabbables(root);
      if (!list.length) {
        e.preventDefault();
        root.focus();
        return;
      }
      if (!root.contains(document.activeElement)) {
        e.preventDefault();
        list[0]!.focus();
        return;
      }
      const target = nextInTrap(list, document.activeElement, e.shiftKey);
      if (target) {
        e.preventDefault();
        target.focus();
      }
    };
    root.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      root.removeEventListener('keydown', onKey);
      if (previous && typeof previous.focus === 'function' && document.contains(previous)) previous.focus({ preventScroll: true });
    };
  }, [active]);
}
