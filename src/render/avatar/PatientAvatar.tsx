import { useRef } from 'preact/hooks';
import type { Eye } from '@core';
import { CX, VIEW_H, VIEW_W } from './geometry';
import { Backdrop, BodyContent, Defs, EyesContent, FaceTop, GrainOverlay, HeadBase, useHair } from './layers';
import { useAvatarModel, useRigAnimation, type AvatarModelProps } from './model';

export { signSideFor, describeSigns } from './model';

export interface PatientAvatarProps extends AvatarModelProps {
  /** Visible clinical signs (PatientFindings['external']). */
  external?: AvatarModelProps['external'];
  /** Manifest deviation of one eye (OD = patient's right = viewer's left). */
  strabismus?: AvatarModelProps['strabismus'];
  /** Where the patient looks, x/y in -1..1 (x+ = viewer's right, y+ = down). Omit for idle glances. */
  lookAt?: AvatarModelProps['lookAt'];
  /** Pupil size multipliers, e.g. { OS: 1.6 } for a dilated left pupil. */
  pupils?: Partial<Record<Eye, number>>;
  /** Pixel width (height is 1.2x) or any CSS length. Defaults to filling the container width. */
  size?: number | string;
  /** Breathing, sway, blinks and glances. Default true. */
  animated?: boolean;
  /** Disables sway/breathing/glance travel (blinks remain, they are not vestibular). */
  reducedMotion?: boolean;
  /** Paint the jewel-toned portrait background (and clip to the frame). Default true. */
  backdrop?: boolean;
  class?: string;
  /** Accessible label; defaults to a description including visible clinical signs. */
  label?: string;
}

const pct = (v: number, of: number) => `${((v / of) * 100).toFixed(3)}%`;

/**
 * A premium procedural patient portrait. Breathes, blinks, glances and changes
 * expression smoothly; shows visible clinical signs from `external`.
 *
 * Rendered as stacked SVG layers: a static backdrop, a breathing wrapper
 * (body + head) and a swaying head wrapper driven by compositor-only CSS
 * keyframes, and a separate eye SVG so a blink re-records only the eyes.
 */
export function PatientAvatar(props: PatientAvatarProps) {
  const { animated = true, backdrop = true } = props;
  const m = useAvatarModel(props);
  const { c, a, g } = m;
  const root = useRef<HTMLDivElement>(null);
  useRigAnimation(m, animated, { root, posable: true });

  const hair = useHair(c);
  const size = props.size;
  const style: Record<string, string> =
    size === undefined ? { width: '100%' } : typeof size === 'number' ? { width: `${size}px`, height: `${size * 1.2}px` } : { width: size };
  const vb = `0 0 ${VIEW_W} ${VIEW_H}`;
  const pivot = `${pct(CX, VIEW_W)} ${pct(g.chinY + 6, VIEW_H)}`;
  const cls = `lav-root lav-portrait${animated ? ' lav-anim' : ''}${backdrop ? ' lav-framed' : ''}${props.class ? ` ${props.class}` : ''}`;

  // per-patient rhythm so a waiting room never breathes in unison
  const seed = c.t.seed;
  const breathe = { animationDuration: `${4000 + (seed % 800)}ms`, animationDelay: `-${seed % 4000}ms` };
  const sway = { transformOrigin: pivot, animationDuration: `${11000 + (seed % 4000)}ms`, animationDelay: `-${(seed >>> 3) % 11000}ms` };

  return (
    <div ref={root} class={cls} style={style} role="img" aria-label={m.label} data-expression={props.expression ?? 'neutral'}>
      <svg class="lav-layer" viewBox={vb} aria-hidden="true" focusable="false">
        <Defs c={c} grain={backdrop} />
        {backdrop && <Backdrop c={c} grain />}
      </svg>
      <div class="lav-rig lav-breathe" style={breathe}>
        <svg class="lav-layer" viewBox={vb} aria-hidden="true" focusable="false">
          <BodyContent c={c} />
          {backdrop && <GrainOverlay c={c} strength={0.14} />}
        </svg>
        <div class="lav-rig lav-sway" style={sway}>
          <svg class="lav-layer" viewBox={vb} aria-hidden="true" focusable="false">
            <HeadBase c={c} a={a} hair={hair} />
            {backdrop && <GrainOverlay c={c} strength={0.12} clip={c.url('headClip')} />}
          </svg>
          <svg class="lav-layer lav-eyes" viewBox={vb} aria-hidden="true" focusable="false">
            <EyesContent c={c} a={a} />
          </svg>
          <svg class="lav-layer" viewBox={vb} aria-hidden="true" focusable="false">
            <FaceTop c={c} a={a} hair={hair} />
          </svg>
        </div>
      </div>
    </div>
  );
}
