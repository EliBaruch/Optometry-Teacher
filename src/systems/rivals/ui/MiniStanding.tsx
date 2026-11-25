/**
 * Top-bar chip: your place on the weekly board, with a trend arrow after a move.
 * During an exam in progress it never navigates (that would abandon the patient): a tap shows
 * the standing in a small popover instead.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Icon, useSfx, useSignal } from '@ui-kit';
import { SYSTEM_ID } from '../controller';
import { nextAbove, playerRank, standings } from '../league';
import { useRivals } from './shared';

const TREND_MS = 24 * 3_600_000;

export function MiniStanding({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const session = useSignal(services.session.state);
  const play = useSfx();
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLSpanElement>(null);
  const rows = standings(state, now);
  const rank = playerRank(rows);
  const above = nextAbove(rows);
  const trend = state.trend && now - state.trend.at < TREND_MS ? state.trend.dir : null;
  const joined = state.cases > 0;
  const inExam = !!session && !session.submitted && !session.failed;
  const hint = !joined
    ? 'Colleagues board: finish a patient to join this week'
    : above?.rival
      ? `Colleagues board: #${rank} of ${rows.length}, ${(above.points - state.points).toLocaleString('en')} pts to pass ${above.rival.short}`
      : `Colleagues board: top of ${rows.length} this week`;

  // Close the popover on outside tap / Escape, and whenever the exam ends.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (root.current && !root.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);
  useEffect(() => {
    if (!inExam) setOpen(false);
  }, [inExam]);

  return (
    <span class="rv-mini-wrap" ref={root}>
      <button
        type="button"
        class={`rv-mini${rank === 1 && joined ? ' is-top' : ''}${inExam ? ' is-exam' : ''}`}
        title={inExam ? undefined : hint}
        aria-label={inExam ? `${hint}. Opens after this patient.` : `${hint}. Open the board.`}
        aria-expanded={inExam ? open : undefined}
        onClick={() => {
          play('click');
          if (inExam) {
            setOpen((o) => !o);
            return;
          }
          if (services.router.current.get().id !== SYSTEM_ID) services.router.go(SYSTEM_ID);
        }}
      >
        <span class="rv-mini__icon"><Icon name={rank === 1 && joined ? 'crown' : 'users'} size={15} /></span>
        {joined ? (
          <span class="rv-mini__rank lm-num" key={rank}>#{rank}</span>
        ) : (
          <span class="rv-mini__rank rv-mini__rank--idle lm-num">—</span>
        )}
        {trend && (
          <span class={`rv-mini__trend is-${trend}`} aria-hidden="true">
            {trend === 'up' ? '↑' : '↓'}
          </span>
        )}
      </button>
      {inExam && open && (
        <span class="rv-mini__pop" role="status">
          <b>{joined ? `#${rank} of ${rows.length}` : 'Not on the board yet'}</b>
          <span>{joined && above?.rival ? `${(above.points - state.points).toLocaleString('en')} pts to pass ${above.rival.short}` : joined ? 'Leading the ward' : 'Finish this patient to join'}</span>
          <span class="rv-dim">The full board opens after this patient.</span>
        </span>
      )}
    </span>
  );
}
