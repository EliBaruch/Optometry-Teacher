/** Run summary: what this shift did on the colleagues board (points, passes, best work-ups). */
import type { GameServices } from '@core';
import { CountUp, GlassPanel, Icon, useLocale, useStrings } from '@ui-kit';
import { S, rivalText } from '../strings';
import { ACCENT } from '../controller';
import { playerRank, standings } from '../league';
import { RIVAL_BY_ID } from '../roster';
import { RivalPortrait, useRivals } from './shared';

export function RunCard({ services }: { services: GameServices }) {
  const { state, now } = useRivals(services);
  const t = useStrings(S);
  const locale = useLocale();
  const run = state.run;
  if (!run || run.cases === 0) return null;
  const rows = standings(state, now);
  const rank = playerRank(rows);
  const moved = run.rankBefore > 0 ? run.rankBefore - rank : 0;
  const passed = run.passed.map((id) => RIVAL_BY_ID[id]).filter(Boolean);

  return (
    <GlassPanel as="section" class="rv-runcard" accent={ACCENT} strong icon="users" eyebrow={t.eyebrow} title={t.runTitle}>
      <div class="rv-runcard__grid">
        <div class="rv-runcard__stat">
          <span class="rv-runcard__num lm-num">+<CountUp value={run.points} /></span>
          <span class="rv-dim">{t.runPoints(run.cases)}</span>
        </div>
        <div class="rv-runcard__stat">
          <span class="rv-runcard__num lm-num" dir="ltr">#{rank}</span>
          <span class="rv-dim">
            {run.rankBefore === 0 ? t.runJoined(rows.length) : moved > 0 ? t.runUp(moved) : moved < 0 ? t.runBusy : t.runHeld}
          </span>
        </div>
        <div class="rv-runcard__stat">
          <span class="rv-runcard__num lm-num">{run.best}</span>
          <span class="rv-dim">{t.runBest(run.best)}</span>
        </div>
      </div>
      {passed.length > 0 && (
        <p class="rv-runcard__passed">
          <span class="rv-runcard__faces" aria-hidden="true">
            {passed.map((r) => <RivalPortrait key={r.id} rival={r} size={30} />)}
          </span>
          <span><Icon name="trophy" size={14} /> {t.runPassed(passed.map((r) => rivalText(r, locale).short).join(', '))}</span>
        </p>
      )}
    </GlassPanel>
  );
}
