import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { TEST_CATALOG, type MiniGameModule, type MiniGameResult, type PracticeScenario, type SceneProps } from '@core';
import {
  Icon, IconOrText, Modal, Screen, Tabs, cx, isIconName, useReducedMotion, useRegistry, useSignal,
} from '@ui-kit';
import {
  ARCADE_INITIAL, CATEGORY_ACCENT, CATEGORY_LABEL, DIFFICULTIES, MEDAL_COLOR, difficultyById, medalFor, migrateArcade,
  practicable, recordResult, type DifficultyId, type GameRecord,
} from './logic';
import { ResultPanel, type PracticeOutcome } from './ResultPanel';
import { Stage } from './Stage';
import './arcade.css';

export function ArcadeScene({ services, params }: SceneProps) {
  const reduced = useReducedMotion();
  const games = practicable(useRegistry(services.registries.minigames));
  const slot = useMemo(() => services.save.slot('scene:arcade', ARCADE_INITIAL, { version: 1, migrate: migrateArcade }), []);
  const save = useSignal(slot);
  const diff = difficultyById(save.difficulty);

  const initial = typeof params.testId === 'string' ? params.testId : null;
  const [playing, setPlaying] = useState<string | null>(initial);
  const [run, setRun] = useState(0);
  const [outcome, setOutcome] = useState<PracticeOutcome | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const mg = playing ? games.find((g) => g.id === playing) : undefined;
  const medals = Object.values(save.games).filter((g) => medalFor(g.bestAccuracy)).length;
  const harder = DIFFICULTIES[DIFFICULTIES.findIndex((d) => d.id === diff.id) + 1] ?? null;

  const setDifficulty = (id: string) => slot.update((s) => ({ ...s, difficulty: id as DifficultyId }));

  const start = (id: string) => {
    services.audio.play('whoosh', { volume: 0.6 });
    setOutcome(null);
    setRun((n) => n + 1);
    setPlaying(id);
  };
  const again = () => {
    setOutcome(null);
    setRun((n) => n + 1);
    services.audio.play('lens-click');
  };
  const exit = () => {
    setPlaying(null);
    setOutcome(null);
  };

  const onDone = (result: MiniGameResult, scenario: PracticeScenario) => {
    if (!mg) return;
    const rec = recordResult(slot.get(), mg.id, diff, result, services.clock.now());
    slot.set(rec.save);
    services.bus.emit('practice:completed', { testId: mg.id, result });
    const acc = result.accuracy;
    const cx_ = window.innerWidth / 2;
    const cy = window.innerHeight * 0.42;
    if (rec.isBest && rec.previousBest > 0) {
      services.audio.play('levelup');
      services.fx.burst(cx_, cy, { kind: 'confetti', count: 60 });
    } else if (acc >= 0.85) {
      services.audio.play('success');
      services.fx.burst(cx_, cy, { kind: 'stars', count: 24, color: '#ffd27a' });
    } else if (acc >= 0.5) {
      services.audio.play('pop');
    } else {
      services.audio.play('fail', { volume: 0.7 });
    }
    services.fx.floatText(`+${rec.score.toLocaleString()}`, cx_, cy - 40, { color: '#ffd27a', size: 30 });
    const show = () =>
      setOutcome({ result, scenario, score: rec.score, previousBest: rec.previousBest, isBest: rec.isBest, bestAccuracy: rec.save.games[mg.id]!.bestAccuracy });
    if (reduced) show();
    else timers.current.push(setTimeout(show, 650));
  };

  return (
    <Screen title="Practice Arcade" eyebrow="Hone every instrument" onBack={() => services.router.back()} escToBack={!playing} backdrop="exam" class="arcade-scene" contentClass="arcade-content">
      <section class="arcade-hero">
        <div class="arcade-hero__copy lm-enter">
          <p class="arcade-hero__lede">No patient waiting, no clock on the wall — just you and the instruments. Practise until your hands know the way.</p>
          <div class="arcade-hero__stats">
            <span><b class="lm-num">{games.length}</b> instruments</span>
            <span><b class="lm-num">{Object.values(save.games).reduce((n, g) => n + g.plays, 0)}</b> runs</span>
            <span><b class="lm-num">{medals}</b> medals</span>
          </div>
        </div>
        <div class="arcade-diff lm-enter" style={{ '--lm-delay': '100ms', '--d': diff.accent }}>
          <div class="lm-eyebrow">Difficulty</div>
          <Tabs id="arcade-diff" label="Difficulty" items={DIFFICULTIES.map((d) => ({ id: d.id, label: d.label }))} value={diff.id} onChange={setDifficulty} accent={diff.accent} block />
          <p class="arcade-diff__blurb" key={diff.id}>{diff.blurb} <span class="lm-num">×{diff.mult}</span> points.</p>
        </div>
      </section>

      {games.length === 0 ? (
        <div class="arcade-empty lm-enter">
          <span class="arcade-empty__lens" aria-hidden="true"><Icon name="target" size={40} /></span>
          <h2>The instrument cabinet is being stocked</h2>
          <p>No practice instruments are installed yet. Check back soon — every test will appear here as it is calibrated.</p>
        </div>
      ) : (
        <div class="arcade-grid" role="list">
          {games.map((g, i) => (
            <GameCard key={g.id} mg={g} record={save.games[g.id]} index={i} reduced={reduced} onPlay={() => start(g.id)}
              onHover={() => services.audio.play('hover', { volume: 0.2 })} />
          ))}
        </div>
      )}

      <Modal open={!!mg} onClose={exit} size="stage" flush class="arcade-modal"
        eyebrow={mg ? `Practice · ${diff.label}` : undefined} title={mg?.title}
        icon={mg && isIconName(mg.id) ? mg.id : undefined} accent={diff.accent}>
        {mg && (
          <div class="arcade-stage">
            <p class="arcade-stage__instructions"><Icon name="info" /> {mg.instructions}</p>
            <Stage key={`${mg.id}:${run}:${diff.id}`} services={services} mg={mg} diff={diff} run={run} reducedMotion={reduced} onDone={onDone} />
            {outcome && (
              <ResultPanel outcome={outcome} diff={diff} harder={harder}
                onAgain={again}
                onHarder={() => { if (harder) { setDifficulty(harder.id); again(); } }}
                onExit={exit} />
            )}
          </div>
        )}
      </Modal>
    </Screen>
  );
}

