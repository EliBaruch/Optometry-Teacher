import { signal, type Signal } from './signal';

export interface StorageAdapter {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
  keys(): string[];
}

export function memoryStorage(): StorageAdapter {
  const m = new Map<string, string>();
  return {
    getItem: (k) => m.get(k) ?? null,
    setItem: (k, v) => void m.set(k, v),
    removeItem: (k) => void m.delete(k),
    keys: () => [...m.keys()],
  };
}

export function browserStorage(): StorageAdapter {
  try {
    const ls = window.localStorage;
    const probe = '__probe__';
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return {
      getItem: (k) => ls.getItem(k),
      setItem: (k, v) => {
        try { ls.setItem(k, v); } catch { /* quota / private mode */ }
      },
      removeItem: (k) => ls.removeItem(k),
      keys: () => Object.keys(ls),
    };
  } catch {
    return memoryStorage();
  }
}

const PREFIX = 'lumen:';

interface Envelope<T> { v: number; data: T }

export interface SaveService {
  /**
   * A persisted, namespaced state slice. Each module owns its own namespace,
   * e.g. 'sys:economy'. `version` + `migrate` allow schema evolution per module.
   */
  slot<T>(namespace: string, initial: T, opts?: { version?: number; migrate?: (old: unknown, oldVersion: number) => T }): Signal<T>;
  exportAll(): string;
  importAll(json: string): void;
  resetAll(): void;
}

export function createSaveService(storage: StorageAdapter, debounceMs = 250): SaveService {
  const slots = new Map<string, Signal<unknown>>();
  const timers = new Map<string, ReturnType<typeof setTimeout>>();
  const versions = new Map<string, number>();

  const write = (ns: string, value: unknown) => {
    const env: Envelope<unknown> = { v: versions.get(ns) ?? 1, data: value };
    storage.setItem(PREFIX + ns, JSON.stringify(env));
  };

  return {
    slot<T>(namespace: string, initial: T, opts?: { version?: number; migrate?: (old: unknown, oldVersion: number) => T }) {
      const existing = slots.get(namespace);
      if (existing) return existing as Signal<T>;
      const version = opts?.version ?? 1;
      versions.set(namespace, version);
      let value = initial;
      const raw = storage.getItem(PREFIX + namespace);
      if (raw) {
        try {
          const env = JSON.parse(raw) as Envelope<T>;
          if (env.v === version) value = mergeDefaults(initial, env.data);
          else if (opts?.migrate) value = opts.migrate(env.data, env.v);
        } catch {
          /* corrupted — start fresh */
        }
      }
      const sig = signal<T>(value);
      sig.subscribe((v) => {
        clearTimeout(timers.get(namespace));
        if (debounceMs <= 0) write(namespace, v);
        else timers.set(namespace, setTimeout(() => write(namespace, v), debounceMs));
      });
      slots.set(namespace, sig as Signal<unknown>);
      return sig;
    },
    exportAll() {
      const out: Record<string, unknown> = {};
      for (const k of storage.keys()) if (k.startsWith(PREFIX)) out[k] = storage.getItem(k);
      return JSON.stringify(out);
    },
    importAll(json) {
      const data = JSON.parse(json) as Record<string, string>;
      for (const [k, v] of Object.entries(data)) if (k.startsWith(PREFIX)) storage.setItem(k, v);
    },
    resetAll() {
      for (const k of storage.keys()) if (k.startsWith(PREFIX)) storage.removeItem(k);
    },
  };
}

/** Fill in fields added to `initial` after a save was written. */
function mergeDefaults<T>(initial: T, saved: T): T {
  if (typeof initial !== 'object' || initial === null || Array.isArray(initial)) return saved;
  if (typeof saved !== 'object' || saved === null) return initial;
  return { ...initial, ...saved };
}
