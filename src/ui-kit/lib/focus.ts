const TABBABLE = [
  'a[href]', 'area[href]', 'button:not([disabled])', 'input:not([disabled]):not([type="hidden"])',
  'select:not([disabled])', 'textarea:not([disabled])', 'iframe', 'audio[controls]', 'video[controls]',
  '[contenteditable]:not([contenteditable="false"])', '[tabindex]',
].join(',');

/** Focusable elements inside `root` in tab order (tabindex >= 0, not hidden/inert). */
export function getTabbables(root: HTMLElement): HTMLElement[] {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>(TABBABLE));
  return nodes.filter((el) => {
    if (el.tabIndex < 0) return false;
    if (el.closest('[inert],[hidden],[aria-hidden="true"]')) return false;
    return true;
  });
}

/** Given the current element and direction, which element should receive focus (wrapping). */
export function nextInTrap(list: HTMLElement[], current: Element | null, backwards: boolean): HTMLElement | null {
  if (!list.length) return null;
  const i = current ? list.indexOf(current as HTMLElement) : -1;
  if (i === -1) return backwards ? list[list.length - 1]! : list[0]!;
  if (backwards) return i === 0 ? list[list.length - 1]! : null;
  return i === list.length - 1 ? list[0]! : null;
}
