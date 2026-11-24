/**
 * Modal isolation helpers (DOM only, no framework).
 *
 * `isolate(el)` makes everything outside `el` inert (not focusable, not
 * clickable, hidden from assistive tech) and stops the scroll containers that
 * hold `el` from scrolling. It returns a function that undoes exactly what it
 * changed, so nested dialogs unwind cleanly in reverse order.
 *
 * Live regions (`[aria-live]`, e.g. ToastHost) are left alone so that
 * announcements made while a dialog is open are still read out.
 */

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'LINK', 'TEMPLATE', 'NOSCRIPT']);

function keepInteractive(el: Element): boolean {
  if (SKIP_TAGS.has(el.tagName)) return true;
  return el.hasAttribute('aria-live') || el.querySelector('[aria-live]') !== null;
}

function isScrollContainer(el: Element): boolean {
  if (typeof getComputedStyle !== 'function') return false;
  const cs = getComputedStyle(el);
  return /(auto|scroll)/.test(cs.overflowY + cs.overflowX) && (el.scrollHeight > el.clientHeight || el.scrollWidth > el.clientWidth);
}

/** Make the rest of the document inert around `el` and lock scrolling. Returns the undo function. */
export function isolate(el: HTMLElement): () => void {
  const madeInert: Element[] = [];
  const locked: { el: HTMLElement; overflow: string }[] = [];
  const doc = el.ownerDocument;

  for (let node: HTMLElement | null = el; node && node !== doc.body && node !== doc.documentElement; node = node.parentElement) {
    const parent: HTMLElement | null = node.parentElement;
    if (!parent) break;
    for (const sib of Array.from(parent.children)) {
      if (sib === node || sib.hasAttribute('inert') || keepInteractive(sib)) continue;
      sib.setAttribute('inert', '');
      madeInert.push(sib);
    }
    if (parent !== doc.body && isScrollContainer(parent)) {
      locked.push({ el: parent, overflow: parent.style.overflow });
      parent.style.overflow = 'hidden';
    }
  }
  const root = doc.documentElement;
  locked.push({ el: root, overflow: root.style.overflow });
  root.style.overflow = 'hidden';

  return () => {
    for (const sib of madeInert) sib.removeAttribute('inert');
    for (let i = locked.length - 1; i >= 0; i--) locked[i]!.el.style.overflow = locked[i]!.overflow;
  };
}
