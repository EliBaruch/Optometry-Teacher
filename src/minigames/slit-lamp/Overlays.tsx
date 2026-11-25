import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Kbd, RingMeter } from '@ui-kit';
import type { Question } from './practice';

export interface TutStep { title: string; body: string; keys?: string[] }

export function Tutorial(props: { eyebrow: string; steps: TutStep[]; onClose: () => void; cta: string }) {
  const [i, setI] = useState(0);
  const s = props.steps[i]!;
  const last = i === props.steps.length - 1;
  return (
    <div class="sl-overlay" role="dialog" aria-modal="true" aria-label={props.eyebrow}>
      <div class="sl-card sl-card--tut" key={i}>
        <p class="sl-eyebrow">{props.eyebrow} · {i + 1}/{props.steps.length}</p>
        <h3 class="sl-card__title">{s.title}</h3>
        <p class="sl-card__body">{s.body}</p>
        {s.keys && <p class="sl-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>}
        <div class="sl-dots" aria-hidden="true">{props.steps.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="sl-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? props.cta : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Multiple-choice recognition challenge shown at the end of practice. */
export function Challenge(props: { questions: Question[]; onFinish: (right: boolean[]) => void; audio: { play: (id: 'success' | 'fail') => void } }) {
  const [qi, setQi] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const results = useRef<boolean[]>([]);
  const q = props.questions[qi]!;
  const last = qi === props.questions.length - 1;
  const rootRef = useRef<HTMLDivElement>(null);
  useEffect(() => { rootRef.current?.querySelector<HTMLButtonElement>('.sl-opt')?.focus(); }, [qi]);
  const choose = (k: number) => {
    if (picked !== null) return;
    setPicked(k);
    const ok = k === q.correct;
    results.current[qi] = ok;
    props.audio.play(ok ? 'success' : 'fail');
  };
  return (
    <div class="sl-overlay" role="dialog" aria-modal="true" aria-label="Recognition challenge" ref={rootRef}>
      <div class="sl-card sl-card--wide" key={qi}>
        <p class="sl-eyebrow">Name it · {qi + 1}/{props.questions.length}</p>
        <h3 class="sl-card__title">{q.prompt}</h3>
        <div class="sl-opts">
          {q.options.map((o, k) => (
            <button
              key={k}
              type="button"
              class={`sl-opt${picked !== null ? (k === q.correct ? ' is-right' : k === picked ? ' is-wrong' : ' is-dim') : ''}`}
              onClick={() => choose(k)}
              aria-pressed={picked === k}
            >
              <span class="sl-opt__k">{String.fromCharCode(65 + k)}</span>{o}
            </button>
          ))}
        </div>
        {picked !== null && (
          <p class={`sl-explain ${picked === q.correct ? 'is-right' : 'is-wrong'}`} role="status">
            <b>{picked === q.correct ? 'Correct. ' : 'Not quite. '}</b>{q.explain}
          </p>
        )}
        <div class="sl-card__actions">
          <Button variant="primary" size="sm" disabled={picked === null} trailingIcon="arrow-right" onClick={() => (last ? props.onFinish(results.current.slice(0, props.questions.length)) : (setPicked(null), setQi(qi + 1)))}>
            {last ? 'See my report' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface DebriefItem { label: string; status: 'found' | 'partial' | 'missed'; note?: string }
export interface DebriefProps {
  title: string;
  accuracy: number;
  perfect: boolean;
  groups: { heading: string; items: DebriefItem[] }[];
  stats: { label: string; value: string }[];
  challenge?: { right: number; total: number };
  finishLabel: string;
  onFinish: () => void;
}

export function Debrief(p: DebriefProps) {
  const pct = Math.round(p.accuracy * 100);
  const grade = p.perfect ? 'Flawless technique' : p.accuracy >= 0.85 ? 'Excellent technique' : p.accuracy >= 0.65 ? 'Good work' : p.accuracy >= 0.4 ? 'Getting there' : 'Keep practising';
  return (
    <div class="sl-overlay" role="dialog" aria-modal="true" aria-label="Examination summary">
      <div class="sl-card sl-card--debrief">
        <div class="sl-debrief__top">
          <RingMeter value={p.accuracy} size={108} thickness={8} ariaLabel={`Technique score ${pct} percent`}>
            <span class="sl-debrief__pct">{pct}</span>
          </RingMeter>
          <div>
            <p class="sl-eyebrow">{p.title}</p>
            <h3 class="sl-card__title">{grade}</h3>
            <p class="sl-debrief__stats">{p.stats.map((s) => <span key={s.label}><b>{s.value}</b> {s.label}</span>)}{p.challenge && <span><b>{p.challenge.right}/{p.challenge.total}</b> questions</span>}</p>
          </div>
        </div>
        <div class="sl-debrief__cols">
          {p.groups.map((g) => (
            <section key={g.heading}>
              <h4>{g.heading}</h4>
              <ul>
                {g.items.length === 0 && <li class="is-none">Nothing to chart — all clear.</li>}
                {g.items.map((it, k) => (
                  <li key={k} class={`is-${it.status}`}>
                    <i aria-hidden="true">{it.status === 'found' ? '✓' : it.status === 'partial' ? '≈' : '○'}</i>
                    <span>{it.label}{it.note && <em>{it.note}</em>}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <div class="sl-card__actions">
          <Button variant="primary" icon="check" onClick={p.onFinish} autoFocus>{p.finishLabel}</Button>
        </div>
      </div>
    </div>
  );
}
