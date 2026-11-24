/** Hub sidebar card: a compact slice of the weekly board around the player. */
import type { GameServices } from '@core';
import { GlassPanel, Icon, useReducedMotion, useSfx, useSignal } from '@ui-kit';
import { ACCENT, SYSTEM_ID } from '../controller';
import { PLAYER_ID, boardSeries, nextAbove, playerRank, standings, type Standing } from '../league';
import { timeLeftLabel, weekNumber, weekStart } from '../week';
import { PlayerPortrait, RivalPortrait, Sparkline, useRivals } from './shared';

/** Up to `n` rows: the leader(s) plus the player and their neighbours. */
export function boardSlice(rows: Standing[], n = 4): Standing[] {
  const i = rows.findIndex((r) => r.id === PLAYER_ID);
  if (i < n - 1) return rows.slice(0, n);
  const start = Math.max(1, Math.min(i - 1, rows.length - (n - 1)));
  return [rows[0]!, ...rows.slice(start, start + n - 1)];
}

export function HubCard({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const settings = useSignal(services.settings);
  const reduced = useReducedMotion();
  const play = useSfx();
  const rows = standings(state, now);
  const rank = playerRank(rows);
  const above = nextAbove(rows);
  const joined = state.cases > 0;
  const slice = boardSlice(rows);
  const series = boardSeries(state, now, undefined, 21).map((s) => ({ ...s, highlight: s.id === PLAYER_ID }));
  const open = () => {
    play('click');
    services.router.go(SYSTEM_ID);
  };

  return (
    <GlassPanel
      as="section"
      class="rv-hubcard"
      accent={ACCENT}
      glow
      interactive
      padding="md"
      onClick={open}
      onKeyDown={(e: KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          open();
        }
      }}
      role="button"
      aria-label={`Rivals: ${joined ? `you are #${rank} of ${rows.length}` : 'join this week by finishing a patient'}. Open the board.`}
      icon="users"
      eyebrow={`Rivals · Week ${weekNumber(state.weekKey)}`}
      title={joined ? <span>You're <b class="rv-hubcard__rank lm-num">#{rank}</b> <span class="rv-dim">of {rows.length}</span></span> : 'Colleagues board'}
    >
      <Sparkline series={series} t0={weekStart(now)} t1={Math.max(now, weekStart(now) + 12 * 3_600_000)} height={46} label="This week's points" class={reduced ? 'is-static' : ''} />
      <ol class="rv-hubcard__list">
        {slice.map((r, i) => [
          i > 0 && r.rank - slice[i - 1]!.rank > 1 && <li key={`gap-${r.id}`} class="rv-hubrow rv-hubrow--gap" aria-hidden="true">⋯</li>,
          <li key={r.id} class={`rv-hubrow${r.id === PLAYER_ID ? ' is-you' : ''}`}>
            <span class="rv-hubrow__pos lm-num">{r.rank}</span>
            {r.rival ? <RivalPortrait rival={r.rival} size={28} /> : <PlayerPortrait name={settings.playerName} size={28} />}
            <span class="rv-hubrow__name">{r.rival ? r.rival.short : 'You'}</span>
            <span class="rv-hubrow__pts lm-num">{r.points.toLocaleString('en')}</span>
          </li>,
        ])}
      </ol>
      <footer class="rv-hubcard__foot">
        <span>
          {!joined
            ? 'Finish a patient to join the race'
            : above?.rival
              ? <>Pass {above.rival.short} with <b class="lm-num">{above.points - state.points}</b> pts</>
              : <><Icon name="crown" size={14} /> Leading the ward</>}
        </span>
        <span class="rv-dim"><Icon name="clock" size={13} /> {timeLeftLabel(now)}</span>
      </footer>
    </GlassPanel>
  );
}
