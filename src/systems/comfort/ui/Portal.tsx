import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';

/**
 * Renders overlays at <body> level. HUD slots and glass panels use
 * backdrop-filter, which would otherwise become the containing block of a
 * fixed-position modal and clip it.
 */
export function Portal(props: { children: ComponentChildren }) {
  if (typeof document === 'undefined' || !document.body) return <>{props.children}</>;
  return createPortal(<>{props.children}</>, document.body);
}
