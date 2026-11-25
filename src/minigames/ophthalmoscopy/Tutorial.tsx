import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Icon, type IconName } from '@ui-kit';

const KEY = 'lumen:ophthalmoscopy:tutorial-seen';

export function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

function markSeen() {
  try {
    localStorage.setItem(KEY, '1');
  } catch {
    /* private mode: the tutorial simply shows again */
  }
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'eye',
    title: 'Start with the red reflex',
    body: 'From arm’s length, shine the light into each pupil. A bright, even orange glow means clear media. Dull, absent or white tells you the view of the retina will be poor, and why.',
  },
  {
    icon: 'ophthalmoscopy',
    title: 'Explore the fundus',
    body: 'Drag (or use the arrow keys) to travel across the retina; wheel or + / − to zoom. Direct gives an upright, magnified, narrow view: turn the lens wheel until it is sharp. Indirect (20 D) is wide but upside down and reversed. The red-free filter makes bleeds and nerve-fibre defects pop.',
  },
  {
    icon: 'target',
    title: 'Tag what you find',
    body: 'Tap (or press Enter) to open the tag wheel. Tag the disc to estimate its cup-to-disc ratio, grade the vessels, mark each lesion type, and confirm a healthy macula. False tags cost points, so only mark what you can name.',
  },
];

export function Tutorial({ onClose, reducedMotion }: { onClose: () => void; reducedMotion: boolean }) {
  const [i, setI] = useState(0);
  const btn = useRef<HTMLDivElement>(null);
  const close = () => {
    markSeen();
    onClose();
  };
  useEffect(() => {
    btn.current?.querySelector('button')?.focus({ preventScroll: true });
  }, [i]);
  const step = STEPS[i]!;
  const last = i === STEPS.length - 1;
  return (
    <div
      class={`oph-tutorial${reducedMotion ? ' is-reduced' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="How ophthalmoscopy works"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div class="oph-tutorial__card" key={i}>
        <div class="oph-tutorial__icon"><Icon name={step.icon} size={26} /></div>
        <p class="oph-tutorial__step">Step {i + 1} of {STEPS.length}</p>
        <h3>{step.title}</h3>
        <p class="oph-tutorial__body">{step.body}</p>
        <div class="oph-tutorial__dots" aria-hidden="true">
          {STEPS.map((_, k) => <i key={k} class={k === i ? 'is-on' : ''} />)}
        </div>
        <div class="oph-tutorial__actions" ref={btn}>
          <Button variant="primary" sfx={false} onClick={() => (last ? close() : setI(i + 1))} data-testid="oph-tutorial-next">
            {last ? 'Begin' : 'Next'}
          </Button>
          {!last && <Button variant="ghost" sfx={false} onClick={close} data-testid="oph-tutorial-skip">Skip</Button>}
        </div>
      </div>
    </div>
  );
}
