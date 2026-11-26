/**
 * Top-bar chip: your place on the weekly board, with a trend arrow after a move.
 * During an exam in progress it never navigates (that would abandon the patient): a tap shows
 * the standing in a small popover instead.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Icon, useSfx, useSignal, useStrings } from '@ui-kit';
import { S, rivalText } from '../strings';
import { SYSTEM_ID } from '../controller';
import { nextAbove, playerRank, standings } from '../league';
import { useRivals } from './shared';

const TREND_MS = 24 * 3_600_000;

export function MiniStanding({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const t = useStrings(S);
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
  const aboveShort = above?.rival ? rivalText(above.rival, services.locale).short : '';
  const hint = !joined
    ? t.miniJoin
    : above?.rival
      ? t.miniGap(rank, rows.length, above.points - state.points, aboveShort)
      : t.miniTop(rows.length);

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
        aria-label={inExam ? t.miniAriaExam(hint) : t.miniAriaOpen(hint)}
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
          <span class="rv-mini__rank lm-num" key={rank} dir="ltr">#{rank}</span>
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
          <b>{joined ? t.popRank(rank, rows.length) : t.popNot}</b>
          <span>{joined && above?.rival ? t.popGap(above.points - state.points, aboveShort) : joined ? t.popLead : t.popJoin}</span>
          <span class="rv-dim">{t.popNote}</span>
        </span>
      )}
    </span>
  );
}
