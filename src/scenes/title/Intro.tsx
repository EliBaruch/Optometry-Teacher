import { useEffect, useRef, useState } from 'preact/hooks';
import { Button, Icon, useFocusTrap, useLocale, useSfx, useStrings } from '@ui-kit';
import { introCards } from './logic';
import { S } from './strings';

export interface IntroProps {
  onDone: () => void;
}

/** First-visit orientation: three elegant cards. Enter/→ advance, Esc skips. */
export function Intro({ onDone }: IntroProps) {
  const t = useStrings(S);
  const locale = useLocale();
  const rtl = locale === 'he';
  const INTRO_CARDS = introCards(locale);
  const [i, setI] = useState(0);
  const play = useSfx();
  const rootRef = useRef<HTMLDivElement>(null);
  const doneRef = useRef(false);
  useFocusTrap(rootRef, true, '.ttl-intro__next');
  const last = i === INTRO_CARDS.length - 1;
  const card = INTRO_CARDS[i]!;

  const finish = () => {
    if (doneRef.current) return; // exactly once, however many keys/clicks arrive
    doneRef.current = true;
    onDone();
  };
  const next = () => {
    if (last) {
      play('reveal');
      finish();
    } else {
      play('whoosh');
      setI(i + 1);
    }
  };
  const skip = () => {
    play('back');
    finish();
  };

  const act = useRef({ next, skip, i, rtl });
  act.current = { next, skip, i, rtl };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const a = act.current;
      if (e.key === 'Escape') {
        e.preventDefault();
        a.skip();
      } else if (e.key === (a.rtl ? 'ArrowLeft' : 'ArrowRight')) {
        e.preventDefault();
        a.next();
      } else if (e.key === (a.rtl ? 'ArrowRight' : 'ArrowLeft') && a.i > 0) {
        e.preventDefault();
        setI(a.i - 1);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div ref={rootRef} class="ttl-intro" role="dialog" aria-modal="true" aria-label={t.introLabel}>
      <div class="ttl-intro__card" key={i}>
        <div class="ttl-intro__icon"><Icon name={card.icon} size={30} /></div>
        <div class="lm-eyebrow">{card.eyebrow}</div>
        <h2>{card.title}</h2>
        <p>{card.body}</p>
        {card.steps && (
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
        <div class="ttl-intro__dots" aria-label={t.step(i + 1, INTRO_CARDS.length)}>
          {INTRO_CARDS.map((_, n) => <i key={n} class={n === i ? 'is-on' : ''} />)}
        </div>
        <div class="ttl-intro__btns">
          <Button variant="ghost" size="sm" onClick={skip} sfx={false}>{t.skip}</Button>
          <button type="button" class="ttl-intro__next" onClick={next}>
            {last ? t.begin : t.next}
          </button>
        </div>
      </div>
    </div>
  );
}
