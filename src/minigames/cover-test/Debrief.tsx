import { useState } from 'preact/hooks';
import { Button, Icon } from '@ui-kit';
import { baseWord, describe, kindLabel, type Target, type Truth } from './model';
import type { Call, CallScore } from './scoring';
import type { Challenge } from './practice';
import { explain } from './teach';

export interface DebriefProps {
  truths: Record<Target, Truth>;
  calls: Record<Target, Call | null>;
  scores: Record<Target, CallScore>;
  challenge: Challenge | null;
  accuracy: number;
  onFinish: (challengeCorrect: boolean | null) => void;
}

const stars = (a: number) => (a >= 0.9 ? 3 : a >= 0.65 ? 2 : a >= 0.35 ? 1 : 0);
const callText = (c: Call) => {
  const k = c.kind === 'ortho' ? 'Orthophoria' : kindLabel(c.kind, c.dir, c.eye);
  return c.prism && c.prism.mag > 0 ? `${c.prism.mag}Δ ${baseWord(c.prism.base)} · ${k}` : k;
};

export function Debrief({ truths, calls, scores, challenge, accuracy, onFinish }: DebriefProps) {
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  const correct = challenge ? pick === challenge.correct : null;
  const canFinish = !challenge || answered;
  return (
    <div class="cvt-overlay cvt-overlay--debrief" role="dialog" aria-modal="true" aria-labelledby="cvt-deb-title">
      <div class="cvt-card cvt-card--wide">
        <p class="cvt-eyebrow">Examination review</p>
        <h3 id="cvt-deb-title" class="cvt-card__title">Alignment recorded</h3>
        <div class="cvt-deb">
          {(['distance', 'near'] as Target[]).map((tg) => {
            const t = truths[tg];
            const c = calls[tg];
            const s = scores[tg];
            return (
              <div key={tg} class="cvt-deb__t">
                <div class="cvt-deb__row">
                  <span class="cvt-deb__name">{tg === 'distance' ? 'Distance · 6 m' : 'Near · 33 cm'}</span>
                  <span class="cvt-stars" aria-label={`${stars(s.score)} of 3 stars`}>{[0, 1, 2].map((i) => <Icon key={i} name="star" class={i < stars(s.score) ? 'is-on' : ''} />)}</span>
                </div>
                <p class="cvt-deb__truth"><span>Actual</span>{describe(t)}</p>
                <p class={`cvt-deb__you${c ? (s.score >= 0.9 ? ' is-ok' : s.score >= 0.5 ? ' is-mid' : ' is-bad') : ''}`}><span>Your call</span>{c ? callText(c) : 'Not tested'}</p>
                <p class="cvt-deb__why">{explain(t)}</p>
              </div>
            );
          })}
        </div>
        <p class="cvt-deb__acc">Technique and accuracy: <strong class="cvt-num">{Math.round(accuracy * 100)}%</strong></p>
        {challenge && (
          <div class="cvt-quiz">
            <h4>{challenge.question}</h4>
            <div class="cvt-quiz__opts" role="radiogroup" aria-label={challenge.question}>
              {challenge.options.map((o, i) => (
                <button
                  key={o} type="button" role="radio" aria-checked={pick === i} disabled={answered}
                  class={`cvt-opt${answered && i === challenge.correct ? ' is-right' : ''}${pick === i && i !== challenge.correct ? ' is-wrong' : ''}`}
                  onClick={() => setPick(i)}
                >{o}</button>
              ))}
            </div>
            {answered && <p class="cvt-quiz__explain" role="status"><strong>{correct ? 'Correct. ' : 'Not quite. '}</strong>{challenge.explain}</p>}
          </div>
        )}
        <div class="cvt-card__actions">
          <Button variant="primary" size="md" trailingIcon="check" disabled={!canFinish} onClick={() => onFinish(correct)} autoFocus={!challenge}>
            {challenge ? 'Finish' : 'Send to chart'}
          </Button>
        </div>
      </div>
    </div>
  );
}
