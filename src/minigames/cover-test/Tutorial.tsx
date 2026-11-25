import { useEffect, useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';
import { useT } from './locale';

export function Tutorial(props: { onClose: () => void; onStep?: (i: number) => void }) {
  const t = useT();
  const STEPS = t.tutSteps;
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  useEffect(() => { props.onStep?.(i); }, [i]);
  const last = i === STEPS.length - 1;
  return (
    <div class={`cvt-overlay cvt-overlay--s${i}`} role="dialog" aria-modal="true" aria-labelledby="cvt-tut-title">
      <div class="cvt-card" key={i}>
        <p class="cvt-eyebrow">{t.tutEyebrow} · <bdi dir="ltr">{i + 1}/{STEPS.length}</bdi></p>
        <h3 id="cvt-tut-title" class="cvt-card__title">{s.title}</h3>
        <p class="cvt-card__body">{s.body}</p>
        <p class="cvt-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="cvt-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="cvt-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>{t.skip}</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? t.startExamining : t.next}
          </Button>
        </div>
      </div>
    </div>
  );
}
