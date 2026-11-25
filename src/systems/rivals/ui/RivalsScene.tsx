/** The Rivals scene: the weekly board, the week's race, and a profile card for every colleague. */
import { useRef, useState } from 'preact/hooks';
import { TEST_CATALOG, type SceneProps } from '@core';
import {
  Badge, Button, CountUp, GlassPanel, Icon, ProgressBar, Screen, isIconName, useReducedMotion, useSfx, useSignal,
} from '@ui-kit';
import { ACCENT } from '../controller';
import { DAILY_FULL_CREDIT, PLAYER_ID, boardSeries, divisionName, nextAbove, playerRank, standings, type RivalsState, type Standing } from '../league';
import { ROSTER, type Rival } from '../roster';
import { dayKey, timeLeftLabel, weekEnd, weekNumber, weekStart } from '../week';
import { PlayerPortrait, RivalPortrait, Sparkline, ordinal, useRivals } from './shared';

const MEDAL = ['#ffd27a', '#d9e2ef', '#e0a36b'];

export function RivalsScene({ services }: SceneProps) {
  const { ctl, state, now } = useRivals(services, 20_000);
  const settings = useSignal(services.settings);
  const reduced = useReducedMotion();
  const play = useSfx();
  const [focus, setFocus] = useState<string | null>(null);
  const cards = useRef<Record<string, HTMLElement | null>>({});

  const rows = standings(state, now);
  const rank = playerRank(rows);
  const above = nextAbove(rows);
  const joined = state.cases > 0;
  const series = boardSeries(state, now).map((s) => ({ ...s, highlight: s.id === PLAYER_ID }));
  const todayCases = state.day === dayKey(now) ? state.dayCases : 0;

  const showCard = (id: string) => {
    play('select');
    setFocus(id);
    const el = cards.current[id];
    if (!el) return;
    el.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    // Move keyboard focus with the highlight so screen-reader and keyboard users land on the profile.
    el.focus({ preventScroll: true });
  };

  return (
    <Screen
      title="Rivals"
      eyebrow={`${divisionName(state.scale)} · Week ${weekNumber(state.weekKey)}`}
      onBack={() => services.router.back()}
      escToBack
      backdrop="hub"
      class="rv-scene-screen"
    >
      <div class={`rv-scene${reduced ? ' is-reduced' : ''}`}>
        <GlassPanel as="section" class="rv-hero" accent={ACCENT} glow strong padding="lg">
          <div class="rv-hero__place">
            <div class="lm-eyebrow">Your place this week</div>
            {joined ? (
              <div class="rv-hero__rank">
                <span class="rv-hero__hash">#</span>
                <span class="rv-hero__num lm-num">{rank}</span>
                <span class="rv-hero__of">of {rows.length}</span>
              </div>
            ) : (
              <div class="rv-hero__rank rv-hero__rank--idle">Not on the board yet</div>
            )}
            <div class="rv-hero__pts">
              <CountUp value={state.points} class="rv-hero__ptsnum" /> <span class="rv-dim">board points</span>
            </div>
            <p class="rv-hero__next">
              {!joined
                ? 'Finish any patient to take your place among your colleagues.'
                : above?.rival
                  ? <>Pass <b style={{ color: above.rival.color }}>{above.rival.short}</b> with <b class="lm-num">{above.points - state.points}</b> more points — a clean, focused work-up earns the most.</>
                  : <><Icon name="crown" size={16} /> You lead the ward. Keep the standard high.</>}
            </p>
            <div class="rv-hero__chips">
              <Badge tone="neutral" icon="users">{state.cases} patients</Badge>
              <Badge tone="good" icon="check">{state.correct}/{state.cases} correct</Badge>
              <Badge tone="info" icon="star" title="Patients today that earn full board points">
                {Math.min(todayCases, DAILY_FULL_CREDIT)}/{DAILY_FULL_CREDIT} full-credit today
              </Badge>
              <Badge tone="gold" icon="clock" title="The board resets every Monday">Resets in {timeLeftLabel(now)}</Badge>
            </div>
          </div>
          <div class="rv-hero__chart">
            <Sparkline series={series} t0={weekStart(now)} t1={weekEnd(now)} height={170} days nowAt={now} label="Points across the week for you and each colleague" />
            <ul class="rv-legend">
              <li style={{ '--rv-c': '#ffd27a' }}>You</li>
              {ROSTER.map((r) => <li key={r.id} style={{ '--rv-c': r.color }}>{r.short}</li>)}
            </ul>
          </div>
        </GlassPanel>

        {state.lastWeek && (
          <p class="rv-lastweek">
            <Icon name="trophy" size={15} /> Last board ({state.lastWeek.weekKey.replace('-W', ', week ')}): you finished {ordinal(state.lastWeek.rank)} of {state.lastWeek.field} with {state.lastWeek.points.toLocaleString('en')} pts.
            {state.bestRank !== null && <span class="rv-dim"> Best ever: {ordinal(state.bestRank)}.</span>}
          </p>
        )}

        <div class="rv-cols">
          <GlassPanel as="section" class="rv-board" padding="none" icon="trophy" eyebrow="Weekly board" title="Standings">
            <ol class="rv-board__list">
              {rows.map((r, i) => (
                <BoardRow key={r.id} row={r} i={i} state={state} playerName={settings.playerName} onPick={showCard} focused={focus === r.id} />
              ))}
            </ol>
            <p class="rv-board__note rv-dim">
              Points come from the quality of each work-up — diagnosis, triage, essential tests and technique. After {DAILY_FULL_CREDIT} patients
              a day they count at a gentler rate, so short daily sessions go furthest.
            </p>
          </GlassPanel>

          <section class="rv-cards" aria-label="Colleague profiles">
            {ROSTER.map((r, i) => (
              <ProfileCard
                key={r.id}
                rival={r}
                i={i}
                row={rows.find((x) => x.id === r.id)!}
                state={state}
                accuracy={ctl.accuracy(r.id)}
                focused={focus === r.id}
                reduced={reduced}
                ref_={(el) => (cards.current[r.id] = el)}
              />
            ))}
          </section>
        </div>

        <div class="rv-actions">
          <Button variant="primary" icon="play" onClick={() => services.router.go('hub')}>Back to the clinic</Button>
        </div>
      </div>
    </Screen>
  );
}

