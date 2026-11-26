import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';
import { useT } from './strings';

const KEYS = [['←', '→'], ['A'], ['J', 'D']];
export function Tutorial(props: { onClose: () => void }) {
  const t = useT();
  const STEPS = t.tutSteps;
  const [i, setI] = useState(0);
  const s = { ...STEPS[i]!, keys: KEYS[i]! };
  const last = i === STEPS.length - 1;
  return (
    <div class="php-tut" role="dialog" aria-modal="true" aria-labelledby="php-tut-title">
      <div class="php-tut__card" key={i}>
        <p class="php-eyebrow">{t.tutEyebrow(i + 1, STEPS.length)}</p>
        <h3 id="php-tut-title" class="php-tut__title">{s.title}</h3>
        <p class="php-tut__body">{s.body}</p>
        <p class="php-tut__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="php-tut__dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="php-tut__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>{t.tutSkip}</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? t.tutStart : t.tutNext}
          </Button>
        </div>
      </div>
    </div>
  );
}
