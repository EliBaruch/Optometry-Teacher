/** Top-bar chip: the daily flame with its day count. Opens the streak details. */
import { useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { cx, useSfx, useStrings } from '@ui-kit';
import { S } from '../strings';
import { DetailsModal } from './DetailsModal';
import { Flame, FreezeGlyph } from './Flame';
import { dailyIntensity, flameVariant, statusLine } from './copy';
import { useStreaks } from './hooks';

export function FlameChip({ services }: { services: GameServices }) {
  const { ctl, state } = useStreaks(services);
  const t = useStrings(S);
  const play = useSfx();
  const [open, setOpen] = useState(false);
  if (!ctl) return null;
  const view = ctl.view();
  const hint = t.chipHint(view.streak, statusLine(view, state.daily.best, t), state.daily.freezes);
  return (
    <>
      <button
        type="button"
        class={cx('sk-chip', `is-${view.status}`)}
        title={hint}
        aria-label={hint}
        aria-haspopup="dialog"
        onClick={() => {
          play('click');
          setOpen(true);
        }}
      >
        <Flame size={22} intensity={dailyIntensity(view.streak)} variant={flameVariant(view.status)} embers={false} class="sk-chip__flame" />
        <span class="sk-chip__num lm-num" key={view.streak}>{view.streak}</span>
        {state.daily.freezes > 0 && (
          <span class="sk-chip__freeze" aria-hidden="true">
            <FreezeGlyph size={11} />
            {state.daily.freezes > 1 && <span class="lm-num">{state.daily.freezes}</span>}
          </span>
        )}
      </button>
      <DetailsModal services={services} open={open} onClose={() => setOpen(false)} />
    </>
  );
}
