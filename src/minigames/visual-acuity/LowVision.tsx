/**
 * Off-chart tests drawn over the projector: the examiner's hand counting
 * fingers, a waving hand, or a pen-light — the low-vision ladder.
 */
import { LOW_VISION } from './notation';
import { useT } from './strings';

function Hand(props: { fingers: number; waving: boolean }) {
  // Five finger capsules fanned over a palm; folded fingers drop into the fist.
  const fingers = [
    { x: -30, len: 52, rot: -14 },
    { x: -11, len: 62, rot: -4 },
    { x: 8, len: 64, rot: 3 },
    { x: 26, len: 56, rot: 11 },
  ];
  const shown = props.waving ? 5 : props.fingers;
  return (
    <g class={props.waving ? 'va-lv__hand is-waving' : 'va-lv__hand'}>
      {fingers.map((f, i) => {
        const up = i < Math.min(4, shown);
        return (
          <rect
            key={i}
            x={f.x - 8}
            y={up ? -f.len - 18 : -32}
            width="16"
            height={up ? f.len + 20 : 22}
            rx="8"
            transform={`rotate(${up ? f.rot : 0} ${f.x} 0)`}
            fill="url(#va-lv-skin)"
            stroke="rgba(90,50,30,0.35)"
            stroke-width="1"
          />
        );
      })}
      {shown >= 5 && <rect x="34" y="-38" width="16" height="46" rx="8" transform="rotate(48 40 6)" fill="url(#va-lv-skin)" stroke="rgba(90,50,30,0.35)" stroke-width="1" />}
      <path d="M-40 -16 Q-42 40 -18 54 L22 54 Q44 40 44 -12 Q40 -26 -2 -24 Q-36 -26 -40 -16Z" fill="url(#va-lv-skin)" stroke="rgba(90,50,30,0.35)" stroke-width="1" />
      {/* tucked thumb folds across the palm */}
      {shown < 5 && <rect x="-24" y="6" width="58" height="17" rx="8.5" transform="rotate(-12 5 14)" fill="url(#va-lv-skin)" stroke="rgba(90,50,30,0.4)" stroke-width="1" />}
      <rect x="-22" y="52" width="40" height="40" rx="6" fill="#2b2140" />
      {props.waving && (
        <g fill="none" stroke="rgba(255,210,122,0.7)" stroke-width="3" stroke-linecap="round">
          <path d="M-70 -70 Q-84 -40 -70 -10" />
          <path d="M-86 -82 Q-104 -40 -86 2" opacity="0.5" />
          <path d="M70 -70 Q84 -40 70 -10" />
          <path d="M86 -82 Q104 -40 86 2" opacity="0.5" />
        </g>
      )}
    </g>
  );
}

function Light(props: { lit: boolean }) {
  return (
    <g>
      {props.lit && <circle cx="0" cy="-36" r="70" fill="url(#va-lv-beam)" class="va-lv__beam" />}
      <rect x="-9" y="-30" width="18" height="96" rx="5" fill="url(#va-lv-pen)" />
      <rect x="-11" y="-38" width="22" height="14" rx="4" fill="#d9cfbf" />
      <circle cx="0" cy="-38" r={props.lit ? 8 : 6} fill={props.lit ? '#fff8dc' : '#6d6273'} />
    </g>
  );
}

export function LowVisionCard(props: { level: number; fingers: number }) {
  const t = useT();
  const lv = LOW_VISION[-1 - props.level]!;
  const name = t.lowVision[lv.code];
  const dist = t.lvDist[lv.code];
  return (
    <div class="va-lv" aria-label={`${name}: ${dist}`}>
      <svg viewBox="-120 -130 240 240" class="va-lv__art" aria-hidden="true">
        <defs>
          <linearGradient id="va-lv-skin" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stop-color="#f1c9a5" />
            <stop offset="100%" stop-color="#c98f66" />
          </linearGradient>
          <linearGradient id="va-lv-pen" x1="0" x2="1">
            <stop offset="0%" stop-color="#5a4a2a" />
            <stop offset="50%" stop-color="#f2c46b" />
            <stop offset="100%" stop-color="#7a5418" />
          </linearGradient>
          <radialGradient id="va-lv-beam">
            <stop offset="0%" stop-color="#fffbe6" stop-opacity="0.95" />
            <stop offset="35%" stop-color="#ffd27a" stop-opacity="0.45" />
            <stop offset="100%" stop-color="#ffd27a" stop-opacity="0" />
          </radialGradient>
        </defs>
        {lv.code === 'CF' && <Hand fingers={props.fingers} waving={false} />}
        {lv.code === 'HM' && <Hand fingers={5} waving />}
        {(lv.code === 'LP' || lv.code === 'NLP') && <Light lit />}
      </svg>
      <div class="va-lv__label">
        <b>{name}</b>
        <span>{dist}</span>
      </div>
    </div>
  );
}
