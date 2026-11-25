import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Icon, type IconName } from '@ui-kit';

const KEY = 'lumen:visual-fields:tutorial-seen';

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
    /* private mode — the tutorial simply shows again */
  }
}

const STEPS: { icon: IconName; title: string; body: string }[] = [
  {
    icon: 'visual-fields',
    title: 'Eye on the amber light',
    body: 'One eye patched, chin on the rest, gaze locked on the fixation light. Every point you choose flashes a tiny white stimulus; the patient presses the buzzer when they see it.',
  },
  {
    icon: 'target',
    title: 'Probe like a perimetrist',
    body: 'Threshold runs a 4-2 dB staircase for a true sensitivity; Screen is one quick flash brighter than normal. Spread your probes across all four quadrants and chase the edges. Every eye has a blind spot 15° temporally.',
  },
  {
    icon: 'eye',
    title: 'Read the printout',
    body: 'Dark squares are lost sensitivity. Name each eye’s pattern, then combine both eyes: which meridian does it respect, and where along the pathway is the lesion?',
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
      class={`vf-tutorial${reducedMotion ? ' is-reduced' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="How the visual field test works"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div class="vf-tutorial__card" key={i}>
        <div class="vf-tutorial__icon"><Icon name={step.icon} size={26} /></div>
        <p class="vf-tutorial__step">Step {i + 1} of {STEPS.length}</p>
        <h3>{step.title}</h3>
        <p class="vf-tutorial__body">{step.body}</p>
        <div class="vf-tutorial__dots" aria-hidden="true">
          {STEPS.map((_, k) => <i key={k} class={k === i ? 'is-on' : ''} />)}
        </div>
        <div class="vf-tutorial__actions" ref={btn}>
          <Button variant="primary" sfx={false} onClick={() => (last ? close() : setI(i + 1))} data-testid="vf-tutorial-next">
            {last ? 'Begin' : 'Next'}
          </Button>
          {!last && <Button variant="ghost" sfx={false} onClick={close} data-testid="vf-tutorial-skip">Skip</Button>}
        </div>
      </div>
    </div>
  );
}
