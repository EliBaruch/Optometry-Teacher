import { useEffect, useMemo, useState } from 'preact/hooks';
import { createRng } from '@core';
import { useReducedMotion } from '@ui-kit';
import { PatientAvatar, generateAvatar, type AvatarSex } from '@render';
import { clockAngles } from './logic';

const SITTERS: { seed: number; age: number; sex: AvatarSex; left: string; w: string; delay: string }[] = [
  { seed: 11, age: 71, sex: 'F', left: '6%', w: '27%', delay: '0s' },
  { seed: 42, age: 9, sex: 'M', left: '37%', w: '23%', delay: '-1.6s' },
  { seed: 77, age: 38, sex: 'M', left: '65%', w: '27%', delay: '-3.1s' },
];

const RAIN = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37) % 100}%`, animationDelay: `-${((i * 53) % 100) / 40}s`, animationDuration: `${0.9 + ((i * 17) % 7) / 10}s`, height: `${14 + ((i * 11) % 16)}%`,
}));

/** A small ambient vignette: rainy window, wall clock, three patients idling on the bench. */
export function WaitingRoom({ compact }: { compact?: boolean }) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), reduced ? 30_000 : 1000);
    return () => window.clearInterval(t);
  }, [reduced]);
  const people = useMemo(() => SITTERS.map((s) => ({ ...s, spec: generateAvatar(createRng(s.seed), { age: s.age, sex: s.sex }) })), []);
  const a = clockAngles(now);

  return (
    <div class={`hub-room${compact ? ' hub-room--compact' : ''}`} aria-hidden="true">
      <div class="hub-room__wall" />
      <div class="hub-room__window">
        {RAIN.map((r, i) => <span key={i} class="hub-room__drop" style={r} />)}
        <span class="hub-room__mullion hub-room__mullion--v" />
        <span class="hub-room__mullion hub-room__mullion--h" />
        <span class="hub-room__lightning" />
      </div>
      <svg class="hub-room__clock" viewBox="-50 -50 100 100">
        <circle r="46" fill="#1a0f2e" stroke="#d9962a" stroke-width="4" />
        <circle r="40" fill="none" stroke="rgba(255,231,179,.25)" stroke-width="1" />
        {Array.from({ length: 12 }, (_, i) => (
          <line key={i} x1="0" y1="-35" x2="0" y2={i % 3 === 0 ? -29 : -32} stroke="#ffe7b3" stroke-width={i % 3 === 0 ? 2.4 : 1.2} transform={`rotate(${i * 30})`} />
        ))}
        <line class="hub-room__hand" x1="0" y1="2" x2="0" y2="-20" stroke="#fff4da" stroke-width="3.4" stroke-linecap="round" style={{ transform: `rotate(${a.hour}deg)` }} />
        <line class="hub-room__hand" x1="0" y1="3" x2="0" y2="-30" stroke="#fff4da" stroke-width="2.2" stroke-linecap="round" style={{ transform: `rotate(${a.minute}deg)` }} />
        <line class="hub-room__hand hub-room__hand--sec" x1="0" y1="6" x2="0" y2="-32" stroke="#fb923c" stroke-width="1" stroke-linecap="round" style={{ transform: `rotate(${a.second}deg)` }} />
        <circle r="2.6" fill="#ffd27a" />
      </svg>
      <div class="hub-room__lamp" />
      <div class="hub-room__people">
        {people.map((p) => (
          <div key={p.seed} class="hub-room__sitter" style={{ left: p.left, width: p.w, animationDelay: p.delay }}>
            <PatientAvatar spec={p.spec} age={p.age} sex={p.sex} backdrop={false} animated reducedMotion={reduced} size="100%" expression={p.age < 12 ? 'happy' : 'neutral'} />
          </div>
        ))}
      </div>
      <div class="hub-room__bench" />
      <div class="hub-room__floor" />
    </div>
  );
}
