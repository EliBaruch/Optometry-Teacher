import { useEffect, useRef, useState } from 'preact/hooks';
import type { Eye, Locale, PatientFindings, RevealedFinding } from '@core';
import { Button, Kbd, RingMeter } from '@ui-kit';
import type { CvClass, CvEye, Interpretation, Score } from './clinical';
import { eyeVision } from './clinical';
import { PlateCanvas } from './PlateBook';
import type { PlateStore } from './store';
import { T, type Seg } from './strings';

// ───────────────────────────────────────────── tutorial

const rich = (segs: Seg[]) => segs.map((s, i) => (typeof s === 'string' ? s : 'b' in s ? <bdi key={i}><b>{s.b}</b></bdi> : <bdi key={i}><Kbd>{s.k}</Kbd></bdi>));

export function Tutorial(props: { onClose: () => void; locale?: Locale }) {
  const t = T(props.locale ?? 'en');
  const STEPS = t.tutSteps;
  const [step, setStep] = useState(0);
  const btn = useRef<HTMLDivElement>(null);
  useEffect(() => {
    btn.current?.querySelector<HTMLButtonElement>('.lm-btn--primary')?.focus({ preventScroll: true });
  }, [step]);
  const s = STEPS[step]!;
  return (
    <div class="cv-overlay cv-overlay--soft" role="dialog" aria-modal="true" aria-labelledby="cv-tut-title">
      <div class="cv-tut" key={step}>
        <div class="cv-tut__count" dir="ltr">{step + 1} / {STEPS.length}</div>
        <h3 id="cv-tut-title" class="cv-tut__title">{s.title}</h3>
        <p class="cv-tut__body">{rich(s.body)}</p>
        <div class="cv-tut__dots" aria-hidden="true">{STEPS.map((_, i) => <span key={i} class={i === step ? 'is-on' : ''} />)}</div>
        <div class="cv-tut__actions" ref={btn}>
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>{t.skip}</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={step < STEPS.length - 1 ? 'arrow-right' : 'check'}
            onClick={() => (step < STEPS.length - 1 ? setStep(step + 1) : props.onClose())}>
            {step < STEPS.length - 1 ? t.next : t.begin}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────── classify

const CLASSES: CvClass[] = ['normal', 'protan', 'deutan', 'tritan', 'acquired'];
const EYE_IDS: CvEye[] = ['OD', 'OS', 'OU'];

export function ClassifyPanel(props: { initial: Interpretation | null; onBack: () => void; onSubmit: (i: Interpretation) => void; onPick: () => void; locale?: Locale }) {
  const t = T(props.locale ?? 'en');
  const [type, setType] = useState<CvClass | null>(props.initial?.type ?? null);
  const [eye, setEye] = useState<CvEye | null>(props.initial?.eye ?? null);
  const ready = type === 'normal' || (type !== null && eye !== null);
  const first = useRef<HTMLDivElement>(null);
  useEffect(() => first.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true }), []);
  return (
    <div class="cv-overlay" role="dialog" aria-modal="true" aria-labelledby="cv-cls-title">
      <div class="cv-sheetpanel cv-classify">
        <header class="cv-sheetpanel__head">
          <div class="cv-eyebrow">{t.interpretation}</div>
          <h3 id="cv-cls-title" class="cv-sheetpanel__title">{t.classifyTitle}</h3>
        </header>
        <div class="cv-choicegroup" role="radiogroup" aria-label={t.typeAria} ref={first}>
          {CLASSES.map((c) => (
            <button key={c} type="button" role="radio" aria-checked={type === c} class={`cv-choice cv-choice--${c} ${type === c ? 'is-on' : ''}`}
              onClick={() => { setType(c); props.onPick(); }}>
              <span class="cv-choice__swatch" aria-hidden="true" />
              <span class="cv-choice__label">{t.classLabel[c]}</span>
              <span class="cv-choice__hint">{t.classHint[c]}</span>
            </button>
          ))}
        </div>
        <div class={`cv-eyegroup ${type === 'normal' ? 'is-off' : ''}`} role="radiogroup" aria-label={t.affectedEye}>
          <span class="cv-eyegroup__label">{t.affectedEye}</span>
          {EYE_IDS.map((id) => (
            <button key={id} type="button" role="radio" aria-checked={eye === id} disabled={type === 'normal'}
              class={`cv-pill ${eye === id && type !== 'normal' ? 'is-on' : ''}`} onClick={() => { setEye(id); props.onPick(); }}>
              {id === 'OU' ? t.bothEyes : id}
            </button>
          ))}
        </div>
        <footer class="cv-sheetpanel__foot">
          <Button variant="ghost" sfx={false} icon="chevron-left" onClick={props.onBack}>{t.back}</Button>
          <Button variant="primary" sfx={false} icon="check" disabled={!ready} onClick={() => type && props.onSubmit({ type, eye: type === 'normal' ? null : eye })}>
            {t.sign}
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
  locale?: Locale;
}

function showcase(truth: Interpretation, store: PlateStore, findings: PatientFindings): number {
  const kinds = store.plates.map((p) => p.kind);
  const eye: Eye = truth.eye === 'OS' ? 'OS' : 'OD';
  if (truth.type === 'tritan' || findings.colorVision[eye].type === 'acquired-blue-yellow') return kinds.indexOf('tritan');
  if (truth.type === 'protan' || truth.type === 'deutan') return kinds.indexOf('classify');
  return Math.max(0, kinds.indexOf('vanish'));
}

function verdict(score: Score, t: ReturnType<typeof T>): { title: string; tone: 'good' | 'warn' | 'bad' } {
  if (score.parts.type === 1 && score.parts.eye === 1) return { title: score.perfect ? t.vFlawless : t.vCorrect, tone: 'good' };
  if (score.parts.type > 0) return { title: score.parts.type === 1 ? t.vWrongEye : t.vClose, tone: 'warn' };
  return { title: t.vNot, tone: 'bad' };
}

const describeAnswer = (i: Interpretation, t: ReturnType<typeof T>) =>
  i.type === 'normal' ? t.normalWord : `${t.classLabel[i.type]} · ${i.eye === 'OU' ? t.bothEyesLc : i.eye ?? '—'}`;

export function RevealPanel(p: RevealProps) {
  const loc = p.locale ?? 'en';
  const t = T(loc);
  const v = verdict(p.score, t);
  const idx = showcase(p.truth, p.store, p.findings);
  const affected: Eye = p.truth.eye === 'OS' ? 'OS' : 'OD';
  const vision = eyeVision(p.findings, affected);
  const blur = Math.max(0, Math.min(6, (vision.va - 0.2) * 5));
  const [sim, setSim] = useState(true);
  const cont = useRef<HTMLDivElement>(null);
  useEffect(() => cont.current?.querySelector<HTMLButtonElement>('.lm-btn--primary')?.focus({ preventScroll: true }), []);
  const parts = p.score.parts;
  const rows: [string, string, boolean | null][] = [
    [t.rInterp, parts.type === 1 ? t.vCorrectWord : parts.type > 0 ? t.vHalf : t.vMissed, parts.type === 1],
    [t.rEye, p.truth.type === 'normal' ? '—' : parts.eye === 1 ? t.vCorrectWord : t.vMissed, p.truth.type === 'normal' ? null : parts.eye === 1],
    [t.rCovered, `${Math.round(parts.coverage * 100)}%`, parts.coverage >= 0.999],
    [t.rRedCap, parts.redCap >= 0.9 ? t.vDone : parts.redCap > 0 ? t.vPartial : t.vSkipped, parts.redCap >= 0.9],
  ];
  return (
    <div class="cv-overlay" role="dialog" aria-modal="true" aria-labelledby="cv-rev-title">
      <div class={`cv-sheetpanel cv-reveal cv-reveal--${v.tone}`}>
        <div class="cv-reveal__top">
          <RingMeter value={p.score.accuracy} size={92} thickness={7} accent={v.tone === 'good' ? 'var(--lm-gold)' : v.tone === 'warn' ? 'var(--lm-abnormal)' : 'var(--lm-critical)'} ariaLabel={t.techniqueAria}>
            <span class="cv-reveal__pct">{Math.round(p.score.accuracy * 100)}</span>
          </RingMeter>
          <div class="cv-reveal__head">
            <div class="cv-eyebrow">{p.mode === 'practice' ? t.practiceResult : t.charted}</div>
            <h3 id="cv-rev-title" class="cv-reveal__title">{v.title}</h3>
            <p class="cv-reveal__answer">
              <span>{t.answer} <b>{describeAnswer(p.truth, t)}</b></span>
              <span class="cv-reveal__yours">{t.you} {describeAnswer(p.given, t)}</span>
            </p>
          </div>
        </div>
        <div class="cv-reveal__grid">
          <div class="cv-reveal__compare">
            <figure>
              <PlateCanvas store={p.store} index={idx} label={t.plateAsYou} class="cv-plate--mini" />
              <figcaption>{t.youSee}</figcaption>
            </figure>
            <figure>
              <PlateCanvas store={p.store} index={idx} view={sim ? vision : undefined} viewKey={sim ? `sim-${affected}` : ''} blurPx={sim ? blur : 0} label={t.plateAsPatient(affected)} class="cv-plate--mini" />
              <figcaption>
                <button type="button" class={`cv-pill cv-pill--sm ${sim ? 'is-on' : ''}`} aria-pressed={sim} onClick={() => setSim(!sim)}>
                  {p.truth.type === 'normal' ? t.patientSees : t.patientsEye(affected)}
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
            <p class="cv-reveal__teach">{t.teaching[p.truth.type]}</p>
          </div>
        </div>
        <ul class="cv-reveal__chart" aria-label={t.chartEntries}>
          {p.lines.map((l, i) => (
            <li key={i} class={`is-${l.flag}`}><span>{l.label}{l.eye ? ` · ${l.eye}` : ''}</span><b>{l.value}</b></li>
          ))}
        </ul>
        <p class="cv-reveal__note">{t.disclaimer}</p>
        <footer class="cv-sheetpanel__foot" ref={cont}>
          <Button variant="primary" sfx={false} trailingIcon="arrow-right" onClick={p.onContinue}>{p.mode === 'practice' ? t.finish : t.closeChart}</Button>
        </footer>
      </div>
    </div>
  );
}
