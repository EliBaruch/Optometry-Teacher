/** Profile page section: the player's record against colleagues. */
import type { GameServices } from '@core';
import { GlassPanel, useSfx, useStrings } from '@ui-kit';
import { S } from '../strings';
import { ACCENT, SYSTEM_ID } from '../controller';
import { playerRank, standings } from '../league';
import { ROSTER } from '../roster';
import { RivalPortrait, useOrdinal, useRivals } from './shared';

export function ProfileSection({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const t = useStrings(S);
  const ordinal = useOrdinal();
  const play = useSfx();
  const rank = playerRank(standings(state, now));
  const wins = Object.values(state.h2h).reduce((n, h) => n + (h?.w ?? 0), 0);
  const games = Object.values(state.h2h).reduce((n, h) => n + (h?.w ?? 0) + (h?.l ?? 0), 0);
  const stats: [string, string][] = [
    [t.statThisWeek, state.cases ? ordinal(rank) : '—'],
    [t.statBestFinish, state.bestRank ? ordinal(state.bestRank) : '—'],
    [t.statWeeks, String(state.weeksPlayed)],
    [t.statH2h, games ? `${wins}–${games - wins}` : '—'],
  ];
  return (
    <GlassPanel as="section" class="rv-profile" accent={ACCENT} icon="users" eyebrow={t.eyebrow} title={t.profileTitle}>
      <dl class="rv-profile__stats">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd class="lm-num" dir="auto">{v}</dd>
          </div>
        ))}
      </dl>
      <button
        type="button"
        class="rv-profile__faces"
        onClick={() => {
          play('click');
          services.router.go(SYSTEM_ID);
        }}
        aria-label={t.openBoardAria}
      >
        {ROSTER.map((r) => <RivalPortrait key={r.id} rival={r} size={30} />)}
        <span>{t.viewBoard}</span>
      </button>
    </GlassPanel>
  );
}
