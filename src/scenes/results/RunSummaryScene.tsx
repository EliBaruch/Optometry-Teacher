import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { modeText, beginRun, type GameServices, type RunSnapshot, type SceneProps } from '@core';
import { AvatarBust } from '@render';
import {
  Button, CountUp, Divider, GRADE_COLOR, GlassPanel, HudSlot, Icon, Ornament, RingMeter, Screen, cx, palette, useLocale, useReducedMotion, useRegistry, useStrings,
} from '@ui-kit';
import { demoRun } from './demo';
import { prettyId } from './model';
import { accuracy, bestCase, checkBest, comboPeak, findRun, missedDiagnoses, runLogSlot, type BestResult, type RunLogEntry } from './run-log';
import { Safe } from './Safe';
import { S } from './strings';
import './summary.css';

interface Row extends RunLogEntry {
  name: string;
  dxName: string;
  avatar?: import('@core').PatientProfile;
}

function isSnapshot(v: unknown): v is RunSnapshot {
  return !!v && typeof v === 'object' && Array.isArray((v as RunSnapshot).completed) && Array.isArray((v as RunSnapshot).failed);
}

/** Without a run log (older save / cleared storage) fall back to the snapshot ids. */
function fallbackEntries(s: RunSnapshot): RunLogEntry[] {
  const mk = (caseId: string, correct: boolean): RunLogEntry => ({ caseId, diagnosisId: '', grade: null, total: 0, points: 0, correct, timeout: false });
  return [...s.completed.map((id) => mk(id, true)), ...s.failed.map((id) => mk(id, false))];
}

export function RunSummaryScene({ services, params }: SceneProps) {
  const modeParam = typeof params.modeId === 'string' ? params.modeId : undefined;
  const [data] = useState(() => {
    if (params.demo) return demoRun(services, modeParam ?? 'shift');
    const snap = isSnapshot(params.snapshot) ? params.snapshot : null;
    if (!snap) return null;
    const entries = findRun(runLogSlot(services).get(), snap.seed)?.entries ?? fallbackEntries(snap);
    return { snapshot: snap, entries };
  });
  if (!data || data.entries.length === 0) return <NoRun services={services} modeId={modeParam} />;
  return <Summary services={services} snapshot={data.snapshot} entries={data.entries} demo={!!params.demo} />;
}

function NoRun({ services, modeId }: { services: GameServices; modeId?: string }) {
  const t = useStrings(S);
  return (
    <Screen backdrop="results" title={t.shiftReport} onBack={() => services.router.go('hub')} backLabel={t.backToClinic}>
      <div class="sm-empty">
        <GlassPanel strong padding="lg" icon="info" title={t.noPatientsTitle}>
          <p class="lm-muted">{t.noPatientsBody}</p>
          <div class="sm-empty__btns">
            {modeId && services.registries.modes.has(modeId) && (
              <Button variant="primary" icon="play" onClick={() => beginRun(services, modeId) || services.router.go('hub')}>
                {t.tryAgain}
              </Button>
            )}
            <Button variant="glass" icon="home" onClick={() => services.router.go('hub')}>
              {t.backToClinic}
            </Button>
          </div>
        </GlassPanel>
      </div>
    </Screen>
  );
}

