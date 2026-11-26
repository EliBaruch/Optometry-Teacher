/** The Rivals scene: the weekly board, the week's race, and a profile card for every colleague. */
import { useRef, useState } from 'preact/hooks';
import { testText, type SceneProps } from '@core';
import {
  Badge, Button, CountUp, GlassPanel, Icon, ProgressBar, Screen, isIconName, useLocale, useReducedMotion, useSfx, useSignal, useStrings,
} from '@ui-kit';
import { ACCENT } from '../controller';
import { DAILY_FULL_CREDIT, PLAYER_ID, boardSeries, divisionIndex, nextAbove, playerRank, standings, type RivalsState, type Standing } from '../league';
import { ROSTER, type Rival } from '../roster';
import { dayKey, timeLeftLabel, weekEnd, weekNumber, weekStart } from '../week';
import { S, rivalText, text } from '../strings';
import { PlayerPortrait, Rich, RivalPortrait, Sparkline, useOrdinal, useRivals } from './shared';

const MEDAL = ['#ffd27a', '#d9e2ef', '#e0a36b'];

export function RivalsScene({ services }: SceneProps) {
  const { ctl, state, now } = useRivals(services, 20_000);
  const t = useStrings(S);
  const locale = useLocale();
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
      title={t.sceneTitle}
      eyebrow={t.sceneEyebrow(t.divisions[divisionIndex(state.scale)], weekNumber(state.weekKey))}
      onBack={() => services.router.back()}
      escToBack
      backdrop="hub"
      class="rv-scene-screen"
    >
      <div class={`rv-scene${reduced ? ' is-reduced' : ''}`}>
        <GlassPanel as="section" class="rv-hero" accent={ACCENT} glow strong padding="lg">
          <div class="rv-hero__place">
            <div class="lm-eyebrow">{t.yourPlace}</div>
            {joined ? (
              <div class="rv-hero__rank">
                <span class="rv-hero__hash">{t.hash}</span>
                <span class="rv-hero__num lm-num">{rank}</span>
                <span class="rv-hero__of">{t.heroOf(rows.length)}</span>
              </div>
            ) : (
              <div class="rv-hero__rank rv-hero__rank--idle">{t.heroNone}</div>
            )}
            <div class="rv-hero__pts">
              <CountUp value={state.points} class="rv-hero__ptsnum" /> <span class="rv-dim">{t.boardPoints}</span>
            </div>
            <p class="rv-hero__next">
              {!joined
                ? t.nextJoin
                : above?.rival
                  ? <Rich text={t.nextPass(rivalText(above.rival, locale).short, above.points - state.points)} color={above.rival.color} />
                  : <><Icon name="crown" size={16} /> {t.nextLead}</>}
            </p>
            <div class="rv-hero__chips">
              <Badge tone="neutral" icon="users">{t.chipPatients(state.cases)}</Badge>
              <Badge tone="good" icon="check">{t.chipCorrect(state.correct, state.cases)}</Badge>
              <Badge tone="info" icon="star" title={t.chipFullTitle}>
                {t.chipFull(Math.min(todayCases, DAILY_FULL_CREDIT), DAILY_FULL_CREDIT)}
              </Badge>
              <Badge tone="gold" icon="clock" title={t.chipResetsTitle}>{t.chipResets(timeLeftLabel(now, locale))}</Badge>
            </div>
          </div>
          <div class="rv-hero__chart">
            <Sparkline series={series} t0={weekStart(now)} t1={weekEnd(now)} height={170} days nowAt={now} label={t.sparkAria} />
            <ul class="rv-legend">
              <li style={{ '--rv-c': '#ffd27a' }}>{t.you}</li>
              {ROSTER.map((r) => <li key={r.id} style={{ '--rv-c': r.color }}>{rivalText(r, locale).short}</li>)}
            </ul>
          </div>
        </GlassPanel>

        {state.lastWeek && (
          <p class="rv-lastweek">
            <Icon name="trophy" size={15} /> {t.lastBoard(...(state.lastWeek.weekKey.split('-W') as [string, string]), state.lastWeek.rank, state.lastWeek.field, state.lastWeek.points)}
            {state.bestRank !== null && <span class="rv-dim">{t.bestEver(state.bestRank)}</span>}
          </p>
        )}

        <div class="rv-cols">
          <GlassPanel as="section" class="rv-board" padding="none" icon="trophy" eyebrow={t.boardEyebrow} title={t.standings}>
            <ol class="rv-board__list">
              {rows.map((r, i) => (
                <BoardRow key={r.id} row={r} i={i} state={state} playerName={settings.playerName} onPick={showCard} focused={focus === r.id} />
              ))}
            </ol>
            <p class="rv-board__note rv-dim">
              {t.boardNote(DAILY_FULL_CREDIT)}
            </p>
          </GlassPanel>

          <section class="rv-cards" aria-label={t.cardsAria}>
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
          <Button variant="primary" icon="play" onClick={() => services.router.go('hub')}>{t.backToClinic}</Button>
        </div>
      </div>
    </Screen>
  );
}

