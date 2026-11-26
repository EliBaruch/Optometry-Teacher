/**
 * Results screen panel: how each colleague handled the very same patient (with their slips as lessons).
 * On the run summary it shows the run's board progress instead (the per-patient panel would only
 * describe the last case there).
 */
import { useState } from 'preact/hooks';
import { testText, type GameServices, type Grade, type TestId } from '@core';
import { GRADE_COLOR, GlassPanel, Icon, isIconName, useLocale, useSfx, useSignal, useStrings } from '@ui-kit';
import { S, rivalText } from '../strings';
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
  const t = useStrings(S);
  const locale = useLocale();
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
    ? t.headBest
    : beaten >= Math.ceil(last.rivals.length / 2)
      ? t.headMost(beaten, last.rivals.length)
      : beaten > 0
        ? t.headSome(beaten, last.rivals.length)
        : lessons
          ? t.headLessons
          : t.headCompare;

  return (
    <GlassPanel
      as="section"
      class="rv-results"
      accent={ACCENT}
      glow={best}
      strong
      icon="users"
      eyebrow={t.resEyebrow}
      title={t.resTitle}
      actions={<span class="rv-results__pts lm-num" title={t.resPtsTitle}><bdi dir="ltr">+{last.points}</bdi> {locale === 'he' ? 'נק׳' : 'pts'}</span>}
    >
      <p class={`rv-results__headline${best ? ' is-best' : ''}`}>
        {best && <Icon name="star" size={16} />} {headline}
      </p>
      <ol class="rv-results__list">
        {rows.map((r, i) => {
          const ratio = r.max > 0 ? r.total / r.max : 0;
          const quip = r.rival && r.result ? pickQuip(r.rival, r.result, p.total, last.caseId, locale) : null;
          const who = r.rival ? (r.rival.avatar.sex === 'F' ? 'f' : 'm') : 'you';
          const dx = r.correct ? t.dxCorrect : r.chosen ? t.dxCalled(ctl.diagnosisName(r.chosen), who) : t.dxMissed(who);
          return (
            <li key={r.id} class={`rv-rrow${r.id === 'you' ? ' is-you' : ''}${r.correct ? '' : ' is-wrong'}`} style={{ '--rv-i': i, '--rv-c': r.rival?.color ?? '#2257f0' }}>
              <div class="rv-rrow__main">
                <span class="rv-rrow__place lm-num" aria-hidden="true">{i + 1}</span>
                {r.rival ? <RivalPortrait rival={r.rival} size={40} /> : <PlayerPortrait name={settings.playerName} size={40} />}
                <div class="rv-rrow__who">
                  <b>{r.rival ? rivalText(r.rival, locale).short : t.you}</b>
                  <span class={`rv-rrow__dx${r.correct ? ' is-ok' : ''}`}>
                    <Icon name={r.correct ? 'check' : 'close'} size={11} /> {dx}
                  </span>
                </div>
                <div class="rv-rrow__bar" aria-hidden="true">
                  <span style={{ width: `${Math.round(ratio * 100)}%` }} />
                </div>
                <span class="rv-rrow__time lm-num" title={t.timeTitle}>
                  {r.correct && r.timeSec === fastest && <Icon name="lightning" size={12} />} {formatTime(r.timeSec)}
                </span>
                <span class="rv-rrow__grade" style={{ '--rv-g': GRADE_COLOR[r.grade] }} aria-label={t.gradeAria(r.grade)}>{r.grade}</span>
                <span class="rv-rrow__score lm-num" aria-label={t.pointsAria(r.total)}>{r.total}</span>
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
                      <span class="rv-slip__pearl"><Icon name="info" size={13} /> <span><b>{t.teachingPoint}</b> {r.result.slip.lesson}</span></span>
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
  const t = useStrings(S);
  const locale = useLocale();
  if (!tests.length) return null;
  const nameOf = (id: TestId) => testText(id, locale).name;
  const names = tests.map(nameOf);
  return (
    <span class={`rv-path${you ? ' rv-path--you' : ''}${open ? ' is-open' : ''}`}>
      <button
        type="button"
        class="rv-path__btn"
        aria-expanded={open}
        aria-label={`${you ? t.pathYour : t.pathRun}: ${t.pathCount(tests.length)}. ${open ? t.pathHide : t.pathShow}`}
        onClick={() => {
          play('click');
          setOpen((o) => !o);
        }}
      >
        <span class="rv-path__steps" aria-hidden="true">
          {tests.map((id) => (
            <span key={id} class="rv-path__step" title={nameOf(id)}>
              {isIconName(id) ? <Icon name={id} size={13} /> : id[0]}
            </span>
          ))}
        </span>
        <span class="rv-path__count">{you ? t.pathYourRoute : ''}{t.pathCount(tests.length)}</span>
        <span class="rv-path__chev" aria-hidden="true"><Icon name="chevron-right" size={12} /></span>
      </button>
      {open && <span class="rv-path__names">{names.join(' → ')}</span>}
    </span>
  );
}
