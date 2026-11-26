import { useRef } from 'preact/hooks';
import { CX } from './geometry';
import { BodyContent, Defs, EyesContent, FaceTop, HeadBase, useHair } from './layers';
import { useAvatarModel, useRigAnimation, type AvatarModelProps } from './model';
import { GOLD } from './palette';

export interface AvatarBustProps extends AvatarModelProps {
  /** Diameter in px. Default 48. */
  size?: number;
  /** Ring colour (rank / rarity / rival accent). Default candle gold. */
  ring?: string;
  /** Static by default — list rows shouldn't all be blinking at you. */
  animated?: boolean;
  class?: string;
}

const R = 72;

/**
 * Circular head-and-shoulders crop for list rows, leaderboards and chips.
 * A single small SVG (consumers may style `> svg`); when animated it only
 * blinks and glances, since sway is sub-pixel at this size.
 */
export function AvatarBust(props: AvatarBustProps) {
  const { size = 48, animated = false, ring = GOLD } = props;
  const m = useAvatarModel({ ...props, animated });
  const { c, a, g } = m;
  const root = useRef<SVGSVGElement>(null);
  // sway/breathing are sub-pixel at bust size: blink & glance only
  useRigAnimation(m, animated, { root, posable: false });
  const hair = useHair(c);
  const cy = (g.headTop + g.chinY) / 2 + 3;
  const clip = c.id('bustClip');
  return (
    <svg
      ref={root}
      class={`lav-root lav-bust${props.class ? ` ${props.class}` : ''}`}
      viewBox={`${CX - R} ${cy - R} ${R * 2} ${R * 2}`}
      style={{ width: `${size}px`, height: `${size}px` }}
      role="img"
      aria-label={m.label}
      data-expression={props.expression ?? 'neutral'}
    >
      <Defs c={c} grain={false} />
      <defs>
        <clipPath id={clip}>
          <circle cx={CX} cy={cy} r={R - 2} />
        </clipPath>
      </defs>
      <g clip-path={`url(#${clip})`}>
        <rect x={CX - R} y={cy - R} width={R * 2} height={R * 2} fill={c.url('bg')} />
        <circle cx={CX + 40} cy={cy - 46} r="60" fill={c.url('key')} />
        <g data-r="body">
          <BodyContent c={c} />
        </g>
        <g data-r="head">
          <HeadBase c={c} a={a} hair={hair} />
          <EyesContent c={c} a={a} />
          <FaceTop c={c} a={a} hair={hair} />
        </g>
      </g>
      <circle cx={CX} cy={cy} r={R - 2} fill="none" stroke="#0f283c" stroke-opacity="0.12" stroke-width="5" />
      <circle cx={CX} cy={cy} r={R - 3} fill="none" stroke={ring} stroke-width="3.2" />
      <circle cx={CX} cy={cy} r={R - 1} fill="none" stroke="#fff" stroke-opacity="0.7" stroke-width="0.8" />
    </svg>
  );
}
