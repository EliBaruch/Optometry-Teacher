import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, MiniGameModule, MiniGameResult, PracticeScenario } from '@core';
import { Icon, useStrings } from '@ui-kit';
import { S } from './strings';
import type { Difficulty } from './logic';

export interface StageProps {
  services: GameServices;
  mg: MiniGameModule;
  diff: Difficulty;
  /** Changes on every "Again" so a fresh scenario is generated. */
  run: number;
  reducedMotion: boolean;
  onDone: (result: MiniGameResult, scenario: PracticeScenario) => void;
  onScenario?: (scenario: PracticeScenario) => void;
}

/**
 * Hosts one mini-game in practice mode. Owns the mount/cleanup lifecycle:
 * `done` is honoured at most once per run, and the mini-game's cleanup always runs.
 */
export function Stage({ services, mg, diff, run, reducedMotion, onDone, onScenario }: StageProps) {
  const t = useStrings(S);
  const host = useRef<HTMLDivElement>(null);
  const [failed, setFailed] = useState(false);
  const latestDone = useRef(onDone);
  latestDone.current = onDone;

  useEffect(() => {
    const el = host.current;
    if (!el || !mg.practice) return;
    let finished = false;
    let alive = true;
    let cleanup: (() => void) | undefined;
    try {
      const rng = services.rng.fork(`arcade:${mg.id}:${run}:${services.clock.now()}`);
      const scenario = mg.practice(rng, diff.value);
      onScenario?.(scenario);
      cleanup = mg.mount(
        el,
        {
          testId: mg.id,
          patient: scenario.patient,
          findings: scenario.findings,
          mode: 'practice',
          difficulty: diff.value,
          rng: rng.fork('game'),
          audio: services.audio,
          fx: services.fx,
          reducedMotion,
          locale: services.locale,
        },
        (result) => {
          if (finished || !alive) return;
          finished = true;
          latestDone.current(result, scenario);
        },
      );
      setFailed(false);
    } catch (err) {
      console.error(`[arcade] ${mg.id} failed to start`, err);
      setFailed(true);
    }
    return () => {
      alive = false;
      try {
        cleanup?.();
      } catch (err) {
        console.error(`[arcade] ${mg.id} cleanup threw`, err);
      }
      el.replaceChildren();
    };
  }, [mg, run, diff.value]);

  return (
    <div class="arcade-stage__host-wrap">
      <div ref={host} class="arcade-stage__host" data-testid="arcade-host" />
      {failed && (
        <div class="arcade-stage__failed" role="alert">
          <Icon name="warning" size={32} />
          <h3>{t.failedTitle}</h3>
          <p>{t.failedBody}</p>
        </div>
      )}
    </div>
  );
}
