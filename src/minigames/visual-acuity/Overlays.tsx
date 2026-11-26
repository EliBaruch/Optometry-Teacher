/** First-run micro-tutorial, practice challenge card and the "charted" stamp. */
import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Icon, type IconName } from '@ui-kit';
import type { Challenge } from './challenge';
import { useT } from './strings';

export interface TutorialStep {
  icon: IconName;
  title: string;
  body: string;
}

export function Tutorial(props: { steps: TutorialStep[]; onClose(): void }) {
  const t = useT();
  const [i, setI] = useState(0);
  const last = i === props.steps.length - 1;
  const step = props.steps[i]!;
  const nextRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    nextRef.current?.querySelector<HTMLButtonElement>('.va-tut__next')?.focus();
  }, [i]);
  return (
    <div class="va-overlay" role="dialog" aria-modal="true" aria-label={t.tutAria}>
      <div class="va-tut" key={i}>
        <div class="va-tut__icon"><Icon name={step.icon} size={30} /></div>
        <div class="va-tut__count">{t.tutStep(i + 1, props.steps.length)}</div>
        <h3 class="va-tut__title">{step.title}</h3>
        <p class="va-tut__body">{step.body}</p>
        <div class="va-tut__dots" aria-hidden="true">
          {props.steps.map((_, k) => <span key={k} class={k === i ? 'is-on' : ''} />)}
        </div>
        <div class="va-tut__actions" ref={nextRef}>
          <Button variant="ghost" size="sm" onClick={props.onClose}>{t.skip}</Button>
          <Button class="va-tut__next" variant="primary" size="sm" trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))}>
            {last ? t.start : t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function ChallengeCard(props: {
  challenge: Challenge;
  summary: { label: string; value: string; ok: boolean | null }[];
  /** Technique notes shown under the summary */
  notes?: string[];
  onAnswer(correct: boolean): void;
  onFinish(): void;
}) {
  const t = useT();
  const [picked, setPicked] = useState<number | null>(null);
  const c = props.challenge;
  const firstRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    firstRef.current?.querySelector<HTMLButtonElement>('button')?.focus();
  }, []);
  return (
    <div class="va-overlay" role="dialog" aria-modal="true" aria-label={t.quizAria}>
      <div class="va-quiz">
        <div class="lm-eyebrow va-quiz__eyebrow">{t.yourChart}</div>
        <ul class="va-quiz__summary">
          {props.summary.map((s) => (
            <li key={s.label} class={s.ok === null ? '' : s.ok ? 'is-ok' : 'is-off'}>
              <span>{s.label}</span>
              <b>{s.value}</b>
              {s.ok !== null && <Icon name={s.ok ? 'check' : 'x'} size={16} />}
            </li>
          ))}
        </ul>
        {props.notes && props.notes.length > 0 && (
          <ul class="va-quiz__notes">
            {props.notes.slice(0, 4).map((n) => <li key={n}>{n}</li>)}
          </ul>
        )}
        <h3 class="va-quiz__prompt">{c.prompt}</h3>
        <div class="va-quiz__opts" ref={firstRef}>
          {c.options.map((o, i) => {
            const state = picked === null ? '' : i === c.answer ? 'is-right' : i === picked ? 'is-wrong' : 'is-dim';
            return (
              <button
                key={o}
                type="button"
                class={`va-quiz__opt ${state}`}
                disabled={picked !== null}
                onClick={() => {
                  setPicked(i);
                  props.onAnswer(i === c.answer);
                }}
              >
                <span class="va-quiz__key">{String.fromCharCode(65 + i)}</span>
                {o}
              </button>
            );
          })}
        </div>
        {picked !== null && (
          <div class={`va-quiz__explain ${picked === c.answer ? 'is-right' : 'is-wrong'}`}>
            <b>{picked === c.answer ? t.exactly : t.notQuite}</b> {c.explain}
          </div>
        )}
        {picked !== null && (
          <div class="va-quiz__actions">
            <Button variant="primary" icon="check" onClick={props.onFinish}>{t.finish}</Button>
          </div>
        )}
      </div>
    </div>
  );
}

export function ChartedStamp(props: { lines: string[] }) {
  const t = useT();
  return (
    <div class="va-overlay va-overlay--clear" aria-live="polite">
      <div class="va-stamp">
        <div class="va-stamp__ring"><Icon name="check" size={34} /></div>
        <div class="va-stamp__title">{t.charted}</div>
        {props.lines.map((l) => <div key={l} class="va-stamp__line">{l}</div>)}
      </div>
    </div>
  );
}
