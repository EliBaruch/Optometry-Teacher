import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { createRng } from '@core';
import { useReducedMotion } from '@ui-kit';
import { PatientAvatar, generateAvatar } from '@render';
import { clockAngles, pickSitters } from './logic';

const SLOTS = [
  { left: '5%', w: '28%', delay: '0s', idle: 'a' },
  { left: '36%', w: '24%', delay: '-1.6s', idle: 'b' },
  { left: '64%', w: '28%', delay: '-3.1s', idle: 'c' },
];

const RAIN = Array.from({ length: 22 }, (_, i) => ({
  left: `${(i * 37) % 100}%`, animationDelay: `-${((i * 53) % 100) / 40}s`, animationDuration: `${0.9 + ((i * 17) % 7) / 10}s`, height: `${14 + ((i * 11) % 16)}%`,
}));
const DRIPS = [18, 41, 63, 82].map((l, i) => ({ left: `${l}%`, animationDelay: `-${i * 2.3}s`, animationDuration: `${7 + i * 1.7}s` }));
const DUST = Array.from({ length: 12 }, (_, i) => ({
  left: `${(i * 29 + 7) % 100}%`, top: `${(i * 41 + 13) % 70}%`, animationDelay: `-${(i * 3.7) % 20}s`, animationDuration: `${14 + (i % 5) * 4}s`, width: `${2 + (i % 3)}px`, height: `${2 + (i % 3)}px`,
}));

type Gaze = { x: number; y: number } | null;

/** Ambient vignette: rainy window, wall clock, eye chart, lamp light, parallax depth and three patients idling. */
export function WaitingRoom({ compact }: { compact?: boolean }) {
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => new Date());
  const [glance, setGlance] = useState<Gaze>(null);
  const room = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), reduced ? 30_000 : 1000);
    return () => window.clearInterval(t);
  }, [reduced]);
  // The first patient now and then glances up at the wall clock.
  useEffect(() => {
    if (reduced) return;
    let off = 0;
    const t = window.setInterval(() => {
      setGlance({ x: 0.7, y: -0.6 });
      off = window.setTimeout(() => setGlance(null), 1800);
    }, 9000);
    return () => { window.clearInterval(t); window.clearTimeout(off); };
  }, [reduced]);

  const people = useMemo(
    () => pickSitters(Date.now() >>> 10).map((s, i) => ({ ...s, ...SLOTS[i]!, spec: generateAvatar(createRng(s.seed), { age: s.age, sex: s.sex }) })),
    [],
  );
  const a = clockAngles(now);

  const move = (e: PointerEvent) => {
    if (reduced || e.pointerType === 'touch') return;
    const el = room.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty('--px', (((e.clientX - r.left) / r.width) * 2 - 1).toFixed(3));
    el.style.setProperty('--py', (((e.clientY - r.top) / r.height) * 2 - 1).toFixed(3));
  };
  const leave = () => { room.current?.style.setProperty('--px', '0'); room.current?.style.setProperty('--py', '0'); };

  return (
    <div ref={room} class={`hub-room${compact ? ' hub-room--compact' : ''}`} aria-hidden="true" onPointerMove={move} onPointerLeave={leave}>
      <div class="hub-room__layer hub-room__layer--back">
        <div class="hub-room__wall" />
        <div class="hub-room__window">
          {RAIN.map((r, i) => <span key={i} class="hub-room__drop" style={r} />)}
          {DRIPS.map((d, i) => <span key={`d${i}`} class="hub-room__drip" style={d} />)}
          <span class="hub-room__mullion hub-room__mullion--v" />
          <span class="hub-room__mullion hub-room__mullion--h" />
          <span class="hub-room__lightning" />
          <span class="hub-room__gloss" />
        </div>
        <div class="hub-room__sill" />
        <div class="hub-room__chart">
          <span class="c1">E</span><span class="c2">F P</span><span class="c3">T O Z</span><span class="c4">L P E D</span>
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
      </div>

      <div class="hub-room__lamp" />

      <div class="hub-room__layer hub-room__layer--mid">
        <div class="hub-room__people">
          {people.map((p, i) => (
            <div key={p.seed} class={`hub-room__sitter hub-room__sitter--${p.idle}`} style={{ left: p.left, width: p.w, animationDelay: p.delay }}>
              <PatientAvatar spec={p.spec} age={p.age} sex={p.sex} backdrop={false} animated reducedMotion={reduced} size="100%"
                lookAt={i === 0 ? glance : undefined} expression={p.age < 12 ? 'happy' : 'neutral'} />
            </div>
          ))}
        </div>
        <div class="hub-room__bench" />
        <div class="hub-room__floor" />
      </div>

      <div class="hub-room__layer hub-room__layer--front">
        <svg class="hub-room__plant" viewBox="0 0 80 120" fill="#0b0716">
          <path d="M40 120 C 38 90 30 70 6 52 C 28 56 38 66 40 84 C 42 60 50 36 66 18 C 56 44 48 64 44 90 C 52 74 62 66 76 62 C 62 74 54 88 48 120Z" />
          <path d="M26 120h28l-4-26H30z" fill="#1a0f2e" stroke="#4a2e06" stroke-width="1.5" />
        </svg>
      </div>

      <div class="hub-room__light" />
      {DUST.map((d, i) => <span key={i} class="hub-room__dust" style={d} />)}
      <div class="hub-room__vignette" />
    </div>
  );
}
