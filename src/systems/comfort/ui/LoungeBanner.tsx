import { useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Button, Icon, useRegistry, useSignal, useStrings } from '@ui-kit';
import { ACCENT } from '../controller';
import { REST_AFTER_CASES, casesToday, collectable, jarCapacity, ratePerHour, formatDuration, giftReady, grandSatchelHint, msUntilTomorrow, nextGift } from '../logic';
import { S } from '../strings';
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
  const t = useStrings(S);
  const loc = services.locale;
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
    <section class="cf-banner" style={{ '--cf-accent': ACCENT }} aria-label={t.bannerLabel}>
      <div class="cf-banner__glow" aria-hidden="true" />
      <button
        type="button"
        class={`cf-banner__gift ${ready ? 'is-ready' : ''}`}
        onClick={ready ? openGift : () => services.router.go('lounge')}
        aria-label={ready ? t.openTonight(next.day) : t.visit}
      >
        <GiftBox phase={ready ? 'ready' : 'idle'} size={76} grand={next.day === 7} />
        {ready && <span class="cf-banner__ping" aria-hidden="true" />}
      </button>
      <div class="cf-banner__text">
        <div class="lm-eyebrow cf-banner__eyebrow">
          <Icon name="gift" size={12} /> {t.hubTitle}
        </div>
        <h3 class="cf-banner__title">
          {ready ? (next.day === 7 ? t.titleGrand : t.titleReady) : rest ? t.titleRest : t.titleLamps}
        </h3>
        <p class="cf-banner__sub">
          {ready
            ? t.subReady(next.day, next.coins, next.satchel)
            : rest
              ? t.subRest(seen)
              : t.subNext(formatDuration(msUntilTomorrow(now), loc), jarCoins)}
        </p>
        <div class="cf-banner__calrow">
          <GiftCalendar next={state.gift.next} ready={ready} totalClaims={state.gift.totalClaims} compact class="cf-banner__cal" />
          <span class="cf-banner__goal">
            <Icon name="crate" size={13} />
            {grandSatchelHint(state, ready, loc)}
          </span>
        </div>
      </div>
      <button
        type="button"
        class="cf-banner__jar"
        onClick={() => services.router.go('lounge')}
        aria-label={t.jarAria(jarCoins)}
      >
        <Jar fill={Math.min(1, state.jar / jarCapacity(state))} size={50} />
        <span class="cf-banner__jar-text">
          <span class="cf-banner__jar-k">{t.jarK}</span>
          <span class="cf-banner__jar-v lm-num">✦ {jarCoins}</span>
          <span class="cf-banner__meter" aria-hidden="true">
            <span style={{ width: `${Math.round(Math.min(1, state.jar / jarCapacity(state)) * 100)}%` }} />
          </span>
          <span class="cf-banner__jar-rate lm-num">{t.jarRate(ratePerHour(state).toFixed(1))}</span>
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
            aria-label={t.continueAria(plan.title)}
          >
            <span class="cf-banner__cta-text">
              <span class="cf-banner__cta-k">{t.continue}</span>
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
