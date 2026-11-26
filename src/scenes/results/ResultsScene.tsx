import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { modeText, abandonRun, advanceRun, type CaseSession, type ClinicalCase, type GameServices, type SceneProps } from '@core';
import {
  Button, Divider, GlassPanel, GradeStamp, Icon, Kbd, Screen, cx, palette, useLocale, useReducedMotion, useSignal, useStrings,
} from '@ui-kit';
import { BEAT_ORDER, beats, type Beat } from './choreo';
import { demoKind, prepareDemo } from './demo';
import { buildReview, type ReviewModel } from './model';
import { ClinicPanels, Rewards, useClinicPanels } from './Rewards';
import { appendEntry, findRun, runLogSlot } from './run-log';
import { ScoreLedger } from './ScoreLedger';
import { S } from './strings';
import { CasePanel, ClockPanel, ConfidenceCallout, DiagnosisPanel, MissedPanel, ReflectionCard, TriagePanel } from './Teaching';
import { VerdictCard } from './VerdictCard';
import './results.css';

/** Cases already reported to the run, per services instance — survives re-renders and re-mounts. */
const reported = new WeakMap<GameServices, Set<string>>();

export function ResultsScene({ services, params }: SceneProps) {
  // Sandbox previews play a case through the session first (never during render).
  const [ready, setReady] = useState(() => !demoKind(params));
  useEffect(() => {
    if (ready) return;
    prepareDemo(services, params);
    setReady(true);
  }, []);
  return ready ? <ResultsLoaded services={services} params={params} /> : null;
}

function ResultsLoaded({ services, params }: SceneProps) {
  const [caseId] = useState(() =>
    typeof params.caseId === 'string' && services.registries.cases.has(params.caseId) ? params.caseId : services.session.state.get()?.caseId ?? '',
  );
  // Snapshot at mount: rewards were buffered here synchronously on submit.
  const [session] = useState(() => services.session.state.get());
  const kase = caseId ? services.registries.cases.get(caseId) : undefined;
  if (!kase) return <NoCase services={services} />;
  return <ResultsView services={services} kase={kase} session={session} timeout={!!params.timeout} />;
}

function NoCase({ services }: { services: GameServices }) {
  const t = useStrings(S);
  return (
    <Screen backdrop="results" title={t.noCaseScreen} onBack={() => services.router.go('hub')} backLabel={t.backToClinic}>
      <div class="rs-empty">
        <GlassPanel strong padding="lg" icon="info" title={t.noCaseTitle}>
          <p class="lm-muted">{t.noCaseBody}</p>
          <Button variant="primary" icon="home" onClick={() => services.router.go('hub')}>
            {t.backToClinic}
          </Button>
        </GlassPanel>
      </div>
    </Screen>
  );
}

function useReportOnce(services: GameServices, review: ReviewModel, session: CaseSession | null) {
  useEffect(() => {
    const run = services.run.state.get();
    if (!run) return;
    const key = `${review.kase.id}@${session?.startedAt ?? 'none'}`;
    let done = reported.get(services);
    if (!done) reported.set(services, (done = new Set()));
    if (done.has(key)) return;
    done.add(key);
    const before = run.totalScore;
    const score = review.score ?? null;
    const after = services.run.report(review.kase.id, score);
    const log = runLogSlot(services);
    log.set(
      appendEntry(log.get(), after.seed, after.modeId, {
        caseId: review.kase.id,
        diagnosisId: review.kase.diagnosis,
        grade: score?.grade ?? null,
        total: score?.total ?? 0,
        points: after.totalScore - before,
        correct: !!score?.diagnosisCorrect,
        timeout: review.verdict === 'timeout',
        confidence: review.confidence,
      }),
    );
  }, []);
}

function useBeats(review: ReviewModel, reduced: boolean) {
  const b = useMemo(() => beats(review.score?.parts.length ?? 0, reduced, !review.score), [reduced]);
  const all = () => Object.fromEntries(BEAT_ORDER.map((k) => [k, true])) as Record<Beat, boolean>;
  const [hit, setHit] = useState<Record<Beat, boolean>>(() => (reduced ? all() : ({} as Record<Beat, boolean>)));
  const [skipped, setSkipped] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => {
    if (reduced) {
      setHit(all());
      return;
    }
    timers.current = BEAT_ORDER.map((k) => setTimeout(() => setHit((h) => ({ ...h, [k]: true })), b[k]));
    return () => timers.current.forEach(clearTimeout);
  }, [b]);
  const skip = () => {
    if (hit.settled) return;
    timers.current.forEach(clearTimeout);
    setSkipped(true);
    setHit(all());
  };
  return { b, hit, skip, instant: reduced || skipped };
}

