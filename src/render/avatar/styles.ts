/** Small stylesheet for portrait micro-animations, injected once. */
const STYLE_ID = 'lumen-avatar-styles';

const CSS = `
.lav-root { display: block; overflow: visible; -webkit-user-select: none; user-select: none; }
.lav-bust { overflow: hidden; border-radius: 50%; }
.lav-portrait { position: relative; aspect-ratio: 5 / 6; box-sizing: border-box; contain: layout style; }
.lav-portrait.lav-framed { overflow: hidden; }
.lav-layer { position: absolute; left: 0; top: 0; width: 100%; height: 100%; overflow: visible; pointer-events: none; }
.lav-rig { position: absolute; inset: 0; pointer-events: none; }
/* Idle pose: compositor-only keyframes on two wrappers. Nothing else is
   promoted (each extra layer costs more to composite than it saves). */
.lav-posed .lav-breathe { animation: lav-breathe 4.4s ease-in-out infinite; will-change: transform; }
.lav-posed .lav-sway { animation: lav-sway 13s ease-in-out infinite; will-change: transform; }
/* large portraits only: a blink re-rasters the small eye layer, not the face */
.lav-posed .lav-eyes { will-change: transform; }
@keyframes lav-breathe {
  0%, 100% { transform: translate3d(0, 0, 0); }
  42% { transform: translate3d(0, -0.5%, 0); }
  55% { transform: translate3d(0, -0.48%, 0); }
}
@keyframes lav-sway {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(0deg); }
  14% { transform: translate3d(0.22%, 0.12%, 0) rotate(0.85deg); }
  31% { transform: translate3d(-0.05%, -0.1%, 0) rotate(-0.3deg); }
  49% { transform: translate3d(-0.3%, 0.22%, 0) rotate(-1.15deg); }
  66% { transform: translate3d(-0.08%, -0.16%, 0) rotate(0.2deg); }
  83% { transform: translate3d(0.18%, 0.08%, 0) rotate(0.7deg); }
}
@media (prefers-reduced-motion: reduce) { .lav-posed .lav-breathe, .lav-posed .lav-sway { animation: none; } }
html.reduced-motion .lav-posed .lav-breathe, html.reduced-motion .lav-posed .lav-sway { animation: none; }
.lav-drop { animation: lav-drop 3.4s cubic-bezier(.45,0,.75,1) infinite; transform-box: fill-box; }
@keyframes lav-drop {
  0%, 35% { transform: translateY(-6px); opacity: 0; }
  50% { opacity: 1; }
  92% { transform: translateY(7px); opacity: .9; }
  100% { transform: translateY(9px); opacity: 0; }
}
@media (prefers-reduced-motion: reduce) { .lav-drop { animation: none; } }
html.reduced-motion .lav-drop { animation: none; }
`;

export function ensureAvatarStyles(doc: Document = document): void {
  if (doc.getElementById(STYLE_ID)) return;
  const el = doc.createElement('style');
  el.id = STYLE_ID;
  el.textContent = CSS;
  doc.head.appendChild(el);
}
