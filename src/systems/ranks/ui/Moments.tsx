import { render } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { signal, type GameServices, type Signal } from '@core';
import { Button, formatNumber, IconOrText, RARITY_COLOR, ServicesProvider, useLocale, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { achText, rarityLabel } from '../model/locale';
import { S } from '../strings';
import type { Moment } from '../engine';
import { Crest } from './Crest';
import './moments.css';

interface Queued {
  key: number;
  m: Moment;
}

/**
 * Stages Career moments over whatever scene is showing: a sliding trophy
 * plaque, or the full promotion ceremony. Mounted lazily into <body> the first
 * time a moment is presented; everything is torn down on uninstall.
 */
export function createMomentStage(services: GameServices) {
  const queue: Signal<Queued[]> = signal([]);
  const timers = new Set<ReturnType<typeof setTimeout>>();
  let host: HTMLElement | null = null;
  let seq = 0;

  const mount = () => {
    if (host || typeof document === 'undefined') return;
    host = document.createElement('div');
    host.className = 'rk-stage-host';
    document.body.appendChild(host);
    render(
      <ServicesProvider services={services}>
        <Stage services={services} queue={queue} />
      </ServicesProvider>,
      host,
    );
  };

  return {
    present(m: Moment, delayMs: number) {
      if (typeof document === 'undefined') return;
      const t = setTimeout(() => {
        timers.delete(t);
        mount();
        queue.update((q) => [...q, { key: ++seq, m }]);
      }, Math.max(0, delayMs));
      timers.add(t);
    },
    destroy() {
      timers.forEach(clearTimeout);
      timers.clear();
      if (host) {
        render(null, host);
        host.remove();
        host = null;
      }
    },
  };
}

function Stage({ services, queue }: { services: GameServices; queue: Signal<Queued[]> }) {
  const items = useSignal(queue);
  const remove = (key: number) => queue.update((q) => q.filter((x) => x.key !== key));
  // One level moment at a time: a full ceremony for a new rank, a banner for a new tier.
  const level = items.find((x) => x.m.kind === 'rank');
  // Trophies wait politely while a level moment is on stage.
  const trophies = level ? [] : items.filter((x) => x.m.kind === 'trophy').slice(0, 3);
  return (
    <>
      {level && level.m.kind === 'rank' && (level.m.newRank
        ? <Ceremony key={level.key} services={services} m={level.m} onDone={() => remove(level.key)} />
        : <LevelBanner key={level.key} services={services} m={level.m} onDone={() => remove(level.key)} />)}
      <div class="rk-plaques" aria-live="polite">
        {trophies.map((x, i) => x.m.kind === 'trophy' && <TrophyToast key={x.key} services={services} m={x.m} index={i} onDone={() => remove(x.key)} />)}
      </div>
    </>
  );
}

const BANNER_MS = 4200;

/** A new tier inside the same rank: a luminous banner drops in, never blocks play. */
function LevelBanner({ services, m, onDone }: { services: GameServices; m: Extract<Moment, { kind: 'rank' }>; onDone: () => void }) {
  const reduced = useReducedMotion();
  const t = useStrings(S);
  const ref = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const { info } = m;
  const leave = () => {
    setLeaving(true);
    setTimeout(onDone, reduced ? 0 : 380);
  };

  useEffect(() => {
    services.audio.play('levelup', { volume: 0.75 });
    const ts = [
      setTimeout(() => {
        services.audio.play('sparkle', { volume: 0.6 });
        const r = ref.current?.querySelector('.rk-banner__crest')?.getBoundingClientRect();
        if (r && r.width > 0 && !reduced) {
          services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'stars', count: 16, color: info.rank.color });
          services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 10, color: info.rank.color2 });
        }
      }, reduced ? 0 : 380),
      setTimeout(() => setLeaving(true), BANNER_MS),
      setTimeout(onDone, BANNER_MS + 400),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  const toRank = info.nextRank ? t.xpTo(formatNumber(info.toNextRank), info.nextRank.title) : t.xpTo(formatNumber(info.toNext), info.nextTitle);
  return (
    <button
      ref={ref}
      type="button"
      role="status"
      class={`rk-banner${leaving ? ' is-leaving' : ''}`}
      style={{ '--rk-c': info.rank.color, '--rk-c2': info.rank.color2 }}
      onClick={leave}
      aria-label={t.careerLevelLabel(String(info.number), info.title, toRank)}
    >
      <span class="rk-banner__crest" aria-hidden="true">
        <Crest rankIndex={info.rankIndex} tier={info.tier} size={58} animate />
      </span>
      <span class="rk-banner__text" aria-hidden="true">
        <span class="rk-banner__eyebrow">{t.careerLevelWord} <b class="lm-num">{info.number}</b></span>
        <span class="rk-banner__title">{info.title}</span>
        <span class="rk-banner__next lm-num">{toRank}</span>
      </span>
      <span class="rk-banner__shine" aria-hidden="true" />
    </button>
  );
}

