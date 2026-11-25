import { useEffect, useRef, useState } from 'preact/hooks';
import { EYES, formatDiopters, formatRx, pickStrings, type AudioPort, type Eye, type Locale } from '@core';
import { Button, CountUp, Icon, RingMeter } from '@ui-kit';
import { perceivedVA, snellen, type EyeModel, type Lens } from './optics';
import type { Challenge } from './practice';
import type { Assessment, EyeProtocol } from './scoring';
import { S, useLoc, useT } from './strings';

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

function lessons(p: DebriefProps, locale: Locale): string[] {
  const t = pickStrings(S, locale);
  const out: string[] = [];
  for (const e of EYES) {
    const err = p.assessment.perEye[e].error;
    if (p.protocol[e].asks === 0) out.push(t.lessonNever(e));
    if (err.dM <= -0.24) out.push(t.lessonOver(e, formatDiopters(-err.dM).replace('+', '')));
    else if (err.dM >= 0.24) out.push(t.lessonUnder(e, err.dM.toFixed(2)));
    if (err.dCyl > 0.3) out.push(t.lessonCyl(e, err.dCyl.toFixed(2)));
    if (!p.protocol[e].fogged) out.push(t.lessonFog(e));
    if (!p.protocol[e].duochrome && p.models[e].best <= 0.3) out.push(t.lessonDuo(e));
  }
  if (!out.length) out.push(t.lessonClean);
  return out.slice(0, 4);
}

export function Debrief(p: DebriefProps) {
  const t = useT();
  const loc = useLoc();
  const [picked, setPicked] = useState<number | null>(null);
  // Technique first: the player sees how their own refraction compares, then the recognition check.
  const [stage, setStage] = useState<'result' | 'challenge'>('result');
  const ch = p.challenge;
  const explain = useRef<HTMLParagraphElement>(null);
  // On a short phone screen the explanation sits below the fold: bring it into view.
  useEffect(() => { if (picked !== null) explain.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' }); }, [picked]);
  const correct = ch && picked !== null ? picked === ch.correct : null;

  const choose = (i: number) => {
    if (picked !== null || !ch) return;
    setPicked(i);
    p.audio.play(i === ch.correct ? 'success' : 'fail');
  };

  return (
    <div class="php-debrief" role="dialog" aria-modal="true" aria-labelledby="php-debrief-title">
      <div class="php-debrief__card" key={stage}>
        {stage === 'result' && (
          <section class="php-result">
            <div class="php-scroll">
            <header class="php-result__head">
              <RingMeter value={p.assessment.accuracy} size={96} accent={p.assessment.perfect ? 'var(--lm-gold)' : 'var(--lm-normal)'} ariaLabel={t.scoreAria}>
                <span class="php-result__pct"><CountUp value={Math.round(p.assessment.accuracy * 100)} />%</span>
              </RingMeter>
              <div>
                <p class="php-eyebrow">{p.assessment.perfect ? t.flawless : t.recorded}</p>
                <h2 id="php-debrief-title" class="php-result__title">{p.assessment.perfect ? t.flawlessTitle : t.vsEndpoint}</h2>
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
                      <dt>{t.yours}</dt><dd class="php-num" dir="ltr">{rx(p.finals[e])}</dd>
                      <dt>{t.endpoint}</dt><dd class="php-num" dir="ltr">{rx(p.truths[e])}</dd>
                      <dt>{t.vaWithYours}</dt><dd class="php-num" dir="ltr">{va}</dd>
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
              {lessons(p, loc).map((l) => <li key={l}>{l}</li>)}
            </ul>
            </div>
            <div class="php-result__foot">
              {ch ? (
                <Button variant="primary" size="lg" icon="arrow-right" sfx={false} onClick={() => { p.audio.play('select'); setStage('challenge'); }} autoFocus>
                  {t.recognitionCheck}
                </Button>
              ) : (
                <Button variant="primary" size="lg" icon="chart" sfx={false} onClick={() => { p.audio.play('stamp'); p.onFinish(null); }} autoFocus>{t.finish}</Button>
              )}
            </div>
          </section>
        )}

        {stage === 'challenge' && ch && (
          <section class="php-challenge" aria-live="polite">
            <div class="php-scroll">
            <p class="php-eyebrow">{t.recognitionCheck}</p>
            <h3 id="php-debrief-title" class="php-challenge__q">{ch.question}</h3>
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
              <p ref={explain} class={`php-challenge__explain${correct ? ' is-right' : ''}`}>
                <Icon name={correct ? 'check' : 'info'} /> {correct ? t.correctPrefix : t.itsPrefix(ch.options[ch.correct]!)}{ch.explain}
              </p>
            )}
            </div>
            {picked !== null && (
              <div class="php-result__foot">
                <Button variant="primary" size="lg" icon="chart" sfx={false} onClick={() => { p.audio.play('stamp'); p.onFinish(correct); }} autoFocus>{t.finish}</Button>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
