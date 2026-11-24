import { useEffect, useRef } from 'preact/hooks';
import type { MiniGameResult, PracticeScenario } from '@core';
import { Badge, Button, CountUp, Icon, Kbd, RingMeter, cx } from '@ui-kit';
import { MEDAL_COLOR, accuracyWord, formatSeconds, medalFor, type Difficulty } from './logic';

export interface PracticeOutcome {
  result: MiniGameResult;
  scenario: PracticeScenario;
  score: number;
  previousBest: number;
  isBest: boolean;
  bestAccuracy: number;
}

const FLAG_COLOR = { normal: '#5eead4', abnormal: '#fbbf24', critical: '#f43f5e' } as const;

/** The verdict card shown over the stage after a practice run. */
export function ResultPanel(props: {
  outcome: PracticeOutcome;
  diff: Difficulty;
  harder: Difficulty | null;
  onAgain: () => void;
  onHarder: () => void;
  onExit: () => void;
}) {
  const { result, scenario, score, isBest, previousBest, bestAccuracy } = props.outcome;
  const acc = Math.max(0, Math.min(1, result.accuracy || 0));
  const medal = medalFor(bestAccuracy);
  const ring = acc >= 0.85 ? '#5eead4' : acc >= 0.6 ? '#ffd27a' : '#fb923c';
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
          <RingMeter value={acc} size={132} thickness={9} accent={ring} ariaLabel={`Accuracy ${Math.round(acc * 100)}%`}>
            <span class="arcade-result__pct"><CountUp value={Math.round(acc * 100)} tickSfx="tick" /><small>%</small></span>
          </RingMeter>
          <div class="arcade-result__verdict">
            <div class="lm-eyebrow">{props.diff.label} practice{result.perfect ? ' · perfect' : ''}</div>
            <h3 class="arcade-result__word">{accuracyWord(acc)}</h3>
            <div class="arcade-result__score">
              <span class="lm-num arcade-result__points"><CountUp value={score} delay={250} /></span>
              <span class="arcade-result__unit">points</span>
              {isBest && <Badge tone="gold" variant="solid" icon="trophy" class="arcade-result__best">{previousBest > 0 ? 'New best!' : 'First score!'}</Badge>}
            </div>
            <div class="arcade-result__meta">
              <span><Icon name="clock" /> {formatSeconds(result.timeMs)}</span>
              {!isBest && previousBest > 0 && <span><Icon name="trophy" /> Best <b class="lm-num">{previousBest.toLocaleString()}</b></span>}
              {medal && <span class="arcade-result__medal" style={{ '--m': MEDAL_COLOR[medal] }}><Icon name="star" /> {medal} medal</span>}
            </div>
          </div>
        </div>

        <div class="arcade-result__answer">
          <div class="lm-eyebrow">The answer</div>
          <p>{scenario.answer}</p>
        </div>

        {result.findings.length > 0 && (
          <ul class="arcade-result__findings" role="list" aria-label="Charted findings">
            {result.findings.slice(0, 8).map((f, i) => (
              <li key={i} class={cx('arcade-finding', `is-${f.flag}`)} style={{ '--f': FLAG_COLOR[f.flag], '--i': i }}>
                <span class="arcade-finding__label">{f.label}{f.eye ? <small> {f.eye}</small> : null}</span>
                <span class="arcade-finding__value lm-num">{f.value}</span>
              </li>
            ))}
          </ul>
        )}

        <div class="arcade-result__actions" ref={againRef}>
          <Button variant="primary" icon="refresh" onClick={props.onAgain} sfx="select">Again <Kbd class="arcade-result__kbd">R</Kbd></Button>
          {props.harder && acc >= 0.7 && (
            <Button variant="glass" icon="lightning" onClick={props.onHarder} style={{ '--h': props.harder.accent }}>Try {props.harder.label}</Button>
          )}
          <Button variant="ghost" icon="chevron-left" onClick={props.onExit} sfx="back">All instruments</Button>
        </div>
      </div>
    </div>
  );
}
