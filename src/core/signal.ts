/**
 * Tiny framework-agnostic reactive cell. Core must not depend on any UI library,
 * so this is the single reactive primitive every module shares.
 * ui-kit exposes `useSignal(sig)` to read it from Preact components.
 */
export type Listener<T> = (value: T, prev: T) => void;

export interface ReadSignal<T> {
  get(): T;
  subscribe(fn: Listener<T>): () => void;
}

export interface Signal<T> extends ReadSignal<T> {
  set(value: T): void;
  update(fn: (prev: T) => T): void;
}

export function signal<T>(initial: T): Signal<T> {
  let value = initial;
  const listeners = new Set<Listener<T>>();
  return {
    get: () => value,
    set(next) {
      if (Object.is(next, value)) return;
      const prev = value;
      value = next;
      for (const l of [...listeners]) l(value, prev);
    },
    update(fn) {
      this.set(fn(value));
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}

/** Derived read-only signal. Recomputes when any source changes. */
export function computed<T>(sources: ReadSignal<unknown>[], fn: () => T): ReadSignal<T> {
  const out = signal(fn());
  for (const s of sources) s.subscribe(() => out.set(fn()));
  return { get: out.get, subscribe: out.subscribe };
}
