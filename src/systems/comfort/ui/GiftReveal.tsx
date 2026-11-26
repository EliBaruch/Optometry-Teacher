import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Button, CountUp, Modal, RARITY_COLOR, useReducedMotion, useStrings } from '@ui-kit';
import { ACCENT } from '../controller';
import { GIFT_CALENDAR, nextGift, satchelOdds, skillOf, type GiftResult } from '../logic';
import { S } from '../strings';
import { GiftBox, type GiftPhase } from './GiftBox';
import { GiftCalendar } from './GiftCalendar';
import { centerOf, safePlay, useComfort } from './hooks';

const SHAKE_MS = 900;

/** Centre of an element inside the reveal, or a point `dy` below the box as a fallback. */
function below(sel: string, box: { x: number; y: number }, dy: number): { x: number; y: number } {
  const el = typeof document !== 'undefined' ? document.querySelector(`.cf-reveal ${sel}`) : null;
  return el ? centerOf(el) : { x: box.x, y: box.y + dy };
}

/**
 * Opening tonight's gift: the box wobbles, the lid springs off with a flash of
 * light, coins count up and (on evenings 3 and 7) a satchel reveals its rarity.
 * The reward is claimed the moment the player taps Open, so closing early never loses it.
 */
export function GiftReveal(props: { services: GameServices; open: boolean; onClose: () => void }) {
  const { services } = props;
  const t = useStrings(S);
  const { ctl, state } = useComfort(services);
  const reduced = useReducedMotion();
  const [phase, setPhase] = useState<GiftPhase>('ready');
  const [result, setResult] = useState<GiftResult | null>(null);
  const boxRef = useRef<HTMLButtonElement>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  useEffect(() => {
    if (props.open) {
      setPhase('ready');
      setResult(null);
    }
  }, [props.open]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  // Keep keyboard focus on the dialog's action as the footer button swaps.
  useEffect(() => {
    if (phase !== 'open') return;
    const raf = requestAnimationFrame(() => document.querySelector<HTMLElement>('.cf-reveal .cf-reveal__cta')?.focus());
    return () => cancelAnimationFrame(raf);
  }, [phase]);

  const day = result?.day ?? nextGift(state);
  const label = t.giftLabels[day.day - 1] ?? day.label;
  const odds = satchelOdds(skillOf(state), day.day === 7);

  const later = (ms: number, fn: () => void) => timers.current.push(setTimeout(fn, reduced ? 0 : ms));

  const open = () => {
    if (!ctl || phase !== 'ready') return;
    const r = ctl.openGift();
    if (!r) {
      props.onClose();
      return;
    }
    setResult(r);
    setPhase('shaking');
    safePlay(services, 'drumroll', { volume: 0.5 });
    later(SHAKE_MS, () => {
      setPhase('open');
      const c = centerOf(boxRef.current);
      safePlay(services, 'chest-open');
      services.fx.flash('#ffffff', 160);
      // Light sparks from the open box; the heavy coin shower rises from the
      // counter below it so the dialog title stays readable.
      services.fx.burst(c.x, c.y + 10, { kind: 'sparks', count: 24, color: ACCENT });
      later(140, () => {
        const n = below('.cf-reveal__coins', c, 90);
        services.fx.burst(n.x, n.y, { kind: 'coins', count: 22 });
      });
      later(380, () => safePlay(services, 'coins'));
      if (r.satchel) {
        const rare = r.satchel.rarity === 'legendary' ? 'legendary' : r.satchel.rarity === 'common' ? 'sparkle' : 'rare';
        later(900, () => {
          safePlay(services, rare);
          const sc = below('.cf-reveal__satchel', c, 150);
          services.fx.burst(sc.x, sc.y, { kind: 'stars', count: r.satchel!.rarity === 'common' ? 12 : 32, color: RARITY_COLOR[r.satchel!.rarity] });
          if (r.satchel!.rarity === 'legendary') services.fx.shake(4, 260);
        });
      }
    });
  };

  return (
    <Modal
      open={props.open}
      onClose={props.onClose}
      eyebrow={t.eveningOf(day.day, GIFT_CALENDAR.length)}
      title={result ? (day.satchel ? label : t.tonightGift) : t.giftWaiting}
      icon="gift"
      accent={ACCENT}
      size="sm"
      class="cf-reveal"
      initialFocus=".cf-reveal__cta"
      footer={
        phase === 'open' ? (
          <Button variant="primary" block icon="check" onClick={props.onClose} sfx="select" class="cf-reveal__cta">
            {t.thanks}
          </Button>
        ) : (
          <Button variant="primary" block icon="gift" onClick={open} disabled={phase !== 'ready' || !ctl} sfx={false} class="cf-reveal__cta">
            {phase === 'shaking' ? t.opening : t.openGift}
          </Button>
        )
      }
    >
      <div class="cf-reveal__stage">
        <button ref={boxRef} type="button" class="cf-reveal__box" onClick={open} aria-label={t.openGift} disabled={phase !== 'ready'} tabIndex={-1}>
          <GiftBox phase={phase} size={168} grand={day.day === 7} />
        </button>
        {result && phase === 'open' ? (
          <div class="cf-reveal__loot" aria-live="polite">
            <div class="cf-reveal__coins">
              <span class="cf-reveal__glyph">✦</span>
              <CountUp value={result.total} from={0} delay={reduced ? 0 : 120} tickSfx="tick" class="cf-reveal__num" />
              <span class="cf-reveal__unit">{t.unit}</span>
            </div>
            {result.satchel && (
              <div class="cf-reveal__satchel" style={{ '--rc': RARITY_COLOR[result.satchel.rarity] }}>
                <span>{t.satchelOf(t.rarity[result.satchel.rarity])}</span>
                <strong class="lm-num"><bdi dir="ltr">+{result.satchel.coins}</bdi></strong>
              </div>
            )}
            {!day.satchel && <p class="cf-reveal__flavour">{label}</p>}
            <p class="cf-reveal__note">{t.nextTomorrow}</p>
          </div>
        ) : (
          <div class="cf-reveal__preview">
            <p>
              <strong class="lm-num">✦ {day.coins}</strong> {t.unit}
              {day.satchel && <>{t.mystery}</>}
            </p>
            {!day.satchel && <p class="cf-reveal__flavour">{label}</p>}
            {day.satchel && (
              <p class="cf-reveal__odds" aria-label={t.oddsAria}>
                {(['common', 'rare', 'epic', 'legendary'] as const).map((r) => (
                  <span key={r} style={{ color: RARITY_COLOR[r] }}>
                    {t.oddsPct(t.rarity[r], Math.round(odds[r] * 100))}
                  </span>
                ))}
                <em>{t.sharper}</em>
              </p>
            )}
          </div>
        )}
      </div>
      <GiftCalendar next={state.gift.next} ready={phase === 'ready' && !result} totalClaims={state.gift.totalClaims} compact />
    </Modal>
  );
}
