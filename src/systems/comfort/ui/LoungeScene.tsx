import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dayKey, type SceneProps } from '@core';
import {
  Button, CountUp, GlassPanel, IconButton, ProgressBar, Screen, useReducedMotion, useRegistry, useStrings,
} from '@ui-kit';
import { ACCENT } from '../controller';
import {
  EARN_CAP_HOURS, REST_AFTER_CASES, casesToday, formatDuration, giftReady, jarCapacity, msUntilTomorrow, nextGift,
  collectable, ratePerHour, salutation, skillOf,
} from '../logic';
import { pearlsFor } from '../pearls';
import { S } from '../strings';
import { GiftBox } from './GiftBox';
import { GiftCalendar } from './GiftCalendar';
import { GiftReveal } from './GiftReveal';
import { Jar } from './Jar';
import { LoungeArt } from './LoungeArt';
import { Portal } from './Portal';
import { WelcomeBack } from './WelcomeBack';
import { centerOf, playerName, safePlay, useComfort, useNow } from './hooks';
import './comfort.css';
import './lounge.css';

function useNarrow(): boolean {
  const q = '(max-width: 720px)';
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia(q).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(q);
    const on = () => setNarrow(mq.matches);
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);
  return narrow;
}

export function LoungeScene({ services }: SceneProps) {
  const t = useStrings(S);
  const loc = services.locale;
  const { ctl, state } = useComfort(services);
  const now = useNow(services, 30_000);
  const reduced = useReducedMotion();
  const diagnoses = useRegistry(services.registries.diagnoses);
  const [gift, setGift] = useState(false);
  const [lampOn, setLampOn] = useState(true);
  const [sip, setSip] = useState(0);
  const [pet, setPet] = useState(0);
  const [tip, setTip] = useState(0);
  const jarRef = useRef<HTMLDivElement>(null);
  const quiet = state.quiet;
  const narrow = useNarrow();

  // Quiet mode: the lounge plays the zen track; otherwise the lobby music.
  useEffect(() => {
    try {
      services.audio.music(quiet ? 'zen' : 'hub');
    } catch {
      /* ignore */
    }
  }, [quiet]);

  const pearls = useMemo(() => pearlsFor(diagnoses, services.learning, dayKey(now)), [diagnoses, dayKey(now)]);
  const pearl = pearls.length ? pearls[((tip % pearls.length) + pearls.length) % pearls.length] : null;

  const back = () => (services.registries.scenes.has('hub') ? services.router.go('hub') : services.router.back());
  if (!ctl) {
    return (
      <Screen title={t.hubTitle} onBack={back} escToBack backdrop="calm">
        <p class="lm-muted">{t.closed}</p>
      </Screen>
    );
  }

  const ready = giftReady(state, now);
  const next = nextGift(state);
  const rate = ratePerHour(state);
  const cap = jarCapacity(state);
  const coins = collectable(state);
  const skill = skillOf(state);
  const plan = ctl.plan();
  const seen = casesToday(state, now);

  const collect = () => {
    const c = centerOf(jarRef.current);
    const paid = ctl.collectEarnings();
    if (paid <= 0) return;
    safePlay(services, 'coins');
    services.fx.burst(c.x, c.y - 30, { kind: 'coins', count: Math.min(36, 8 + Math.round(paid / 5)) });
    services.fx.floatText(`+${paid} ✦`, c.x, c.y - 70, { color: '#f5a524', size: 32 });
  };

  const toggleQuiet = () => {
    safePlay(services, quiet ? 'select' : 'whoosh', { volume: 0.5 });
    ctl.setQuiet(!quiet);
  };

  return (
    <Screen
      eyebrow={t.restEyebrow}
      title={t.sceneTitle}
      onBack={back}
      escToBack
      backdrop="calm"
      class="cf-lounge"
      right={
        <button
          type="button"
          role="switch"
          aria-checked={quiet}
          aria-label={t.quietAria}
          title={t.quietAria}
          class={`cf-quiet ${quiet ? 'is-on' : ''}`}
          onClick={toggleQuiet}
        >
          <span class="cf-quiet__track" aria-hidden="true">
            <span class="cf-quiet__thumb">
              <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden="true">
                <path d="M11.5 10.6A5 5 0 0 1 6.4 3a5 5 0 1 0 6.6 6.9 5 5 0 0 1-1.5.7z" fill="currentColor" />
              </svg>
            </span>
          </span>
          <span class="cf-quiet__label" aria-hidden="true">{t.quietLabel}</span>
        </button>
      }
    >
      <div class="cf-lounge__wrap">
        <section class="cf-hero" aria-label={t.sceneTitle}>
          <LoungeArt
            lampOn={lampOn}
            sip={sip}
            pet={pet}
            quiet={quiet}
            align={narrow ? 'right' : 'center'}
            class={reduced ? 'is-reduced' : undefined}
            onLamp={() => {
              safePlay(services, 'click');
              setLampOn((v) => !v);
            }}
            onCoffee={(p) => {
              safePlay(services, 'pop', { pitch: 0.8, volume: 0.6 });
              setSip((n) => n + 1);
              services.fx.floatText(t.ahh, p.x, p.y - 30, { color: '#2257f0', size: 20 });
            }}
            onCat={(p) => {
              safePlay(services, 'sparkle', { volume: 0.5 });
              setPet((n) => n + 1);
              services.fx.burst(p.x, p.y - 20, { kind: 'hearts', count: 7, color: '#ff6ec7' });
            }}
          />
          <div class="cf-hero__shade" aria-hidden="true" />
          <div class="cf-hero__copy">
            <p class="lm-eyebrow">{salutation(new Date(now).getHours(), loc)}{playerName(services) ? `, ${playerName(services)}` : ''}</p>
            <h2 class="cf-hero__title">{t.heroTitle}</h2>
            {seen >= REST_AFTER_CASES ? (
              <p class="cf-hero__sub">{t.heroDone(seen)}</p>
            ) : (
              <p class="cf-hero__sub">{t.heroSub}</p>
            )}
            {plan && (
              <Button variant="primary" size="lg" trailingIcon="arrow-right" onClick={() => ctl.resume()} sfx="door" class="cf-hero__cta">
                {t.continueDot(plan.title)}
              </Button>
            )}
          </div>
        </section>

        <div class="cf-grid">
          <GlassPanel class="cf-card cf-card--gift" accent={ACCENT} glow={ready} eyebrow={t.dailyGift} title={ready ? t.eveningReady(next.day) : t.openedToday} icon="gift">
            <div class="cf-card__gift">
              <button
                type="button"
                class="cf-card__giftbtn"
                onClick={() => (ready ? setGift(true) : safePlay(services, 'tick'))}
                aria-label={ready ? t.openEveningAria(next.day) : t.openedAria}
                aria-disabled={!ready}
              >
                <GiftBox phase={ready ? 'ready' : 'idle'} size={112} grand={next.day === 7} />
              </button>
              <div>
                <p class="cf-card__big lm-num">✦ {next.coins}{next.satchel && <small>{t.plusSatchel}</small>}</p>
                <p class="cf-card__flavour">{t.giftLabels[next.day - 1] ?? next.label}</p>
                <p class="lm-muted cf-card__small">
                  {ready ? t.tapBox : t.nextIn(formatDuration(msUntilTomorrow(now), loc))}{t.neverReset}
                </p>
              </div>
            </div>
            <GiftCalendar next={state.gift.next} ready={ready} totalClaims={state.gift.totalClaims} />
          </GlassPanel>

          <GlassPanel class="cf-card cf-card--jar" accent="#d97706" eyebrow={t.whileAway} title={t.earnings} icon="coin">
            <div class="cf-card__jarrow">
              <div ref={jarRef} class="cf-card__jar">
                <Jar fill={cap > 0 ? state.jar / cap : 0} size={118} />
              </div>
              <div class="cf-card__jarinfo">
                <p class="cf-card__big lm-num">
                  ✦ <CountUp value={coins} />
                </p>
                <p class="lm-muted cf-card__small">
                  {state.bonus > 0 && (
                    <span class="cf-card__kept">
                      {t.keptSafe(state.bonus)}
                    </span>
                  )}
                  {t.earnA}<strong class="lm-num cf-nowrap">{t.earnRate(rate.toFixed(1))}</strong>{t.earnB(EARN_CAP_HOURS)}
                </p>
                <Button variant="primary" icon="coin" onClick={collect} disabled={coins < 1} sfx={false} class="cf-card__collect">
                  {coins >= 1 ? t.collect : t.jarFilling}
                </Button>
              </div>
            </div>
            <ProgressBar
              value={skill}
              max={1}
              accent={ACCENT}
              size="sm"
              label={t.teamSkill}
              valueText={state.recent.length ? `${Math.round(skill * 100)}%` : t.noCases}
              ariaLabel={t.skillAria}
            />
            <p class="lm-muted cf-card__tiny">{t.skillNote}</p>
          </GlassPanel>

          <GlassPanel
            class="cf-card cf-card--pearl"
            accent="#7c3aed"
            eyebrow={t.pearlEyebrow}
            title={pearl?.diagnosisName ?? t.pearlsTitle}
            icon="sparkle"
            actions={
              pearls.length > 1 && (
                <div class="cf-card__nav">
                  <IconButton icon="chevron-left" label={t.prevPearl} variant="ghost" class="cf-card__navbtn" onClick={() => setTip((n) => n - 1)} />
                  <IconButton icon="chevron-right" label={t.nextPearl} variant="ghost" class="cf-card__navbtn" onClick={() => setTip((n) => n + 1)} />
                </div>
              )
            }
          >
            {pearl ? (
              <figure class="cf-pearl" key={pearl.diagnosisId + tip} aria-live="polite">
                <span class={`cf-pearl__tag cf-pearl__tag--${pearl.reason}`}>{t.reason[pearl.reason]}</span>
                <blockquote class="cf-pearl__text">{pearl.text}</blockquote>
                <figcaption class="lm-muted cf-card__tiny">
                  {t.ofN(((tip % pearls.length) + pearls.length) % pearls.length + 1, pearls.length)}
                </figcaption>
              </figure>
            ) : (
              <p class="lm-muted">{t.noPearls}</p>
            )}
          </GlassPanel>
        </div>
      </div>
      <Portal>
        <GiftReveal services={services} open={gift} onClose={() => setGift(false)} />
        <WelcomeBack services={services} host="scene" />
      </Portal>
    </Screen>
  );
}
