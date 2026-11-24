/** Top-bar chip: your place on the weekly board, with a trend arrow after a move. */
import type { GameServices } from '@core';
import { Icon, useSfx } from '@ui-kit';
import { SYSTEM_ID } from '../controller';
import { nextAbove, playerRank, standings } from '../league';
import { useRivals } from './shared';

const TREND_MS = 24 * 3_600_000;

export function MiniStanding({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const play = useSfx();
  const rows = standings(state, now);
  const rank = playerRank(rows);
  const above = nextAbove(rows);
  const trend = state.trend && now - state.trend.at < TREND_MS ? state.trend.dir : null;
  const joined = state.cases > 0;
  const hint = !joined
    ? 'Colleagues board — finish a patient to join this week'
    : above?.rival
      ? `Colleagues board: #${rank} of ${rows.length} — ${above.points - state.points} pts to pass ${above.rival.short}`
      : `Colleagues board: top of ${rows.length} this week`;

  return (
    <button
      type="button"
      class={`rv-mini${rank === 1 && joined ? ' is-top' : ''}`}
      title={hint}
      aria-label={hint}
      onClick={() => {
        play('click');
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
  );
}
