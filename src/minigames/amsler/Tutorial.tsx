import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Icon, type IconName } from '@ui-kit';

const KEY = 'lumen:amsler:tutorial-seen';

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
    icon: 'eye',
    title: 'One eye at a time',
    body: 'Near glasses on, card at 33 cm, the other eye covered. Each square is 1° — the whole grid is the central 20° of vision.',
  },
  {
    icon: 'target',
    title: 'Eyes on the dot',
    body: 'Ask the patient to fixate the centre dot. You will see the grid through their eye: wavy lines are metamorphopsia; a missing or grey patch is a scotoma.',
  },
  {
    icon: 'amsler',
    title: 'Map it, name it',
    body: 'Paint over the affected area (drag, or arrows + Space), choose what they report, then test the other eye and record.',
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
      class={`amsler-tutorial${reducedMotion ? ' is-reduced' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="How the Amsler grid works"
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div class="amsler-tutorial__card" key={i}>
        <div class="amsler-tutorial__icon"><Icon name={step.icon} size={26} /></div>
        <p class="amsler-tutorial__step">Step {i + 1} of {STEPS.length}</p>
        <h3>{step.title}</h3>
        <p class="amsler-tutorial__body">{step.body}</p>
        <div class="amsler-tutorial__dots" aria-hidden="true">
          {STEPS.map((_, k) => <i key={k} class={k === i ? 'is-on' : ''} />)}
        </div>
        <div class="amsler-tutorial__actions" ref={btn}>
          <Button variant="primary" sfx={false} onClick={() => (last ? close() : setI(i + 1))} data-testid="amsler-tutorial-next">
            {last ? 'Begin' : 'Next'}
          </Button>
          {!last && <Button variant="ghost" sfx={false} onClick={close} data-testid="amsler-tutorial-skip">Skip</Button>}
        </div>
      </div>
    </div>
  );
}
