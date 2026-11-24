import { useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { useInterval, useSignal } from '@ui-kit';
import { comfortOf, type ComfortController } from '../controller';
import { INITIAL, type ComfortState } from '../logic';
import { signal } from '@core';

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