function BoardRow(props: { row: Standing; i: number; state: RivalsState; playerName: string; onPick: (id: string) => void; focused: boolean }) {
  const { row, i, state } = props;
  const you = row.id === PLAYER_ID;
  const r = row.rival;
  const h = r ? state.h2h[r.id] : undefined;
  const body = (
    <>
      <span class="rv-brow__pos lm-num" style={row.rank <= 3 ? { '--rv-m': MEDAL[row.rank - 1] } : undefined}>{row.rank}</span>
      {r ? <RivalPortrait rival={r} size={42} /> : <PlayerPortrait name={props.playerName} size={42} />}
      <span class="rv-brow__who">
        <b>{r ? r.name : `You${props.playerName && props.playerName !== 'Doctor' ? ` · ${props.playerName}` : ''}`}</b>
        <span class="rv-dim">{r ? r.title : `${state.cases} patients this week`}</span>
      </span>
      {h && (h.w || h.l) ? (
        <span class="rv-brow__h2h lm-num" title="Head-to-head on shared patients this week">
          {h.w}–{h.l}
        </span>
      ) : <span class="rv-brow__h2h" />}
      <span class="rv-brow__pts">
        <CountUp value={row.points} from={Math.round(row.points * 0.6)} delay={120 + i * 70} />
      </span>
    </>
  );
  return (
    <li class={`rv-brow${you ? ' is-you' : ''}${props.focused ? ' is-focused' : ''}`} style={{ '--rv-i': i, '--rv-c': r?.color ?? '#ffd27a' }}>
      {r ? (
        <button type="button" class="rv-brow__btn" onClick={() => props.onPick(r.id)} aria-label={`${r.name}, ${ordinal(row.rank)} with ${row.points} points. Show profile.`}>
          {body}
        </button>
      ) : (
        <div class="rv-brow__btn">{body}</div>
      )}
    </li>
  );
}

