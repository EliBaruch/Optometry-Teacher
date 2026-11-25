import { useState } from 'preact/hooks';
import { Button, Icon } from '@ui-kit';
import type { Challenge } from './practice';
import type { Assessment, EyeMeasure } from './scoring';
import { dyeState, fmtGrams, CONTACT_WARN_S, CENTRE_TOL } from './optics';
import { fix, S } from './strings';
import { pickStrings, type Locale } from '@core';
import { useLocale } from './locale';

export interface DebriefProps {
  assessment: Assessment;
  measures: Record<string, EyeMeasure | undefined>;
  challenge: Challenge | null;
  onFinish: (challengeCorrect: boolean | null) => void;
}

const stars = (a: number) => (a >= 0.9 ? 3 : a >= 0.65 ? 2 : a >= 0.35 ? 1 : 0);

function notes(m: EyeMeasure, err: number, locale: Locale): string[] {
  const t = pickStrings(S, locale);
  const out: string[] = [];
  const a = Math.abs(err);
  out.push(a <= 1 ? t.noteExact : t.noteOff(a, err > 0, m.method === 'goldmann'));
  if (m.method === 'goldmann') {
    const s = dyeState(m.dye);
    if (s === 'thick') out.push(t.noteThick);
    if (s === 'thin') out.push(t.noteThin);
    if (m.centreErr > CENTRE_TOL) out.push(t.noteCentre);
    if (m.contactS > CONTACT_WARN_S) out.push(t.noteContact);
  } else if (m.centreErr > 0.2) out.push(t.noteShots);
  return out.map((n) => fix(locale, n));
}

export function Debrief({ assessment, measures, challenge, onFinish }: DebriefProps) {
  const locale = useLocale();
  const t = pickStrings(S, locale);
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  const correct = challenge ? pick === challenge.correct : null;
  const canFinish = !challenge || answered;
  return (
    <div class="tn-overlay tn-overlay--debrief" role="dialog" aria-modal="true" aria-labelledby="tn-deb-title">
      <div class="tn-card tn-card--wide">
        <p class="tn-eyebrow">{t.reviewEyebrow}</p>
        <h3 id="tn-deb-title" class="tn-card__title">{t.recorded}</h3>
        <div class="tn-deb" dir="ltr">
          {assessment.eyes.map((e) => {
            const m = measures[e.eye]!;
            return (
              <div key={e.eye} class="tn-deb__eye" dir={locale === 'he' ? 'rtl' : 'ltr'}>
                <div class="tn-deb__row">
                  <span class="tn-deb__eye-name">{e.eye}</span>
                  <span class="tn-deb__val tn-num" dir="ltr">{m.reading}<small> mmHg</small></span>
                  <span class="tn-deb__truth">{t.trueVal(m.truth)}</span>
                  <span class="tn-stars" dir="ltr" aria-label={t.starsAria(stars(e.score))}>{[0, 1, 2].map((i) => <Icon key={i} name="star" class={i < stars(e.score) ? 'is-on' : ''} />)}</span>
                </div>
                <p class="tn-deb__meta">{t.methodLabel[m.method]}{fix(locale, m.method === 'goldmann' ? t.drumAt(fmtGrams(m.reading)) : t.shotsAveraged(m.shots ?? 6))}</p>
                <ul class="tn-deb__notes">{notes(m, e.err, locale).map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
            );
          })}
        </div>
        <p class="tn-deb__tip">{fix(locale, t.tip)}</p>
        {challenge && (
          <div class="tn-quiz">
            <h4>{challenge.question}</h4>
            <div class="tn-quiz__opts" role="radiogroup" aria-label={challenge.question}>
              {challenge.options.map((o, i) => (
                <button
                  key={o} type="button" role="radio" aria-checked={pick === i} disabled={answered}
                  class={`tn-opt${answered && i === challenge.correct ? ' is-right' : ''}${pick === i && i !== challenge.correct ? ' is-wrong' : ''}`}
                  onClick={() => setPick(i)}
                >{o}</button>
              ))}
            </div>
            {answered && <p class="tn-quiz__explain" role="status"><strong>{correct ? t.correct : t.notQuite}</strong>{challenge.explain}</p>}
          </div>
        )}
        <div class="tn-card__actions">
          <Button variant="primary" size="md" trailingIcon="check" disabled={!canFinish} onClick={() => onFinish(correct)} autoFocus={!challenge}>
            {challenge ? t.finish : t.sendToChart}
          </Button>
        </div>
      </div>
    </div>
  );
}
