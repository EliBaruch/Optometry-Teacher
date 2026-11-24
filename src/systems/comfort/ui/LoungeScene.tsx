import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { dayKey, type SceneProps } from '@core';
import {
  Button, CountUp, GlassPanel, IconButton, ProgressBar, Screen, useReducedMotion, useRegistry,
} from '@ui-kit';
import { ACCENT } from '../controller';
import {
  EARN_CAP_HOURS, REST_AFTER_CASES, casesToday, formatDuration, giftReady, jarCapacity, msUntilTomorrow, nextGift,
  ratePerHour, skillOf,
} from '../logic';
import { pearlsFor } from '../pearls';
import { GiftBox } from './GiftBox';
import { GiftCalendar } from './GiftCalendar';
import { GiftReveal } from './GiftReveal';
import { Jar } from './Jar';
import { LoungeArt } from './LoungeArt';
import { Portal } from './Portal';
import { WelcomeBack } from './WelcomeBack';
import { centerOf, doctorName, safePlay, useComfort, useNow } from './hooks';
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

const REASON_LABEL = { review: 'Due for review', seen: 'From your cases', discover: 'New to you' } as const;

export function LoungeScene({ services }: SceneProps) {
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
      <Screen title="Lounge" onBack={back} escToBack backdrop="calm">
        <p class="lm-muted">The lounge is closed tonight.</p>
      </Screen>
    );
  }

  const ready = giftReady(state, now);
  const next = nextGift(state);
  const rate = ratePerHour(state);
  const cap = jarCapacity(state);
  const coins = Math.floor(state.jar);
  const skill = skillOf(state);
  const plan = ctl.plan();
  const seen = casesToday(state, now);

  const collect = () => {
    const c = centerOf(jarRef.current);
    const paid = ctl.collectEarnings();
    if (paid <= 0) return;
    safePlay(services, 'coins');
    services.fx.burst(c.x, c.y - 30, { kind: 'coins', count: Math.min(36, 8 + Math.round(paid / 5)) });
    services.fx.floatText(`+${paid} ✦`, c.x, c.y - 70, { color: '#ffd27a', size: 32 });
  };

  const toggleQuiet = () => {
    safePlay(services, quiet ? 'select' : 'whoosh', { volume: 0.5 });
    ctl.setQuiet(!quiet);
  };

  return (
    <Screen
      eyebrow="Rest a moment"
      title="The Lounge"
      onBack={back}
      escToBack
      backdrop="calm"
      class="cf-lounge"
      right={
        <button type="button" role="switch" aria-checked={quiet} class={`cf-quiet ${quiet ? 'is-on' : ''}`} onClick={toggleQuiet}>
          <span class="cf-quiet__track" aria-hidden="true">
            <span class="cf-quiet__thumb" />
          </span>
          <span class="cf-quiet__label">Quiet mode</span>
        </button>
      }
    >
      <div class="cf-lounge__wrap">
        <section class="cf-hero" aria-label="The Lounge">
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
              services.fx.floatText('ahh', p.x, p.y - 30, { color: '#f6efe4', size: 20 });
            }}
            onCat={(p) => {
              safePlay(services, 'sparkle', { volume: 0.5 });
              setPet((n) => n + 1);
              services.fx.burst(p.x, p.y - 20, { kind: 'hearts', count: 7, color: '#f9a8d4' });
            }}
          />
          <div class="cf-hero__shade" aria-hidden="true" />
          <div class="cf-hero__copy">
            <p class="lm-eyebrow">Evening, {doctorName(services)}</p>
            <h2 class="cf-hero__title">Kick off your shoes. The rain will keep.</h2>
            {seen >= REST_AFTER_CASES ? (
              <p class="cf-hero__sub">{seen} patients today — that is a full, good day. Stopping here is a fine choice.</p>
            ) : (
              <p class="cf-hero__sub">Open tonight’s gift, collect what the clinic earned, and pick up a pearl before your next patient.</p>
            )}
            {plan && (
              <Button variant="primary" size="lg" trailingIcon="arrow-right" onClick={() => ctl.resume()} sfx="door" class="cf-hero__cta">
                Continue · {plan.title}
              </Button>
            )}
          </div>
        </section>

        <div class="cf-grid">
          <GlassPanel class="cf-card cf-card--gift" accent={ACCENT} glow={ready} eyebrow="Daily gift" title={ready ? `Evening ${next.day} is ready` : 'Opened for today'} icon="gift">
            <div class="cf-card__gift">
              <button
                type="button"
                class="cf-card__giftbtn"
                onClick={() => (ready ? setGift(true) : safePlay(services, 'tick'))}
                aria-label={ready ? `Open the gift for evening ${next.day}` : 'Today’s gift is already opened'}
                aria-disabled={!ready}
              >
                <GiftBox phase={ready ? 'ready' : 'idle'} size={112} grand={next.day === 7} />
              </button>
              <div>
                <p class="cf-card__big lm-num">✦ {next.coins}{next.satchel && <small> + satchel</small>}</p>
                <p class="lm-muted cf-card__small">
                  {ready ? 'Tap the box to open it.' : `Next gift in ${formatDuration(msUntilTomorrow(now))}.`} Missed evenings never reset the calendar.
                </p>
              </div>
            </div>
            <GiftCalendar next={state.gift.next} ready={ready} totalClaims={state.gift.totalClaims} />
          </GlassPanel>

          <GlassPanel class="cf-card cf-card--jar" accent="#ffd27a" eyebrow="While you’re away" title="Clinic earnings" icon="coin">
            <div class="cf-card__jarrow">
              <div ref={jarRef} class="cf-card__jar">
                <Jar fill={cap > 0 ? state.jar / cap : 0} size={118} />
              </div>
              <div class="cf-card__jarinfo">
                <p class="cf-card__big lm-num">
                  ✦ <CountUp value={coins} />
                </p>
                <p class="lm-muted cf-card__small">
                  Your technicians earn <strong class="lm-num cf-nowrap">✦ {rate.toFixed(1)}/hour</strong> while you’re away, for up to {EARN_CAP_HOURS} hours.
                </p>
                <Button variant="primary" size="sm" icon="coin" onClick={collect} disabled={coins < 1} sfx={false}>
                  {coins >= 1 ? 'Collect' : 'Jar is filling'}
                </Button>
              </div>
            </div>
            <ProgressBar
              value={skill}
              max={1}
              accent={ACCENT}
              size="sm"
              label="Team skill (from your recent cases)"
              valueText={`${Math.round(skill * 100)}%`}
              ariaLabel="Team skill from your recent case scores"
            />
            <p class="lm-muted cf-card__tiny">Sharper diagnoses, triage and work-ups train your team — the rate follows your case scores, not your hours.</p>
          </GlassPanel>

          <GlassPanel
            class="cf-card cf-card--pearl"
            accent="#a78bfa"
            eyebrow="Pearl of the evening"
            title={pearl?.diagnosisName ?? 'Clinical pearls'}
            icon="sparkle"
            actions={
              pearls.length > 1 && (
                <div class="cf-card__nav">
                  <IconButton icon="chevron-left" label="Previous pearl" size="sm" variant="ghost" onClick={() => setTip((t) => t - 1)} />
                  <IconButton icon="chevron-right" label="Next pearl" size="sm" variant="ghost" onClick={() => setTip((t) => t + 1)} />
                </div>
              )
            }
          >
            {pearl ? (
              <figure class="cf-pearl" key={pearl.diagnosisId + tip} aria-live="polite">
                <span class={`cf-pearl__tag cf-pearl__tag--${pearl.reason}`}>{REASON_LABEL[pearl.reason]}</span>
                <blockquote class="cf-pearl__text">{pearl.text}</blockquote>
                <figcaption class="lm-muted cf-card__tiny">
                  {((tip % pearls.length) + pearls.length) % pearls.length + 1} of {pearls.length}
                </figcaption>
              </figure>
            ) : (
              <p class="lm-muted">The library is being shelved — pearls will appear here soon.</p>
            )}
          </GlassPanel>
        </div>
      </div>
      <Portal>
        <GiftReveal services={services} open={gift} onClose={() => setGift(false)} />
        <WelcomeBack services={services} />
      </Portal>
    </Screen>
  );
}
