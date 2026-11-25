import { useState } from 'preact/hooks';
import { EYES, type Eye } from '@core';
import { Button, CountUp, Icon } from '@ui-kit';
import type { Challenge } from './practice';
import { fmtRx } from './optics';
import { REFLEX_SHORT } from './report';
import type { Assessment, EyeAssess } from './scoring';

export function ChallengeCard(p: { challenge: Challenge; onAnswer: (ok: boolean) => void; onNext: () => void }) {
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
        <p class="rt-eyebrow">Recognition check</p>
        <h3 id="rt-q-title" class="rt-card__title">{c.question}</h3>
        <div class="rt-options" role="group" aria-label="Answers">
          {c.options.map((o, i) => {
            const state = picked === null ? '' : i === c.correct ? ' is-right' : i === picked ? ' is-wrong' : ' is-dim';
            return (
              <button key={o} type="button" class={`rt-option${state}`} onClick={() => pick(i)} disabled={picked !== null}>
                <span class="rt-option__k">{i + 1}</span>
                <span>{o}</span>
                {picked !== null && i === c.correct && <Icon name="check" class="rt-option__ic" />}
                {picked !== null && i === picked && i !== c.correct && <Icon name="x" class="rt-option__ic" />}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div class="rt-teach">
            <p class={`rt-teach__verdict ${ok ? 'is-right' : 'is-wrong'}`}>{ok ? 'Correct' : 'Not quite'}</p>
            <p class="rt-teach__body">{c.explain}</p>
          </div>
        )}
        <div class="rt-card__actions">
          <Button variant="primary" size="sm" sfx={false} trailingIcon="arrow-right" disabled={picked === null} onClick={p.onNext} autoFocus={picked !== null}>See your results</Button>
        </div>
      </div>
    </div>
  );
}

function EyeRow(p: { a: EyeAssess }) {
  const a = p.a;
  return (
    <div class="rt-db__row">
      <span class="rt-db__eye">{a.eye}</span>
      <div class="rt-db__cols">
        {a.state === 'skipped' && <p class="rt-db__note">Not measured.</p>}
        {a.state === 'no-reflex' && (
          <>
            <p><span class="rt-db__k">You</span><b>No reflex</b></p>
            <p><span class="rt-db__k">Truth</span><b>{a.reflexTrue === 'absent' ? 'No red reflex — correct call' : fmtRx(a.truth)}</b></p>
            <p class="rt-db__note">{a.reflexTrue === 'absent' ? 'A dense opacity blocks the light: you cannot neutralise what you cannot see.' : `This eye did give a ${REFLEX_SHORT[a.reflexTrue].toLowerCase()} reflex — keep sweeping before giving up.`}</p>
          </>
        )}
        {a.state === 'measured' && a.net && (
          <>
            <p><span class="rt-db__k">You</span><b class="rt-num">{fmtRx(a.net)}</b></p>
            <p><span class="rt-db__k">Truth</span><b class="rt-num">{a.reflexTrue === 'absent' ? 'No reflex to measure' : fmtRx(a.truth)}</b>{Number.isFinite(a.err) && <em class="rt-num"> · error {a.err.toFixed(2)} D</em>}</p>
            <p class="rt-db__chips">
              <span class={a.wdOk ? 'is-ok' : 'is-off'}>{a.wdOk ? 'Working distance ✓' : a.forgotWd ? 'Forgot the working distance' : 'Wrong working-distance lens'}</span>
              {a.axisErr !== null && <span class={a.axisErr <= 10 ? 'is-ok' : 'is-off'}>Meridian {a.axisErr <= 1 ? 'on axis' : `${Math.round(a.axisErr)}° off`}</span>}
              <span class={a.reflexOk ? 'is-ok' : 'is-off'}>Reflex: {a.reflexSaid ? REFLEX_SHORT[a.reflexSaid] : '—'}{a.reflexOk ? ' ✓' : ` (it was ${REFLEX_SHORT[a.reflexTrue].toLowerCase()})`}</span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}

export function Debrief(p: { assessment: Assessment; practice: boolean; challengeCorrect: boolean | null; answer?: string; onDone: () => void }) {
  const a = p.assessment;
  return (
    <div class="rt-overlay" role="dialog" aria-modal="true" aria-labelledby="rt-db-title">
      <div class="rt-card rt-card--db">
        <p class="rt-eyebrow">Retinoscopy · results</p>
        <div class="rt-db__head">
          <h3 id="rt-db-title" class="rt-card__title">{a.perfect ? 'Perfectly neutralised' : a.accuracy >= 0.75 ? 'Well neutralised' : a.accuracy >= 0.45 ? 'Close — refine the endpoint' : 'Keep practising the endpoint'}</h3>
          <span class="rt-db__pct rt-num"><CountUp value={Math.round(a.accuracy * 100)} />%</span>
        </div>
        {p.challengeCorrect !== null && (
          <p class={`rt-db__q ${p.challengeCorrect ? 'is-right' : 'is-wrong'}`}>
            <Icon name={p.challengeCorrect ? 'check' : 'x'} /> {p.challengeCorrect ? 'Recognition check passed' : 'Recognition check missed'}
          </p>
        )}
        <div class="rt-db__rows">{EYES.map((e: Eye) => <EyeRow key={e} a={a.eyes[e]} />)}</div>
        {p.practice && p.answer && <p class="rt-db__ans">{p.answer}</p>}
        <p class="rt-db__tip">Net Rx = gross neutralising lens − working-distance lens. Take the endpoint at the last lens before against-motion appears.</p>
        <div class="rt-card__actions">
          <Button variant="primary" icon="check" onClick={p.onDone} autoFocus>Done</Button>
        </div>
      </div>
    </div>
  );
}
