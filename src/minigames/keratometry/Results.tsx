/**
 * End-of-test overlays: the practice recognition challenge and the debrief that
 * compares the player's readings with the chart.
 */
import { useState } from 'preact/hooks';
import { EYES, type Keratometry, type PerEye } from '@core';
import { Button, Icon, RingMeter } from '@ui-kit';
import { fmtCornealCyl, fmtReading, normalizeK } from './optics';
import type { Challenge } from './practice';
import { MIRE_TEXT } from './report';
import type { Assessment } from './scoring';

export function ChallengeCard(props: { challenge: Challenge; onAnswer: (correct: boolean) => void; onNext: () => void }) {
  const { challenge: c } = props;
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  return (
    <div class="kr-overlay" role="dialog" aria-modal="true" aria-labelledby="kr-q-title">
      <div class="kr-card kr-card--q">
        <p class="kr-eyebrow">Read the cornea</p>
        <h3 id="kr-q-title" class="kr-card__title">{c.question}</h3>
        <div class="kr-options" role="group" aria-label="Answers">
          {c.options.map((o, i) => {
            const state = !answered ? '' : i === c.correct ? ' is-right' : i === pick ? ' is-wrong' : ' is-dim';
            return (
              <button
                key={o}
                type="button"
                class={`kr-option${state}`}
                disabled={answered}
                autoFocus={i === 0}
                onClick={() => {
                  setPick(i);
                  props.onAnswer(i === c.correct);
                }}
              >
                <span class="kr-option__k" aria-hidden="true">{String.fromCharCode(65 + i)}</span>
                <span>{o}</span>
                {answered && i === c.correct && <Icon name="check" class="kr-option__ic" />}
                {answered && i === pick && i !== c.correct && <Icon name="x" class="kr-option__ic" />}
              </button>
            );
          })}
        </div>
        {answered && (
          <div class="kr-teach" role="status">
            <p class={`kr-teach__verdict ${pick === c.correct ? 'is-right' : 'is-wrong'}`}>{pick === c.correct ? 'Exactly right.' : 'Not quite.'}</p>
            <p class="kr-teach__body">{c.explain}</p>
          </div>
        )}
        <div class="kr-card__actions">
          {answered && <Button variant="primary" size="sm" trailingIcon="arrow-right" onClick={props.onNext} autoFocus>See my readings</Button>}
        </div>
      </div>
    </div>
  );
}

function fmtErr(v: number): string {
  return v < 0.005 ? '0.00 D' : `${v.toFixed(2)} D`;
}

export function Debrief(props: { assessment: Assessment; truth: PerEye<Keratometry>; practice: boolean; challengeCorrect: boolean | null; onDone: () => void }) {
  const { assessment: a } = props;
  const pct = Math.round(a.accuracy * 100);
  return (
    <div class="kr-overlay" role="dialog" aria-modal="true" aria-labelledby="kr-db-title">
      <div class="kr-card kr-card--db">
        <div class="kr-db__head">
          <RingMeter value={a.accuracy} size={86} thickness={7} ariaLabel={`Technique ${pct}%`}>
            <span class="kr-db__pct kr-num">{pct}<small>%</small></span>
          </RingMeter>
          <div>
            <p class="kr-eyebrow">Technique</p>
            <h3 id="kr-db-title" class="kr-card__title">{a.perfect ? 'Flawless alignment' : pct >= 80 ? 'Clean readings' : pct >= 50 ? 'Readings recorded' : 'Rough readings'}</h3>
            {props.challengeCorrect !== null && (
              <p class={`kr-db__q ${props.challengeCorrect ? 'is-right' : 'is-wrong'}`}>
                <Icon name={props.challengeCorrect ? 'check' : 'x'} /> {props.challengeCorrect ? 'Interpretation correct' : 'Interpretation missed'}
              </p>
            )}
          </div>
        </div>
        <div class="kr-db__rows">
          {EYES.map((e) => {
            const ea = a.eyes[e];
            const t = normalizeK(props.truth[e]);
            return (
              <div class="kr-db__row" key={e}>
                <span class="kr-db__eye">{e}</span>
                <div class="kr-db__cols">
                  <p><span class="kr-db__k">Yours</span><b class="kr-num">{ea ? fmtReading(ea.reading) : 'not measured'}</b></p>
                  <p><span class="kr-db__k">Chart</span><b class="kr-num">{fmtReading(t)}</b></p>
                  <p class="kr-db__note">{fmtCornealCyl(t)} · {MIRE_TEXT[t.mires]}</p>
                  {ea && (
                    <p class="kr-db__chips">
                      <span class={ea.kErr <= 0.13 ? 'is-ok' : 'is-off'}>ΔK {fmtErr(ea.kErr)}</span>
                      <span class={ea.axisErr === null || ea.axisErr <= (ea.axisTol ?? 0) ? 'is-ok' : 'is-off'}>{ea.axisErr === null ? 'axis n/a (spherical)' : `axis ${ea.axisErr}° off`}</span>
                      <span class={ea.focusOk ? 'is-ok' : 'is-off'}>{ea.focusOk ? 'in focus' : 'out of focus'}</span>
                      <span class={ea.miresOk ? 'is-ok' : 'is-off'}>{ea.miresOk ? 'mires graded' : 'mire grade off'}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div class="kr-card__actions">
          <Button variant="primary" icon="check" onClick={props.onDone} autoFocus>{props.practice ? 'Finish' : 'Back to the exam'}</Button>
        </div>
      </div>
    </div>
  );
}
