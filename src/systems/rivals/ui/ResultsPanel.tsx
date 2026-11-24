/** Results screen panel: how each colleague handled the very same patient (with their slips as lessons). */
import { TEST_CATALOG, type GameServices, type Grade, type TestId } from '@core';
import { GRADE_COLOR, GlassPanel, Icon, isIconName, useSignal } from '@ui-kit';
import { ACCENT } from '../controller';
import { RIVAL_BY_ID, type Rival } from '../roster';
import { formatTime, pickQuip, type RivalCaseResult } from '../sim';
import { PlayerPortrait, RivalPortrait, useRivals } from './shared';

interface Row {
  id: string;
  rival?: Rival;
  total: number;
  max: number;
  grade: Grade;
  timeSec: number;
  correct: boolean;
  result?: RivalCaseResult;
}

export function ResultsPanel({ services }: { services: GameServices }) {
  const { ctl, state } = useRivals(services);
  const session = useSignal(services.session.state);
  const settings = useSignal(services.settings);
  const last = state.last;
  if (!last) return null;
  if (session && session.caseId !== last.caseId) return null;

  const p = last.player;
  const rows: Row[] = [
    { id: 'you', total: p.total, max: p.max, grade: p.grade, timeSec: p.timeSec, correct: p.diagnosisCorrect },
    ...last.rivals.map((r) => ({
      id: r.rivalId, rival: RIVAL_BY_ID[r.rivalId], total: r.total, max: r.max, grade: r.grade, timeSec: r.timeSec, correct: r.diagnosisCorrect, result: r,
    })),
  ].sort((a, b) => b.total - a.total || (a.id === 'you' ? -1 : 1));
  const beaten = last.rivals.filter((r) => p.total > r.total).length;
  const best = beaten === last.rivals.length && p.diagnosisCorrect;
  const topRival = rows.find((r) => r.rival);
  const fastest = Math.min(...rows.filter((r) => r.correct).map((r) => r.timeSec));

  const headline = best
    ? 'Best work-up on the ward'
    : beaten >= Math.ceil(last.rivals.length / 2)
      ? `You out-scored ${beaten} of ${last.rivals.length} colleagues`
      : `${topRival?.rival?.short ?? 'A colleague'}'s work-up is worth a look`;

  return (
    <GlassPanel
      as="section"
      class="rv-results"
      accent={ACCENT}
      glow={best}
      strong
      icon="users"
      eyebrow="Rivals"
      title="How your colleagues did on this patient"
      actions={<span class="rv-results__pts lm-num" title="Weekly board points">+{last.points} pts</span>}
    >
      <p class={`rv-results__headline${best ? ' is-best' : ''}`}>
        {best && <Icon name="star" size={16} />} {headline}
      </p>
      <ol class="rv-results__list">
        {rows.map((r, i) => {
          const ratio = r.max > 0 ? r.total / r.max : 0;
          const quip = r.rival && r.result ? pickQuip(r.rival, r.result, p.total, last.caseId) : null;
          return (
            <li key={r.id} class={`rv-rrow${r.id === 'you' ? ' is-you' : ''}`} style={{ '--rv-i': i, '--rv-c': r.rival?.color ?? '#ffd27a' }}>
              <div class="rv-rrow__main">
                {r.rival ? <RivalPortrait rival={r.rival} size={40} /> : <PlayerPortrait name={settings.playerName} size={40} />}
                <div class="rv-rrow__who">
                  <b>{r.rival ? r.rival.short : 'You'}</b>
                  <span class="rv-dim">
                    {r.correct ? 'Correct diagnosis' : r.result?.chosenDiagnosisId ? `Called it ${ctl.diagnosisName(r.result.chosenDiagnosisId)}` : 'Missed it'}
                  </span>
                </div>
                <div class="rv-rrow__bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <span class="rv-rrow__time lm-num" title="Time to diagnosis">
                  {r.correct && r.timeSec === fastest && <Icon name="lightning" size={12} />} {formatTime(r.timeSec)}
                </span>
                <span class="rv-rrow__grade" style={{ '--rv-g': GRADE_COLOR[r.grade] }} aria-label={`Grade ${r.grade}`}>{r.grade}</span>
                <span class="rv-rrow__score lm-num">{r.total}</span>
              </div>
              {r.result && (
                <div class="rv-rrow__detail">
                  {r.result.tests.length > 0 && (
                    <span class="rv-path" aria-label={`Tests run: ${r.result.tests.map((t) => TEST_CATALOG[t].name).join(', ')}`}>
                      {r.result.tests.map((t: TestId) => (
                        <span key={t} class="rv-path__step" title={TEST_CATALOG[t].name}>
                          {isIconName(t) ? <Icon name={t} size={13} /> : t[0]}
                        </span>
                      ))}
                    </span>
                  )}
                  {r.result.slip ? (
                    <span class="rv-slip">
                      <Icon name="info" size={13} /> {r.result.slip.text} <em>{r.result.slip.lesson}</em>
                    </span>
                  ) : (
                    quip && <q class="rv-quip">{quip}</q>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </GlassPanel>
  );
}
