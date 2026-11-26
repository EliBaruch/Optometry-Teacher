import type { Ref } from 'preact';
import { Button, Kbd } from '@ui-kit';
import { Dial } from './Dial';
import type { TestMode } from './patient';
import { iso } from './strings';
import { useVf, useVfLocale } from './useVf';

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
  const t = useVf();
  const locale = useVfLocale();
  return (
    <div class="vf-console">
      <div class="vf-console__row">
        <div class="vf-seg" role="radiogroup" aria-label={t.strategy}>
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
              {m === 'threshold' ? t.threshold : t.screen} <Kbd>{m === 'threshold' ? 'T' : 'S'}</Kbd>
            </button>
          ))}
        </div>
        <p class="vf-console__hint">
          {iso(locale, p.mode === 'threshold' ? t.hintThreshold : t.hintScreen)}
        </p>
      </div>
      <div class="vf-console__row vf-console__row--instr">
        <Dial
          value={p.offset}
          min={2}
          max={16}
          step={1}
          label={t.screenLevel}
          format={(v) => iso(locale, t.screenFmt(v))}
          onChange={p.onOffset}
          disabled={p.mode !== 'screen'}
          size={58}
        />
        <div class="vf-meter" aria-hidden="true">
          <span class="vf-meter__label">{t.stimulus}</span>
          <span class="vf-meter__track"><span class="vf-meter__fill" ref={p.meterRef} /></span>
          <span class="vf-meter__value" ref={p.stimRef} dir="ltr">— dB</span>
        </div>
      </div>
      <div class="vf-console__row">
        {p.sweeping ? (
          <Button variant="glass" size="sm" icon="x" sfx={false} onClick={p.onStop} data-testid="vf-stop">{t.stopSweep}</Button>
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
            {iso(locale, t.autoSweep(p.remaining242))}
          </Button>
        )}
        <span class="vf-console__keys"><Kbd>A</Kbd> {t.keySweep} · <Kbd>G</Kbd> {t.keyGreyDb}</span>
      </div>
    </div>
  );
}
