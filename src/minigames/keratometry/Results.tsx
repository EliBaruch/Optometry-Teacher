/**
 * End-of-test overlays: the practice recognition challenge and the debrief that
 * compares the player's readings with the chart.
 */
import { useState } from 'preact/hooks';
import { EYES, type Keratometry, type PerEye } from '@core';
import { Button, Icon, RingMeter } from '@ui-kit';
import { fmtCornealCyl, fmtReading, normalizeK } from './optics';
import type { Challenge } from './practice';
import { useLocale, useT } from './locale';
import type { Assessment } from './scoring';

export function ChallengeCard(props: { challenge: Challenge; onAnswer: (correct: boolean) => void; onNext: () => void }) {
  const { challenge: c } = props;
  const t = useT();
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  return (
    <div class="kr-overlay" role="dialog" aria-modal="true" aria-labelledby="kr-q-title">
      <div class="kr-card kr-card--q">
        <p class="kr-eyebrow">{t.readCornea}</p>
        <h3 id="kr-q-title" class="kr-card__title">{c.question}</h3>
        <div class="kr-options" role="group" aria-label={t.answers}>
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
            <p class={`kr-teach__verdict ${pick === c.correct ? 'is-right' : 'is-wrong'}`}>{pick === c.correct ? t.exactlyRight : t.notQuite}</p>
            <p class="kr-teach__body">{c.explain}</p>
          </div>
        )}
        <div class="kr-card__actions">
          {answered && <Button variant="primary" size="sm" trailingIcon="arrow-right" onClick={props.onNext} autoFocus>{t.seeReadings}</Button>}
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
  const t = useT();
  const locale = useLocale();
  const pct = Math.round(a.accuracy * 100);
  return (
    <div class="kr-overlay" role="dialog" aria-modal="true" aria-labelledby="kr-db-title">
      <div class="kr-card kr-card--db">
        <div class="kr-db__head">
          <RingMeter value={a.accuracy} size={86} thickness={7} ariaLabel={t.technique(pct)}>
            <span class="kr-db__pct kr-num">{pct}<small>%</small></span>
          </RingMeter>
          <div>
            <p class="kr-eyebrow">{t.techniqueEyebrow}</p>
            <h3 id="kr-db-title" class="kr-card__title">{a.perfect ? t.flawless : pct >= 80 ? t.clean : pct >= 50 ? t.recorded : t.rough}</h3>
            {props.challengeCorrect !== null && (
              <p class={`kr-db__q ${props.challengeCorrect ? 'is-right' : 'is-wrong'}`}>
                <Icon name={props.challengeCorrect ? 'check' : 'x'} /> {props.challengeCorrect ? t.interpOk : t.interpMiss}
              </p>
            )}
          </div>
        </div>
        <div class="kr-db__rows">
          {EYES.map((e) => {
            const ea = a.eyes[e];
            const tr = normalizeK(props.truth[e]);
            return (
              <div class="kr-db__row" key={e}>
                <span class="kr-db__eye">{e}</span>
                <div class="kr-db__cols">
                  <p><span class="kr-db__k">{t.yours}</span><b class="kr-num">{ea ? fmtReading(ea.reading) : t.notMeasured}</b></p>
                  <p><span class="kr-db__k">{t.chart}</span><b class="kr-num">{fmtReading(tr)}</b></p>
                  <p class="kr-db__note">{fmtCornealCyl(tr, locale)} · {t.mireChart[tr.mires]}</p>
                  {ea && (
                    <p class="kr-db__chips">
                      <span class={ea.kErr <= 0.13 ? 'is-ok' : 'is-off'}>ΔK {fmtErr(ea.kErr)}</span>
                      <span class={ea.axisErr === null || ea.axisErr <= (ea.axisTol ?? 0) ? 'is-ok' : 'is-off'}>{ea.axisErr === null ? t.axisNa : t.axisOff(ea.axisErr)}</span>
                      <span class={ea.focusOk ? 'is-ok' : 'is-off'}>{ea.focusOk ? t.inFocus : t.outFocus}</span>
                      <span class={ea.miresOk ? 'is-ok' : 'is-off'}>{ea.miresOk ? t.miresGraded : t.miresOff}</span>
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <div class="kr-card__actions">
          <Button variant="primary" icon="check" onClick={props.onDone} autoFocus>{props.practice ? t.finish : t.backToExam}</Button>
        </div>
      </div>
    </div>
  );
}
