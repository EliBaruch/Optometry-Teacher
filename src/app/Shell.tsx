import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, Route } from '@core';
import { asComponent, useRegistry, useServices, useSignal } from '@ui-kit';

/**
 * The app shell: renders whichever scene the router points at, with a
 * cross-fade. It knows nothing about specific scenes.
 */
export function Shell() {
  const services = useServices();
  const route = useSignal(services.router.current);
  const scenes = useRegistry(services.registries.scenes);
  const [shown, setShown] = useState<Route>(route);
  const [phase, setPhase] = useState<'in' | 'out'>('in');
  const reduced = useSignal(services.settings).reducedMotion;
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      setShown(route);
      return;
    }
    if (reduced) {
      setShown(route);
      return;
    }
    setPhase('out');
    const t = setTimeout(() => {
      setShown(route);
      setPhase('in');
    }, 180);
    return () => clearTimeout(t);
  }, [route]);

  const scene = scenes.find((s) => s.id === shown.id);
  useEffect(() => {
    if (scene?.music !== undefined) services.audio.music(scene.music);
  }, [scene?.id]);

  if (!scene) return <MissingScene services={services} id={shown.id} />;
  const C = asComponent(scene.component);
  return (
    <div class={`scene-host scene-host--${phase}`} data-scene={scene.id}>
      <C key={`${shown.id}:${JSON.stringify(shown.params)}`} services={services} params={shown.params} />
    </div>
  );
}

function MissingScene(props: { services: GameServices; id: string }) {
  const ids = props.services.registries.scenes.all().map((s) => s.id);
  return (
    <div class="missing-scene">
      <h1>Scene “{props.id}” is not installed</h1>
      <p>Installed scenes: {ids.join(', ') || 'none'}</p>
      {ids.length > 0 && <button onClick={() => props.services.router.replace(ids.includes('hub') ? 'hub' : ids[0]!)}>Go</button>}
    </div>
  );
}
