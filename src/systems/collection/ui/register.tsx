import type { ComponentChildren } from 'preact';
import { useSignal } from '@ui-kit';
import { pickStrings } from '@core';
import { S } from '../strings';
import { unseenCount } from '../model';
import { GALLERY_COLOR, SYSTEM_ID, type CollectionStore } from '../store';
import { GalleryScene } from './GalleryScene';
import { LatestCard } from './LatestCard';
import { PackReveal } from './PackReveal';
import { ProfileShowcase } from './ProfileShowcase';

/** Gate: render nothing once the system has been uninstalled (registries cannot unregister). */
function Active(props: { store: CollectionStore; children: () => ComponentChildren }) {
  const on = useSignal(props.store.active);
  return on ? <>{props.children()}</> : null;
}

export function registerUi(store: CollectionStore): void {
  const { registries } = store.services;
  const t = pickStrings(S, store.services.locale);

  registries.scenes.register({
    id: 'gallery',
    music: 'zen',
    component: (p) => <GalleryScene store={store} services={p.services} />,
  });

  registries.hub.register({
    id: 'gallery',
    title: t.hubTitle,
    subtitle: t.hubSubtitle,
    icon: 'gem',
    accent: GALLERY_COLOR,
    order: 50,
    system: SYSTEM_ID,
    sceneId: 'gallery',
    badge: () => {
      if (!store.active.get()) return undefined;
      const n = unseenCount(store.state.get());
      return n ? t.newBadge(n) : undefined;
    },
  });

  registries.hud.register({
    id: 'collection:reveal',
    slot: 'results-extra',
    order: 40,
    system: SYSTEM_ID,
    component: () => <Active store={store}>{() => <PackReveal store={store} />}</Active>,
  });

  registries.hud.register({
    id: 'collection:latest',
    slot: 'hub-sidebar',
    order: 40,
    system: SYSTEM_ID,
    component: () => <Active store={store}>{() => <LatestCard store={store} />}</Active>,
  });

  registries.hud.register({
    id: 'collection:profile',
    slot: 'profile',
    order: 50,
    system: SYSTEM_ID,
    component: () => <Active store={store}>{() => <ProfileShowcase store={store} />}</Active>,
  });
}
