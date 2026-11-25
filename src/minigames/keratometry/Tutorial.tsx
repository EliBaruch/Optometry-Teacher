import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';
import { useT } from './locale';

export function Tutorial(props: { onClose: () => void }) {
  const t = useT();
  const STEPS = t.tutSteps;
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <div class="kr-overlay" role="dialog" aria-modal="true" aria-labelledby="kr-tut-title">
      <div class="kr-card kr-card--tut" key={i}>
        <p class="kr-eyebrow">{t.tutEyebrow} · <bdi dir="ltr">{i + 1}/{STEPS.length}</bdi></p>
        <h3 id="kr-tut-title" class="kr-card__title">{s.title}</h3>
        <p class="kr-card__body">{s.body}</p>
        <p class="kr-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="kr-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="kr-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>{t.skip}</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? t.startMeasuring : t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
