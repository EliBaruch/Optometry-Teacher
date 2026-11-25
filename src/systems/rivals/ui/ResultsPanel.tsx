/**
 * Results screen panel: how each colleague handled the very same patient (with their slips as lessons).
 * On the run summary it shows the run's board progress instead (the per-patient panel would only
 * describe the last case there).
 */
import { useState } from 'preact/hooks';
import { TEST_CATALOG, type GameServices, type Grade, type TestId } from '@core';
import { GRADE_COLOR, GlassPanel, Icon, isIconName, useSfx, useSignal } from '@ui-kit';
import { ACCENT } from '../controller';
import { RIVAL_BY_ID, type Rival } from '../roster';
import { formatTime, inClinicalOrder, pickQuip, type RivalCaseResult } from '../sim';
import { RunCard } from './RunCard';
import { PlayerPortrait, RivalPortrait, useRivals } from './shared';

interface Row {
  id: string;
  rival?: Rival;
  total: number;
  max: number;
  grade: Grade;
  timeSec: number;
  correct: boolean;
  chosen?: string;
  result?: RivalCaseResult;
}

export function ResultsPanel({ services }: { services: GameServices }) {
  const route = useSignal(services.router.current);
  if (route.id === 'run-summary') return <RunCard services={services} />;
  return <CasePanel services={services} routeId={route.id} />;
}

function CasePanel({ services, routeId }: { services: GameServices; routeId: string }) {
  const { ctl, state } = useRivals(services);
  const session = useSignal(services.session.state);
  const settings = useSignal(services.settings);
  const last = state.last;
  if (!last) return null;
  // Only about the patient just finished: the live session must be this case (or, on the results
  // scene itself, no other case may have started since).
  const sameCase = session ? session.caseId === last.caseId && !!session.submitted : routeId === 'results';
  if (!sameCase) return null;

  const p = last.player;
  const rows: Row[] = [
    { id: 'you', total: p.total, max: p.max, grade: p.grade, timeSec: p.timeSec, correct: p.diagnosisCorrect, chosen: p.chosenDiagnosisId },
    ...last.rivals.map((r) => ({
      id: r.rivalId, rival: RIVAL_BY_ID[r.rivalId], total: r.total, max: r.max, grade: r.grade, timeSec: r.timeSec, correct: r.diagnosisCorrect, chosen: r.chosenDiagnosisId, result: r,
    })),
  ].sort((a, b) => b.total - a.total || (a.id === 'you' ? -1 : 1));
  const beaten = last.rivals.filter((r) => p.total > r.total).length;
  const best = beaten === last.rivals.length && p.diagnosisCorrect;
  const fastest = Math.min(...rows.filter((r) => r.correct).map((r) => r.timeSec));
  const lessons = last.rivals.filter((r) => r.slip).length;
  // The player's own route through the exam (when the live session is this case).
  const yourTests = session && session.caseId === last.caseId ? inClinicalOrder(Object.keys(session.testsDone) as TestId[]) : [];

  const headline = best
    ? 'Best work-up on the ward'
    : beaten >= Math.ceil(last.rivals.length / 2)
      ? `You out-scored ${beaten} of ${last.rivals.length} colleagues`
      : beaten > 0
        ? `You out-scored ${beaten} of ${last.rivals.length}. Their slips below are worth a look`
        : lessons
          ? 'A strong ward today. Their slips below are free lessons'
          : 'A strong ward today. Compare your route with theirs';

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
          const dx = r.correct ? 'Correct diagnosis' : r.chosen ? `Called it ${ctl.diagnosisName(r.chosen)}` : 'Missed the diagnosis';
          return (
            <li key={r.id} class={`rv-rrow${r.id === 'you' ? ' is-you' : ''}${r.correct ? '' : ' is-wrong'}`} style={{ '--rv-i': i, '--rv-c': r.rival?.color ?? '#ffd27a' }}>
              <div class="rv-rrow__main">
                <span class="rv-rrow__place lm-num" aria-hidden="true">{i + 1}</span>
                {r.rival ? <RivalPortrait rival={r.rival} size={40} /> : <PlayerPortrait name={settings.playerName} size={40} />}
                <div class="rv-rrow__who">
                  <b>{r.rival ? r.rival.short : 'You'}</b>
                  <span class={`rv-rrow__dx${r.correct ? ' is-ok' : ''}`}>
                    <Icon name={r.correct ? 'check' : 'close'} size={11} /> {dx}
                  </span>
                </div>
                <div class="rv-rrow__bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <span class="rv-rrow__time lm-num" title="Time to diagnosis">
                  {r.correct && r.timeSec === fastest && <Icon name="lightning" size={12} />} {formatTime(r.timeSec)}
                </span>
                <span class="rv-rrow__grade" style={{ '--rv-g': GRADE_COLOR[r.grade] }} aria-label={`Grade ${r.grade}`}>{r.grade}</span>
                <span class="rv-rrow__score lm-num" aria-label={`${r.total} points`}>{r.total}</span>
              </div>
              {!r.result && yourTests.length > 0 && (
                <div class="rv-rrow__detail">
                  <TestPath tests={yourTests} you />
                </div>
              )}
              {r.result && (
                <div class="rv-rrow__detail">
                  <TestPath tests={r.result.tests} />
                  {quip && <q class="rv-quip">{quip}</q>}
                  {r.result.slip && (
                    <span class="rv-slip">
                      <span class="rv-slip__what">{r.result.slip.text}</span>
                      <span class="rv-slip__pearl"><Icon name="info" size={13} /> <span><b>Teaching point</b> {r.result.slip.lesson}</span></span>
                    </span>
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

/**
 * A sequence of tests as small icon steps with a visible count. Tap (or Enter) toggles the names,
 * so touch users can read what each glyph means.
 */
function TestPath({ tests, you }: { tests: TestId[]; you?: boolean }) {
  const [open, setOpen] = useState(false);
  const play = useSfx();
  if (!tests.length) return null;
  const names = tests.map((t) => TEST_CATALOG[t]?.name ?? t);
  return (
    <span class={`rv-path${you ? ' rv-path--you' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        class="rv-path__btn"
        aria-expanded={open}
        aria-label={`${you ? 'Your work-up' : 'Tests run'}: ${tests.length} ${tests.length === 1 ? 'test' : 'tests'}. ${open ? 'Hide' : 'Show'} names.`}
        onClick={() => {
          play('click');
          setOpen((o) => !o);
        }}
      >
        <span class="rv-path__steps" aria-hidden="true">
          {tests.map((t) => (
            <span key={t} class="rv-path__step" title={TEST_CATALOG[t]?.name ?? t}>
              {isIconName(t) ? <Icon name={t} size={13} /> : t[0]}
            </span>
          ))}
        </span>
        <span class="rv-path__count">{you ? 'Your route · ' : ''}{tests.length} {tests.length === 1 ? 'test' : 'tests'}</span>
        <span class="rv-path__chev" aria-hidden="true"><Icon name="chevron-right" size={12} /></span>
      </button>
      {open && <span class="rv-path__names">{names.join(' → ')}</span>}
    </span>
  );
}
