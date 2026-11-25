import { useEffect, useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { useInterval, useSignal } from '@ui-kit';
import { comfortOf, type ComfortController } from '../controller';
import { INITIAL, type ComfortState } from '../logic';
import { signal, type Signal } from '@core';

const EMPTY = signal<ComfortState>(INITIAL);

/** The Lounge controller + its live state (null controller when the system is not installed). */
export function useComfort(services: GameServices): { ctl: ComfortController | null; state: ComfortState } {
  const ctl = comfortOf(services);
  const state = useSignal(ctl?.state ?? EMPTY);
  return { ctl, state };
}

/** The game clock, refreshed every `ms` (for countdowns). */
export function useNow(services: GameServices, ms = 30_000): number {
  const [now, setNow] = useState(() => services.clock.now());
  useInterval(() => setNow(services.clock.now()), ms);
  return now;
}

/** "Doctor" or "Dr. Ada" — how the clinic addresses the player. */
export function doctorName(services: GameServices): string {
  const raw = (services.settings.get().playerName || '').trim();
  if (!raw || /^doctor$/i.test(raw)) return 'Doctor';
  return /^dr\.?\s/i.test(raw) ? raw : `Dr. ${raw}`;
}

/** Center of an element in viewport coordinates (for fx bursts). */
export function centerOf(el: Element | null | undefined): { x: number; y: number } {
  if (!el) return { x: typeof innerWidth === 'number' ? innerWidth / 2 : 0, y: typeof innerHeight === 'number' ? innerHeight / 2 : 0 };
  const r = el.getBoundingClientRect();
  return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
}

/** Audio must never break the UI. */
export function safePlay(services: GameServices, ...args: Parameters<GameServices['audio']['play']>) {
  try {
    services.audio.play(...args);
  } catch {
    /* ignore */
  }
}

// ── Welcome-note host lease ──────────────────────────────────────────────
// The welcome note can be hosted by the hub banner, the lounge scene and a
// global top-bar host. Only one may show it: the highest-priority host wins,
// ties go to the one mounted first.

interface Lease {
  id: number;
  priority: number;
}
const leases = new WeakMap<object, Signal<Lease[]>>();
let leaseSeq = 0;

function leaseSignal(key: object): Signal<Lease[]> {
  let s = leases.get(key);
  if (!s) {
    s = signal<Lease[]>([]);
    leases.set(key, s);
  }
  return s;
}

/** Pure: which lease currently holds the host (highest priority, then oldest). */
export function leaseHolder(list: readonly Lease[]): number | null {
  let best: Lease | null = null;
  for (const l of list) if (!best || l.priority > best.priority) best = l;
  return best?.id ?? null;
}

/** True while this component is the one that should render the shared overlay. */
export function useHostLease(key: object, priority: number): boolean {
  const sig = leaseSignal(key);
  const [id] = useState(() => ++leaseSeq);
  useEffect(() => {
    sig.update((xs) => [...xs, { id, priority }]);
    return () => sig.update((xs) => xs.filter((x) => x.id !== id));
  }, [sig, priority]);
  return leaseHolder(useSignal(sig)) === id;
}
