import { useState } from 'preact/hooks';
import { Button, Kbd } from '@ui-kit';

const STEPS = [
  { title: 'Numb, then stain', body: 'Instil one drop of anaesthetic, then touch a fluorescein strip to the lower lid. Aim for fine green mires about a tenth of the ring diameter wide. Too much dye reads low, too little reads high. (The iCare needs neither.)', keys: ['Hold F'] },
  { title: 'Centre the mires', body: 'Under cobalt blue light the dye glows green. Push the joystick until the ring sits in the gold target, so the two semicircles are equal. The patient drifts and blinks, so keep correcting.', keys: ['W', 'A', 'S', 'D'] },
  { title: 'Kiss the arcs', body: 'Turn the drum until the INNER edges of the semicircles just touch in an S. Apart means too little force, overlapping means too much. The mires pulse with the heartbeat: read at the middle of the swing, then lock the reading.', keys: ['←', '→', 'L'] },
];

export function Tutorial(props: { onClose: () => void }) {
  const [i, setI] = useState(0);
  const s = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <div class="tn-overlay" role="dialog" aria-modal="true" aria-labelledby="tn-tut-title">
      <div class="tn-card" key={i}>
        <p class="tn-eyebrow">The tonometer · {i + 1}/{STEPS.length}</p>
        <h3 id="tn-tut-title" class="tn-card__title">{s.title}</h3>
        <p class="tn-card__body">{s.body}</p>
        <p class="tn-card__keys">{s.keys.map((k) => <Kbd key={k}>{k}</Kbd>)}</p>
        <div class="tn-dots" aria-hidden="true">{STEPS.map((_, j) => <span key={j} class={j === i ? 'is-on' : ''} />)}</div>
        <div class="tn-card__actions">
          <Button variant="ghost" size="sm" sfx={false} onClick={props.onClose}>Skip</Button>
          <Button variant="primary" size="sm" sfx={false} trailingIcon={last ? 'check' : 'arrow-right'} onClick={() => (last ? props.onClose() : setI(i + 1))} autoFocus>
            {last ? 'Start measuring' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
}
