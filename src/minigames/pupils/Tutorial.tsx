import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';

const STEPS = [
  { title: 'Size the pupils', body: 'Switch the room lights on, then slide the half-circle gauge until its edge meets the pupil. Press Record size. Repeat in the dim room with the light held away from the eyes, and give the pupils a few seconds to settle.', keys: ['B', '+', '-', 'Enter'] },
  { title: 'Swing the light', body: 'In the dim room drag the penlight onto one eye and hold it about 3 seconds. Then swing briskly to the other eye along an even path. A healthy pair stays constricted. If the pupils dilate when the light reaches one eye, that eye has an afferent defect.', keys: ['←', '→', 'Space'] },
  { title: 'Near target, then call it', body: 'Bring in the near target: eyes converge and pupils should constrict. Poor reaction to light with a good near response is light-near dissociation. Finally call the RAPD (side and grade) and record your findings.', keys: ['N'] },
];

export function Tutorial(props: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <div class="pu-overlay" role="dialog" aria-modal="true" aria-labelledby="pu-tut-title">
      <div class="pu-card" key={i}>
        <p class="pu-eyebrow">The pupil exam · {i + 1}/{STEPS.length}</p>
        <h3 id="pu-tut-title" class="pu-card__title">{s.title}</h3>
        <p class="pu-card__body">{s.body}</p>
        <p class="pu-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="pu-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="pu-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? 'Begin exam' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
