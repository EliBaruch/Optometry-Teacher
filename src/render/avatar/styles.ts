/** Small stylesheet for portrait micro-animations, injected once. */
const STYLE_ID = 'lumen-avatar-styles';

const CSS = `
.lav-root { display: block; overflow: visible; -webkit-user-select: none; user-select: none; }
.lav-bust { overflow: hidden; border-radius: 50%; }
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
