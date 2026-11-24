/**
 * Clinic colour themes: recolours the candle-gold accent family of the design
 * tokens by setting `data-theme` on <html> plus one generated <style> sheet.
 * The default theme ('candlelight') removes the attribute entirely.
 */
import { THEMES, type ThemePalette } from './catalog';

const STYLE_ID = 'eco-theme-sheet';
const ATTR = 'data-theme';
const OURS = new Set(THEMES.map((t) => t.id));

function rgb(hex: string): string {
  const n = parseInt(hex.replace('#', ''), 16);
  return `${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}`;
}

export function themeCss(id: string, p: ThemePalette): string {
  const a = rgb(p.accent);
  const d = rgb(p.deep);
  const sel = `html[${ATTR}="${id}"]`;
  return `${sel} {
  --lm-gold-100: ${p.pale}; --lm-gold-200: color-mix(in srgb, ${p.pale} 55%, ${p.accent});
  --lm-gold-300: color-mix(in srgb, ${p.pale} 25%, ${p.accent}); --lm-gold: ${p.accent};
  --lm-gold-500: ${p.deep}; --lm-gold-600: color-mix(in srgb, ${p.deep} 60%, ${p.shade}); --lm-gold-700: ${p.shade};
  --lm-gold-900: color-mix(in srgb, ${p.shade} 35%, #000); --lm-text-on-gold: ${p.ink};
  --lm-glow-gold: 0 0 0 1px rgba(${a}, 0.35), 0 0 18px rgba(${a}, 0.28), 0 0 48px rgba(${d}, 0.18);
  --lm-glow-soft: 0 0 24px rgba(${a}, 0.14);
  --lm-text-glow: 0 0 18px rgba(${a}, 0.45), 0 0 2px rgba(${rgb(p.pale)}, 0.6);
  --lm-glass-border-hi: rgba(${a}, 0.34);
}
${sel} body {
  background-image:
    radial-gradient(120% 80% at 50% -10%, rgba(${rgb(p.sky[0])}, 0.55), transparent 60%),
    radial-gradient(90% 60% at 100% 110%, rgba(${rgb(p.sky[1])}, 0.09), transparent 60%),
    linear-gradient(180deg, var(--lm-ink-900), var(--lm-aubergine-700));
}
${sel} ::selection { background: rgba(${a}, 0.32); }
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
