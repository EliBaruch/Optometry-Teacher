import { useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Icon, useAnimationFrame, useReducedMotion, useSignal } from '@ui-kit';
import { clockColor, clockPhase, formatClock, heartbeatIntervalMs, remainingSec, type ClockPhase } from '../logic';
import './widgets.css';

const SUB: Record<ClockPhase, string> = {
  calm: 'Sight at risk',
  tense: 'Prioritise the red flags',
  critical: 'Time to decide',
  final: 'Make the call',
};

const R = 42;
const C = 2 * Math.PI * R;

/** exam-overlay: the emergency clock. Display only — the exam scene enforces the timeout. */
export function CountdownWidget({ services }: { services: GameServices }) {
  const s = useSignal(services.session.state);
  if (!s || !s.timeLimitSec || s.submitted || s.failed) return null;
  return <Countdown key={`${s.caseId}:${s.startedAt}`} services={services} startedAt={s.startedAt} limit={s.timeLimitSec} />;
}

function srText(rem: number): string {
  const whole = Math.ceil(rem);
  const m = Math.floor(whole / 60);
  const sec = whole % 60;
  return m > 0 ? `${m} minute${m > 1 ? 's' : ''} ${sec} seconds left` : `${sec} seconds left`;
}

export function Countdown(props: { services: GameServices; startedAt: number; limit: number }) {
  const { services, startedAt, limit } = props;
  const reduced = useReducedMotion();
  const read = () => remainingSec(startedAt, limit, services.clock.now());
  const [rem, setRem] = useState(read);
  useAnimationFrame(() => {
    const next = read();
    // Re-render only when the readout or the ring visibly changes.
    setRem((prev) => (Math.abs(prev - next) >= 0.05 || next === 0 ? next : prev));
  }, rem > 0);

  const phase = clockPhase(rem, limit);
  const color = clockColor(rem, limit);
  const frac = limit > 0 ? rem / limit : 0;
  const beat = heartbeatIntervalMs(rem, limit);
  const announce = rem <= 0 ? 'Time is up' : rem <= 10 ? '10 seconds left' : rem <= 30 ? '30 seconds left' : rem <= 60 ? 'One minute left' : '';
  const ticks = Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2 - Math.PI / 2;
    const major = i % 4 === 0;
    const lit = i / 48 < frac;
    return (
      <line
        key={i}
        x1={50 + 49 * Math.cos(a)}
        y1={50 + 49 * Math.sin(a)}
        x2={50 + (major ? 45 : 46.6) * Math.cos(a)}
        y2={50 + (major ? 45 : 46.6) * Math.sin(a)}
        class={`cr-clock__tick${lit ? ' is-lit' : ''}${major ? ' is-major' : ''}`}
      />
    );
  });
  // Comet head at the draining end of the arc.
  const headA = -Math.PI / 2 + frac * Math.PI * 2;

  return (
    <div
      class={`cr-clock cr-clock--${phase}${reduced ? ' is-still' : ''}`}
      style={{ '--cr-c': color, '--cr-beat': `${beat}ms` }}
      role="timer"
      aria-label={`Emergency clock, ${srText(rem)}`}
    >
      <div class="cr-clock__ring" aria-hidden="true">
        <svg viewBox="0 0 100 100">
          {ticks}
          <circle class="cr-clock__track" cx="50" cy="50" r={R} />
          <circle class="cr-clock__glow" cx="50" cy="50" r={R} stroke-dasharray={C} stroke-dashoffset={C * (1 - frac)} transform="rotate(-90 50 50)" />
          <circle class="cr-clock__arc" cx="50" cy="50" r={R} stroke-dasharray={C} stroke-dashoffset={C * (1 - frac)} transform="rotate(-90 50 50)" />
          {frac > 0.004 && <circle class="cr-clock__head" cx={50 + R * Math.cos(headA)} cy={50 + R * Math.sin(headA)} r="3.4" />}
        </svg>
        <span class="cr-clock__heart">
          <Icon name="heart" size={22} strokeWidth={2} />
        </span>
      </div>
      <div class="cr-clock__text">
        <span class="cr-clock__eyebrow">
          <span class="cr-clock__dot" />
          Code Red
        </span>
        <span class="cr-clock__digits lm-num" aria-hidden="true">{formatClock(rem)}</span>
        <span class="cr-clock__sub">{rem > 0 ? SUB[phase] : 'Time'}</span>
      </div>
      <span class="lm-sr-only" aria-live="polite">{announce}</span>
    </div>
  );
}
