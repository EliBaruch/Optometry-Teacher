import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';
import { useT } from './strings';

const KEYS = [['←', '→', 'Space'], ['↑', '↓', 'Enter'], ['+', '−']];

export function Tutorial(props: { onClose: () => void }) {
  const t = useT();
  const STEPS = t.tutSteps;
  const [i, setI] = useState(0);
  const s = { ...STEPS[i]!, keys: KEYS[i]!.map((k) => (k === 'Space' ? t.keySpace : k)) };
  const last = i === STEPS.length - 1;
  return (
    <div class="rt-overlay" role="dialog" aria-modal="true" aria-labelledby="rt-tut-title">
      <div class="rt-card rt-card--tut" key={i}>
        <p class="rt-eyebrow">{t.tutEyebrow(i + 1, STEPS.length)}</p>
        <h3 id="rt-tut-title" class="rt-card__title">{s.title}</h3>
        <p class="rt-card__body">{s.body}</p>
        <p class="rt-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="rt-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="rt-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>{t.tutSkip}</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? t.tutStart : t.tutNext}
          </Button>
        </div>
      </div>
    </div>
  );
}
