/** Procedural "saved eye" emblem: an almond eye with a candle-gold jewelled iris. */
export function EyeJewel(props: { size?: number; uid: string; class?: string }) {
  const id = (s: string) => `cr-eye-${props.uid}-${s}`;
  const fibres = Array.from({ length: 40 }, (_, i) => {
    const a = (i / 40) * Math.PI * 2;
    const r1 = 8.5 + (i % 3) * 0.6;
    const r2 = 19.5 - (i % 2) * 2.2;
    return (
      <line
        key={i}
        x1={Math.cos(a) * r1}
        y1={Math.sin(a) * r1}
        x2={Math.cos(a + 0.05) * r2}
        y2={Math.sin(a + 0.05) * r2}
        stroke={i % 2 ? '#fff1c2' : '#a8550f'}
        stroke-opacity={i % 2 ? 0.55 : 0.5}
        stroke-width={i % 4 === 0 ? 1.1 : 0.6}
      />
    );
  });
  const rays = Array.from({ length: 16 }, (_, i) => {
    const a = (i / 16) * Math.PI * 2;
    const long = i % 2 === 0;
    const r1 = 46;
    const r2 = long ? 58 : 52;
    return <line key={i} x1={Math.cos(a) * r1} y1={Math.sin(a) * r1 * 0.78} x2={Math.cos(a) * r2} y2={Math.sin(a) * r2 * 0.78} stroke="#ffd27a" stroke-opacity={long ? 0.7 : 0.35} stroke-width={long ? 1.4 : 1} stroke-linecap="round" />;
  });
  return (
    <svg class={props.class} viewBox="-64 -50 128 100" width={props.size ?? 160} height={((props.size ?? 160) * 100) / 128} aria-hidden="true">
      <defs>
        <radialGradient id={id('iris')} cx="0" cy="0" r="22" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#2b1606" />
          <stop offset="0.36" stop-color="#d9962a" />
          <stop offset="0.62" stop-color="#ffd27a" />
          <stop offset="0.86" stop-color="#b8611a" />
          <stop offset="1" stop-color="#3a1a07" />
        </radialGradient>
        <linearGradient id={id('sclera')} x1="0" y1="-1" x2="0" y2="1">
          <stop offset="0" stop-color="#e9dccb" />
          <stop offset="0.5" stop-color="#fbf4ea" />
          <stop offset="1" stop-color="#d8c6b0" />
        </linearGradient>
        <radialGradient id={id('halo')}>
          <stop offset="0" stop-color="#ffd27a" stop-opacity="0.55" />
          <stop offset="1" stop-color="#ffd27a" stop-opacity="0" />
        </radialGradient>
        <clipPath id={id('almond')}>
          <path d="M-46,0 Q0,-38 46,0 Q0,38 -46,0Z" />
        </clipPath>
      </defs>
      <ellipse rx="62" ry="48" fill={`url(#${id('halo')})`} />
      <g class="cr-eye__rays">{rays}</g>
      <g class="cr-eye__lid">
        <g clip-path={`url(#${id('almond')})`}>
          <rect x="-50" y="-40" width="100" height="80" fill={`url(#${id('sclera')})`} />
          <circle r="22" fill={`url(#${id('iris')})`} />
          {fibres}
          <circle r="22" fill="none" stroke="#2a1404" stroke-width="1.6" stroke-opacity="0.8" />
          <circle class="cr-eye__pupil" r="8" fill="#0b0716" />
          <ellipse cx="-7" cy="-8" rx="4.2" ry="3" fill="#fff" opacity="0.9" />
          <circle cx="6" cy="6" r="1.4" fill="#fff" opacity="0.55" />
          <path d="M-46,0 Q0,-38 46,0" fill="none" stroke="#000" stroke-opacity="0.25" stroke-width="7" />
        </g>
        <path d="M-46,0 Q0,-38 46,0 Q0,38 -46,0Z" fill="none" stroke="#ffd27a" stroke-width="1.8" />
      </g>
    </svg>
  );
}
