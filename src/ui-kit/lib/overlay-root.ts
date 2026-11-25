/**
 * Where body-level overlays (portals, ceremony hosts) should mount.
 *
 * Overlays live outside the scene tree so glass panels' backdrop-filter can't
 * clip them, but they must still stay inside the playable area: when the host
 * reserves a footer strip (see watchHostBadge in app/main.tsx), #lm-overlays is
 * shrunk to end above it, exactly like #app. Falls back to <body> when the page
 * has no overlay root (tests, isolated harnesses).
 */
export function overlayRoot(): HTMLElement {
  return document.getElementById('lm-overlays') ?? document.body;
}