function TrophyToast({ services, m, index, onDone }: { services: GameServices; m: Extract<Moment, { kind: 'trophy' }>; index: number; onDone: () => void }) {
  const reduced = useReducedMotion();
  const t = useStrings(S);
  const locale = useLocale();
  const txt = achText(m.def, locale);
  const ref = useRef<HTMLButtonElement>(null);
  const [leaving, setLeaving] = useState(false);
  const color = RARITY_COLOR[m.def.rarity];

  useEffect(() => {
    const big = m.def.rarity === 'legendary' || m.def.rarity === 'epic';
    services.audio.play('unlock', { volume: 0.8 });
    const ts = [
      setTimeout(() => {
        services.audio.play(big ? 'rare' : 'sparkle', { volume: 0.7 });
        const r = ref.current?.getBoundingClientRect();
        if (r && !reduced) services.fx.burst(r.left + 36, r.top + r.height / 2, { kind: 'stars', count: big ? 26 : 14, color });
      }, 260),
      setTimeout(() => setLeaving(true), 4600 + index * 300),
      setTimeout(onDone, 5000 + index * 300),
    ];
    return () => ts.forEach(clearTimeout);
  }, []);

  return (
    <button
      ref={ref}
      type="button"
      class={`rk-toast rk-toast--${m.def.rarity}${leaving ? ' is-leaving' : ''}`}
      style={{ '--rk-r': color }}
      onClick={() => {
        setLeaving(true);
        setTimeout(onDone, 300);
      }}
      aria-label={t.trophyUnlockedLabel(txt.title, txt.description)}
    >
      <span class="rk-toast__medal" aria-hidden="true">
        <IconOrText icon={m.def.icon} size={24} />
      </span>
      <span class="rk-toast__text">
        <span class="rk-toast__eyebrow">{t.trophyUnlocked} · {rarityLabel(m.def.rarity, locale)}</span>
        <span class="rk-toast__title">{txt.title}</span>
        <span class="rk-toast__desc">{txt.description}</span>
      </span>
      <span class="rk-toast__shine" aria-hidden="true" />
    </button>
  );
}

const AUTO_CLOSE_MS = 7000;

function Ceremony({ services, m, onDone }: { services: GameServices; m: Extract<Moment, { kind: 'rank' }>; onDone: () => void }) {
  const reduced = useReducedMotion();
  const t = useStrings(S);
  const card = useRef<HTMLDivElement>(null);
  const focusBtn = () => card.current?.querySelector<HTMLButtonElement>('.rk-ceremony__btn')?.focus();
  const [leaving, setLeaving] = useState(false);
  const { info, from, newRank } = m;
  const close = useRef(() => {});
  close.current = () => {
    if (leaving) return;
    setLeaving(true);
    // The toast is the afterglow: it lands once the ceremony clears the stage.
    services.bus.emit('toast', { message: t.promotedToast(info.rank.title, info.rank.motto), icon: 'crown', tone: 'epic' });
    setTimeout(onDone, reduced ? 0 : 420);
  };

  useEffect(() => {
    const prevFocus = document.activeElement as HTMLElement | null;
    services.audio.play('drumroll', { volume: 0.5 });
    const ts = [
      setTimeout(() => {
        services.audio.play('levelup');
        if (newRank) services.audio.play(info.rankIndex >= 5 ? 'legendary' : 'rare', { volume: 0.8 });
        if (!reduced) {
          const cx = window.innerWidth / 2;
          const cy = window.innerHeight * 0.4;
          services.fx.flash(info.rank.color, 380);
          services.fx.burst(cx, cy, { kind: 'stars', count: newRank ? 60 : 32, color: info.rank.color });
          if (newRank) {
            services.fx.burst(cx, cy, { kind: 'confetti', count: 90 });
            services.fx.shake(4, 260);
          }
        }
      }, reduced ? 0 : 650),
      setTimeout(focusBtn, 80),
      setTimeout(() => close.current(), AUTO_CLOSE_MS),
    ];
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        close.current();
      }
      if (e.key === 'Tab') {
        e.preventDefault();
        focusBtn();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => {
      ts.forEach(clearTimeout);
      window.removeEventListener('keydown', onKey, true);
      prevFocus?.focus?.();
    };
  }, []);

  return (
    <div
      class={`rk-ceremony${newRank ? ' is-rank' : ''}${leaving ? ' is-leaving' : ''}`}
      style={{ '--rk-c': info.rank.color, '--rk-c2': info.rank.color2 }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rk-ceremony-title"
      aria-describedby="rk-ceremony-motto"
      onClick={(e) => {
        if (e.target === e.currentTarget) close.current();
      }}
    >
      <div class="rk-ceremony__rays" aria-hidden="true" />
      <div class="rk-ceremony__card" ref={card}>
        <div class="rk-ceremony__crest">
          <span class="rk-ceremony__ring" aria-hidden="true" />
          <Crest rankIndex={info.rankIndex} tier={info.tier} size={newRank ? 188 : 150} animate />
        </div>
        <div class="rk-ceremony__eyebrow">{newRank ? t.promotion : t.levelUp}</div>
        <h2 id="rk-ceremony-title" class="rk-ceremony__title">
          {info.title}
        </h2>
        <div class="rk-ceremony__from">
          <span>{from.title}</span>
          <span class="rk-ceremony__arrow" aria-hidden="true">→</span>
          <span class="rk-ceremony__to">{info.title}</span>
          <span class="rk-ceremony__lv lm-num">{t.levelWord} {info.number}</span>
        </div>
        <p id="rk-ceremony-motto" class="rk-ceremony__motto">
          {info.rank.motto}
        </p>
        <Button variant="primary" size="lg" onClick={() => close.current()} sfx="select" class="rk-ceremony__btn">
          {t.cont}
        </Button>
      </div>
    </div>
  );
}
