import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';

const STEPS = [
  {
    title: 'Focus the reference ring',
    body: 'Through the eyepiece you see three glowing images of the mire reflected by the cornea. The lower-right ring holds the cross-hair: when the instrument is out of focus it doubles. Turn the Focus wheel until it is single and crisp.',
    keys: ['←', '→'],
  },
  {
    title: 'Find a principal meridian',
    body: 'Drag the bezel round the eyepiece. On an astigmatic cornea the bars of the two gold plus signs step apart unless the instrument sits on a principal meridian — rotate until they run in one unbroken line.',
    keys: ['[', ']'],
  },
  {
    title: 'Superimpose, read, judge',
    body: 'The horizontal drum fuses the plus signs (K along the gold pointer); the vertical drum fuses the blue minus signs (90° away). The difference between them is the corneal cylinder. Grade the mires, lock each eye, then record.',
    keys: ['E', 'L'],
  },
];

export function Tutorial(props: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <div class="kr-overlay" role="dialog" aria-modal="true" aria-labelledby="kr-tut-title">
      <div class="kr-card kr-card--tut" key={i}>
        <p class="kr-eyebrow">The keratometer · {i + 1}/{STEPS.length}</p>
        <h3 id="kr-tut-title" class="kr-card__title">{s.title}</h3>
        <p class="kr-card__body">{s.body}</p>
        <p class="kr-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="kr-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="kr-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? 'Start measuring' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
