import { render } from 'preact';
import '@fontsource-variable/inter';
import '@fontsource-variable/fraunces';
import '@fontsource/space-grotesk/500.css';
import '@fontsource/space-grotesk/700.css';
import { browserStorage, createServices } from '@core';
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

  const services = createServices({ storage: browserStorage(), seed: Date.now() });
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
  const obs = new MutationObserver(apply);
  obs.observe(document.body, { childList: true });
  window.addEventListener('resize', apply);
}

void boot();
