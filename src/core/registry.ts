/**
 * Generic plugin registry. Every pluggable thing (mini-games, cases, diagnoses,
 * sins, scenes, modes, HUD widgets) lives in one of these. Plugins are
 * discovered by the app composition root; consumers only ever look them up by id.
 */
export interface Identified {
  id: string;
}

export interface Registry<T extends Identified> {
  register(item: T): void;
  get(id: string): T | undefined;
  require(id: string): T;
  has(id: string): boolean;
  all(): T[];
  /** Fires after every register(). */
  onChange(fn: () => void): () => void;
}

export function createRegistry<T extends Identified>(kind: string): Registry<T> {
  const items = new Map<string, T>();
  const listeners = new Set<() => void>();
  return {
    register(item) {
      if (!item || typeof item.id !== 'string' || !item.id) {
        throw new Error(`[registry:${kind}] item without id`);
      }
      if (items.has(item.id)) {
        console.warn(`[registry:${kind}] duplicate id "${item.id}" — replacing`);
      }
      items.set(item.id, item);
      for (const l of [...listeners]) l();
    },
    get: (id) => items.get(id),
    require(id) {
      const v = items.get(id);
      if (!v) throw new Error(`[registry:${kind}] unknown id "${id}"`);
      return v;
    },
    has: (id) => items.has(id),
    all: () => [...items.values()],
    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
