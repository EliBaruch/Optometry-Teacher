import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';

const STEPS = [
  {
    title: 'You see what they see',
    body: 'The chart on the right is the patient’s view through the lenses you dial. Turn the knobs by dragging around them, with the mouse wheel, or with the arrow keys.',
    keys: ['←', '→'],
  },
  {
    title: 'Fog, then trade plus for clarity',
    body: 'Start from the autorefraction, add about +0.75 to fog, then unfog in −0.25 clicks asking “one or two?”. Give minus only when the letters get clearer — “smaller and darker” is not clearer.',
    keys: ['A'],
  },
  {
    title: 'Cross-cylinder & duochrome',
    body: 'Swing in the cross-cylinder: rotate the axis toward the red dot of the clearer flip, then refine the power. Finish on the duochrome, refine the other eye, then record your findings.',
    keys: ['J', 'D'],
  },
];

export function Tutorial(props: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <div class="php-tut" role="dialog" aria-modal="true" aria-labelledby="php-tut-title">
      <div class="php-tut__card" key={i}>
        <p class="php-eyebrow">How to refract · {i + 1}/{STEPS.length}</p>
        <h3 id="php-tut-title" class="php-tut__title">{s.title}</h3>
        <p class="php-tut__body">{s.body}</p>
        <p class="php-tut__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="php-tut__dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="php-tut__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? 'Start refracting' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
