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
    <div class="tn-overlay" role="dialog" aria-modal="true" aria-labelledby="tn-tut-title">
      <div class="tn-card" key={i}>
        <p class="tn-eyebrow">{t.tutEyebrow(i + 1, STEPS.length)}</p>
        <h3 id="tn-tut-title" class="tn-card__title">{s.title}</h3>
        <p class="tn-card__body">{s.body}</p>
        <p class="tn-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="tn-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="tn-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>{t.skip}</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? t.startMeasuring : t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
