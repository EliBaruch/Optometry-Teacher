/**
 * The FX layer's stylesheet, injected once. Kept in TS so the library is
 * self-contained (no CSS import needed by consumers or tests).
 */
const STYLE_ID = 'lumen-fx-styles';

const CSS = `
.lfx-canvas { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
.lfx-float {
  position: absolute; pointer-events: none; white-space: nowrap; will-change: transform, opacity;
  font-family: 'Space Grotesk', 'Inter Variable', system-ui, sans-serif; font-weight: 700;
  letter-spacing: -0.01em; font-variant-numeric: tabular-nums; line-height: 1;
  color: var(--lfx-c, #3b6bff);
  -webkit-text-stroke: 3px rgba(255, 255, 255, 0.92);
  paint-order: stroke fill;
  text-shadow: 0 4px 14px rgba(15, 40, 60, 0.18);
  opacity: 0; transform: translate(-50%, -50%);
}
.lfx-flash {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  mix-blend-mode: normal;
}
.lfx-vignette {
  position: absolute; inset: 0; pointer-events: none; opacity: 0;
  background: radial-gradient(ellipse 75% 70% at 50% 50%, transparent 52%,
    color-mix(in srgb, var(--lfx-c, #ef4444) 32%, transparent) 82%,
    color-mix(in srgb, var(--lfx-c, #ef4444) 62%, transparent) 115%);
  box-shadow: inset 0 0 120px 10px color-mix(in srgb, var(--lfx-c, #ef4444) 34%, transparent);
  mix-blend-mode: normal;
}
.fx-hitstop { scale: 1.006; filter: saturate(1.06); transition: none !important; }
@media (prefers-reduced-motion: reduce) { .fx-hitstop { scale: none; } }
html.reduced-motion .fx-hitstop, .fx-hitstop.fx-hitstop--still { scale: none; }
`;

export function ensureFxStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  doc.head.appendChild(el);
}
