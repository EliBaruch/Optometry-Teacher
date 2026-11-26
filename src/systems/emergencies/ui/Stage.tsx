/**
 * Body-level cinematic overlays (arrival banner, "sight saved" finale).
 * They live outside the scene tree so a scene change (exam → results) never
 * cuts them short; pointer-events are off so they never block play.
 */
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { pickStrings } from '@core';
import { AvatarBust } from '@render';
import type { ArrivalInfo, SavedInfo, Stage } from '../engine';
import { formatClock, formatDuration } from '../logic';
import { S } from '../strings';
import { EyeJewel } from './EyeJewel';
import './stage.css';

const ARRIVAL_MS = 2700;
const SAVED_MS = 3600;
/** A thin (unproven) save gets a shorter, quieter finale. */
const THIN_MS = 2800;
const LEAVE_MS = 420;

/** Plays for `total` ms then leaves; `cut` ends it early with the same exit transition. */
function useLifecycle(total: number, onDone: () => void, cut = false) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const ms = cut ? LEAVE_MS : total;
    const a = setTimeout(() => setLeaving(true), Math.max(0, ms - LEAVE_MS));
    const b = setTimeout(onDone, ms);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, [cut]);
  return leaving;
}

export function ArrivalBanner({ info, onDone, cut }: { info: ArrivalInfo; onDone: () => void; cut?: boolean }) {
  const leaving = useLifecycle(ARRIVAL_MS, onDone, cut);
  const tx = pickStrings(S, info.locale ?? 'en');
  const p = info.kase?.patient;
  return (
    <div class={`cr-arrival${leaving ? ' is-leaving' : ''}${info.reduced ? ' is-still' : ''}`} role="alert">
      <div class="cr-arrival__wash" aria-hidden="true" />
      <div class="cr-arrival__band">
        <div class="cr-arrival__stripes cr-arrival__stripes--l" aria-hidden="true" />
        <div class="cr-arrival__stripes cr-arrival__stripes--r" aria-hidden="true" />
        <div class="cr-arrival__core">
          <span class="cr-arrival__eyebrow">
            <span class="cr-arrival__dot" aria-hidden="true" />
            {info.grandRounds ? tx.arrivalGrand : tx.arrivalNormal}
          </span>
          <h2 class="cr-arrival__title">
            <span class="cr-arrival__glyph" aria-hidden="true">✚</span>
            {tx.codeRed}
            <span class="cr-arrival__glyph" aria-hidden="true">✚</span>
          </h2>
          <p class="cr-arrival__sub">
            {p && (
              <>
                <span class="cr-arrival__who">{p.name}, {p.age}</span>
                <span class="cr-arrival__sep" aria-hidden="true">·</span>
              </>
            )}
            <span class="lm-num">{formatClock(info.limitSec)}</span>{tx.onClock.replace(/^ /, '\u00a0')}
          </p>
        </div>
      </div>
    </div>
  );
}

/** Golden light rays fading from the centre (rotated as one composited layer). */
function Rays() {
  const wedges = Array.from({ length: 24 }, (_, i) => {
    const a0 = (i / 24) * Math.PI * 2;
    const a1 = a0 + (Math.PI * 2) / 24 / 2.6;
    return `M0,0 L${Math.cos(a0) * 100},${Math.sin(a0) * 100} L${Math.cos(a1) * 100},${Math.sin(a1) * 100}Z`;
  });
  return (
    <svg viewBox="-100 -100 200 200">
      <defs>
        <radialGradient id="cr-rays-fade" r="100" cx="0" cy="0" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#2257f0" stop-opacity="0.26" />
          <stop offset="0.35" stop-color="#2257f0" stop-opacity="0.1" />
          <stop offset="1" stop-color="#2257f0" stop-opacity="0" />
        </radialGradient>
      </defs>
      <path d={wedges.join(' ')} fill="url(#cr-rays-fade)" />
    </svg>
  );
}

export function SightSaved({ info, onDone }: { info: SavedInfo; onDone: () => void }) {
  const { reward } = info;
  const leaving = useLifecycle(reward.thin ? THIN_MS : SAVED_MS, onDone);
  const loc = info.locale ?? 'en';
  const tx = pickStrings(S, loc);
  const p = info.kase?.patient;
  return (
    <div
      class={`cr-saved cr-saved--${reward.rarity}${reward.thin ? ' is-thin' : ''}${leaving ? ' is-leaving' : ''}${info.reduced ? ' is-still' : ''}`}
      role="status"
      aria-live="polite"
    >
      <div class="cr-saved__veil" aria-hidden="true" />
      <div class="cr-saved__rays" aria-hidden="true">
        <Rays />
      </div>
      <div class="cr-saved__card">
        <span class="cr-saved__eyebrow">{reward.rarity === 'legendary' ? tx.savedFlawless : tx.savedResolved}</span>
        <div class="cr-saved__emblem">
          <EyeJewel uid="saved" size={180} class="cr-eye" />
          {p && (
            <span class="cr-saved__bust">
              <AvatarBust spec={p.avatar} age={p.age} sex={p.sex} size={54} ring="#00c875" expression="relieved" label={p.name} />
            </span>
          )}
        </div>
        <h2 class="cr-saved__title">{tx.sightSaved}</h2>
        <p class="cr-saved__dx">
          {info.dxName} <span aria-hidden="true">·</span> {tx.calledIn}<span class="lm-num">{info.sec < 1 ? tx.underSecond : formatDuration(info.sec, loc)}</span>
        </p>
        <div class="cr-saved__chips">
          <span class="cr-saved__chip cr-saved__chip--gold" style={{ '--i': 0 }} dir="ltr">+{reward.coins} ✦</span>
          <span class="cr-saved__chip" style={{ '--i': 1 }} dir="ltr">+{reward.xp} XP</span>
          {reward.grandCoins > 0 && <span class="cr-saved__chip cr-saved__chip--grand" style={{ '--i': 2 }}>{tx.grandRounds} <bdi dir="ltr">+{reward.grandCoins} ✦</bdi></span>}
        </div>
        {info.note && <p class="cr-saved__note">{info.note}</p>}
      </div>
    </div>
  );
}

/** A Stage that renders into its own fixed host appended to <body>. */
export function createDomStage(): Stage {
  if (typeof document === 'undefined') return { arrival() {}, saved() {}, destroy() {} };
  let host: HTMLDivElement | null = null;
  let seq = 0;
  /** The arrival on screen (so it can be cut short), or null. */
  let arriving: { k: number; info: ArrivalInfo } | null = null;
  const ensure = () => {
    if (!host) {
      host = document.createElement('div');
      host.className = 'cr-stage';
      document.body.appendChild(host);
    }
    return host;
  };
  const clear = (token: number) => () => {
    if (token !== seq) return;
    arriving = null;
    if (host) render(null, host);
  };
  return {
    arrival(info) {
      const k = ++seq;
      arriving = { k, info };
      render(<ArrivalBanner key={`a${k}`} info={info} onDone={clear(k)} />, ensure());
    },
    saved(info) {
      const k = ++seq;
      arriving = null;
      render(<SightSaved key={`s${k}`} info={info} onDone={clear(k)} />, ensure());
    },
    dismissArrival() {
      const a = arriving;
      if (!a || a.k !== seq || !host) return;
      arriving = null;
      render(<ArrivalBanner key={`a${a.k}`} info={a.info} onDone={clear(a.k)} cut />, host);
    },
    destroy() {
      seq++;
      arriving = null;
      if (host) {
        render(null, host);
        host.remove();
        host = null;
      }
    },
  };
}
