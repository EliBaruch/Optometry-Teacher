/** Run summary: what this shift did on the colleagues board (points, passes, best work-ups). */
import type { GameServices } from '@core';
import { CountUp, GlassPanel, Icon } from '@ui-kit';
import { ACCENT } from '../controller';
import { playerRank, standings } from '../league';
import { RIVAL_BY_ID } from '../roster';
import { RivalPortrait, useRivals } from './shared';

export function RunCard({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const run = state.run;
  if (!run || run.cases === 0) return null;
  const rows = standings(state, now);
  const rank = playerRank(rows);
  const moved = run.rankBefore > 0 ? run.rankBefore - rank : 0;
  const passed = run.passed.map((id) => RIVAL_BY_ID[id]).filter(Boolean);

  return (
    <GlassPanel as="section" class="rv-runcard" accent={ACCENT} strong icon="users" eyebrow="Rivals" title="This shift on the colleagues board">
      <div class="rv-runcard__grid">
        <div class="rv-runcard__stat">
          <span class="rv-runcard__num lm-num">+<CountUp value={run.points} /></span>
          <span class="rv-dim">board points from {run.cases} {run.cases === 1 ? 'patient' : 'patients'}</span>
        </div>
        <div class="rv-runcard__stat">
          <span class="rv-runcard__num lm-num">#{rank}</span>
          <span class="rv-dim">
            {run.rankBefore === 0 ? `joined the board of ${rows.length}` : moved > 0 ? `up ${moved} ${moved === 1 ? 'place' : 'places'} this shift` : moved < 0 ? 'the ward was busy too' : 'held your place'}
          </span>
        </div>
        <div class="rv-runcard__stat">
          <span class="rv-runcard__num lm-num">{run.best}</span>
          <span class="rv-dim">{run.best === 1 ? 'patient' : 'patients'} with the best work-up on the ward</span>
        </div>
      </div>
      {passed.length > 0 && (
        <p class="rv-runcard__passed">
          <span class="rv-runcard__faces" aria-hidden="true">
            {passed.map((r) => <RivalPortrait key={r.id} rival={r} size={30} />)}
          </span>
          <span><Icon name="trophy" size={14} /> You passed {passed.map((r) => r.short).join(', ')} this shift.</span>
        </p>
      )}
    </GlassPanel>
  );
}