function Summary({ services, snapshot, entries, demo }: { services: GameServices; snapshot: RunSnapshot; entries: RunLogEntry[]; demo: boolean }) {
  const reduced = useReducedMotion();
  const t = useStrings(S);
  const locale = useLocale();
  const mode = services.registries.modes.get(snapshot.modeId);
  const widgets = useRegistry(services.registries.hud).filter((w) => w.slot === 'results-extra');
  const totalRef = useRef<HTMLDivElement>(null);

  const rows: Row[] = useMemo(
    () =>
      entries.map((e) => {
        const kase = services.registries.cases.get(e.caseId);
        const dxId = e.diagnosisId || kase?.diagnosis || '';
        return {
          ...e,
          diagnosisId: dxId,
          name: kase?.patient.name ?? t.patientFallback,
          dxName: dxId ? services.registries.diagnoses.get(dxId)?.name ?? prettyId(dxId) : '',
          avatar: kase?.patient,
        };
      }),
    [entries],
  );
  const best = bestCase(rows.filter((r) => r.grade));
  const acc = accuracy(snapshot);
  const peak = Math.max(comboPeak(entries), snapshot.combo);
  const correctN = snapshot.completed.length;
  const hasCodex = services.registries.scenes.has('codex');
  const study = useMemo(
    () => missedDiagnoses(rows).map((id) => ({ id, name: services.registries.diagnoses.get(id)?.name ?? prettyId(id) })),
    [rows],
  );

  const [pb] = useState<BestResult | null>(() => {
    if (demo) return { state: { runs: [], best: {} }, isBest: true, first: false, previous: Math.round(snapshot.totalScore * 0.82) };
    const slot = runLogSlot(services);
    const r = checkBest(slot.get(), snapshot.modeId, snapshot.seed, snapshot.totalScore);
    if (r.state !== slot.get()) slot.set(r.state);
    return r;
  });
  const [landed, setLanded] = useState(reduced);

  useEffect(() => {
    services.audio.play('drumroll', { volume: 0.5 });
  }, []);
  const onTotal = () => {
    setLanded(true);
    if (pb?.isBest) {
      services.audio.play('levelup');
      const r = totalRef.current?.getBoundingClientRect();
      if (r && !reduced) {
        services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'confetti', count: 80 });
        services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 30, color: palette.gold });
      }
    } else services.audio.play('success', { volume: 0.7 });
  };

  const playAgain = () => {
    if (!beginRun(services, snapshot.modeId)) services.router.go('hub');
  };

  return (
    <Screen backdrop="results" eyebrow={t.runComplete} title={mode ? modeText(mode, locale).title : t.shiftReport} class={cx('sm-screen', reduced && 'is-instant')} contentClass="sm-content">
      <div class="sm-page">
        <header class="sm-hero" ref={totalRef}>
          <span class="lm-eyebrow">{t.shiftReport}</span>
          <div class="sm-total">
            <CountUp value={snapshot.totalScore} duration={reduced ? 1 : 1900} delay={reduced ? 0 : 500} onDone={onTotal} tickSfx="tick" />
          </div>
          <span class="sm-total__label">{t.totalScore}</span>
          <div class={cx('sm-pb', landed && 'is-shown', pb?.isBest && 'is-best')}>
            {pb?.isBest ? (
              <>
                <Icon name="crown" />
                <span>{pb.first ? t.firstRecord : t.newBest}</span>
                {pb.previous !== undefined && <span class="sm-pb__prev">{t.previous(pb.previous.toLocaleString('en-US'))}</span>}
              </>
            ) : pb?.previous !== undefined ? (
              <>
                <Icon name="trophy" />
                <span>{t.personalBest(pb.previous.toLocaleString('en-US'))}</span>
              </>
            ) : null}
          </div>
          <Ornament width={160} class="sm-hero__orn" />
        </header>

        <section class="sm-stats" aria-label={t.runStats}>
          <GlassPanel class="sm-stat" style={{ '--n': 0 }} strong>
            <RingMeter value={acc} size={92} thickness={7} accent={palette.normal} ariaLabel={`${t.accuracy} ${Math.round(acc * 100)}%`}>
              <span class="sm-stat__ring lm-num" dir="ltr">{Math.round(acc * 100)}%</span>
            </RingMeter>
            <div class="sm-stat__text">
              <span class="lm-eyebrow">{t.accuracy}</span>
              <strong>{t.correctOf(correctN, entries.length)}</strong>
            </div>
          </GlassPanel>
          <GlassPanel class="sm-stat" style={{ '--n': 1 }} strong accent={palette.streaks}>
            <span class="sm-stat__big sm-stat__big--flame">
              <Icon name="flame" />
              <span class="lm-num">{peak}</span>
            </span>
            <div class="sm-stat__text">
              <span class="lm-eyebrow">{t.comboPeak}</span>
              <strong>{peak >= 3 ? t.comboHigh : peak >= 1 ? t.comboSome : t.comboNone}</strong>
            </div>
          </GlassPanel>
          <GlassPanel class="sm-stat sm-stat--best" style={{ '--n': 2 }} strong accent={best?.grade ? GRADE_COLOR[best.grade] : undefined}>
            {best?.avatar ? (
              <Safe fallback={<span class="sm-row__ph sm-row__ph--lg" />}>
                <AvatarBust spec={best.avatar.avatar} age={best.avatar.age} sex={best.avatar.sex} size={64} ring={palette.gold} label={best.name} />
              </Safe>
            ) : (
              <span class="sm-stat__big">
                <Icon name="star" />
              </span>
            )}
            <div class="sm-stat__text">
              <span class="lm-eyebrow">{t.bestCase}</span>
              <strong>{best ? best.dxName || best.name : '—'}</strong>
              {best?.grade && (
                <span class="sm-stat__sub">
                  {t.bestSub(best.grade, best.total.toLocaleString('en-US'))}
                </span>
              )}
            </div>
          </GlassPanel>
        </section>

        <Divider label={t.patients} />
        <ol class="sm-table" role="list">
          {rows.map((r, i) => (
            <li key={r.caseId + i} class={cx('sm-row', r.correct ? 'is-correct' : 'is-wrong', best === r && 'is-best')} style={{ '--n': i }}>
              <span class="sm-row__n lm-num">{i + 1}</span>
              {r.avatar ? (
                <Safe fallback={<span class="sm-row__ph" />}>
                  <AvatarBust spec={r.avatar.avatar} age={r.avatar.age} sex={r.avatar.sex} size={44} ring={r.correct ? palette.gold : '#6b5a88'} />
                </Safe>
              ) : (
                <span class="sm-row__ph" />
              )}
              <span class="sm-row__who">
                <strong>{r.name}</strong>
                <span>{r.dxName}</span>
              </span>
              <span class="sm-row__res" title={r.correct ? t.rowCorrect : r.timeout ? t.rowTimeout : t.rowMissed}>
                <Icon name={r.correct ? 'check' : r.timeout ? 'clock' : 'x'} label={r.correct ? t.rowCorrectShort : r.timeout ? t.rowTimeout : t.rowMissedShort} />
              </span>
              <span class="sm-row__grade" style={{ '--g': r.grade ? GRADE_COLOR[r.grade] : '#54486b' }}>
                {r.grade ?? '–'}
              </span>
              <span class="sm-row__pts lm-num">{r.points ? `+${r.points.toLocaleString('en-US')}` : '—'}</span>
              {best === r && (
                <span class="sm-row__crown" aria-label={t.bestCase}>
                  <Icon name="crown" />
                </span>
              )}
            </li>
          ))}
        </ol>

        {study.length > 0 && (
          <section class="sm-study" aria-labelledby="sm-study-title">
            <div class="sm-study__head">
              <span class="sm-study__icon">
                <Icon name="refresh" />
              </span>
              <div>
                <span class="lm-eyebrow">{t.studyList}</span>
                <h3 id="sm-study-title">{t.secondLook}</h3>
                <p class="lm-muted">{t.studyBody(study.length)}</p>
              </div>
            </div>
            <ul class="sm-study__list" role="list">
              {study.map((d, i) => (
                <li key={d.id} style={{ '--n': i }}>
                  {hasCodex ? (
                    <button type="button" class="sm-study__item" onClick={() => services.router.go('codex', { diagnosisId: d.id })}>
                      <span>{d.name}</span>
                      <Icon name="book" />
                    </button>
                  ) : (
                    <span class="sm-study__item">
                      <span>{d.name}</span>
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        )}

        {widgets.length > 0 && (
          <section class="sm-extra">
            <HudSlot slot="results-extra" />
          </section>
        )}
      </div>

      <footer class="sm-actions">
        <Button variant="ghost" icon="home" sfx="back" class="sm-back" aria-label={t.backToClinic} onClick={() => services.router.go('hub')}>
          <span class="rs-lbl">{t.backToClinic}</span>
        </Button>
        {mode && (
          <div class="sm-again">
            <Button variant="primary" size="lg" icon="refresh" onClick={playAgain} sfx="whoosh">
              {t.playAgain}
            </Button>
          </div>
        )}
      </footer>
    </Screen>
  );
}
