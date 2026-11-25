/**
 * Shared state for PatientAvatar and AvatarBust: the paint context, the rig's
 * current pose, and the animation loop that writes only what changed.
 *
 * Performance model: breathing and sway are CSS keyframe animations on two
 * composited wrappers (portrait), so they run on the compositor and never
 * repaint the SVG; blinks/glances rewrite only the eye layer's attributes;
 * brows and mouth are touched only while an expression is blending. No DOM
 * reads happen per frame.
 */
import { useEffect, useId, useLayoutEffect, useMemo, useRef } from 'preact/hooks';
import type { AvatarSpec, Eye } from '@core';
import type { AvatarSex } from './generate';
import { buildGeo, traitsFor, type Geo, type Side } from './geometry';
import { SKIN } from './palette';
import type { PaintCtx } from './parts/ctx';
import { eyeAttrs, faceAttrs, lerpRig, rigAttrs, rigDistance, targetRig, type AttrMap, type Expression, type External, type Gaze, type RigParams, type Strabismus } from './rig';
import { ensureAvatarStyles } from './styles';
import { onTick } from './ticker';

export interface AvatarModelProps {
  spec: AvatarSpec;
  age: number;
  sex: AvatarSex;
  expression?: Expression;
  external?: External;
  strabismus?: Strabismus;
  lookAt?: Gaze | null;
  pupils?: Partial<Record<Eye, number>>;
  animated?: boolean;
  reducedMotion?: boolean;
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
export function blinkCurve(t: number): number {
  if (t < 0 || t > BLINK_MS) return 0;
  const close = 0.075;
  const hold = 0.035;
  if (t < close) return t / close;
  if (t < close + hold) return 1;
  const u = (t - close - hold) / (BLINK_MS - close - hold);
  return 1 - u * u * (3 - 2 * u);
}

/** Side of a unilateral skin sign (rash / temporal artery): OD = viewer-left (-1). */
export function signSideFor(ext: External | undefined): Side {
  const one = (list?: Eye[]) => (list && list.length === 1 ? list[0] : undefined);
  const eye = one(ext?.redEye) ?? one(ext?.ptosis) ?? one(ext?.tearing) ?? 'OD';
  return eye === 'OD' ? -1 : 1;
}

const EYE_WORD: Record<Eye, string> = { OD: 'right', OS: 'left' };
function eyesPhrase(list: Eye[] | undefined, one: string, both: string): string | null {
  if (!list || !list.length) return null;
  return list.length > 1 ? both : one.replace('%', EYE_WORD[list[0]!]);
}

/** Screen-reader description of the visible clinical clues (patient's right/left). */
/** Edition language for built-in labels: the render layer has no services, so it reads <html lang>. */
export function renderLocale(): 'en' | 'he' {
  return typeof document !== 'undefined' && document.documentElement.lang === 'he' ? 'he' : 'en';
}

const HE_EYE: Record<Eye, string> = { OD: 'ימין', OS: 'שמאל' };
const HE_DIR: Record<Strabismus['direction'], string> = { in: 'פנימה', out: 'החוצה', up: 'למעלה', down: 'למטה' };
const HE_EXPR: Record<Expression, string> = {
  neutral: 'רגוע', worried: 'מודאג', pain: 'כאב', happy: 'שמח', relieved: 'מרוגע', squint: 'פוזל מאור', surprised: 'מופתע',
};
function describeSignsHe(ext: External | undefined, strab?: Strabismus, pupils?: Partial<Record<Eye, number>>): string[] {
  const e = ext ?? {};
  const out: string[] = [];
  const both = (l: Eye[] | undefined, one: (s: string) => string, two: string) => {
    if (!l || !l.length) return;
    out.push(l.length > 1 ? two : one(HE_EYE[l[0]!]));
  };
  both(e.redEye, (s) => `עין ${s} אדומה`, 'שתי העיניים אדומות');
  both(e.tearing, (s) => `עין ${s} דומעת`, 'שתי העיניים דומעות');
  both(e.ptosis, (s) => `עפעף עליון ${s} צונח`, 'שני העפעפיים העליונים צונחים');
  both(e.proptosis, (s) => `עין ${s} בולטת`, 'שתי העיניים בולטות');
  if (e.squinting) out.push('פוזל מאור');
  if (e.photophobia) out.push('מגן על העיניים מפני האור');
  if (e.eyePatch) out.push(`רטייה על עין ${HE_EYE[e.eyePatch]}`);
  if (e.rash === 'forehead-dermatomal') out.push(`פריחה שלפוחית במצח ${HE_EYE[signSideFor(e) < 0 ? 'OD' : 'OS']}`);
  if (e.templeTenderness) out.push(`עורק רקה ${HE_EYE[signSideFor(e) < 0 ? 'OD' : 'OS']} בולט ומפותל`);
  if (strab) out.push(`עין ${HE_EYE[strab.eye]} סוטה ${HE_DIR[strab.direction]}`);
  for (const eye of ['OD', 'OS'] as const) {
    const k = pupils?.[eye];
    if (k && k > 1.2) out.push(`אישון ${HE_EYE[eye]} רחב`);
    else if (k && k < 0.8) out.push(`אישון ${HE_EYE[eye]} צר`);
  }
  return out;
}

export function describeSigns(ext: External | undefined, strab?: Strabismus, pupils?: Partial<Record<Eye, number>>, locale: 'en' | 'he' = 'en'): string[] {
  if (!ext && !strab && !pupils) return [];
  if (locale === 'he') return describeSignsHe(ext, strab, pupils);
  const e = ext ?? {};
  const out: string[] = [];
  const push = (s: string | null) => s && out.push(s);
  push(eyesPhrase(e.redEye, 'red % eye', 'both eyes red'));
  push(eyesPhrase(e.tearing, 'watering % eye', 'both eyes watering'));
  push(eyesPhrase(e.ptosis, 'drooping % upper eyelid', 'both upper eyelids drooping'));
  push(eyesPhrase(e.proptosis, 'bulging % eye', 'both eyes bulging'));
  if (e.squinting) out.push('squinting');
  if (e.photophobia) out.push('shielding the eyes from light');
  if (e.eyePatch) out.push(`patch over the ${EYE_WORD[e.eyePatch]} eye`);
  if (e.rash === 'forehead-dermatomal') out.push(`blistering rash on the ${EYE_WORD[signSideFor(e) < 0 ? 'OD' : 'OS']} forehead`);
  if (e.templeTenderness) out.push(`prominent, tortuous ${EYE_WORD[signSideFor(e) < 0 ? 'OD' : 'OS']} temple artery`);
  if (strab) out.push(`${EYE_WORD[strab.eye]} eye turned ${strab.direction}`);
  for (const eye of ['OD', 'OS'] as const) {
    const k = pupils?.[eye];
    if (k && k > 1.2) out.push(`large ${EYE_WORD[eye]} pupil`);
    else if (k && k < 0.8) out.push(`small ${EYE_WORD[eye]} pupil`);
  }
  return out;
}

let fallbackUid = 0;

export interface AvatarModel {
  c: PaintCtx;
  g: Geo;
  /** attributes for the current (static) render */
  a: AttrMap;
  label: string;
  /** collects every [data-r] element after each render */
  collect(root: Element | null): void;
  st: { current: AnimState | null };
  live: { current: { target: RigParams; lookAt: Gaze | null | undefined; reducedMotion: boolean; geo: Geo } };
  els: { current: Map<string, Element> };
  cache: { current: Map<string, string> };
}

export function useAvatarModel(props: AvatarModelProps): AvatarModel {
  const { spec, age, sex, expression = 'neutral', external, strabismus, lookAt, pupils, animated = true, reducedMotion = false } = props;
  const rawId = typeof useId === 'function' ? useId() : `u${++fallbackUid}`;
  const uid = useMemo(() => `lav${rawId.replace(/[^a-zA-Z0-9_-]/g, '')}`, [rawId]);
  const extKey = JSON.stringify(external ?? {});
  const ext = useMemo<External>(() => external ?? {}, [extKey]);
  const traits = useMemo(() => traitsFor(spec, age, sex), [spec.skin, spec.hair, spec.hairColor, spec.irisColor, spec.outfit, spec.glasses, spec.facialHair, spec.headwear, spec.accessory, age, sex]);
  const geo = useMemo(() => buildGeo(age, sex, traits), [age, sex, traits]);
  const target = useMemo(() => targetRig(expression, ext), [expression, ext]);

  const st = useRef<AnimState | null>(null);
  if (!st.current) {
    st.current = { params: target, gaze: lookAt ?? { x: 0, y: 0 }, goal: { x: 0, y: 0 }, nextGlance: 0, nextBlink: 0, blinkStart: -1, doubleBlink: false };
  }
  if (!animated) {
    st.current.params = target;
    st.current.gaze = lookAt ?? { x: 0, y: 0 };
  }
  const live = useRef({ target, lookAt, reducedMotion, geo });
  live.current = { target, lookAt, reducedMotion, geo };
  const els = useRef<Map<string, Element>>(new Map());
  const cache = useRef<Map<string, string>>(new Map());

  const c: PaintCtx = useMemo(() => {
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

  const s = st.current;
  const a = rigAttrs(geo, { params: s.params, gazeL: s.gaze, gazeR: s.gaze, blink: 0, breath: 0, sway: 0, nod: 0 });
  const loc = renderLocale();
  const signs = describeSigns(external, strabismus, pupils, loc);
  const label = props.label ?? (loc === 'he'
    ? `דיוקן המטופל, הבעה: ${HE_EXPR[expression]}${signs.length ? `; ${signs.join(', ')}` : ''}`
    : `Patient portrait, ${expression === 'neutral' ? 'calm' : expression} expression${signs.length ? `; ${signs.join(', ')}` : ''}`);

  // Synchronous + idempotent so the very first paint is already laid out.
  if (typeof document !== 'undefined') ensureAvatarStyles();

  return {
    c,
    g: geo,
    a,
    label,
    st,
    live,
    els,
    cache,
    collect(root) {
      const m = new Map<string, Element>();
      root?.querySelectorAll('[data-r]').forEach((el) => m.set(el.getAttribute('data-r')!, el));
      els.current = m;
      // Preact just wrote render-time values; force a fresh write next frame.
      cache.current.clear();
    },
  };
}

export interface RigDriver {
  /** Element measured to decide "micro" (tile-size) mode; gets the `lav-posed` class. */
  root: { current: Element | null };
  /** Whether this renderer has an idle pose (breathing/sway) at all. */
  posable: boolean;
}

/** Below this rendered width, breathing/sway are sub-pixel: blink & glance only. */
export const MICRO_PX = 170;

export function useRigAnimation(m: AvatarModel, animated: boolean, driver: RigDriver): void {
  const drv = useRef(driver);
  drv.current = driver;
  useLayoutEffect(() => {
    m.collect(driver.root.current);
  });

  useEffect(() => {
    if (!animated) return;
    const s = m.st.current!;
    const cache = m.cache.current;
    let micro = false;
    let posed: boolean | null = null;
    let lastBlink = -1;
    let lastGx = NaN;
    let lastGy = NaN;
    const measure = () => {
      const w = drv.current.root.current?.getBoundingClientRect().width ?? 999;
      micro = w > 0 && w < MICRO_PX;
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    if (ro && drv.current.root.current) ro.observe(drv.current.root.current);

    const write = (attrs: AttrMap) => {
      const map = m.els.current;
      for (const key in attrs) {
        const el = map.get(key);
        if (!el) continue;
        const kv = attrs[key]!;
        for (const name in kv) {
          const v = kv[name]!;
          const ck = `${key}.${name}`;
          if (cache.get(ck) !== v) {
            el.setAttribute(name, v);
            cache.set(ck, v);
          }
        }
      }
    };

    const off = onTick((t, dt, frame) => {
      const L = m.live.current;
      const rm = L.reducedMotion || micro;
      // expression easing (~250 ms)
      const moving = rigDistance(s.params, L.target) > 0.002;
      if (moving) s.params = lerpRig(s.params, L.target, 1 - Math.exp(-dt * 11));
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
        s.nextGlance = t + (away ? 0.7 + Math.random() : (micro ? 3 : 1.6) + Math.random() * 2.8);
      }
      const gk = 1 - Math.exp(-dt * (rm ? 40 : 24));
      const gx = s.gaze.x + (s.goal.x - s.gaze.x) * gk;
      const gy = s.gaze.y + (s.goal.y - s.gaze.y) * gk;
      s.gaze = Math.abs(gx - s.goal.x) < 0.001 && Math.abs(gy - s.goal.y) < 0.001 ? { ...s.goal } : { x: gx, y: gy };

      // Eyes: only when the lids, gaze or expression actually changed. Tiles
      // update on even frames only, so a waiting room's many small blinks
      // share paint frames instead of dirtying every single one.
      const q = (v: number) => Math.round(v * 400);
      if (micro && frame & 1 && !moving) return;
      if (moving || q(blink) !== lastBlink || q(s.gaze.x) !== lastGx || q(s.gaze.y) !== lastGy) {
        lastBlink = q(blink);
        lastGx = q(s.gaze.x);
        lastGy = q(s.gaze.y);
        write(eyeAttrs(L.geo, s.params, s.gaze, s.gaze, blink));
      }
      if (moving) write(faceAttrs(L.geo, s.params));

      // Breathing + sway are CSS keyframe animations on composited wrappers
      // (zero main-thread work per frame); we only switch them on or off.
      const want = drv.current.posable && !rm;
      if (want !== posed) {
        posed = want;
        drv.current.root.current?.classList.toggle('lav-posed', want);
      }
    });
    return () => {
      off();
      ro?.disconnect();
      drv.current.root.current?.classList.remove('lav-posed');
    };
  }, [animated, m.c.t.seed]);
}