/** Words for a 0..1 trait, so the bar reads aloud and at a glance ("Pace · Very fast"). */
export function traitWord(kind: 'accuracy' | 'pace' | 'thoroughness', v: number): string {
  const band = v >= 0.9 ? 3 : v >= 0.75 ? 2 : v >= 0.55 ? 1 : 0;
  const words = {
    accuracy: ['Still learning', 'Solid', 'Sharp', 'Exceptional'],
    pace: ['Unhurried', 'Steady', 'Quick', 'Very fast'],
    thoroughness: ['Focused', 'Selective', 'Thorough', 'Exhaustive'],
  }[kind];
  return words[band]!;
}

function StatBar(props: { label: string; value: number; color: string; word: string }) {
  return (
    <ProgressBar
      value={props.value}
      max={1}
      label={props.label}
      valueText={props.word}
      accent={props.color}
      size="sm"
      ariaLabel={`${props.label}: ${props.word}`}
    />
  );
}

function ProfileCard(props: { rival: Rival; i: number; row: Standing; state: RivalsState; accuracy: number; focused: boolean; reduced: boolean; ref_: (el: HTMLElement | null) => void }) {
  const { rival: r, state } = props;
  const h = state.h2h[r.id];
  return (
    <article
      ref={props.ref_}
      class={`rv-card${props.focused ? ' is-focused' : ''}`}
      style={{ '--rv-c': r.color, '--rv-i': props.i }}
      tabIndex={-1}
      aria-label={r.name}
    >
      <div class="rv-card__halo" aria-hidden="true" />
      <header class="rv-card__head">
        <RivalPortrait rival={r} size={76} animated={props.focused && !props.reduced} reduced={props.reduced} class="rv-card__portrait" />
        <div class="rv-card__titles">
          <h3>{r.name}</h3>
          <div class="rv-dim">{r.title}</div>
          <div class="rv-card__tag">“{r.tagline}”</div>
        </div>
        <span class="rv-card__rank lm-num" title="Board position">{ordinal(props.row.rank)}</span>
      </header>
      <div class="rv-card__body">
        <div class="rv-card__col">
          <p class="rv-card__bio">{r.bio}</p>
          <div class="rv-card__sig">
            <div class="rv-card__label">Signature · {r.signatureLabel}</div>
            <div class="rv-card__chips">
              {r.signature.map((t) => (
                <span key={t} class="rv-sigchip">
                  {isIconName(t) && <Icon name={t} size={14} />} {TEST_CATALOG[t].name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div class="rv-card__col">
          <div class="rv-card__stats">
            <StatBar label="Diagnostic accuracy" value={props.accuracy} color={r.color} word={`${traitWord('accuracy', props.accuracy)} · ${Math.round(props.accuracy * 100)}%`} />
            <StatBar label="Pace" value={Math.min(1, r.speed / 1.7)} color={r.color} word={traitWord('pace', Math.min(1, r.speed / 1.7))} />
            <StatBar label="Thoroughness" value={r.thoroughness} color={r.color} word={traitWord('thoroughness', r.thoroughness)} />
          </div>
          <div class="rv-card__slip">
            <div class="rv-card__label"><Icon name="info" size={13} /> Classic slip · {r.slipLabel}</div>
            <p>{r.slipLesson}</p>
          </div>
        </div>
      </div>
      <footer class="rv-card__foot">
        {h && (h.w || h.l) ? (
          <span>Head-to-head this week: <b class="lm-num">{h.w}–{h.l}</b> {h.w > h.l ? 'to you' : h.w < h.l ? `to ${r.short}` : '— level'}</span>
        ) : (
          <span class="rv-dim">No shared patients yet this week</span>
        )}
        <span class="lm-num rv-card__pts">{props.row.points.toLocaleString('en')} pts</span>
      </footer>
    </article>
  );
}
