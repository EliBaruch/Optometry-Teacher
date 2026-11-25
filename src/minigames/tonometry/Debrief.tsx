import { useState } from 'preact/hooks';
import { Button, Icon } from '@ui-kit';
import type { Challenge } from './practice';
import type { Assessment, EyeMeasure } from './scoring';
import { dyeState, fmtGrams, CONTACT_WARN_S, CENTRE_TOL, METHOD_LABEL } from './optics';

export interface DebriefProps {
  assessment: Assessment;
  measures: Record<string, EyeMeasure | undefined>;
  challenge: Challenge | null;
  onFinish: (challengeCorrect: boolean | null) => void;
}

const stars = (a: number) => (a >= 0.9 ? 3 : a >= 0.65 ? 2 : a >= 0.35 ? 1 : 0);

function notes(m: EyeMeasure, err: number): string[] {
  const out: string[] = [];
  const a = Math.abs(err);
  out.push(a <= 1 ? 'Endpoint within 1 mmHg: textbook.' : `Endpoint was ${a} mmHg ${err > 0 ? 'high' : 'low'}${m.method === 'goldmann' ? (err > 0 ? ': you pressed past the touch point.' : ': the arcs were still apart.') : '.'}`);
  if (m.method === 'goldmann') {
    const s = dyeState(m.dye);
    if (s === 'thick') out.push('Mires too thick: wide mires under-read the pressure.');
    if (s === 'thin') out.push('Mires too thin: thin mires over-read the pressure.');
    if (m.centreErr > CENTRE_TOL) out.push('Mires were off-centre: unequal arcs make the endpoint unreliable.');
    if (m.contactS > CONTACT_WARN_S) out.push('Long contact dries the dye and risks an epithelial abrasion.');
  } else if (m.centreErr > 0.2) out.push('Shots off the corneal apex scatter: centre before each shot.');
  return out;
}

export function Debrief({ assessment, measures, challenge, onFinish }: DebriefProps) {
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  const correct = challenge ? pick === challenge.correct : null;
  const canFinish = !challenge || answered;
  return (
    <div class="tn-overlay tn-overlay--debrief" role="dialog" aria-modal="true" aria-labelledby="tn-deb-title">
      <div class="tn-card tn-card--wide">
        <p class="tn-eyebrow">Measurement review</p>
        <h3 id="tn-deb-title" class="tn-card__title">Pressure recorded</h3>
        <div class="tn-deb">
          {assessment.eyes.map((e) => {
            const m = measures[e.eye]!;
            return (
              <div key={e.eye} class="tn-deb__eye">
                <div class="tn-deb__row">
                  <span class="tn-deb__eye-name">{e.eye}</span>
                  <span class="tn-deb__val tn-num">{m.reading}<small> mmHg</small></span>
                  <span class="tn-deb__truth">true {m.truth}</span>
                  <span class="tn-stars" aria-label={`${stars(e.score)} of 3 stars`}>{[0, 1, 2].map((i) => <Icon key={i} name="star" class={i < stars(e.score) ? 'is-on' : ''} />)}</span>
                </div>
                <p class="tn-deb__meta">{METHOD_LABEL[m.method]}{m.method === 'goldmann' ? ` · drum ${fmtGrams(m.reading)}` : ` · ${m.shots ?? 6} shots averaged`}</p>
                <ul class="tn-deb__notes">{notes(m, e.err).map((n) => <li key={n}>{n}</li>)}</ul>
              </div>
            );
          })}
        </div>
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
            {answered && <p class="tn-quiz__explain" role="status"><strong>{correct ? 'Correct. ' : 'Not quite. '}</strong>{challenge.explain}</p>}
          </div>
        )}
        <div class="tn-card__actions">
          <Button variant="primary" size="md" trailingIcon="check" disabled={!canFinish} onClick={() => onFinish(correct)} autoFocus={!challenge}>
            {challenge ? 'Finish' : 'Send to chart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
