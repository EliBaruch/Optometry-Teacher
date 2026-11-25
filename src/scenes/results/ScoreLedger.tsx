import { useEffect } from 'preact/hooks';
import type { ScoreBreakdown, ScorePart } from '@core';
import { CountUp, GRADE_COLOR, GRADE_WORD, Icon, cx, useLocale, useSfx, useStrings, type IconName } from '@ui-kit';
import { clockText } from './model';
import { S } from './strings';

const PART_ICON: Record<ScorePart['id'], IconName> = {
  diagnosis: 'eye',
  urgency: 'alert',
  workup: 'target',
  efficiency: 'lightning',
  history: 'book',
  skill: 'star',
  speed: 'clock',
};

export interface ScoreLedgerProps {
  score: ScoreBreakdown;
  /** Rows start counting (beat 'ledger') */
  started: boolean;
  /** Total revealed (beat 'total') */
  totalShown: boolean;
  step: number;
  /** Skip / reduced motion: show final values immediately */
  instant: boolean;
  /** Points actually added to the run (after multipliers), if different */
  runPoints?: number;
}

/** Score parts count up one by one, then the total. */
export function ScoreLedger({ score, started, totalShown, step, instant, runPoints }: ScoreLedgerProps) {
  const play = useSfx();
  const t = useStrings(S);
  const he = useLocale() !== 'en';

  useEffect(() => {
    if (!started || instant) return;
    const timers = score.parts.map((p, i) =>
      setTimeout(() => play(p.points > 0 ? 'pop' : 'tick', { volume: p.points > 0 ? 0.45 : 0.25, pitch: 0.9 + i * 0.06 }), i * step + 60),
    );
    return () => timers.forEach(clearTimeout);
  }, [started, instant]);

  useEffect(() => {
    if (!totalShown || instant) return;
    play(score.diagnosisCorrect ? 'coins' : 'reveal', { volume: 0.6 });
  }, [totalShown, instant]);

  return (
    <div class={cx('rs-ledger', started && 'is-started', instant && 'is-instant')}>
      <ol class="rs-ledger__rows" role="list">
        {score.parts.map((p, i) => {
          const ratio = p.max ? p.points / p.max : 0;
          return (
            <li
              key={p.id}
              class={cx('rs-ledger__row', p.points === 0 && 'is-zero', ratio >= 1 && 'is-full')}
              style={{ '--i': i, '--step': `${step}ms`, '--ratio': ratio }}
            >
              <span class="rs-ledger__icon">
                <Icon name={PART_ICON[p.id]} />
              </span>
              <span class="rs-ledger__label">{he ? t.partLabel[p.id] ?? p.label : p.label}</span>
              <span class="rs-ledger__bar" aria-hidden="true">
                <span />
              </span>
              <span class="rs-ledger__pts" dir="ltr">
                {started ? (
                  <CountUp key={instant ? 'i' : 'a'} value={p.points} from={instant ? p.points : 0} delay={instant ? 0 : i * step} duration={instant ? 1 : 520} />
                ) : (
                  <span class="lm-num">0</span>
                )}
                <span class="rs-ledger__max">/{p.max}</span>
              </span>
            </li>
          );
        })}
      </ol>
      <div class={cx('rs-ledger__total', totalShown && 'is-shown')} style={{ '--grade-c': GRADE_COLOR[score.grade] }}>
        <div>
          <span class="lm-eyebrow">{t.caseScore}</span>
          <span class="rs-ledger__grade-word">{he ? t.gradeWord[score.grade] : GRADE_WORD[score.grade]}</span>
        </div>
        <div class="rs-ledger__total-num" dir="ltr">
          {totalShown ? (
            <CountUp key={instant ? 'i' : 'a'} value={score.total} from={instant ? score.total : 0} duration={instant ? 1 : 1100} />
          ) : (
            <span class="lm-num">0</span>
          )}
          <span class="rs-ledger__max">/{score.max}</span>
        </div>
      </div>
      <div class={cx('rs-ledger__foot', totalShown && 'is-shown')}>
        <span>
          <Icon name="clock" /> <bdi>{clockText(score.elapsedSec)}</bdi> <span class="lm-muted">· {t.par} <bdi>{clockText(score.parSec)}</bdi></span>
        </span>
        <span>
          <Icon name="book" /> {t.keyQuestions(score.keyQuestionsAsked, score.keyQuestionsTotal)}
        </span>
        {runPoints !== undefined && runPoints !== score.total && (
          <span class="rs-ledger__run">
            <Icon name="lightning" /> <bdi dir="ltr">+{runPoints}</bdi> {t.toRunSuffix}
          </span>
        )}
      </div>
    </div>
  );
}