function ResultsView({ services, kase, session, timeout }: { services: GameServices; kase: ClinicalCase; session: CaseSession | null; timeout: boolean }) {
  const reduced = useReducedMotion();
  const t = useStrings(S);
  const locale = useLocale();
  const review = useMemo(
    () => buildReview({ kase, session, timeout, locale, diagnosis: (id) => services.registries.diagnoses.get(id) }),
    [kase, session],
  );
  useReportOnce(services, review, session);
  const { b, hit, skip, instant } = useBeats(review, reduced);
  const run = useSignal(services.run.state);
  const log = useSignal(runLogSlot(services));
  const runEntry = run ? findRun(log, run.seed)?.entries.find((e) => e.caseId === kase.id) : undefined;
  const cardEl = useRef<HTMLDivElement | null>(null);
  const stampEl = useRef<HTMLDivElement>(null);
  const dxPanel = useRef<HTMLElement | null>(null);
  const nextBtn = useRef<HTMLDivElement>(null);
  const verdictFired = useRef(false);
  const panels = useClinicPanels(services);

  // Beat 1 impact: the card faces the player.
  useEffect(() => {
    if (!hit.verdict || verdictFired.current) return;
    verdictFired.current = true;
    const { audio, fx } = services;
    const r = cardEl.current?.getBoundingClientRect();
    const cx0 = r ? r.left + r.width / 2 : innerWidth / 2;
    const cy0 = r ? r.top + r.height * 0.42 : innerHeight / 3;
    if (review.verdict === 'correct') {
      audio.play('success');
      if (!instant) {
        fx.hitstop(110);
        fx.burst(cx0, cy0, { kind: 'sparks', count: 48, color: palette.gold });
        fx.burst(cx0, cy0, { kind: 'stars', count: 12, color: '#fff4da' });
        fx.flash('rgba(255,210,122,0.18)', 260);
      }
    } else if (review.verdict === 'wrong') {
      audio.play('fail', { volume: 0.55 });
      if (!instant) fx.shake(3.5, 320);
    } else {
      audio.play('thud', { volume: 0.6 });
    }
  }, [hit.verdict]);

  // Perfect case: a last flourish once the total lands.
  useEffect(() => {
    if (!hit.total || instant || !review.score?.perfect) return;
    const r = stampEl.current?.getBoundingClientRect();
    if (r) {
      services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'confetti', count: 60 });
      services.fx.floatText(t.perfectFloat, r.left + r.width / 2, r.top, { color: palette.gold, size: 26 });
    }
  }, [hit.total]);

  // Keyboard: Space/Enter skips the choreography; N = next patient once settled.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const t = e.target;
      const onControl = t instanceof Element && !!t.closest('button, a, input, textarea, select, [role="tab"]');
      if (!hit.settled && (e.key === ' ' || e.key === 'Enter' || e.key === 'Escape') && !onControl) {
        e.preventDefault();
        skip();
      } else if ((e.key === 'n' || e.key === 'N') && hit.settled) {
        nextBtn.current?.querySelector('button')?.click();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [hit.settled]);

  const mode = services.run.mode();
  const modeMod = (mode && services.registries.modes.get(mode.id)) || services.registries.modes.get(session?.modeId ?? '');
  const modeTitle = modeMod ? modeText(modeMod, locale).title : undefined;
  const runActive = !!(run && mode);
  const runOver = !!(run && mode && ((run.lives !== null && run.lives <= 0) || (mode.rules.length !== 'endless' && run.completed.length + run.failed.length >= mode.rules.length)));
  const seen = run ? run.completed.length + run.failed.length : 0;
  const hasCodex = services.registries.scenes.has('codex');

  const onNext = () => {
    if (runActive) advanceRun(services);
    else {
      services.session.clear();
      services.router.go('hub');
    }
  };
  const onBack = () => {
    if (runActive) abandonRun(services);
    else {
      services.session.clear();
      services.router.go('hub');
    }
  };
  const readFindings = () => {
    skip();
    requestAnimationFrame(() => {
      dxPanel.current?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
      dxPanel.current?.focus({ preventScroll: true });
    });
  };

  const score = review.score;
  const headline = score ? (score.perfect ? t.perfect : t.headline[score.grade]) : review.verdict === 'timeout' ? t.timeoutHeadline : t.closedHeadline;

  return (
    <Screen backdrop="results" eyebrow={modeTitle ?? t.caseReview} title={kase.patient.name} class={cx('rs-screen', `rs--${review.verdict}`, instant && 'is-instant')} contentClass="rs-content">
      <div class="rs-page">
        <div
          class="rs-hero"
          onPointerDown={(e) => !(e.target as HTMLElement).closest('button, a') && skip()}
          onPointerMove={(e) => {
            const el = cardEl.current;
            if (!el || instant || e.pointerType !== 'mouse') return;
            const r = el.getBoundingClientRect();
            const nx = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / r.width));
            const ny = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / r.height));
            el.style.setProperty('--ry', `${(nx * 7).toFixed(2)}deg`);
            el.style.setProperty('--rx', `${(-ny * 5).toFixed(2)}deg`);
          }}
          onPointerLeave={() => {
            cardEl.current?.style.setProperty('--ry', '0deg');
            cardEl.current?.style.setProperty('--rx', '0deg');
          }}
        >
          <div class="rs-hero__left">
            <VerdictCard review={review} flipped={!!hit.flip} landed={!!hit.verdict} settled={!!hit.stamp} reduced={instant} cardRef={(el) => (cardEl.current = el)} />
            {hit.verdict && <ConfidenceCallout review={review} onReadFindings={readFindings} />}
          </div>

          <div class="rs-hero__right">
            <div class={cx('rs-head', hit.stamp && 'is-shown')}>
              <div class="rs-head__stamp" ref={stampEl}>
                {hit.stamp &&
                  (score ? (
                    <GradeStamp key={instant ? 's' : 'a'} grade={score.grade} size={150} animate={!instant} shake={!instant && score.grade !== 'F' ? undefined : false} />
                  ) : (
                    <div class="rs-seal" role="img" aria-label={t.sealLabel}>
                      <Icon name="clock" size={44} />
                      <span>{review.verdict === 'timeout' ? t.outOfTime : t.closed}</span>
                    </div>
                  ))}
              </div>
              <div class="rs-head__text">
                <span class="lm-eyebrow">{score ? t.gradeEyebrow(score.grade) : t.noScore}</span>
                <h2 class="rs-head__line">{headline}</h2>
                {!score && <p class="lm-muted">{t.noScoreBody}</p>}
              </div>
            </div>

            {!score && (
              <div class={cx('rs-scorepanel', hit.stamp && 'is-shown')}>
                <ClockPanel review={review} limitSec={session?.caseId === kase.id ? session.timeLimitSec : undefined} />
              </div>
            )}
            {score && (
              <GlassPanel class={cx('rs-scorepanel', hit.ledger && 'is-shown')} strong padding="md">
                <ScoreLedger score={score} started={!!hit.ledger} totalShown={!!hit.total} step={b.partStep} instant={instant} runPoints={runEntry?.points} />
              </GlassPanel>
            )}

            <Rewards services={services} initial={session?.caseId === kase.id ? session.rewards : []} shown={!!hit.rewards} instant={instant} />
          </div>
        </div>

        <div class={cx('rs-body', panels && 'has-rail')}>
          <div class={cx('rs-lesson', hit.teaching && 'is-shown')}>
            <Divider label={t.lesson} />
            <div class="rs-grid">
              <DiagnosisPanel review={review} panelRef={(el) => (dxPanel.current = el)} />
              <div class="rs-col">
                <MissedPanel review={review} />
                <TriagePanel review={review} />
              </div>
            </div>
            <CasePanel review={review} />
            <ReflectionCard review={review} />
          </div>
          {panels && (
            <aside class={cx('rs-clinic', hit.rewards && 'is-shown')} aria-label={t.aroundClinic}>
              <Divider label={t.aroundClinic} />
              <ClinicPanels shown={!!hit.rewards} />
            </aside>
          )}
        </div>
      </div>

      {!hit.settled && (
        <button type="button" class="rs-skip" onClick={skip}>
          {t.skip} <Kbd>Space</Kbd>
        </button>
      )}

      <footer class={cx('rs-actions', hit.total || !score ? 'is-shown' : '')}>
        <div class="rs-actions__info">
          {runActive && run && mode && (
            <>
              <span class="lm-eyebrow">{modeTitle ?? mode.title}</span>
              <span class="rs-actions__progress">
                {mode.rules.length === 'endless' ? t.patientEndless(seen) : t.patientOf(seen, mode.rules.length)}
                {run.lives !== null && (
                  <span class="rs-lives" aria-label={t.livesLeft(run.lives)}>
                    {Array.from({ length: Math.max(mode.rules.lives ?? 0, run.lives, 0) }, (_, i) => (
                      <Icon key={i} name="heart" class={i < run.lives! ? 'is-full' : ''} />
                    ))}
                  </span>
                )}
              </span>
            </>
          )}
        </div>
        <div class={cx('rs-actions__btns', (runActive ? 1 : 0) + (hasCodex ? 1 : 0) === 1 && 'is-pair')}>
          {runActive && (
            <Button variant="ghost" icon="home" onClick={onBack} sfx="back" class="rs-sec" aria-label={t.backToClinic}>
              <span class="rs-lbl">{t.backToClinic}</span>
            </Button>
          )}
          {hasCodex && (
            <Button variant="glass" icon="book" onClick={() => services.router.go('codex', { diagnosisId: review.correctId })} class="rs-sec" aria-label={t.codexEntry}>
              <span class="rs-lbl">{t.codexEntry}</span>
            </Button>
          )}
          <div class="rs-next" ref={nextBtn}>
            {runActive ? (
              <Button variant="primary" size="lg" icon={runOver ? 'trophy' : undefined} trailingIcon={runOver ? undefined : 'arrow-right'} onClick={onNext} sfx="whoosh">
                {runOver ? t.seeSummary : t.nextPatient}
              </Button>
            ) : (
              <Button variant="primary" size="lg" icon="home" onClick={onBack} sfx="back">
                {t.backToClinic}
              </Button>
            )}
          </div>
        </div>
      </footer>
    </Screen>
  );
}
