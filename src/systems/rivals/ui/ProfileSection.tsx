/** Profile page section: the player's record against colleagues. */
import type { GameServices } from '@core';
import { GlassPanel, useSfx } from '@ui-kit';
import { ACCENT, SYSTEM_ID } from '../controller';
import { playerRank, standings } from '../league';
import { ROSTER } from '../roster';
import { RivalPortrait, ordinal, useRivals } from './shared';

export function ProfileSection({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const play = useSfx();
  const rank = playerRank(standings(state, now));
  const wins = Object.values(state.h2h).reduce((n, h) => n + (h?.w ?? 0), 0);
  const games = Object.values(state.h2h).reduce((n, h) => n + (h?.w ?? 0) + (h?.l ?? 0), 0);
  const stats: [string, string][] = [
    ['This week', state.cases ? ordinal(rank) : '—'],
    ['Best finish', state.bestRank ? ordinal(state.bestRank) : '—'],
    ['Weeks on the board', String(state.weeksPlayed)],
    ['Head-to-head this week', games ? `${wins}–${games - wins}` : '—'],
  ];
  return (
    <GlassPanel as="section" class="rv-profile" accent={ACCENT} icon="users" eyebrow="Rivals" title="Among colleagues">
      <dl class="rv-profile__stats">
        {stats.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd class="lm-num">{v}</dd>
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
        aria-label="Open the colleagues board"
      >
        {ROSTER.map((r) => <RivalPortrait key={r.id} rival={r} size={30} />)}
        <span>View the board</span>
      </button>
    </GlassPanel>
  );
}
