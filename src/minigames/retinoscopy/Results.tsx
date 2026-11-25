import { useState } from 'preact/hooks';
import { EYES, type Eye } from '@core';
import { Button, CountUp, Icon } from '@ui-kit';
import type { Challenge } from './practice';
import { fmtRx } from './optics';
import { reflexShort } from './report';
import { useLoc, useT } from './strings';
import type { Assessment, EyeAssess } from './scoring';

export function ChallengeCard(p: { challenge: Challenge; onAnswer: (ok: boolean) => void; onNext: () => void }) {
  const t = useT();
  const c = p.challenge;
  const [picked, setPicked] = useState<number | null>(null);
  const pick = (i: number) => {
    if (picked !== null) return;
    setPicked(i);
    p.onAnswer(i === c.correct);
  };
  const ok = picked === c.correct;
  return (
    <div class="rt-overlay" role="dialog" aria-modal="true" aria-labelledby="rt-q-title">
      <div class="rt-card rt-card--q">
        <p class="rt-eyebrow">{t.recognition}</p>
        <h3 id="rt-q-title" class="rt-card__title">{c.question}</h3>
        <div class="rt-options" role="group" aria-label={t.answers}>
          {c.options.map((o, i) => {
            const state = picked === null ? '' : i === c.correct ? ' is-right' : i === picked ? ' is-wrong' : ' is-dim';
            return (
              <button key={o} type="button" class={`rt-option${state}`} onClick={() => pick(i)} disabled={picked !== null}>
                <span class="rt-option__k">{i + 1}</span>
                <span><bdi>{o}</bdi></span>
                {picked !== null && i === c.correct && <Icon name="check" class="rt-option__ic" />}
                {picked !== null && i === picked && i !== c.correct && <Icon name="x" class="rt-option__ic" />}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div class="rt-teach">
            <p class={`rt-teach__verdict ${ok ? 'is-right' : 'is-wrong'}`}>{ok ? t.correct : t.notQuite}</p>
            <p class="rt-teach__body">{c.explain}</p>
          </div>
        )}
        <div class="rt-card__actions">
          <Button variant="primary" size="sm" sfx={false} trailingIcon="arrow-right" disabled={picked === null} onClick={p.onNext} autoFocus={picked !== null}>{t.seeResults}</Button>
        </div>
      </div>
    </div>
  );
}

function EyeRow(p: { a: EyeAssess }) {
  const t = useT();
  const loc = useLoc();
  const a = p.a;
  return (
    <div class="rt-db__row">
      <span class="rt-db__eye">{a.eye}</span>
      <div class="rt-db__cols">
        {a.state === 'skipped' && <p class="rt-db__note">{t.notMeasuredDot}</p>}
        {a.state === 'no-reflex' && (
          <>
            <p><span class="rt-db__k">{t.you}</span><b>{t.noReflex}</b></p>
            <p><span class="rt-db__k">{t.truth}</span><b><bdi>{a.reflexTrue === 'absent' ? t.noRedReflexCorrect : fmtRx(a.truth)}</bdi></b></p>
            <p class="rt-db__note">{a.reflexTrue === 'absent' ? t.denseBlocks : t.didGive(reflexShort(a.reflexTrue, loc))}</p>
          </>
        )}
        {a.state === 'measured' && a.net && (
          <>
            <p><span class="rt-db__k">{t.you}</span><b class="rt-num"><bdi dir="ltr">{fmtRx(a.net)}</bdi></b></p>
            <p><span class="rt-db__k">{t.truth}</span><b class="rt-num"><bdi>{a.reflexTrue === 'absent' ? t.noReflexToMeasure : fmtRx(a.truth)}</bdi></b>{Number.isFinite(a.err) && <em class="rt-num">{t.errorD(a.err.toFixed(2))}</em>}</p>
            <p class="rt-db__chips">
              <span class={a.wdOk ? 'is-ok' : 'is-off'}>{a.wdOk ? t.wdOk : a.forgotWd ? t.wdForgot : t.wdWrong}</span>
              {a.axisErr !== null && <span class={a.axisErr <= 10 ? 'is-ok' : 'is-off'}>{a.axisErr <= 1 ? t.meridianOn : t.meridianOff(Math.round(a.axisErr))}</span>}
              <span class={a.reflexOk ? 'is-ok' : 'is-off'}>{t.reflexSaid(a.reflexSaid ? reflexShort(a.reflexSaid, loc) : '—', a.reflexOk, reflexShort(a.reflexTrue, loc))}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function Debrief(p: { assessment: Assessment; practice: boolean; challengeCorrect: boolean | null; answer?: string; onDone: () => void }) {
  const t = useT();
  const a = p.assessment;
  return (
    <div class="rt-overlay" role="dialog" aria-modal="true" aria-labelledby="rt-db-title">
      <div class="rt-card rt-card--db">
        <p class="rt-eyebrow">{t.dbEyebrow}</p>
        <div class="rt-db__head">
          <h3 id="rt-db-title" class="rt-card__title">{a.perfect ? t.dbPerfect : a.accuracy >= 0.75 ? t.dbWell : a.accuracy >= 0.45 ? t.dbClose : t.dbKeep}</h3>
          <span class="rt-db__pct rt-num"><CountUp value={Math.round(a.accuracy * 100)} />%</span>
        </div>
        {p.challengeCorrect !== null && (
          <p class={`rt-db__q ${p.challengeCorrect ? 'is-right' : 'is-wrong'}`}>
            <Icon name={p.challengeCorrect ? 'check' : 'x'} /> {p.challengeCorrect ? t.quizPassed : t.quizMissed}
          </p>
        )}
        <div class="rt-db__rows">{EYES.map((e: Eye) => <EyeRow key={e} a={a.eyes[e]} />)}</div>
        {p.practice && p.answer && <p class="rt-db__ans">{p.answer}</p>}
        <p class="rt-db__tip">{t.dbTip}</p>
        <div class="rt-card__actions">
          <Button variant="primary" icon="check" onClick={p.onDone} autoFocus>{t.dbDone}</Button>
        </div>
      </div>
    </div>
  );
}
