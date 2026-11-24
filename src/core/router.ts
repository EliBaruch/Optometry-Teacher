import { signal, type ReadSignal } from './signal';
import type { EventBus } from './events';

export interface Route {
  id: string;
  params: Record<string, unknown>;
}

export interface Router {
  current: ReadSignal<Route>;
  go(id: string, params?: Record<string, unknown>): void;
  /** Replace current route without pushing history */
  replace(id: string, params?: Record<string, unknown>): void;
  back(): void;
}

export function createRouter(bus: EventBus, initial: Route = { id: 'title', params: {} }): Router {
  const current = signal<Route>(initial);
  const stack: Route[] = [];
  const set = (r: Route) => {
    current.set(r);
    bus.emit('scene:changed', { id: r.id, params: r.params });
  };
  return {
    current,
    go(id, params = {}) {
      stack.push(current.get());
      if (stack.length > 50) stack.shift();
      set({ id, params });
    },
    replace(id, params = {}) {
      set({ id, params });
    },
    back() {
      const prev = stack.pop();
      set(prev ?? { id: 'hub', params: {} });
    },
  };
}
