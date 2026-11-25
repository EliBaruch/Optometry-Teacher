import type { Ref } from 'preact';
import { Button, Kbd } from '@ui-kit';
import { Dial } from './Dial';
import type { TestMode } from './patient';

export interface ConsoleProps {
  mode: TestMode;
  onMode: (m: TestMode) => void;
  offset: number;
  onOffset: (v: number) => void;
  sweeping: boolean;
  busy: boolean;
  remaining242: number;
  onSweep: () => void;
  onStop: () => void;
  stimRef: Ref<HTMLSpanElement>;
  meterRef: Ref<HTMLSpanElement>;
}

/** The operator's console: strategy, screening level dial, live stimulus meter, auto sweep. */
export function Console(p: ConsoleProps) {
  return (
    <div class="vf-console">
      <div class="vf-console__row">
        <div class="vf-seg" role="radiogroup" aria-label="Test strategy">
          {(['threshold', 'screen'] as const).map((m) => (
            <button
              key={m}
              type="button"
              role="radio"
              aria-checked={p.mode === m}
              class={p.mode === m ? 'is-on' : ''}
              onClick={() => p.onMode(m)}
              data-testid={`vf-mode-${m}`}
            >
              {m === 'threshold' ? 'Threshold' : 'Screen'} <Kbd>{m === 'threshold' ? 'T' : 'S'}</Kbd>
            </button>
          ))}
        </div>
        <p class="vf-console__hint">
          {p.mode === 'threshold' ? '4-2 dB staircase → true sensitivity (≈5 flashes)' : 'One flash, brighter than age-normal by the dial'}
        </p>
      </div>
      <div class="vf-console__row vf-console__row--instr">
        <Dial
          value={p.offset}
          min={2}
          max={16}
          step={1}
          label="Screen level"
          format={(v) => `normal −${v} dB`}
          onChange={p.onOffset}
          disabled={p.mode !== 'screen'}
          size={58}
        />
        <div class="vf-meter" aria-hidden="true">
          <span class="vf-meter__label">Stimulus</span>
          <span class="vf-meter__track"><span class="vf-meter__fill" ref={p.meterRef} /></span>
          <span class="vf-meter__value" ref={p.stimRef}>— dB</span>
        </div>
      </div>
      <div class="vf-console__row">
        {p.sweeping ? (
          <Button variant="glass" size="sm" icon="x" sfx={false} onClick={p.onStop} data-testid="vf-stop">Stop sweep</Button>
        ) : (
          <Button
            variant="glass"
            size="sm"
            icon="play"
            sfx={false}
            onClick={p.onSweep}
            disabled={p.remaining242 === 0 || p.busy}
            data-testid="vf-sweep"
          >
            Auto 24-2 sweep ({p.remaining242})
          </Button>
        )}
        <span class="vf-console__keys"><Kbd>A</Kbd> sweep · <Kbd>G</Kbd> grey/dB</span>
      </div>
    </div>
  );
}
