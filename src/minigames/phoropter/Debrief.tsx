import { useState } from 'preact/hooks';
import { EYES, formatDiopters, formatRx, type AudioPort, type Eye } from '@core';
import { Button, CountUp, Icon, RingMeter } from '@ui-kit';
import { perceivedVA, snellen, type EyeModel, type Lens } from './optics';
import type { Challenge } from './practice';
import type { Assessment, EyeProtocol } from './scoring';

export interface DebriefProps {
  mode: 'case' | 'practice';
  assessment: Assessment;
  finals: Record<Eye, Lens>;
  truths: Record<Eye, Lens>;
  models: Record<Eye, EyeModel>;
  protocol: Record<Eye, EyeProtocol>;
  challenge: Challenge | null;
  audio: AudioPort;
  onFinish: (challengeCorrect: boolean | null) => void;
}

const rx = (l: Lens) => formatRx({ sphere: l.sphere, cylinder: l.cyl, axis: l.axis });
const signed = (v: number) => (Math.abs(v) < 0.005 ? '0.00' : (v > 0 ? '+' : '−') + Math.abs(v).toFixed(2));

function lessons(p: DebriefProps): string[] {
  const out: string[] = [];
  for (const e of EYES) {
    const err = p.assessment.perEye[e].error;
    if (p.protocol[e].asks === 0) out.push(`${e} was never checked with the patient — an Rx nobody looked through is only a guess.`);
    if (err.dM <= -0.24) out.push(`${e} is over-minused by ${formatDiopters(-err.dM).replace('+', '')} D. A young eye accommodates through it — push plus; treat minus like money.`);
    else if (err.dM >= 0.24) out.push(`${e} is under-minused by ${err.dM.toFixed(2)} D: letters were still gaining clarity with more minus.`);
    if (err.dCyl > 0.3) out.push(`${e} cylinder is off by ${err.dCyl.toFixed(2)} D (vector). Refine the axis first, then the power, with the cross-cylinder.`);
    if (!p.protocol[e].fogged) out.push(`${e} was never fogged — without fog, accommodation can hide plus and you drift into over-minus.`);
    if (!p.protocol[e].duochrome && p.models[e].best <= 0.3) out.push(`${e}: finish with the duochrome — red blacker add minus, green blacker add plus.`);
  }
  if (!out.length) out.push('Clean technique: fogged, bracketed, refined the cylinder and confirmed on the duochrome.');
  return out.slice(0, 4);
}

export function Debrief(p: DebriefProps) {
  const [picked, setPicked] = useState<number | null>(null);
  const ch = p.challenge;
  const answered = !ch || picked !== null;
  const correct = ch && picked !== null ? picked === ch.correct : null;

  const choose = (i: number) => {
    if (picked !== null || !ch) return;
    setPicked(i);
    p.audio.play(i === ch.correct ? 'success' : 'fail');
  };

  return (
    <div class="php-debrief" role="dialog" aria-modal="true" aria-labelledby="php-debrief-title">
      <div class="php-debrief__card">
        {ch && (
          <section class="php-challenge" aria-live="polite">
            <p class="php-eyebrow">Recognition check</p>
            <h3 class="php-challenge__q">{ch.question}</h3>
            <div class="php-challenge__opts">
              {ch.options.map((o, i) => (
                <button
                  key={o}
                  type="button"
                  class={`php-opt${picked !== null && i === ch.correct ? ' is-right' : ''}${picked === i && i !== ch.correct ? ' is-wrong' : ''}`}
                  disabled={picked !== null}
                  onClick={() => choose(i)}
                >
                  <span class="php-opt__key">{String.fromCharCode(65 + i)}</span>
                  {o}
                </button>
              ))}
            </div>
            {picked !== null && (
              <p class={`php-challenge__explain${correct ? ' is-right' : ''}`}>
                <Icon name={correct ? 'check' : 'info'} /> {correct ? 'Correct. ' : `It's ${ch.options[ch.correct]}. `}{ch.explain}
              </p>
            )}
          </section>
        )}

        {answered && (
          <section class="php-result">
            <header class="php-result__head">
              <RingMeter value={p.assessment.accuracy} size={96} accent={p.assessment.perfect ? 'var(--lm-gold)' : 'var(--lm-normal)'} ariaLabel="Technique score">
                <span class="php-result__pct"><CountUp value={Math.round(p.assessment.accuracy * 100)} />%</span>
              </RingMeter>
              <div>
                <p class="php-eyebrow">{p.assessment.perfect ? 'Flawless refraction' : 'Refraction recorded'}</p>
                <h2 id="php-debrief-title" class="php-result__title">{p.assessment.perfect ? 'Every quarter-dioptre in its place.' : 'Your prescription vs the endpoint'}</h2>
              </div>
            </header>
            <div class="php-result__eyes">
              {EYES.map((e) => {
                const err = p.assessment.perEye[e].error;
                const va = snellen(perceivedVA(p.models[e], p.finals[e]));
                return (
                  <div class={`php-rx${err.exact ? ' is-exact' : ''}`} key={e}>
                    <div class="php-rx__eye">{e}</div>
                    <dl>
                      <dt>Yours</dt><dd class="php-num">{rx(p.finals[e])}</dd>
                      <dt>Endpoint</dt><dd class="php-num">{rx(p.truths[e])}</dd>
                      <dt>VA with yours</dt><dd class="php-num">{va}</dd>
                    </dl>
                    <div class="php-rx__err">
                      <span class={Math.abs(err.dM) <= 0.13 ? 'ok' : 'off'}>SE {signed(err.dM)}</span>
                      <span class={err.dCyl <= 0.26 ? 'ok' : 'off'}>Cyl Δ {err.dCyl.toFixed(2)}</span>
                    </div>
                  </div>
                );
              })}
            </div>
            <ul class="php-lessons">
              {lessons(p).map((l) => <li key={l}>{l}</li>)}
            </ul>
            <div class="php-result__foot">
              <Button variant="primary" size="lg" icon="chart" sfx={false} onClick={() => { p.audio.play('stamp'); p.onFinish(correct); }} autoFocus>
                {p.mode === 'case' ? 'Write to chart' : 'Finish'}
              </Button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}
