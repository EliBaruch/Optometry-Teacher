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

const CLOUDS = [
  { top: '14%', w: '34%', dur: '95s', delay: '-18s', o: 0.95 },
  { top: '40%', w: '24%', dur: '120s', delay: '-70s', o: 0.8 },
  { top: '6%', w: '20%', dur: '140s', delay: '-110s', o: 0.7 },
].map((c) => ({ top: c.top, width: c.w, animationDuration: c.dur, animationDelay: c.delay, opacity: c.o }));

type Gaze = { x: number; y: number } | null;

/** Ambient vignette: a bright daylight waiting area: sunny window, wall clock, eye chart, parallax depth and three patients idling. */
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
          <span class="hub-room__sun" />
          {CLOUDS.map((c, i) => <span key={i} class="hub-room__cloud" style={c} />)}
          <svg class="hub-room__skyline" viewBox="0 0 200 60" preserveAspectRatio="none">
            <path class="far" d="M0 60V34l14-6 10 4 12-10 12 8 14-4 10 6 16-12 14 10 12-4 14 8 16-6 10 8 16-2v26Z" />
            <path class="near" d="M0 60V46l18-8 14 6 16-10 16 8 18-6 14 8 20-10 16 8 18-4 14 6 16-4v26Z" />
          </svg>
          <span class="hub-room__mullion hub-room__mullion--v" />
          <span class="hub-room__mullion hub-room__mullion--h" />
          <span class="hub-room__gloss" />
        </div>
        <div class="hub-room__sill" />
        <div class="hub-room__chart">
          <span class="c1">E</span><span class="c2">F P</span><span class="c3">T O Z</span><span class="c4">L P E D</span>
        </div>
        <svg class="hub-room__clock" viewBox="-50 -50 100 100">
          <circle class="face" r="46" />
          <circle class="rim" r="46" />
          {Array.from({ length: 12 }, (_, i) => (
            <line key={i} class="tick" x1="0" y1="-37" x2="0" y2={i % 3 === 0 ? -30 : -33} stroke-width={i % 3 === 0 ? 2.6 : 1.3} transform={`rotate(${i * 30})`} />
          ))}
          <line class="hub-room__hand hand" x1="0" y1="2" x2="0" y2="-20" stroke-width="3.6" stroke-linecap="round" style={{ transform: `rotate(${a.hour}deg)` }} />
          <line class="hub-room__hand hand" x1="0" y1="3" x2="0" y2="-31" stroke-width="2.4" stroke-linecap="round" style={{ transform: `rotate(${a.minute}deg)` }} />
          <line class="hub-room__hand hub-room__hand--sec" x1="0" y1="6" x2="0" y2="-34" stroke-width="1.1" stroke-linecap="round" style={{ transform: `rotate(${a.second}deg)` }} />
          <circle class="pin" r="2.8" />
        </svg>
      </div>

      <div class="hub-room__beam" />

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
        <svg class="hub-room__plant" viewBox="0 0 80 120">
          <path d="M40 98 C 34 72 24 54 8 42 C 30 44 40 58 42 82Z" fill="#2f9e6b" />
          <path d="M42 98 C 44 64 52 38 70 22 C 62 50 52 70 46 98Z" fill="#3fb57d" />
          <path d="M41 98 C 47 80 58 68 76 64 C 64 78 56 90 48 100Z" fill="#26875a" />
          <path d="M38 98 C 35 72 37 50 45 32 C 48 54 46 76 42 98Z" fill="#55c995" />
          <path d="M23 96h34l-4 24H27z" fill="#ffffff" stroke="#cfd9e3" stroke-width="1.5" stroke-linejoin="round" />
          <path d="M24.5 102h31" stroke="#e1e8ef" stroke-width="1.5" />
        </svg>
      </div>

    </div>
  );
}
