import { useEffect, useRef, useState } from 'preact/hooks';
import type { Eye, PatientFindings, RevealedFinding } from '@core';
import { Button, Kbd, RingMeter } from '@ui-kit';
import type { CvClass, CvEye, Interpretation, Score } from './clinical';
import { eyeVision } from './clinical';
import { PlateCanvas } from './PlateBook';
import type { PlateStore } from './store';
import { CLASS_HINT, CLASS_LABEL, DISCLAIMER, TEACHING } from './teach';

// ───────────────────────────────────────────── tutorial

const STEPS = [
  { title: 'Show the plates', body: <>Turn the brass dial — or press <Kbd>←</Kbd> <Kbd>→</Kbd> — to show each plate. The patient reads it aloud; the answer key is on your record sheet.</> },
  { title: 'One eye at a time', body: <>Switch the occluder with <b>OD</b> / <b>OS</b> (<Kbd>R</Kbd> / <Kbd>L</Kbd>). Congenital defects match in both eyes; acquired ones usually don’t.</> },
  { title: 'Compare reds, then record', body: <>If an eye looks suspicious, compare red saturation with the <b>red cap</b>. Then record your interpretation: type and eye.</> },
];

export function Tutorial(props: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const btn = useRef<HTMLDivElement>(null);
  useEffect(() => {
    btn.current?.querySelector<HTMLButtonElement>('.lm-btn--primary')?.focus({ preventScroll: true });
  }, [step]);
  const s = STEPS[step]!;
  return (
    <div class="cv-overlay cv-overlay--soft" role="dialog" aria-modal="true" aria-labelledby="cv-tut-title">
      <div class="cv-tut" key={step}>
        <div class="cv-tut__count">{step + 1} / {STEPS.length}</div>
        <h3 id="cv-tut-title" class="cv-tut__title">{s.title}</h3>
        <p class="cv-tut__body">{s.body}</p>
        <div class="cv-tut__dots" aria-hidden="true">{STEPS.map((_, i) => <span key={i} class={i === step ? 'is-on' : ''} />)}</div>
        <div class="cv-tut__actions" ref={btn}>
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={step < STEPS.length - 1 ? 'arrow-right' : 'check'}
            onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : props.onClose())}>
            {step < STEPS.length - 1 ? 'Next' : 'Begin'}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── classify

const CLASSES: CvClass[] = ['normal', 'protan', 'deutan', 'tritan', 'acquired'];
const EYE_CHOICES: { id: CvEye; label: string }[] = [{ id: 'OD', label: 'OD' }, { id: 'OS', label: 'OS' }, { id: 'OU', label: 'Both eyes' }];

export function ClassifyPanel(props: { initial: Interpretation | null; onBack: () => void; onSubmit: (i: Interpretation) => void; onPick: () => void }) {
  const [type, setType] = useState<CvClass | null>(props.initial?.type ?? null);
  const [eye, setEye] = useState<CvEye | null>(props.initial?.eye ?? null);
  const ready = type === 'normal' || (type !== null && eye !== null);
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => first.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }), []);
  return (
    <div class="cv-overlay" role="dialog" aria-modal="true" aria-labelledby="cv-cls-title">
      <div class="cv-sheetpanel cv-classify">
        <header class="cv-sheetpanel__head">
          <div class="cv-eyebrow">Interpretation</div>
          <h3 id="cv-cls-title" class="cv-sheetpanel__title">What do the plates tell you?</h3>
        </header>
        <div class="cv-choicegroup" role="radiogroup" aria-label="Type of colour vision" ref={first}>
          {CLASSES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={type === c} class={`cv-choice cv-choice--${c} ${type === c ? 'is-on' : ''}`}
              onClick={() => { setType(c); props.onPick(); }}>
              <span class="cv-choice__swatch" aria-hidden="true" />
              <span class="cv-choice__label">{CLASS_LABEL[c]}</span>
              <span class="cv-choice__hint">{CLASS_HINT[c]}</span>
            </button>
          ))}
        </div>
        <div class={`cv-eyegroup ${type === 'normal' ? 'is-off' : ''}`} role="radiogroup" aria-label="Affected eye">
          <span class="cv-eyegroup__label">Affected eye</span>
          {EYE_CHOICES.map((e) => (
            <button key={e.id} type="button" role="radio" aria-checked={eye === e.id} disabled={type === 'normal'}
              class={`cv-pill ${eye === e.id && type !== 'normal' ? 'is-on' : ''}`} onClick={() => { setEye(e.id); props.onPick(); }}>
              {e.label}
            </button>
          ))}
        </div>
        <footer class="cv-sheetpanel__foot">
          <Button variant="ghost" sfx={false} icon="chevron-left" onClick={props.onBack}>Back</Button>
          <Button variant="primary" sfx={false} icon="check" disabled={!ready} onClick={() => type && props.onSubmit({ type, eye: type === 'normal' ? null : eye })}>
            Sign the chart
          </Button>
        </footer>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── reveal

export interface RevealProps {
  truth: Interpretation;
  given: Interpretation;
  score: Score;
  lines: RevealedFinding[];
  findings: PatientFindings;
  store: PlateStore;
  mode: 'case' | 'practice';
  onContinue: () => void;
}

