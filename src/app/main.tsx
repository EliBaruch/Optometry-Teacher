import { render } from 'preact';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
// Hebrew edition typography (unicode-range subsets: only downloaded when Hebrew glyphs render)
import '@fontsource/frank-ruhl-libre/400.css';
import '@fontsource/frank-ruhl-libre/500.css';
import '@fontsource/frank-ruhl-libre/700.css';
import '@fontsource-variable/heebo';
import { browserStorage, createServices, isLocale, isRtl, type Locale } from '@core';
import { APP_TEXT } from './strings';
import { ServicesProvider } from '@ui-kit';
import { createAudio } from '@audio';
import { createFx } from '@render';
import { attachLearning, createLearning } from '@learning';
import { discoverPlugins } from './discover';
import { Shell } from './Shell';
import './app.css';

/**
 * Composition root — the ONLY place that knows concrete implementations.
 * Swap any adapter here (e.g. createAudio -> nullAudio) without touching modules.
 */
async function boot() {
  const root = document.getElementById('app')!;
  const fxLayer = document.getElementById('fx-layer')!;

  const locale = editionLocale();
  applyEdition(locale);
  const services = createServices({ storage: browserStorage(), seed: Date.now(), locale });
  services.audio = createAudio();
  services.fx = createFx(fxLayer, root, { reducedMotion: () => services.settings.get().reducedMotion });
  services.learning = createLearning(services.save, services.clock.now);
  attachLearning(services);

  const applySettings = () => {
    const s = services.settings.get();
    services.audio.setVolumes({ master: s.masterVolume, sfx: s.sfxVolume, music: s.musicVolume });
    document.documentElement.classList.toggle('reduced-motion', s.reducedMotion);
    document.documentElement.classList.toggle('high-contrast', s.highContrast);
  };
  services.settings.subscribe(applySettings);
  applySettings();

  const unlock = () => services.audio.unlock();
  window.addEventListener('pointerdown', unlock, { once: true });
  window.addEventListener('keydown', unlock, { once: true });

  watchHostBadge();
  const sandbox = new URLSearchParams(location.search).get('sandbox');
  if (sandbox) {
    const { mountSandbox } = await import('./sandbox/Sandbox');
    await mountSandbox(root, services, sandbox);
    (window as unknown as { __lumen: unknown }).__lumen = services;
    return;
  }

  const { report } = await discoverPlugins(services);
  console.info('[lumen] plugins', report);
  if (!services.registries.scenes.has(services.router.current.get().id)) {
    const fallback = services.registries.scenes.has('hub') ? 'hub' : services.registries.scenes.all()[0]?.id;
    if (fallback) services.router.replace(fallback);
  }

  render(
    <ServicesProvider services={services}>
      <Shell />
    </ServicesProvider>,
    root,
  );
  services.bus.emit('app:ready', {});
  // Debug handle for QA / e2e tests.
  (window as unknown as { __lumen: unknown }).__lumen = services;
}

/**
 * Some hosts (e.g. Netlify's free-tier badge) inject a fixed overlay in the bottom-right corner.
 * Rather than hide their attribution, reserve a footer strip for it so it can never cover game UI.
 */
function watchHostBadge() {
  const selector = '#nl-badge-frame';
  const apply = () => {
    const badge = document.querySelector<HTMLElement>(selector);
    const h = badge ? Math.ceil(badge.getBoundingClientRect().height) : 0;
    document.documentElement.classList.toggle('has-host-badge', h > 0);
    document.documentElement.style.setProperty('--host-badge-h', `${h}px`);
  };
  apply();
  const sizes = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(apply) : null;
  let watched: Element | null = null;
  const obs = new MutationObserver(() => {
    const badge = document.querySelector(selector);
    if (badge && badge !== watched) {
      watched = badge;
      sizes?.observe(badge);
    }
    apply();
  });
  obs.observe(document.body, { childList: true });
  window.addEventListener('resize', apply);
}

/** The edition is fixed at build time (VITE_LOCALE); `?lang=` overrides it for development. */
function editionLocale(): Locale {
  const fromUrl = new URLSearchParams(location.search).get('lang');
  if (isLocale(fromUrl)) return fromUrl;
  const fromBuild = import.meta.env.VITE_LOCALE as unknown;
  return isLocale(fromBuild) ? fromBuild : 'en';
}

function applyEdition(locale: Locale) {
  const t = APP_TEXT[locale];
  const html = document.documentElement;
  html.lang = locale;
  html.dir = isRtl(locale) ? 'rtl' : 'ltr';
  document.title = t.title;
  document.querySelector('meta[name="description"]')?.setAttribute('content', t.description);
  html.style.setProperty('--host-badge-text', JSON.stringify(t.badgeStrip));
}

void boot();
