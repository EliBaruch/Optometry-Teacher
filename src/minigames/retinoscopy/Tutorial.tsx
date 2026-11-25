import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';

const STEPS = [
  {
    title: 'Sweep the streak, read the reflex',
    body: 'Drag across the pupil (or press the arrow keys, or let Auto-sweep run). If the red reflex travels WITH the streak, add plus; if it runs AGAINST the streak, add minus. Near neutrality it turns brighter, wider and faster — and at neutrality the whole pupil floods at once.',
    keys: ['←', '→', 'Space'],
  },
  {
    title: 'Find the principal meridians',
    body: 'Turn the sleeve to change which meridian you sweep. In astigmatism the reflex BREAKS away from the streak unless you sit on a principal meridian — and it is brightest and thinnest on axis. Neutralise one meridian, lock it; the second is exactly 90° away.',
    keys: ['↑', '↓', 'Enter'],
  },
  {
    title: 'Then subtract the working distance',
    body: 'Your neutralising lens is a gross value: the eye was neutral at the end of your arm, not at infinity. Take away 1 ÷ distance in metres (67 cm → +1.50 D, 50 cm → +2.00 D, 1 m → +1.00 D) to get the net Rx. Forgetting it is the classic mistake.',
    keys: ['+', '−'],
  },
];

export function Tutorial(props: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <div class="rt-overlay" role="dialog" aria-modal="true" aria-labelledby="rt-tut-title">
      <div class="rt-card rt-card--tut" key={i}>
        <p class="rt-eyebrow">The retinoscope · {i + 1}/{STEPS.length}</p>
        <h3 id="rt-tut-title" class="rt-card__title">{s.title}</h3>
        <p class="rt-card__body">{s.body}</p>
        <p class="rt-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="rt-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="rt-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? 'Start' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
