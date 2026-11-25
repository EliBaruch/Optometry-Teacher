import { useEffect, useState } from 'preact/hooks';
import { signal, type GameServices, type Signal } from '@core';
import { useSignal } from '@ui-kit';
import { streaksOf, type CaseEcho, type RunEcho, type StreaksController } from '../controller';
import { EMPTY_COMBO, type ComboState } from '../combo';
import { INITIAL, type StreaksState } from '../state';

const DUMMY: { state: Signal<StreaksState>; combo: Signal<ComboState>; echo: Signal<CaseEcho | null>; runEcho: Signal<RunEcho | null> } = {
  state: signal(INITIAL),
  combo: signal(EMPTY_COMBO),
  echo: signal<CaseEcho | null>(null),
  runEcho: signal<RunEcho | null>(null),
};

/** Re-render once a minute so the flame notices midnight. */
export function useMinuteTick(): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setT((x) => x + 1), 60_000);
    return () => clearInterval(id);
  }, []);
  return t;
}

/** Reactive access to the Streaks controller (null when not installed). */
export function useStreaks(services: GameServices) {
  const ctl: StreaksController | null = streaksOf(services);
  const src = ctl ?? DUMMY;
  const state = useSignal(src.state);
  const combo = useSignal(src.combo);
  const echo = useSignal(src.echo);
  const runEcho = useSignal(src.runEcho);
  useMinuteTick();
  return { ctl, state, combo, echo, runEcho };
}
