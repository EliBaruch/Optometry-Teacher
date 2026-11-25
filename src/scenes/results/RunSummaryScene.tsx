import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { beginRun, type GameServices, type RunSnapshot, type SceneProps } from '@core';
import { AvatarBust } from '@render';
import {
  Button, CountUp, Divider, GRADE_COLOR, GlassPanel, HudSlot, Icon, Ornament, RingMeter, Screen, cx, palette, useReducedMotion, useRegistry,
} from '@ui-kit';
import { demoRun } from './demo';
import { prettyId } from './model';
import { accuracy, bestCase, checkBest, comboPeak, findRun, missedDiagnoses, runLogSlot, type BestResult, type RunLogEntry } from './run-log';
import { Safe } from './Safe';
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
  return (
    <Screen backdrop="results" title="Shift report" onBack={() => services.router.go('hub')} backLabel="Back to clinic">
      <div class="sm-empty">
        <GlassPanel strong padding="lg" icon="info" title="No patients seen">
          <p class="lm-muted">This run ended before any patient was reviewed.</p>
          <div class="sm-empty__btns">
            {modeId && services.registries.modes.has(modeId) && (
              <Button variant="primary" icon="play" onClick={() => beginRun(services, modeId) || services.router.go('hub')}>
                Try again
              </Button>
            )}
            <Button variant="glass" icon="home" onClick={() => services.router.go('hub')}>
              Back to clinic
            </Button>
          </div>
        </GlassPanel>
      </div>
    </Screen>
  );
}

function Summary({ services, snapshot, entries, demo }: { services: GameServices; snapshot: RunSnapshot; entries: RunLogEntry[]; demo: boolean }) {
  const reduced = useReducedMotion();
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
          name: kase?.patient.name ?? 'Patient',
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
    <Screen backdrop="results" eyebrow="Run complete" title={mode?.title ?? 'Shift report'} class={cx('sm-screen', reduced && 'is-instant')} contentClass="sm-content">
      <div class="sm-page">
        <header class="sm-hero" ref={totalRef}>
          <span class="lm-eyebrow">Shift report</span>
          <div class="sm-total">
            <CountUp value={snapshot.totalScore} duration={reduced ? 1 : 1900} delay={reduced ? 0 : 500} onDone={onTotal} tickSfx="tick" />
          </div>
          <span class="sm-total__label">total score</span>
          <div class={cx('sm-pb', landed && 'is-shown', pb?.isBest && 'is-best')}>
            {pb?.isBest ? (
              <>
                <Icon name="crown" />
                <span>{pb.first ? 'First record set' : 'New personal best'}</span>
                {pb.previous !== undefined && <span class="sm-pb__prev">previous {pb.previous.toLocaleString('en-US')}</span>}
              </>
            ) : pb?.previous !== undefined ? (
              <>
                <Icon name="trophy" />
                <span>Personal best {pb.previous.toLocaleString('en-US')}</span>
              </>
            ) : null}
          </div>
          <Ornament width={160} class="sm-hero__orn" />
        </header>

        <section class="sm-stats" aria-label="Run statistics">
          <GlassPanel class="sm-stat" style={{ '--n': 0 }} strong>
            <RingMeter value={acc} size={92} thickness={7} accent={palette.normal} ariaLabel={`Accuracy ${Math.round(acc * 100)}%`}>
              <span class="sm-stat__ring lm-num">{Math.round(acc * 100)}%</span>
            </RingMeter>
            <div class="sm-stat__text">
              <span class="lm-eyebrow">Accuracy</span>
              <strong>
                {correctN} of {entries.length} correct
              </strong>
            </div>
          </GlassPanel>
          <GlassPanel class="sm-stat" style={{ '--n': 1 }} strong accent={palette.streaks}>
            <span class="sm-stat__big sm-stat__big--flame">
              <Icon name="flame" />
              <span class="lm-num">{peak}</span>
            </span>
            <div class="sm-stat__text">
              <span class="lm-eyebrow">Combo peak</span>
              <strong>{peak >= 3 ? 'On fire' : peak >= 1 ? 'In a row' : 'Keep at it'}</strong>
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
              <span class="lm-eyebrow">Best case</span>
              <strong>{best ? best.dxName || best.name : '—'}</strong>
              {best?.grade && (
                <span class="sm-stat__sub">
                  Grade <b style={{ color: GRADE_COLOR[best.grade] }}>{best.grade}</b> · case score {best.total.toLocaleString('en-US')}
                </span>
              )}
            </div>
          </GlassPanel>
        </section>

        <Divider label="Patients" />
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
              <span class="sm-row__res" title={r.correct ? 'Correct diagnosis' : r.timeout ? 'Out of time' : 'Missed diagnosis'}>
                <Icon name={r.correct ? 'check' : r.timeout ? 'clock' : 'x'} label={r.correct ? 'Correct' : r.timeout ? 'Out of time' : 'Missed'} />
              </span>
              <span class="sm-row__grade" style={{ '--g': r.grade ? GRADE_COLOR[r.grade] : '#54486b' }}>
                {r.grade ?? '–'}
              </span>
              <span class="sm-row__pts lm-num">{r.points ? `+${r.points.toLocaleString('en-US')}` : '—'}</span>
              {best === r && (
                <span class="sm-row__crown" aria-label="Best case">
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
                <span class="lm-eyebrow">Study list</span>
                <h3 id="sm-study-title">Worth a second look</h3>
                <p class="lm-muted">{study.length === 1 ? 'This diagnosis' : 'These diagnoses'} will come back for review. Five minutes in the codex now makes the next one stick.</p>
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
        <Button variant="ghost" icon="home" sfx="back" onClick={() => services.router.go('hub')}>
          Back to clinic
        </Button>
        {mode && (
          <div class="sm-again">
            <Button variant="primary" size="lg" icon="refresh" onClick={playAgain} sfx="whoosh">
              Play again
            </Button>
          </div>
        )}
      </footer>
    </Screen>
  );
}
