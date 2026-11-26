import { useState } from 'preact/hooks';
import { Button, Icon } from '@ui-kit';
import type { Challenge } from './practice';
import { goodSwings, SWINGS_NEEDED, type Assessment, type Call, type Tech } from './scoring';
import { condWord } from './words';
import { useLocale, useT } from './locale';
import { fix } from './strings';

const stars = (a: number) => (a >= 0.9 ? 3 : a >= 0.65 ? 2 : a >= 0.35 ? 1 : 0);


export interface DebriefProps {
  teach: string;
  assessment: Assessment;
  tech: Tech;
  truthCall: Call;
  challenge: Challenge | null;
  onFinish: (challengeCorrect: boolean | null) => void;
}

export function Debrief({ teach, assessment: a, tech, truthCall, challenge, onFinish }: DebriefProps) {
  const t = useT();
  const locale = useLocale();
  const callText = (c: Call) => (c.side === null ? t.notCalled : c.side === 'none' ? t.noRapd : t.rapdCall(c.side, c.grade ? ` ${c.grade}+` : ''));
  const [pick, setPick] = useState<number | null>(null);
  const answered = pick !== null;
  const correct = challenge ? pick === challenge.correct : null;
  const canFinish = !challenge || answered;
  const notes: string[] = [];
  const good = goodSwings(tech.swings);
  if (good < SWINGS_NEEDED) notes.push(t.notesFewSwings(good, SWINGS_NEEDED));
  if (a.sizeErrors.some((s) => s.mm === null)) notes.push(t.notesMissing);
  const unsettled = a.sizeErrors.find((s) => s.mm !== null && !s.settled && (s.err ?? 0) > 0.5);
  if (unsettled) notes.push(t.notesUnsettled(condWord(unsettled.cond, locale), unsettled.eye));
  if (tech.nearSeconds < 2) notes.push(t.notesNear);
  if (tech.call.side !== null && a.parts.call < 1) notes.push(fix(locale, t.notesCall(callText(tech.call), callText(truthCall))));
  if (!notes.length) notes.push(t.notesClean);
  return (
    <div class="pu-overlay pu-overlay--debrief" role="dialog" aria-modal="true" aria-labelledby="pu-deb-title">
      <div class="pu-card pu-card--wide">
        <p class="pu-eyebrow">{t.review}</p>
        <h3 id="pu-deb-title" class="pu-card__title">{t.recordedTitle}</h3>
        <div class="pu-stars" aria-label={t.starsLabel(stars(a.accuracy))}>
          {[0, 1, 2].map((i) => <Icon key={i} name="star" class={i < stars(a.accuracy) ? 'is-on' : ''} />)}
          <span class="pu-num">{Math.round(a.accuracy * 100)}%</span>
        </div>
        <div class="pu-deb">
          <div class="pu-deb__grid" dir="ltr" role="table" aria-label={t.measuredVsTrue}>
            <span class="pu-deb__h" />{(['OD', 'OS'] as const).map((e) => <span key={e} class="pu-deb__h">{e}</span>)}
            {(['light', 'dark'] as const).map((c) => [
              <span key={c} class="pu-deb__h pu-deb__row">{t.condCap[c]}</span>,
              ...(['OD', 'OS'] as const).map((e) => {
                const s = a.sizeErrors.find((x) => x.cond === c && x.eye === e)!;
                return (
                  <span key={c + e} class={`pu-deb__cell${s.err === null ? ' is-miss' : s.err <= 0.3 ? ' is-ok' : s.err <= 0.7 ? ' is-near' : ' is-off'}`}>
                    <b class="pu-num">{s.mm === null ? t.na : s.mm.toFixed(1)}</b><small>{t.trueSize(s.truth.toFixed(1))}</small>
                  </span>
                );
              }),
            ])}
          </div>
          <ul class="pu-deb__notes">{notes.map((n) => <li key={n}>{n}</li>)}</ul>
          {!challenge && <p class="pu-quiz__why pu-teach"><b>{t.teachLead}</b>{teach}</p>}
        </div>
        {challenge && (
          <div class="pu-quiz">
            <h4>{challenge.question}</h4>
            <div class="pu-quiz__opts" role="radiogroup" aria-label={challenge.question}>
              {challenge.options.map((o, i) => (
                <button
                  key={o} type="button" role="radio" aria-checked={pick === i} disabled={answered}
                  class={`pu-quiz__opt${answered && i === challenge.correct ? ' is-right' : ''}${answered && pick === i && i !== challenge.correct ? ' is-wrong' : ''}`}
                  onClick={() => setPick(i)}
                >{o}</button>
              ))}
            </div>
            {answered && <p class="pu-quiz__why" aria-live="polite"><b>{correct ? t.correct : t.notQuite}</b>{challenge.explain}</p>}
          </div>
        )}
        <div class="pu-card__actions">
          <Button variant="primary" size="md" icon="check" disabled={!canFinish} onClick={() => onFinish(correct)} autoFocus={!challenge}>{t.finish}</Button>
        </div>
      </div>
    </div>
  );
}