function GameCard(props: { mg: MiniGameModule; record?: GameRecord; index: number; reduced: boolean; onPlay: () => void; onHover: () => void }) {
  const { mg, record } = props;
  const info = TEST_CATALOG[mg.id];
  const accent = info ? CATEGORY_ACCENT[info.category] : '#ffd27a';
  const medal = record ? medalFor(record.bestAccuracy) : null;
  return (
    <div role="listitem" class="arcade-card-wrap">
      <button type="button" class={cx('arcade-card', record && 'is-played')} style={{ '--acc': accent, '--lm-delay': `${props.reduced ? 0 : 120 + Math.min(props.index, 12) * 55}ms` }}
        onClick={props.onPlay} onPointerEnter={props.onHover} aria-label={`Practise ${mg.title}${record ? `, best ${record.best} points` : ''}`}>
        <span class="arcade-card__flare" aria-hidden="true" />
        <span class="arcade-card__lens" aria-hidden="true">
          <span class="arcade-card__ring" />
          {isIconName(mg.id) ? <Icon name={mg.id} size={34} /> : <IconOrText icon={mg.icon} size={30} />}
        </span>
        <span class="arcade-card__body">
          {info && <span class="arcade-card__cat">{CATEGORY_LABEL[info.category]}</span>}
          <span class="arcade-card__title">{mg.title}</span>
          <span class="arcade-card__blurb">{info?.blurb ?? mg.instructions}</span>
          {mg.teaches[0] && <span class="arcade-card__teach"><Icon name="book" /> {mg.teaches[0]}</span>}
        </span>
        <span class="arcade-card__foot">
          {record ? (
            <>
              <span class="arcade-card__best"><span class="lm-eyebrow">Best</span><b class="lm-num">{record.best.toLocaleString()}</b></span>
              <span class="arcade-card__plays lm-num">{record.plays} run{record.plays === 1 ? '' : 's'}</span>
              {medal && <span class={cx('arcade-card__medal', `is-${medal}`)} style={{ '--m': MEDAL_COLOR[medal] }} title={`${medal} medal`}><Icon name="star" /></span>}
            </>
          ) : (
            <span class="arcade-card__new">Not yet attempted</span>
          )}
          <span class="arcade-card__play"><Icon name="play" /></span>
        </span>
      </button>
    </div>
  );
}
