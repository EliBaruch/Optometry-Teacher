import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Icon } from '@ui-kit';
import type { Locale } from '@core';
import { T } from './strings';

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

export function Tutorial({ onClose, reducedMotion, locale = 'en' }: { onClose: () => void; reducedMotion: boolean; locale?: Locale }) {
  const t = T(locale);
  const STEPS = t.tutSteps;
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
      aria-label={t.tutAria}
      onKeyDown={(e) => {
        if (e.key === 'Escape') {
          e.stopPropagation();
          close();
        }
      }}
    >
      <div class="amsler-tutorial__card" key={i}>
        <div class="amsler-tutorial__icon"><Icon name={step.icon} size={26} /></div>
        <p class="amsler-tutorial__step">{t.tutStep(i + 1, STEPS.length)}</p>
        <h3>{step.title}</h3>
        <p class="amsler-tutorial__body">{step.body}</p>
        <div class="amsler-tutorial__dots" aria-hidden="true">
          {STEPS.map((_, k) => <i key={k} class={k === i ? 'is-on' : ''} />)}
        </div>
        <div class="amsler-tutorial__actions" ref={btn}>
          <Button variant="primary" sfx={false} onClick={() => (last ? close() : setI(i + 1))} data-testid="amsler-tutorial-next">
            {last ? t.begin : t.next}
          </Button>
          {!last && <Button variant="ghost" sfx={false} onClick={close} data-testid="amsler-tutorial-skip">{t.skip}</Button>}
        </div>
      </div>
    </div>
  );
}
