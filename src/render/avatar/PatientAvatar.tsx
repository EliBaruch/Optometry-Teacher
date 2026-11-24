import { useEffect, useId, useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { AvatarSpec, Eye } from '@core';
import { mix } from '../fx/color';
import { fbm1 } from '../fx/noise';
import type { AvatarSex } from './generate';
import { CX, VIEW_H, VIEW_W, buildGeo, traitsFor, type Side } from './geometry';
import { GOLD, SKIN } from './palette';
import { bodyDefs, Body } from './parts/body';
import type { PaintCtx } from './parts/ctx';
import { AccessoryBody, AccessoryEar, Bandage, FacialHairOver, FacialHairUnder, Glasses, Headwear, ScarfBack } from './parts/extras';
import { AgeMarks, Ears, faceDefs, Head, Nose } from './parts/face';
import { Brows, Eyes, Mouth } from './parts/features';
import { hairDefs, hairLayers } from './parts/hair';
import { EyePatch, Rash, ShieldHand, TearStreaks, TemporalArtery } from './parts/signs';
import { lerpRig, rigAttrs, rigDistance, targetRig, type AttrMap, type Expression, type External, type Gaze, type RigParams, type Strabismus } from './rig';
import { grainDataUrl } from './grain';
import { ensureAvatarStyles } from './styles';
import { onTick } from './ticker';

export interface PatientAvatarProps {
  spec: AvatarSpec;
  age: number;
  sex: AvatarSex;
  expression?: Expression;
  /** Visible clinical signs (PatientFindings['external']). */
  external?: External;
  /** Manifest deviation of one eye (OD = patient's right = viewer's left). */
  strabismus?: Strabismus;
  /** Where the patient looks, x/y in -1..1 (x+ = viewer's right, y+ = down). Omit for idle glances. */
  lookAt?: Gaze | null;
  /** Pupil size multipliers, e.g. { OS: 1.6 } for a dilated left pupil. */
  pupils?: Partial<Record<Eye, number>>;
  /** Pixel width (height is 1.2x) or any CSS length. Defaults to filling the container width. */
  size?: number | string;
  /** Breathing, sway, blinks and glances. Default true. */
  animated?: boolean;
  /** Disables sway/breathing/glance travel (blinks remain, they are not vestibular). */
  reducedMotion?: boolean;
  /** Paint the jewel-toned portrait background. Default true. */
  backdrop?: boolean;
  class?: string;
  /** Accessible label; defaults to a neutral description. */
  label?: string;
}

interface AnimState {
  params: RigParams;
  gaze: Gaze;
  goal: Gaze;
  nextGlance: number;
  nextBlink: number;
  blinkStart: number;
  doubleBlink: boolean;
}

const BLINK_MS = 0.26;
function blinkCurve(t: number): number {
  if (t < 0 || t > BLINK_MS) return 0;
  const close = 0.075;
  const hold = 0.035;
  if (t < close) return t / close;
  if (t < close + hold) return 1;
  const u = (t - close - hold) / (BLINK_MS - close - hold);
  return 1 - u * u * (3 - 2 * u);
}

let fallbackUid = 0;

export function signSideFor(ext: External | undefined): Side {
  const one = (list?: Eye[]) => (list && list.length === 1 ? list[0] : undefined);
  const eye = one(ext?.redEye) ?? one(ext?.ptosis) ?? one(ext?.tearing) ?? 'OD';
  return eye === 'OD' ? -1 : 1;
}

/** Internal: shared by PatientAvatar and AvatarBust. */
export function AvatarSvg(props: PatientAvatarProps & { variant?: 'portrait' | 'bust'; ring?: string }) {
  const { spec, age, sex, expression = 'neutral', external, strabismus, lookAt, pupils, animated = true, reducedMotion = false, backdrop = true, variant = 'portrait' } = props;
  const rawId = typeof useId === 'function' ? useId() : `u${++fallbackUid}`;
  const uid = useMemo(() => `lav${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const svgRef = useRef<SVGSVGElement>(null);
  const els = useRef<Map<string, Element>>(new Map());

  const extKey = JSON.stringify(external ?? {});
  const ext = useMemo<External>(() => external ?? {}, [extKey]);
  const traits = useMemo(() => traitsFor(spec, age, sex), [spec.skin, spec.hair, spec.hairColor, spec.irisColor, spec.outfit, spec.glasses, spec.facialHair, spec.headwear, spec.accessory, age, sex]);
  const geo = useMemo(() => buildGeo(age, sex, traits), [age, sex, traits]);
  const target = useMemo(() => targetRig(expression, ext), [expression, ext]);

  const st = useRef<AnimState | null>(null);
  if (!st.current) {
    st.current = { params: target, gaze: lookAt ?? { x: 0, y: 0 }, goal: { x: 0, y: 0 }, nextGlance: 0, nextBlink: 0, blinkStart: -1, doubleBlink: false };
  }
  const live = useRef({ target, lookAt, reducedMotion, geo });
  live.current = { target, lookAt, reducedMotion, geo };

  if (!animated) {
    st.current.params = target;
    st.current.gaze = lookAt ?? { x: 0, y: 0 };
  }

  const ctx: PaintCtx = useMemo(() => {
    const crownHidden = spec.headwear === 'cap' || spec.headwear === 'beanie' || spec.headwear === 'hard-hat';
    return {
      g: geo,
      t: traits,
      spec,
      skin: SKIN[spec.skin] ?? SKIN[2],
      age,
      sex,
      hair: spec.hairColor,
      ext,
      strabismus,
      pupils: { L: pupils?.OD ?? 1, R: pupils?.OS ?? 1 },
      signSide: signSideFor(ext),
      id: (n: string) => `${uid}-${n}`,
      url: (n: string) => `url(#${uid}-${n})`,
      crownHidden,
      scarf: spec.headwear === 'headscarf',
      animated: animated && !reducedMotion,
    };
  }, [geo, traits, spec, age, sex, ext, strabismus?.eye, strabismus?.direction, pupils?.OD, pupils?.OS, uid, animated, reducedMotion]);

  const a: AttrMap = rigAttrs(geo, { params: st.current.params, gazeL: st.current.gaze, gazeR: st.current.gaze, blink: 0, breath: 0, sway: 0, nod: 0 });

  useLayoutEffect(() => {
    const m = new Map<string, Element>();
    svgRef.current?.querySelectorAll('[data-r]').forEach((el) => m.set(el.getAttribute('data-r')!, el));
    els.current = m;
  });

  useEffect(() => {
    ensureAvatarStyles();
  }, []);

  useEffect(() => {
    if (!animated) return;
    const s = st.current!;
    const seed = (traits.seed % 1000) / 10;
    const cache = new Map<string, string>();
    let settled = 0;
    // Tiny portraits (list tiles) skip sub-pixel breathing/sway: blinks and
    // glances only, so a full waiting room costs almost nothing per frame.
    let micro = false;
    const measure = () => {
      const w = svgRef.current?.getBoundingClientRect().width ?? 999;
      micro = w > 0 && w < 170;
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (ro && svgRef.current) ro.observe(svgRef.current);
    const off = onTick((t, dt) => {
      const L = live.current;
      const rm = L.reducedMotion || micro;
      // expression easing
      const k = 1 - Math.exp(-dt * 11);
      const moving = rigDistance(s.params, L.target) > 0.002;
      if (moving) s.params = lerpRig(s.params, L.target, k);
      // blinks: 2–6 s apart, more often when eyes are irritated
      if (s.nextBlink === 0) s.nextBlink = t + 0.6 + Math.random() * 3;
      if (t >= s.nextBlink && s.blinkStart < 0) {
        s.blinkStart = t;
        s.doubleBlink = Math.random() < 0.18;
        const irritated = L.target.lidL > 0.45 || L.target.lidR > 0.45;
        s.nextBlink = t + (irritated ? 1.2 + Math.random() * 2 : 2.2 + Math.random() * 4);
      }
      let blink = 0;
      if (s.blinkStart >= 0) {
        const bt = t - s.blinkStart;
        blink = blinkCurve(bt);
        if (s.doubleBlink && bt > BLINK_MS) blink = blinkCurve(bt - BLINK_MS - 0.06);
        if (bt > (s.doubleBlink ? BLINK_MS * 2 + 0.08 : BLINK_MS)) s.blinkStart = -1;
      }
      // gaze: follow lookAt, or wander with small saccades
      if (L.lookAt) {
        s.goal = { x: L.lookAt.x, y: L.lookAt.y };
      } else if (t >= s.nextGlance) {
        const away = Math.random() < (rm ? 0 : 0.3);
        s.goal = away ? { x: (Math.random() - 0.5) * 1.2, y: (Math.random() - 0.5) * 0.6 } : { x: (Math.random() - 0.5) * 0.25, y: (Math.random() - 0.5) * 0.15 };
        s.nextGlance = t + (away ? 0.7 + Math.random() : 1.6 + Math.random() * 2.8);
      }
      const gk = 1 - Math.exp(-dt * (rm ? 40 : 24));
      s.gaze = { x: s.gaze.x + (s.goal.x - s.gaze.x) * gk, y: s.gaze.y + (s.goal.y - s.gaze.y) * gk };

      const breath = rm ? 0 : Math.sin(((t + seed) * Math.PI * 2) / 4.4);
      const sway = rm ? 0 : fbm1(t * 0.32 + seed) * 0.9;
      const nod = rm ? 0 : fbm1(t * 0.21 + seed + 40) * 0.6;
      if (rm && !moving && blink === 0 && Math.abs(s.goal.x - s.gaze.x) < 0.002 && Math.abs(s.goal.y - s.gaze.y) < 0.002) {
        if (settled++ > 2) return;
      } else settled = 0;

      const attrs = rigAttrs(L.geo, { params: s.params, gazeL: s.gaze, gazeR: s.gaze, blink, breath, sway, nod });
      const m = els.current;
      for (const key in attrs) {
        const el = m.get(key);
        if (!el) continue;
        const kv = attrs[key]!;
        for (const name in kv) {
          const v = kv[name]!;
          const ck = `${key}.${name}`;
          if (cache.get(ck) !== v || el.getAttribute(name) !== v) {
            el.setAttribute(name, v);
            cache.set(ck, v);
          }
        }
      }
    });
    return () => {
      off();
      ro?.disconnect();
    };
  }, [animated, traits.seed]);

  const c = ctx;
  const g = geo;
  const hair = c.scarf ? { back: null, front: null, scalp: null } : hairLayers(c);
  const hairClip = c.crownHidden ? `url(#${c.id('belowHat')})` : undefined;
  const bust = variant === 'bust';
  const grain = bust ? null : grainDataUrl();
  const bustR = 72;
  const bcy = (g.headTop + g.chinY) / 2 + 3;
  const viewBox = bust ? `${CX - bustR} ${bcy - bustR} ${bustR * 2} ${bustR * 2}` : `0 0 ${VIEW_W} ${VIEW_H}`;
  const size = props.size;
  const style = size === undefined ? { width: '100%', height: 'auto' } : typeof size === 'number' ? { width: `${size}px`, height: `${bust ? size : size * 1.2}px` } : { width: size, height: 'auto' };
  const bg = mix(spec.outfit, '#1a0f2e', 0.68);
  const label = props.label ?? `Patient portrait, ${expression === 'neutral' ? 'calm' : expression} expression`;

  return (
    <svg
      ref={svgRef}
      class={`lav-root${bust ? ' lav-bust' : ''}${props.class ? ` ${props.class}` : ''}`}
      viewBox={viewBox}
      style={style}
      role="img"
      aria-label={label}
      data-expression={expression}
    >
      <defs>
        {faceDefs(c)}
        {hairDefs(c)}
        {bodyDefs(c)}
        <radialGradient id={c.id('bg')} gradientUnits="userSpaceOnUse" cx={CX + 18} cy="80" r="170">
          <stop offset="0" stop-color={mix(bg, GOLD, 0.12)} />
          <stop offset="0.55" stop-color={bg} />
          <stop offset="1" stop-color="#0b0716" />
        </radialGradient>
        <radialGradient id={c.id('key')}>
          <stop offset="0" stop-color={GOLD} stop-opacity="0.35" />
          <stop offset="1" stop-color={GOLD} stop-opacity="0" />
        </radialGradient>
        {grain && (
          <pattern id={c.id('grain')} width="48" height="48" patternUnits="userSpaceOnUse">
            <image href={grain} width="48" height="48" />
          </pattern>
        )}
        {bust && (
          <clipPath id={c.id('bustClip')}>
            <circle cx={CX} cy={bcy} r={bustR - 2} />
          </clipPath>
        )}
      </defs>
      <g clip-path={bust ? `url(#${c.id('bustClip')})` : undefined}>
        {(backdrop || bust) && (
          <g>
            <rect x="-10" y="-10" width={VIEW_W + 20} height={VIEW_H + 20} fill={`url(#${c.id('bg')})`} />
            <circle cx="172" cy="34" r="90" fill={`url(#${c.id('key')})`} />
            <circle cx="28" cy="58" r="5" fill={GOLD} opacity="0.08" />
            <circle cx="40" cy="176" r="9" fill="#a78bfa" opacity="0.07" />
            <circle cx="182" cy="150" r="4" fill="#fff" opacity="0.06" />
          </g>
        )}
        <g data-r="body" {...a.body}>
          <ScarfBack c={c} />
          <Body c={c} />
          <AccessoryBody c={c} />
        </g>
        <g data-r="head" {...a.head}>
          <g clip-path={hairClip}>{hair.back}</g>
          <Ears c={c} />
          <AccessoryEar c={c} />
          <Head c={c} a={a} />
          {hair.scalp}
          <AgeMarks c={c} a={a} />
          <TemporalArtery c={c} />
          <FacialHairUnder c={c} />
          <Nose c={c} />
          <Eyes c={c} a={a} />
          <Rash c={c} />
          <Brows c={c} a={a} />
          <TearStreaks c={c} />
          <Mouth c={c} a={a} />
          <FacialHairOver c={c} />
          <g clip-path={hairClip}>{hair.front}</g>
          <Bandage c={c} />
          <EyePatch c={c} />
          <Headwear c={c} />
          <Glasses c={c} />
        </g>
        <ShieldHand c={c} />
        {grain && <rect x="0" y="0" width={VIEW_W} height={VIEW_H} fill={`url(#${c.id('grain')})`} opacity={backdrop ? 0.09 : 0.05} style={{ mixBlendMode: 'overlay', pointerEvents: 'none' }} />}
      </g>
      {bust && (
        <>
          <circle cx={CX} cy={bcy} r={bustR - 2} fill="none" stroke="#0b0716" stroke-opacity="0.6" stroke-width="5" />
          <circle cx={CX} cy={bcy} r={bustR - 3} fill="none" stroke={props.ring ?? GOLD} stroke-width="3.2" />
          <circle cx={CX} cy={bcy} r={bustR - 1} fill="none" stroke="#fff" stroke-opacity="0.18" stroke-width="0.8" />
        </>
      )}
    </svg>
  );
}

/**
 * A premium procedural patient portrait (SVG). Breathes, blinks, glances and
 * changes expression smoothly; shows visible clinical signs from `external`.
 */
export function PatientAvatar(props: PatientAvatarProps) {
  return <AvatarSvg {...props} variant="portrait" />;
}
