/** Preparation: instil anaesthetic, then load fluorescein (hold the strip to the lid). */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Eye, PatientFindings } from '@core';
import { Button, Icon } from '@ui-kit';
import { EyeCanvas, eyeStateFromFindings } from '@render';
import { DYE_BAND, dyeState } from './optics';

export interface PrepProps {
  findings: PatientFindings;
  eye: Eye;
  numbed: boolean;
  dye: number;
  reduced: boolean;
  onNumb: () => void;
  onDye: (v: number) => void;
  onDone: () => void;
  play: (id: 'pop' | 'sparkle' | 'tick') => void;
}

const WORD = { thin: 'Too thin: will under-read', good: 'Just right', thick: 'Too thick: will over-read' } as const;

export function Prep(p: PrepProps) {
  const [drop, setDrop] = useState(false);
  const [holding, setHolding] = useState(false);
  const live = useRef(p);
  live.current = p;
  const hold = useRef(false);
  const timer = useRef(0);
  useEffect(() => () => clearTimeout(timer.current), []);

  useEffect(() => {
    let raf = 0;
    let last = performance.now();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (hold.current && live.current.numbed) live.current.onDye(Math.min(1, live.current.dye + dt * 0.5));
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, []);
  useEffect(() => {
    const stop = () => { hold.current = false; setHolding(false); };
    const kd = (e: KeyboardEvent) => { if ((e.key === 'f' || e.key === 'F') && live.current.numbed) { hold.current = true; setHolding(true); } };
    window.addEventListener('pointerup', stop);
    window.addEventListener('pointercancel', stop);
    window.addEventListener('blur', stop);
    document.addEventListener('visibilitychange', stop);
    window.addEventListener('keyup', stop);
    window.addEventListener('keydown', kd);
    return () => { window.removeEventListener('pointerup', stop); window.removeEventListener('pointercancel', stop); window.removeEventListener('blur', stop); document.removeEventListener('visibilitychange', stop); window.removeEventListener('keyup', stop); window.removeEventListener('keydown', kd); };
  }, []);

  const st = dyeState(p.dye);
  const state = eyeStateFromFindings(p.findings, p.eye, { lighting: p.dye > 0.02 ? 'cobalt' : 'room' });
  const instil = () => {
    if (p.numbed || drop) return;
    setDrop(true);
    p.play('pop');
    timer.current = window.setTimeout(() => { p.onNumb(); setDrop(false); p.play('sparkle'); }, p.reduced ? 100 : 900);
  };
  return (
    <div class="tn-prep">
      <div class="tn-prep__eye" aria-hidden="true">
        <EyeCanvas state={state} width={520} height={360} reducedMotion={p.reduced} blink />
        <div class="tn-prep__lake" style={{ opacity: Math.min(1, p.dye * 1.3) }} />
        {drop && <span class="tn-prep__drop" />}
        {holding && <span class="tn-prep__strip" />}
      </div>
      <div class="tn-prep__steps">
        <div class={`tn-step ${p.numbed ? 'is-done' : 'is-now'}`}>
          <span class="tn-step__n">{p.numbed ? <Icon name="check" /> : '1'}</span>
          <div>
            <h4>Topical anaesthetic</h4>
            <p>One drop of proparacaine so the patient feels nothing and the dye spreads on a calm eye.</p>
            <Button variant="glass" size="sm" sfx={false} disabled={p.numbed || drop} onClick={instil}>{p.numbed ? 'Instilled' : 'Instil one drop'}</Button>
          </div>
        </div>
        <div class={`tn-step ${!p.numbed ? 'is-locked' : p.dye > 0.15 ? 'is-done' : 'is-now'}`}>
          <span class="tn-step__n">2</span>
          <div>
            <h4>Fluorescein strip</h4>
            <p>Hold the strip against the lower lid. Watch the tear lake: stop in the gold band.</p>
            <div class="tn-gauge" role="meter" aria-label="Fluorescein amount" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.dye * 100)}>
              <span class="tn-gauge__band" style={{ left: `${DYE_BAND.lo * 100}%`, width: `${(DYE_BAND.hi - DYE_BAND.lo) * 100}%` }} />
              <span class="tn-gauge__fill" style={{ width: `${p.dye * 100}%` }} />
            </div>
            <p class={`tn-gauge__word is-${st}`}>{p.dye < 0.02 ? 'No dye yet' : WORD[st]}</p>
            <Button
              variant="glass" size="sm" sfx={false} disabled={!p.numbed}
              onPointerDown={(e) => { hold.current = true; setHolding(true); (e.currentTarget as HTMLElement).focus(); }}
              onKeyDown={(e) => { if (e.key === ' ' || e.key === 'Enter') { hold.current = true; setHolding(true); e.preventDefault(); } }}
            >
              <Icon name="fluorescein" /> Hold strip to lid
            </Button>
            {p.dye > 0.5 && <Button variant="ghost" size="sm" sfx={false} onClick={() => { p.onDye(Math.max(0, p.dye - 0.2)); p.play('tick'); }}>Blot excess</Button>}
          </div>
        </div>
        <Button variant="primary" size="md" trailingIcon="arrow-right" disabled={!p.numbed || p.dye < 0.12} onClick={p.onDone}>Cobalt light on: to the slit lamp</Button>
      </div>
    </div>
  );
}
