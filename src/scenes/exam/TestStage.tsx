import { useEffect, useRef, useState } from 'preact/hooks';
import type { ClinicalCase, GameServices, MiniGameModule, MiniGameResult } from '@core';
import { TEST_CATALOG } from '@core';
import { Button, Icon, Modal, isIconName } from '@ui-kit';
import { testName } from './logic';

/** True when an error's stack or source file points into a mini-game plugin. */
export function isMiniGameError(stack?: string, file?: string): boolean {
  return /\/minigames\//.test(`${stack ?? ''} ${file ?? ''}`);
}

export interface TestStageProps {
  services: GameServices;
  kase: ClinicalCase;
  /** The instrument being used; null = closed */
  mg: MiniGameModule | null;
  reduced: boolean;
  techOk: boolean;
  onResult: (result: MiniGameResult, stageEl: HTMLElement | null) => void;
  onTech: (mg: MiniGameModule) => void;
  onClose: () => void;
}

/**
 * Hosts one mini-game in a large modal stage. Owns the mount / cleanup lifecycle:
 * `done` is honoured once, cleanup always runs, and a game that throws in mount()
 * never takes the scene down — the player can skip or ask the technician.
 */
export function TestStage({ services, kase, mg, reduced, techOk, onResult, onTech, onClose }: TestStageProps) {
  // The modal mounts its body a beat after `open` flips, so track the host element in state.
  const [el, setEl] = useState<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef({ onResult });
  latest.current = { onResult };
  // Keep the last instrument around so the title doesn't vanish during the exit animation.
  const last = useRef<MiniGameModule | null>(null);
  if (mg) last.current = mg;
  const shown = mg ?? last.current;

  useEffect(() => {
    if (!mg || !el) return;
    setFailed(false);
    let alive = true;
    let finished = false;
    let cleanup: (() => void) | undefined;
    // Mount on the next task, never inside Preact's render/effect flush: Preact may flush pending
    // effects at the start of a re-render, and a game that calls render() synchronously there would
    // corrupt the outer component's hook state ("Hook can only be invoked from render methods").
    const start = () => {
    if (!alive) return;
    try {
      cleanup = mg.mount(
        el,
        {
          testId: mg.id,
          patient: kase.patient,
          findings: kase.findings,
          mode: 'case',
          difficulty: (kase.difficulty - 1) / 4,
          rng: services.rng.fork(kase.id + mg.id),
          audio: services.audio,
          fx: services.fx,
          reducedMotion: reduced,
        },
        (result) => {
          if (finished || !alive || !result) return;
          finished = true;
          const panel = el.closest<HTMLElement>('.lm-modal__panel');
          latest.current.onResult({ ...result, testId: result.testId ?? mg.id }, panel);
        },
      );
    } catch (err) {
      console.error(`[exam] ${mg.id} failed to start`, err);
      setFailed(true);
    }
    };
    const timer = setTimeout(start, 0);
    // A game that throws later (timers, async work) must not leave the player stuck on a dead stage.
    const fromGame = isMiniGameError;
    const onError = (e: ErrorEvent) => {
      if (alive && !finished && fromGame(e.error?.stack, e.filename)) setFailed(true);
    };
    const onRejection = (e: PromiseRejectionEvent) => {
      if (alive && !finished && fromGame((e.reason as Error | undefined)?.stack)) setFailed(true);
    };
    window.addEventListener('error', onError);
    window.addEventListener('unhandledrejection', onRejection);
    return () => {
      clearTimeout(timer);
      window.removeEventListener('error', onError);
      window.removeEventListener('unhandledrejection', onRejection);
      alive = false;
      try {
        cleanup?.();
      } catch (err) {
        console.error(`[exam] ${mg.id} cleanup threw`, err);
      }
      el.replaceChildren();
    };
  }, [mg, el]);

  const info = shown ? TEST_CATALOG[shown.id] : undefined;
  return (
    <Modal
      open={!!mg}
      onClose={onClose}
      size="stage"
      flush
      icon={shown && isIconName(shown.id) ? shown.id : undefined}
      eyebrow={info ? `Examining  ·  ${info.minutes} min` : 'Examining'}
      title={kase.patient.name}
      ariaLabel={shown ? `${testName(shown.id, shown)} for ${kase.patient.name}` : 'Instrument'}
      class="exm-stage-modal"
    >
      <div class="exm-stage-host-wrap">
        <div ref={setEl} class="exm-stage-host" data-testid="exm-stage-host" />
        {failed && mg && (
          <div class="exm-stage-failed" role="alert">
            <Icon name="warning" size={34} />
            <h3>This instrument needs calibrating</h3>
            <p>It would not start just now. You can skip this test{techOk ? ' or let the technician take it' : ''}.</p>
            <div class="exm-stage-failed__actions">
              {techOk && (
                <Button variant="primary" icon="user" onClick={() => onTech(mg)}>
                  Ask the technician
                </Button>
              )}
              <Button variant="glass" onClick={onClose}>Skip this test</Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