function showcase(truth: Interpretation, store: PlateStore): number {
  const kinds = store.plates.map((p) => p.kind);
  if (truth.type === 'tritan') return kinds.indexOf('tritan');
  if (truth.type === 'protan' || truth.type === 'deutan') return kinds.indexOf('classify');
  return Math.max(0, kinds.indexOf('vanish'));
}

function verdict(score: Score): { title: string; tone: 'good' | 'warn' | 'bad' } {
  if (score.parts.type === 1 && score.parts.eye === 1) return { title: score.perfect ? 'Flawless reading' : 'Correct interpretation', tone: 'good' };
  if (score.parts.type > 0) return { title: score.parts.type === 1 ? 'Right defect, wrong eye' : 'Close — right axis, wrong cone', tone: 'warn' };
  return { title: 'Not quite', tone: 'bad' };
}

const describeAnswer = (i: Interpretation) =>
  i.type === 'normal' ? 'Normal' : `${CLASS_LABEL[i.type]} · ${i.eye === 'OU' ? 'both eyes' : i.eye ?? '—'}`;

export function RevealPanel(p: RevealProps) {
  const v = verdict(p.score);
  const idx = showcase(p.truth, p.store);
  const affected: Eye = p.truth.eye === 'OS' ? 'OS' : 'OD';
  const vision = eyeVision(p.findings, affected);
  const blur = Math.max(0, Math.min(6, (vision.va - 0.2) * 5));
  const [sim, setSim] = useState(true);
  const cont = useRef<HTMLDivElement>(null);
  useEffect(() => cont.current?.querySelector<HTMLButtonElement>('.lm-btn--primary')?.focus({ preventScroll: true }), []);
  const parts = p.score.parts;
  const rows: [string, string, boolean | null][] = [
    ['Interpretation', parts.type === 1 ? 'correct' : parts.type > 0 ? 'half' : 'missed', parts.type === 1],
    ['Eye', p.truth.type === 'normal' ? '—' : parts.eye === 1 ? 'correct' : 'missed', p.truth.type === 'normal' ? null : parts.eye === 1],
    ['Plates covered', `${Math.round(parts.coverage * 100)}%`, parts.coverage >= 0.999],
    ['Red-cap check', parts.redCap >= 0.9 ? 'done' : parts.redCap > 0 ? 'partial' : 'skipped', parts.redCap >= 0.9],
  ];
  return (
    <div class="cv-overlay" role="dialog" aria-modal="true" aria-labelledby="cv-rev-title">
      <div class={`cv-sheetpanel cv-reveal cv-reveal--${v.tone}`}>
        <div class="cv-reveal__top">
          <RingMeter value={p.score.accuracy} size={92} thickness={7} accent={v.tone === 'good' ? 'var(--lm-gold)' : v.tone === 'warn' ? 'var(--lm-abnormal)' : 'var(--lm-critical)'} ariaLabel="Technique score">
            <span class="cv-reveal__pct">{Math.round(p.score.accuracy * 100)}</span>
          </RingMeter>
          <div class="cv-reveal__head">
            <div class="cv-eyebrow">{p.mode === 'practice' ? 'Practice result' : 'Charted'}</div>
            <h3 id="cv-rev-title" class="cv-reveal__title">{v.title}</h3>
            <p class="cv-reveal__answer">
              <span>Answer: <b>{describeAnswer(p.truth)}</b></span>
              <span class="cv-reveal__yours">You: {describeAnswer(p.given)}</span>
            </p>
          </div>
        </div>
        <div class="cv-reveal__grid">
          <div class="cv-reveal__compare">
            <figure>
              <PlateCanvas store={p.store} index={idx} label="Plate as you see it" class="cv-plate--mini" />
              <figcaption>You see</figcaption>
            </figure>
            <figure>
              <PlateCanvas store={p.store} index={idx} view={sim ? vision : undefined} viewKey={sim ? `sim-${affected}` : ''} blurPx={sim ? blur : 0} label={`Plate as the patient's ${affected} sees it (simulation)`} class="cv-plate--mini" />
              <figcaption>
                <button type="button" class={`cv-pill cv-pill--sm ${sim ? 'is-on' : ''}`} aria-pressed={sim} onClick={() => setSim(!sim)}>
                  {p.truth.type === 'normal' ? 'Patient sees' : `Patient’s ${affected}`}
                </button>
              </figcaption>
            </figure>
          </div>
          <div class="cv-reveal__text">
            <ul class="cv-reveal__rows">
              {rows.map(([k, val, ok]) => (
                <li key={k} class={ok === null ? '' : ok ? 'is-ok' : 'is-miss'}><span>{k}</span><b>{val}</b></li>
              ))}
            </ul>
            <p class="cv-reveal__teach">{TEACHING[p.truth.type]}</p>
          </div>
        </div>
        <ul class="cv-reveal__chart" aria-label="Chart entries">
          {p.lines.map((l, i) => (
            <li key={i} class={`is-${l.flag}`}><span>{l.label}{l.eye ? ` · ${l.eye}` : ''}</span><b>{l.value}</b></li>
          ))}
        </ul>
        <p class="cv-reveal__note">{DISCLAIMER}</p>
        <footer class="cv-sheetpanel__foot" ref={cont}>
          <Button variant="primary" sfx={false} trailingIcon="arrow-right" onClick={p.onContinue}>{p.mode === 'practice' ? 'Finish' : 'Close & chart'}</Button>
        </footer>
      </div>
    </div>
  );
}
