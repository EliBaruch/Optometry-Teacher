/**
 * Clinic colour themes (Clinic Glass): each palette recolours the brand/accent token family,
 * the primary azure capsule and the daylight mesh behind the glass, by setting `data-theme`
 * on <html> plus one generated <style> sheet. Every accent is a deep, legible colour on white
 * (white text on fills). The default theme ('candlelight', shown as "Lumen Azure") removes
 * the attribute entirely so the base tokens apply.
 */
import { THEMES, type ThemePalette } from './catalog';

const STYLE_ID = 'eco-theme-sheet';
const ATTR = 'data-theme';
const OURS = new Set(THEMES.map((t) => t.id));

function rgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

const mixW = (c: string, pct: number) => `color-mix(in srgb, ${c} ${pct}%, #ffffff)`;

export function themeCss(id: string, p: ThemePalette): string {
  const a = rgb(p.accent);
  const d = rgb(p.deep);
  const s0 = rgb(p.sky[0]);
  const s1 = rgb(p.sky[1]);
  const sel = `html[${ATTR}="${id}"]`;
  const gradient = `linear-gradient(135deg, ${mixW(p.accent, 80)} 0%, ${p.accent} 55%, ${p.to ?? p.deep} 100%)`;
  return `${sel} {
  --lm-brand-50: ${p.pale}; --lm-brand-100: ${mixW(p.accent, 14)}; --lm-brand-200: ${mixW(p.accent, 28)};
  --lm-brand-300: ${mixW(p.accent, 50)}; --lm-brand-400: ${mixW(p.accent, 72)}; --lm-brand-500: ${mixW(p.accent, 90)};
  --lm-brand-600: ${p.accent}; --lm-brand-700: ${p.deep}; --lm-brand-800: ${p.shade};
  --lm-brand-900: color-mix(in srgb, ${p.shade} 65%, #0a1633);
  --lm-accent: ${p.accent}; --lm-accent-text: ${p.deep}; --lm-accent-soft: ${p.pale}; --lm-on-accent: ${p.ink};
  --lm-accent-gradient: ${gradient};
  --lm-glow-gold: 0 0 0 1px rgba(${a}, 0.2), 0 10px 28px -8px rgba(${a}, 0.45);
  --lm-glow-soft: 0 12px 32px -12px rgba(${a}, 0.35);
  --lm-glass-border-hi: rgba(${a}, 0.4);
  --lm-focus-color: ${mixW(p.accent, 90)};
  --lm-focus-glow: 0 0 0 4px rgba(${a}, 0.2);
  --lm-focus-ring: 0 0 0 2px #fff, 0 0 0 4px ${mixW(p.accent, 90)};
}
${sel} body {
  background-image:
    radial-gradient(60% 55% at 92% 2%, rgba(${s0}, 0.55), transparent 70%),
    radial-gradient(50% 50% at 6% 10%, rgba(${s1}, 0.42), transparent 70%),
    radial-gradient(55% 50% at 70% 100%, rgba(${a}, 0.2), transparent 70%),
    radial-gradient(45% 45% at 10% 95%, rgba(${s0}, 0.3), transparent 70%),
    linear-gradient(180deg, #f3f6fd, var(--lm-canvas));
}
${sel} .lm-backdrop:not(.lm-backdrop--emergency) {
  --bd-a: rgba(${s0}, 0.6); --bd-b: rgba(${s1}, 0.46); --bd-c: rgba(${s1}, 0.3); --bd-d: rgba(${a}, 0.24);
}
${sel} ::selection { background: rgba(${a}, 0.28); }
${sel} .lm-btn--primary {
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.22) 0%, rgba(255, 255, 255, 0) 52%), ${gradient};
  box-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.45), inset 0 -1px 0.5px rgba(10, 22, 51, 0.28), 0 1px 2px rgba(${d}, 0.3), 0 8px 20px -8px rgba(${a}, 0.6);
}
${sel} .lm-btn--primary:hover:not(:disabled) {
  box-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.5), inset 0 -1px 0.5px rgba(10, 22, 51, 0.28), 0 1px 2px rgba(${d}, 0.3), 0 14px 28px -10px rgba(${a}, 0.7);
}
${sel} .lm-btn--primary:focus-visible { box-shadow: inset 0 1px 0.5px rgba(255, 255, 255, 0.45), var(--lm-focus-glow), 0 8px 20px -8px rgba(${a}, 0.6); }
`;
}

function ensureSheet(): void {
  if (typeof document === 'undefined' || document.getElementById(STYLE_ID)) return;
  const el = document.createElement('style');
  el.id = STYLE_ID;
  el.textContent = THEMES.filter((t) => t.id !== 'candlelight' && t.palette).map((t) => themeCss(t.id, t.palette!)).join('\n');
  document.head.appendChild(el);
}

/** Apply a theme id to <html>. Unknown ids / the default clear the attribute. */
export function applyTheme(id: string | null): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!id || id === 'candlelight' || !OURS.has(id)) {
    if (OURS.has(root.getAttribute(ATTR) ?? '')) root.removeAttribute(ATTR);
    return;
  }
  ensureSheet();
  root.setAttribute(ATTR, id);
}

/** Remove everything the theme layer added (on uninstall). */
export function removeThemeLayer(): void {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (OURS.has(root.getAttribute(ATTR) ?? '')) root.removeAttribute(ATTR);
  document.getElementById(STYLE_ID)?.remove();
}
