import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Icon, useSfx } from '@ui-kit';
import { INTRO_CARDS } from './logic';

export interface IntroProps {
  onDone: () => void;
}

/** First-visit orientation: three elegant cards. Enter/→ advance, Esc skips. */
export function Intro({ onDone }: IntroProps) {
  const [i, setI] = useState(0);
  const play = useSfx();
  const nextRef = useRef<HTMLButtonElement>(null);
  const last = i === INTRO_CARDS.length - 1;
  const card = INTRO_CARDS[i]!;

  const next = () => {
    if (last) {
      play('reveal');
      onDone();
    } else {
      play('whoosh');
      setI(i + 1);
    }
  };
  const skip = () => {
    play('back');
    onDone();
  };

  useEffect(() => {
    nextRef.current?.focus();
  }, [i]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        skip();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        next();
      } else if (e.key === 'ArrowLeft' && i > 0) {
        e.preventDefault();
        setI(i - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div class="ttl-intro" role="dialog" aria-modal="true" aria-label="Welcome to Lumen">
      <div class="ttl-intro__card" key={i}>
        <div class="ttl-intro__icon"><Icon name={card.icon} size={30} /></div>
        <div class="lm-eyebrow">{card.eyebrow}</div>
        <h2>{card.title}</h2>
        <p>{card.body}</p>
        {'steps' in card && card.steps && (
          <ol class="ttl-intro__steps">
            {card.steps.map((s, n) => (
              <li key={s} style={{ '--n': n } as never}>
                <span class="lm-num">{n + 1}</span>
                {s}
              </li>
            ))}
          </ol>
        )}
      </div>
      <div class="ttl-intro__foot">
        <div class="ttl-intro__dots" aria-label={`Step ${i + 1} of ${INTRO_CARDS.length}`}>
          {INTRO_CARDS.map((_, n) => <i key={n} class={n === i ? 'is-on' : ''} />)}
        </div>
        <div class="ttl-intro__btns">
          <Button variant="ghost" size="sm" onClick={skip} sfx={false}>Skip</Button>
          <button ref={nextRef} type="button" class="ttl-intro__next" onClick={next}>
            {last ? 'Begin' : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
