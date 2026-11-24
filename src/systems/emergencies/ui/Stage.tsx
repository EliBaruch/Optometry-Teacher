/**
 * Body-level cinematic overlays (arrival banner, "sight saved" finale).
 * They live outside the scene tree so a scene change (exam → results) never
 * cuts them short; pointer-events are off so they never block play.
 */
import { render } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { AvatarBust } from '@render';
import type { ArrivalInfo, SavedInfo, Stage } from '../engine';
import { formatClock, formatDuration } from '../logic';
import { EyeJewel } from './EyeJewel';
import './stage.css';

const ARRIVAL_MS = 2700;
const SAVED_MS = 3600;
const LEAVE_MS = 420;

function useLifecycle(total: number, onDone: () => void) {
  const [leaving, setLeaving] = useState(false);
  useEffect(() => {
    const a = setTimeout(() => setLeaving(true), Math.max(0, total - LEAVE_MS));
    const b = setTimeout(onDone, total);
    return () => {
      clearTimeout(a);
      clearTimeout(b);
    };
  }, []);
  return leaving;
}

export function ArrivalBanner({ info, onDone }: { info: ArrivalInfo; onDone: () => void }) {
  const leaving = useLifecycle(ARRIVAL_MS, onDone);
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
            {info.grandRounds ? 'Grand Rounds · Emergency' : 'Emergency · Sight at risk'}
          </span>
          <h2 class="cr-arrival__title">
            <span class="cr-arrival__glyph" aria-hidden="true">✚</span>
            Code Red
            <span class="cr-arrival__glyph" aria-hidden="true">✚</span>
          </h2>
          <p class="cr-arrival__sub">
            {p && (
              <>
                <span class="cr-arrival__who">{p.name}, {p.age}</span>
                <span class="cr-arrival__sep" aria-hidden="true">·</span>
              </>
            )}
            <span class="lm-num">{formatClock(info.limitSec)}</span>&nbsp;on the clock
          </p>
        </div>
      </div>
    </div>
  );
}

/** Candle-gold light rays fading from the centre (rotated as one composited layer). */
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
          <stop offset="0" stop-color="#ffd27a" stop-opacity="0.26" />
          <stop offset="0.35" stop-color="#ffd27a" stop-opacity="0.1" />
          <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
        </radialGradient>
      </defs>
      <path d={wedges.join(' ')} fill="url(#cr-rays-fade)" />
    </svg>
  );
}

export function SightSaved({ info, onDone }: { info: SavedInfo; onDone: () => void }) {
  const leaving = useLifecycle(SAVED_MS, onDone);
  const p = info.kase?.patient;
  const { reward } = info;
  return (
    <div class={`cr-saved${leaving ? ' is-leaving' : ''}${info.reduced ? ' is-still' : ''}`} role="status" aria-live="polite">
      <div class="cr-saved__veil" aria-hidden="true" />
      <div class="cr-saved__rays" aria-hidden="true">
        <Rays />
      </div>
      <div class="cr-saved__card">
        <div class="cr-saved__emblem">
          <EyeJewel uid="saved" size={180} class="cr-eye" />
          {p && (
            <span class="cr-saved__bust">
              <AvatarBust spec={p.avatar} age={p.age} sex={p.sex} size={54} ring="#5eead4" expression="relieved" label={p.name} />
            </span>
          )}
        </div>
        <span class="cr-saved__eyebrow">Code Red · Resolved</span>
        <h2 class="cr-saved__title">Sight saved</h2>
        <p class="cr-saved__dx">
          {info.dxName} <span aria-hidden="true">·</span> called in <span class="lm-num">{formatDuration(info.sec)}</span>
        </p>
        <div class="cr-saved__chips">
          <span class="cr-saved__chip cr-saved__chip--gold" style={{ '--i': 0 }}>+{reward.coins} ✦</span>
          <span class="cr-saved__chip" style={{ '--i': 1 }}>+{reward.xp} XP</span>
          {reward.grandCoins > 0 && <span class="cr-saved__chip cr-saved__chip--grand" style={{ '--i': 2 }}>Grand Rounds +{reward.grandCoins} ✦</span>}
        </div>
      </div>
    </div>
  );
}

/** A Stage that renders into its own fixed host appended to <body>. */
export function createDomStage(): Stage {
  if (typeof document === 'undefined') return { arrival() {}, saved() {}, destroy() {} };
  let host: HTMLDivElement | null = null;
  let seq = 0;
  const ensure = () => {
    if (!host) {
      host = document.createElement('div');
      host.className = 'cr-stage';
      document.body.appendChild(host);
    }
    return host;
  };
  const clear = (token: number) => () => {
    if (token === seq && host) render(null, host);
  };
  return {
    arrival(info) {
      const k = ++seq;
      render(<ArrivalBanner key={`a${k}`} info={info} onDone={clear(k)} />, ensure());
    },
    saved(info) {
      const k = ++seq;
      render(<SightSaved key={`s${k}`} info={info} onDone={clear(k)} />, ensure());
    },
    destroy() {
      seq++;
      if (host) {
        render(null, host);
        host.remove();
        host = null;
      }
    },
  };
}
