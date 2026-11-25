import type { ComponentChildren } from 'preact';
import { createPortal } from 'preact/compat';
import { overlayRoot } from '@ui-kit';

/**
 * Renders overlays at <body> level. HUD slots and glass panels use
 * backdrop-filter, which would otherwise become the containing block of a
 * fixed-position modal and clip it. The overlay root stops above any host
 * footer strip, so nothing here can slide under it.
 */
export function Portal(props: { children: ComponentChildren }) {
  if (typeof document === 'undefined' || !document.body) return <>{props.children}</>;
  return createPortal(<>{props.children}</>, overlayRoot());
}
