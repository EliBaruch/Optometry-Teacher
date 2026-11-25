/**
 * The portrait split into paint layers. PatientAvatar stacks them as separate
 * SVGs (static backdrop, breathing body, swaying head with its own eye layer);
 * AvatarBust nests the same content in one SVG.
 */
import type { VNode } from 'preact';
import { mix } from './color';
import { CX, VIEW_H, VIEW_W } from './geometry';
import { grainDataUrl } from './grain';
import { GOLD } from './palette';
import { bodyDefs, Body } from './parts/body';
import type { PaintCtx } from './parts/ctx';
import { AccessoryBody, AccessoryEar, Bandage, FacialHairOver, FacialHairUnder, Glasses, Headwear, ScarfBack } from './parts/extras';
import { AgeMarks, Ears, faceDefs, Head, Nose } from './parts/face';
import { Brows, Eyes, Mouth } from './parts/features';
import { hairDefs, hairLayers, type HairLayers } from './parts/hair';
import { EyePatch, Rash, ShieldHand, TearStreaks, TemporalArtery, templeMask } from './parts/signs';
import type { AttrMap } from './rig';

export function Defs({ c, grain }: { c: PaintCtx; grain: boolean }) {
  const bg = mix(c.spec.outfit, '#1a0f2e', 0.68);
  const url = grain ? grainDataUrl() : null;
  return (
    <defs>
      {faceDefs(c)}
      {hairDefs(c)}
      {bodyDefs(c)}
      {templeMask(c)}
      <radialGradient id={c.id('bg')} gradientUnits="userSpaceOnUse" cx={CX + 18} cy="80" r="170">
        <stop offset="0" stop-color={mix(bg, GOLD, 0.12)} />
        <stop offset="0.55" stop-color={bg} />
        <stop offset="1" stop-color="#0b0716" />
      </radialGradient>
      <radialGradient id={c.id('key')}>
        <stop offset="0" stop-color={GOLD} stop-opacity="0.35" />
        <stop offset="1" stop-color={GOLD} stop-opacity="0" />
      </radialGradient>
      {url && (
        <pattern id={c.id('grain')} width="48" height="48" patternUnits="userSpaceOnUse">
          <image href={url} width="48" height="48" />
        </pattern>
      )}
    </defs>
  );
}

export function Backdrop({ c, grain }: { c: PaintCtx; grain: boolean }) {
  return (
    <g>
      <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={c.url('bg')} />
      <circle cx="172" cy="34" r="90" fill={c.url('key')} />
      <circle cx="28" cy="58" r="5" fill={GOLD} opacity="0.08" />
      <circle cx="40" cy="176" r="9" fill="#a78bfa" opacity="0.07" />
      <circle cx="182" cy="150" r="4" fill="#fff" opacity="0.06" />
      {grain && <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={c.url('grain')} opacity="0.32" />}
    </g>
  );
}

/**
 * Film grain baked into a layer: plain alpha speckle (no blend mode), so it is
 * rasterised with that layer once and never forces a per-frame repaint.
 */
export function GrainOverlay({ c, strength, clip }: { c: PaintCtx; strength: number; clip?: string }) {
  return <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={c.url('grain')} opacity={strength} clip-path={clip} />;
}

export function BodyContent({ c }: { c: PaintCtx }) {
  return (
    <g>
      <ScarfBack c={c} />
      <Body c={c} />
      <AccessoryBody c={c} />
    </g>
  );
}

export function useHair(c: PaintCtx): HairLayers {
  return c.scarf ? { back: null, front: null, scalp: null } : hairLayers(c);
}

const hairClip = (c: PaintCtx) => (c.crownHidden ? c.url('belowHat') : undefined);

/** Behind the eyes: back hair, ears, skin, nose, folds. */
export function HeadBase({ c, a, hair }: { c: PaintCtx; a: AttrMap; hair: HairLayers }) {
  return (
    <g>
      <g clip-path={hairClip(c)}>{hair.back}</g>
      <Ears c={c} />
      <AccessoryEar c={c} />
      <Head c={c} a={a} />
      {hair.scalp}
      <AgeMarks c={c} a={a} />
      <FacialHairUnder c={c} />
      <Nose c={c} />
    </g>
  );
}

export function EyesContent({ c, a }: { c: PaintCtx; a: AttrMap }) {
  return (
    <g>
      <Eyes c={c} a={a} />
      <TearStreaks c={c} />
    </g>
  );
}

/** In front of the eyes: brows, mouth, front hair, headwear, glasses, hand. */
export function FaceTop({ c, a, hair }: { c: PaintCtx; a: AttrMap; hair: HairLayers }): VNode {
  const front = c.ext.templeTenderness ? <g mask={c.url('templeMask')}>{hair.front}</g> : hair.front;
  return (
    <g>
      <Rash c={c} />
      <Brows c={c} a={a} />
      <Mouth c={c} a={a} />
      <FacialHairOver c={c} />
      <g clip-path={hairClip(c)}>{front}</g>
      <TemporalArtery c={c} />
      <Bandage c={c} />
      <EyePatch c={c} />
      <Headwear c={c} />
      <Glasses c={c} />
      <ShieldHand c={c} />
    </g>
  );
}
