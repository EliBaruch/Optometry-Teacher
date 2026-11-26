import { useEffect, useRef } from 'preact/hooks';
import type { MiniGameResult, PracticeScenario } from '@core';
import { Badge, Button, CountUp, Icon, Kbd, RingMeter, cx, useStrings } from '@ui-kit';
import { MEDAL_COLOR, medalFor, type Difficulty } from './logic';
import { S } from './strings';

export interface PracticeOutcome {
  result: MiniGameResult;
  scenario: PracticeScenario;
  score: number;
  previousBest: number;
  isBest: boolean;
  firstPlay: boolean;
  bestAccuracy: number;
}

const FLAG_COLOR = { normal: '#059669', abnormal: '#d97706', critical: '#e11d48' } as const;

/** The verdict card shown over the stage after a practice run. */
export function ResultPanel(props: {
  outcome: PracticeOutcome;
  diff: Difficulty;
  harder: Difficulty | null;
  onAgain: () => void;
  onHarder: () => void;
  onExit: () => void;
}) {
  const t = useStrings(S);
  const dl = t.diffLevel[props.diff.id];
  const { result, scenario, score, isBest, firstPlay, previousBest, bestAccuracy } = props.outcome;
  const acc = Math.max(0, Math.min(1, result.accuracy || 0));
  const medal = medalFor(bestAccuracy);
  const ring = acc >= 0.85 ? '#059669' : acc >= 0.6 ? '#2257f0' : '#ea580c';
  const againRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    againRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.defaultPrevented || (e.target as HTMLElement | null)?.closest?.('input, textarea')) return;
      if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        props.onAgain();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div class="arcade-result" role="status" aria-live="polite">
      <div class="arcade-result__card">
        <div class="arcade-result__top">
          <RingMeter value={acc} size={132} thickness={9} accent={ring} ariaLabel={t.accuracyAria(Math.round(acc * 100))}>
            <span class="arcade-result__pct"><CountUp value={Math.round(acc * 100)} tickSfx="tick" /><small>%</small></span>
          </RingMeter>
          <div class="arcade-result__verdict">
            <div class="lm-eyebrow">{t.practiceWord(dl, !!result.perfect)}</div>
            <h3 class="arcade-result__word">{t.acc(acc)}</h3>
            <div class="arcade-result__score">
              <span class="lm-num arcade-result__points"><CountUp value={score} delay={250} /></span>
              <span class="arcade-result__unit">{t.points}</span>
              {isBest && <Badge tone="gold" variant="solid" icon="trophy" class="arcade-result__best">{previousBest > 0 ? t.newBest : t.firstScore}</Badge>}
              {!isBest && firstPlay && <Badge tone="info" variant="soft" icon="book" class="arcade-result__best">{t.firstAttempt}</Badge>}
            </div>
            <div class="arcade-result__meta">
              <span><Icon name="clock" /> <bdi>{t.seconds(result.timeMs)}</bdi></span>
              {!isBest && previousBest > 0 && <span><Icon name="trophy" /> {t.bestPrev} <b class="lm-num">{previousBest.toLocaleString()}</b></span>}
              {medal && <span class="arcade-result__medal" style={{ '--m': MEDAL_COLOR[medal] }}><Icon name="star" /> {t.medalWord(t.medal[medal])}</span>}
            </div>
          </div>
        </div>

        <div class="arcade-result__answer">
          <div class="lm-eyebrow">{t.answer}</div>
          <p>{scenario.answer}</p>
        </div>

        {result.findings.length > 0 && (
          <ul class="arcade-result__findings" role="list" aria-label={t.findingsLabel}>
            {result.findings.slice(0, 8).map((f, i) => (
              <li key={i} class={cx('arcade-finding', `is-${f.flag}`)} style={{ '--f': FLAG_COLOR[f.flag], '--i': i }}>
                <span class="arcade-finding__label">{f.label}{f.eye ? <small> {f.eye}</small> : null}</span>
                <span class="arcade-finding__value lm-num">{f.value}</span>
              </li>
            ))}
          </ul>
        )}

        <div class="arcade-result__actions" ref={againRef}>
          <Button variant="primary" icon="refresh" onClick={props.onAgain} sfx="select" aria-keyshortcuts="R">{t.again}</Button>
          {props.harder && acc >= 0.7 && (
            <Button variant="glass" icon="lightning" onClick={props.onHarder} style={{ '--h': props.harder.accent }}>{t.tryHarder(t.diffLevel[props.harder.id])}</Button>
          )}
          <Button variant="ghost" icon="chevron-left" onClick={props.onExit} sfx="back">{t.allInstruments}</Button>
        </div>
        <p class="arcade-result__hint" aria-hidden="true">{t.pressR} <Kbd>R</Kbd> {t.forFresh}</p>
      </div>
    </div>
  );
}
