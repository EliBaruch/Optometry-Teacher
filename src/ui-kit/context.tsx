import { createContext, type ComponentChildren, type ComponentType } from 'preact';
import { useContext, useEffect, useState } from 'preact/hooks';
import type { GameServices, HudSlot as HudSlotId, ReadSignal, View } from '@core';

const ServicesContext = createContext<GameServices | null>(null);

export function ServicesProvider(props: { services: GameServices; children: ComponentChildren }) {
  return <ServicesContext.Provider value={props.services}>{props.children}</ServicesContext.Provider>;
}

/** Services if rendered inside a <ServicesProvider>, otherwise null (never throws). */
export function useOptionalServices(): GameServices | null {
  return useContext(ServicesContext);
}

export function useServices(): GameServices {
  const s = useContext(ServicesContext);
  if (!s) throw new Error('useServices() outside <ServicesProvider>');
  return s;
}

/** Subscribe a Preact component to a core signal. */
export function useSignal<T>(sig: ReadSignal<T>): T {
  const [v, setV] = useState(() => sig.get());
  useEffect(() => {
    setV(sig.get());
    return sig.subscribe((next) => setV(() => next));
  }, [sig]);
  return v;
}

/** Re-render when a registry changes (plugins registered late). */
export function useRegistry<T>(reg: { all(): T[]; onChange(fn: () => void): () => void }): T[] {
  const [items, setItems] = useState(() => reg.all());
  useEffect(() => reg.onChange(() => setItems(reg.all())), [reg]);
  return items;
}

/** Render a framework-neutral View (from core contracts) as a Preact component. */
export function asComponent<P>(view: View<P>): ComponentType<P> {
  return view as unknown as ComponentType<P>;
}

/**
 * Renders every HUD widget registered for a slot, sorted by order.
 * Scenes use this so they never need to know which engagement systems exist.
 */
export function HudSlot(props: { slot: HudSlotId; class?: string }) {
  const services = useServices();
  const widgets = useRegistry(services.registries.hud)
    .filter((w) => w.slot === props.slot)
    .sort((a, b) => a.order - b.order);
  if (!widgets.length) return null;
  return (
    <div class={`hud-slot hud-slot--${props.slot} ${props.class ?? ''}`}>
      {widgets.map((w) => {
        const C = asComponent(w.component);
        return <C key={w.id} services={services} />;
      })}
    </div>
  );
}
