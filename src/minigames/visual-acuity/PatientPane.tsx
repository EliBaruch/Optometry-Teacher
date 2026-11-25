/**
 * Mini patient with a hand-held occluder. Tap an eye (or press C) to cover it;
 * the black paddle swings in on a spring. In pinhole mode the paddle over the
 * tested eye flips to its multi-pinhole face.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import type { Eye, PatientProfile } from '@core';
import { PatientAvatar, type AvatarExpression } from '@render';
import type { OpenEyes } from './optics';

export interface PatientPaneProps {
  patient: PatientProfile;
  covered: OpenEyes;
  /** Eye that has the pinhole face turned towards it (pinhole module) */
  pinholeEye: Eye | null;
  expression: AvatarExpression;
  reducedMotion: boolean;
  /** null = occluder is placed automatically (pinhole module) */
  onToggleEye: ((eye: Eye) => void) | null;
}

/** Eye centres in the avatar's 200 × 240 viewBox (mirrors the avatar's face canon). */
function eyeCentre(age: number, eye: Eye): { x: number; y: number } {
  const child = Math.max(0, Math.min(1, (15 - age) / 11));
  const dx = 18.6 - child * 0.3;
  return { x: 100 + (eye === 'OD' ? -dx : dx), y: 104 + child * 3.5 };
}

function Paddle(props: { eye: Eye; age: number; on: boolean; pinhole: boolean; flipping: boolean; uid: string; reducedMotion: boolean }) {
  const c = eyeCentre(props.age, props.eye);
  const side = props.eye === 'OD' ? -1 : 1;
  const off = `translate(${c.x + side * 70}px, ${c.y + 150}px) rotate(${side * 32}deg)`;
  const onT = `translate(${c.x}px, ${c.y}px) rotate(${-side * (props.pinhole ? 24 : 16)}deg)`;
  return (
    <g
      class={`va-paddle${props.on ? ' is-on' : ''}${props.reducedMotion ? ' is-still' : ''}`}
      style={{ transform: props.on ? onT : off }}
    >
      {/* handle */}
      <path d={`M${side * 6} 16 L${side * 15} 74 Q${side * 16} 80 ${side * 10} 80 L${side * 4} 80 Q${side * -1} 80 ${side * 0} 74 L${side * -3} 14 Z`} fill={`url(#${props.uid}-handle)`} />
      <g class={`va-paddle__face${props.flipping ? ' is-flipping' : ''}`}>
        <ellipse cx="0" cy="0" rx="23" ry="20" fill={`url(#${props.uid}-${props.pinhole ? 'phdisc' : 'disc'})`} mask={props.pinhole ? `url(#${props.uid}-holes)` : undefined} />
        <ellipse cx="0" cy="0" rx="22.2" ry="19.2" fill="none" stroke="rgba(255,226,170,0.55)" stroke-width="0.9" />
        <ellipse cx="-6" cy="-8" rx="11" ry="5.5" fill="rgba(255,255,255,0.13)" transform="rotate(-18)" />
        {props.pinhole && (
          <g>
            {[[0, 0], [-6, -3.5], [6, -3.5], [-6, 3.5], [6, 3.5], [0, -7], [0, 7]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.25" fill="none" stroke="rgba(255,214,150,0.65)" stroke-width="0.45" />
            ))}
          </g>
        )}
      </g>
    </g>
  );
}

let uidSeq = 0;

export function PatientPane(p: PatientPaneProps) {
  const uid = useRef(`vao${++uidSeq}`).current;
  const [flipping, setFlipping] = useState(false);
  const [face, setFace] = useState<Eye | null>(p.pinholeEye);
  const prev = useRef(p.pinholeEye);

  // Flip animation: squash the disc, swap its face at the midpoint, spring back.
  useEffect(() => {
    if (prev.current === p.pinholeEye) return;
    prev.current = p.pinholeEye;
    if (p.reducedMotion) {
      setFace(p.pinholeEye);
      return;
    }
    setFlipping(true);
    const t1 = setTimeout(() => {
      setFace(p.pinholeEye);
      setFlipping(false);
    }, 170);
    return () => clearTimeout(t1);
  }, [p.pinholeEye, p.reducedMotion]);

  const age = p.patient.age;
  const eyes: Eye[] = ['OD', 'OS'];
  return (
    <div class="va-patient__portrait">
      <PatientAvatar
        spec={p.patient.avatar}
        age={age}
        sex={p.patient.sex}
        expression={p.expression}
        lookAt={{ x: -0.35, y: -0.3 }}
        reducedMotion={p.reducedMotion}
        size="100%"
        label={`${p.patient.name}, reading the chart`}
      />
      <svg class="va-occ" viewBox="0 0 200 240" aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-disc`} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stop-color="#3a3146" />
            <stop offset="55%" stop-color="#14101c" />
            <stop offset="100%" stop-color="#050308" />
          </radialGradient>
          <radialGradient id={`${uid}-phdisc`} cx="35%" cy="30%" r="80%">
            <stop offset="0%" stop-color="#6a3f86" />
            <stop offset="55%" stop-color="#2c1640" />
            <stop offset="100%" stop-color="#12081c" />
          </radialGradient>
          <linearGradient id={`${uid}-handle`} x1="0" x2="1">
            <stop offset="0%" stop-color="#7a5418" />
            <stop offset="45%" stop-color="#f2c46b" />
            <stop offset="100%" stop-color="#8f6420" />
          </linearGradient>
          <mask id={`${uid}-holes`} maskUnits="userSpaceOnUse" x="-30" y="-30" width="60" height="60">
            <rect x="-30" y="-30" width="60" height="60" fill="#fff" />
            {[[0, 0], [-6, -3.5], [6, -3.5], [-6, 3.5], [6, 3.5], [0, -7], [0, 7]].map(([x, y], i) => (
              <circle key={i} cx={x} cy={y} r="1.1" fill="#000" />
            ))}
          </mask>
        </defs>
        {eyes.map((e) => (
          <Paddle key={e} eye={e} age={age} on={!p.covered[e] ? false : true} pinhole={false} flipping={false} uid={uid} reducedMotion={p.reducedMotion} />
        ))}
        {eyes.map((e) => (
          <Paddle key={`ph${e}`} eye={e} age={age} on={face === e} pinhole flipping={flipping} uid={uid} reducedMotion={p.reducedMotion} />
        ))}
      </svg>
      {p.onToggleEye &&
        eyes.map((e) => {
          const c = eyeCentre(age, e);
          return (
            <button
              key={e}
              type="button"
              class={`va-eyehit${p.covered[e] ? ' is-covered' : ''}`}
              style={{ left: `${(c.x / 200) * 100}%`, top: `${(c.y / 240) * 100}%` }}
              aria-pressed={p.covered[e]}
              aria-label={`${p.covered[e] ? 'Uncover' : 'Cover'} the patient's ${e === 'OD' ? 'right' : 'left'} eye (${e})`}
              onClick={() => p.onToggleEye!(e)}
            >
              <span class="va-eyehit__tag">{e}</span>
            </button>
          );
        })}
    </div>
  );
}