function BoardRow(props: { row: Standing; i: number; state: RivalsState; playerName: string; onPick: (id: string) => void; focused: boolean }) {
  const { row, i, state } = props;
  const t = useStrings(S);
  const locale = useLocale();
  const ordinal = useOrdinal();
  const you = row.id === PLAYER_ID;
  const r = row.rival;
  const h = r ? state.h2h[r.id] : undefined;
  const body = (
    <>
      <span class="rv-brow__pos lm-num" style={row.rank <= 3 ? { '--rv-m': MEDAL[row.rank - 1] } : undefined}>{row.rank}</span>
      {r ? <RivalPortrait rival={r} size={42} /> : <PlayerPortrait name={props.playerName} size={42} />}
      <span class="rv-brow__who">
        <b>{r ? rivalText(r, locale).name : t.youPlayer(props.playerName && props.playerName !== 'Doctor' && props.playerName !== text(locale).you ? props.playerName : '')}</b>
        <span class="rv-dim">{r ? rivalText(r, locale).title : t.patientsWeek(state.cases)}</span>
      </span>
      {h && (h.w || h.l) ? (
        <span class="rv-brow__h2h lm-num" title={t.h2hTitle}>
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
        <button type="button" class="rv-brow__btn" onClick={() => props.onPick(r.id)} aria-label={t.rowAria(rivalText(r, locale).name, ordinal(row.rank), row.points)}>
          {body}
        </button>
      ) : (
        <div class="rv-brow__btn">{body}</div>
      )}
    </li>
  );
}

/** Words for a 0..1 trait, so the bar reads aloud and at a glance ("Pace · Very fast"). */
export function traitWord(kind: 'accuracy' | 'pace' | 'thoroughness', v: number, locale: 'en' | 'he' = 'en', female = false): string {
  const band = v >= 0.9 ? 3 : v >= 0.75 ? 2 : v >= 0.55 ? 1 : 0;
  const tt = text(locale);
  return (female ? tt.traitsF : tt.traits)[kind][band]!;
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
  const t = useStrings(S);
  const locale = useLocale();
  const ordinal = useOrdinal();
  const rt = rivalText(r, locale);
  const h = state.h2h[r.id];
  return (
    <article
      ref={props.ref_}
      class={`rv-card${props.focused ? ' is-focused' : ''}`}
      style={{ '--rv-c': r.color, '--rv-i': props.i }}
      tabIndex={-1}
      aria-label={rt.name}
    >
      <div class="rv-card__halo" aria-hidden="true" />
      <header class="rv-card__head">
        <RivalPortrait rival={r} size={76} animated={props.focused && !props.reduced} reduced={props.reduced} class="rv-card__portrait" />
        <div class="rv-card__titles">
          <h3>{rt.name}</h3>
          <div class="rv-dim">{rt.title}</div>
          <div class="rv-card__tag">“{rt.tagline}”</div>
        </div>
        <span class="rv-card__rank lm-num" title={t.boardPosition}>{ordinal(props.row.rank)}</span>
      </header>
      <div class="rv-card__body">
        <div class="rv-card__col">
          <p class="rv-card__bio">{rt.bio}</p>
          <div class="rv-card__sig">
            <div class="rv-card__label">{t.signature(rt.signatureLabel)}</div>
            <div class="rv-card__chips">
              {r.signature.map((id) => (
                <span key={id} class="rv-sigchip">
                  {isIconName(id) && <Icon name={id} size={14} />} {testText(id, locale).name}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div class="rv-card__col">
          <div class="rv-card__stats">
            <StatBar label={t.statAccuracy} value={props.accuracy} color={r.color} word={`${traitWord('accuracy', props.accuracy, locale, r.avatar.sex === 'F')} · ${Math.round(props.accuracy * 100)}%`} />
            <StatBar label={t.statPace} value={Math.min(1, r.speed / 1.7)} color={r.color} word={traitWord('pace', Math.min(1, r.speed / 1.7), locale, r.avatar.sex === 'F')} />
            <StatBar label={t.statThorough} value={r.thoroughness} color={r.color} word={traitWord('thoroughness', r.thoroughness, locale, r.avatar.sex === 'F')} />
          </div>
          <div class="rv-card__slip">
            <div class="rv-card__label"><Icon name="info" size={13} /> {t.classicSlip(rt.slipLabel)}</div>
            <p>{rt.slipLesson}</p>
          </div>
        </div>
      </div>
      <footer class="rv-card__foot">
        {h && (h.w || h.l) ? (
          <span><Rich text={t.h2hFoot(h.w, h.l, rt.short)} /></span>
        ) : (
          <span class="rv-dim">{t.noShared}</span>
        )}
        <span class="lm-num rv-card__pts">{t.pts(props.row.points)}</span>
      </footer>
    </article>
  );
}
