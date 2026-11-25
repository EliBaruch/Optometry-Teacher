import { useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Button, Icon, useRegistry, useSignal } from '@ui-kit';
import { ACCENT } from '../controller';
import { REST_AFTER_CASES, casesToday, collectable, jarCapacity, ratePerHour, formatDuration, giftReady, grandSatchelHint, msUntilTomorrow, nextGift } from '../logic';
import { GiftBox } from './GiftBox';
import { GiftCalendar } from './GiftCalendar';
import { GiftReveal } from './GiftReveal';
import { Jar } from './Jar';
import { Portal } from './Portal';
import { WelcomeBack } from './WelcomeBack';
import { safePlay, useComfort, useNow } from './hooks';
import './comfort.css';

/**
 * Hub banner: tonight's gift (tap to open), the 7-evening calendar, and a
 * one-tap Continue that starts whatever suits the player best right now.
 * Also hosts the "Welcome back" note so it greets the player in the lobby.
 */
export function LoungeBanner(props: { services: GameServices }) {
  const { services } = props;
  const { ctl, state } = useComfort(services);
  const now = useNow(services, 30_000);
  useRegistry(services.registries.modes); // re-plan when modes register late
  useSignal(services.run.state); // …or a run starts / ends
  const [gift, setGift] = useState(false);
  if (!ctl) return null;

  const ready = giftReady(state, now);
  const next = nextGift(state);
  const plan = ctl.plan();
  const seen = casesToday(state, now);
  const rest = seen >= REST_AFTER_CASES;
  const jarCoins = collectable(state);

  const openGift = () => {
    safePlay(services, 'pop');
    setGift(true);
  };

  return (
    <section class="cf-banner" style={{ '--cf-accent': ACCENT }} aria-label="Lounge">
      <div class="cf-banner__glow" aria-hidden="true" />
      <button
        type="button"
        class={`cf-banner__gift ${ready ? 'is-ready' : ''}`}
        onClick={ready ? openGift : () => services.router.go('lounge')}
        aria-label={ready ? `Open tonight's gift: evening ${next.day}` : 'Visit the Lounge'}
      >
        <GiftBox phase={ready ? 'ready' : 'idle'} size={76} grand={next.day === 7} />
        {ready && <span class="cf-banner__ping" aria-hidden="true" />}
      </button>
      <div class="cf-banner__text">
        <div class="lm-eyebrow cf-banner__eyebrow">
          <Icon name="gift" size={12} /> Lounge
        </div>
        <h3 class="cf-banner__title">
          {ready ? (next.day === 7 ? 'The grand satchel is waiting' : 'Tonight’s gift is waiting') : rest ? 'A lovely place to pause' : 'The lamps are lit'}
        </h3>
        <p class="cf-banner__sub">
          {ready
            ? `Evening ${next.day} of 7 · ✦ ${next.coins}${next.satchel ? ' + satchel' : ''}`
            : rest
              ? `${seen} patients seen today. The clinic will keep — rest those eyes.`
              : `Next gift in ${formatDuration(msUntilTomorrow(now))}${jarCoins >= 1 ? ` · ✦ ${jarCoins} in the jar` : ''}`}
        </p>
        <div class="cf-banner__calrow">
          <GiftCalendar next={state.gift.next} ready={ready} totalClaims={state.gift.totalClaims} compact class="cf-banner__cal" />
          <span class="cf-banner__goal">
            <Icon name="crate" size={13} />
            {grandSatchelHint(state, ready)}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="cf-banner__jar"
        onClick={() => services.router.go('lounge')}
        aria-label={`Clinic jar: ${jarCoins} coins. Open the Lounge`}
      >
        <Jar fill={Math.min(1, state.jar / jarCapacity(state))} size={50} />
        <span class="cf-banner__jar-text">
          <span class="cf-banner__jar-k">Clinic jar</span>
          <span class="cf-banner__jar-v lm-num">✦ {jarCoins}</span>
          <span class="cf-banner__meter" aria-hidden="true">
            <span style={{ width: `${Math.round(Math.min(1, state.jar / jarCapacity(state)) * 100)}%` }} />
          </span>
          <span class="cf-banner__jar-rate lm-num">✦ {ratePerHour(state).toFixed(1)} / hour away</span>
        </span>
      </button>
      <div class="cf-banner__cta">
        {plan && (
          <Button
            variant="primary"
            size="lg"
            trailingIcon="arrow-right"
            onClick={() => ctl.resume()}
            sfx="door"
            class="cf-banner__continue"
            aria-label={`Continue: ${plan.title}`}
          >
            <span class="cf-banner__cta-text">
              <span class="cf-banner__cta-k">Continue</span>
              <span class="cf-banner__cta-v">{plan.title}</span>
            </span>
          </Button>
        )}
        {plan && <span class="cf-banner__cta-detail">{plan.detail}</span>}
      </div>
      <Portal>
        <GiftReveal services={services} open={gift} onClose={() => setGift(false)} />
        <WelcomeBack services={services} host="banner" />
      </Portal>
    </section>
  );
}
