import { useEffect, useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';

const STEPS = [
  { title: 'Cover, then watch the OTHER eye', body: 'Drag the black paddle over one eye, or press the arrow keys. The patient stares at the target. If the uncovered eye moves to pick up the target, it was deviated: a tropia.', keys: ['←', '→'] },
  { title: 'Uncover, and watch the covered eye', body: 'Slide the paddle away and watch the eye that was behind it. If it was hidden and swings back to straight, that is a phoria: a latent deviation that fusion normally holds. Repeat on both eyes.', keys: ['↓', 'Space'] },
  { title: 'Alternate, then neutralise', body: 'Swing the paddle from eye to eye without letting both see together to reveal the full deviation. Then slide a prism bar over an eye (base-out for eso, base-in for exo) until the movement just stops. Lock your call.', keys: ['Alternate', '↑ ↓ prism'] },
];

export function Tutorial(props: { onClose: () => void; onStep?: (i: number) => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  useEffect(() => { props.onStep?.(i); }, [i]);
  const last = i === STEPS.length - 1;
  return (
    <div class={`cvt-overlay cvt-overlay--s${i}`} role="dialog" aria-modal="true" aria-labelledby="cvt-tut-title">
      <div class="cvt-card" key={i}>
        <p class="cvt-eyebrow">The cover test · {i + 1}/{STEPS.length}</p>
        <h3 id="cvt-tut-title" class="cvt-card__title">{s.title}</h3>
        <p class="cvt-card__body">{s.body}</p>
        <p class="cvt-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="cvt-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="cvt-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? 'Start examining' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
