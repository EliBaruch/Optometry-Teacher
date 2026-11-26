import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { EYES, otherEye, pickStrings, type Eye, type MiniGameContext, type MiniGameDone, type RetinoscopyReflex } from '@core';
import { Button, Icon } from '@ui-kit';
import { MeridianDial } from './Dial';
import { LensDrum } from './LensDrum';
import {
  ametropia, clamp, fmtAxis, fmtGross, fmtRx, fmtSigned, meridianDelta, netFromLocks, normalizeRx, quarter, reflexGeo,
  wdPower, wrapPhi, type MeridianLock, type ReflexGeo, type Rx,
} from './optics';
import type { EyeLook, ScopeScene } from './painter';
import { makeChallenge, pickWd, type Challenge } from './practice';
import { report } from './report';
import { LocaleCtx, S, useT } from './strings';
import { ChallengeCard, Debrief } from './Results';
import { assess, type Assessment, type EyeEntry } from './scoring';
import { Scope } from './Scope';
import { Tutorial } from './Tutorial';

const TUT_KEY = 'lumen.retinoscopy.tutorial.v1';
const tutorialSeen = (): boolean => {
  try { return localStorage.getItem(TUT_KEY) === '1'; } catch { return false; }
};
const markTutorialSeen = (): void => {
  try { localStorage.setItem(TUT_KEY, '1'); } catch { /* private mode */ }
};

const LENS_MIN = -16;
const LENS_MAX = 16;
const AMP = 1.45; // auto-sweep amplitude in pupil radii
const SWEEP_RATE = 2.9; // rad/s
const REFLEXES: RetinoscopyReflex[] = ['normal', 'dull', 'scissors', 'irregular', 'absent'];
const WD_CHOICES = [0, 1, 1.5, 2];

type Step = 'm1' | 'm2' | 'wd' | 'done';
interface EyeSession {
  phi: number;
  lens: number;
  step: Step;
  m1: MeridianLock | null;
  m2: MeridianLock | null;
  wd: number;
  reflex: RetinoscopyReflex | null;
  net: Rx | null;
  noReflex: boolean;
  touched: { sweep: boolean; lens: boolean; rot: boolean };
}
type Phase = 'measure' | 'challenge' | 'debrief';

const TOL: Record<RetinoscopyReflex, number> = { normal: 0.125, dull: 0.125, scissors: 0.375, irregular: 0.375, absent: -1 };

export function Game({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const loc = ctx.locale;
  const t = pickStrings(S, loc);
  const f = ctx.findings;
  const d = clamp(ctx.difficulty, 0, 1);
  const reduced = ctx.reducedMotion;
  const truth = useMemo(() => ({ OD: normalizeRx(f.refraction.OD), OS: normalizeRx(f.refraction.OS) }) as Record<Eye, Rx>, []);
  const quality = useMemo(() => ({ OD: f.retinoscopyReflex?.OD ?? 'normal', OS: f.retinoscopyReflex?.OS ?? 'normal' }) as Record<Eye, RetinoscopyReflex>, []);
  const wdCm = useMemo(() => pickWd(ctx.rng.fork('wd'), d, ctx.mode), []);
  const wdTrue = wdPower(wdCm);
  const seeds = useMemo(() => {
    const r = ctx.rng.fork('retinoscopy');
    const start = (): number => (d < 0.3 ? 180 : r.pick([180, 90, 45, 135, 165, 120]));
    return { OD: r.int(1, 99999), OS: r.int(1, 99999), startOD: start(), startOS: start() };
  }, []);
  const challenge = useMemo<Challenge | null>(() => (ctx.mode === 'practice' ? makeChallenge(f, wdCm, ctx.rng.fork('challenge'), loc) : null), []);

  const fresh = (eye: Eye): EyeSession => ({
    phi: eye === 'OD' ? seeds.startOD : seeds.startOS, lens: 0, step: 'm1', m1: null, m2: null, wd: 0, reflex: null, net: null, noReflex: false,
    touched: { sweep: false, lens: false, rot: false },
  });
  const [eye, setEye] = useState<Eye>('OD');
  const [eyes, setEyes] = useState<Record<Eye, EyeSession>>(() => ({ OD: fresh('OD'), OS: fresh('OS') }));
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [phase, setPhase] = useState<Phase>('measure');
  const [result, setResult] = useState<Assessment | null>(null);
  const [answer, setAnswer] = useState<boolean | null>(null);
  const [auto, setAuto] = useState(!reduced);
  const [guide, setGuide] = useState(d < 0.5);
  const [note, setNote] = useState<{ text: string; tone: 'ok' | 'warn' } | null>(null);
  const [ui, setUi] = useState<{ motion: ReflexGeo['motion']; neutral: boolean }>({ motion: 'with', neutral: false });
  const [switching, setSwitching] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const lockRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const finished = useRef(false);
  const timers = useRef<number[]>([]);
  const t0 = useRef(performance.now());
  const assisted = useRef(false);
  const lastSfx = useRef(0);
  const live = useRef({ e1: 0, e2: 0, axis: 180, phi: 180, quality: 'normal' as RetinoscopyReflex, lens: 0, busy: true });
  const geoRef = useRef<ReflexGeo | null>(null);
  const wasNeutral = useRef(false);
  const sw = useRef({ s: 0, manual: 0, t: 0, drag: null as number | null, phi: 180, auto: !reduced, left: false, right: false });
  const eyesRef = useRef(eyes);
  eyesRef.current = eyes;
  const eyeRef = useRef(eye);
  eyeRef.current = eye;

  const cur = eyes[eye];
  const busy = tutorial || phase !== 'measure';
  const tr = truth[eye];
  const wdLive = wdTrue; // the examiner's real distance (lens that the sim uses)
  const err = ametropia(tr, cur.lens, wdLive);
  live.current = { e1: err.e1, e2: err.e2, axis: tr.axis, phi: cur.phi, quality: quality[eye], lens: cur.lens, busy };
  sw.current.auto = auto;

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  };
  useEffect(() => () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; }, []);
  useEffect(() => { if (!tutorial) rootRef.current?.focus({ preventScroll: true }); }, [tutorial]);

  // ── frame loop hooks used by <Scope>
  const frameRef = useRef<(t: number, dt: number) => ScopeScene>(() => ({} as ScopeScene));
  frameRef.current = (t, dt) => {
    const L = live.current;
    const s = sw.current;
    s.phi = reduced ? L.phi : wrapPhi(s.phi + meridianDelta(s.phi, L.phi) * (1 - Math.exp(-dt * 16)));
    const keyDir = (s.right ? 1 : 0) - (s.left ? 1 : 0);
    let target = s.s;
    let manual = false;
    if (s.drag !== null) { target = s.drag; manual = true; }
    else if (keyDir && !L.busy) { s.manual = clamp(s.manual + keyDir * dt * 2.6, -2.1, 2.1); target = s.manual; manual = true; }
    else if (s.auto && !L.busy) { s.t += dt * SWEEP_RATE; target = AMP * Math.sin(s.t); s.manual = target; }
    else target = s.manual;
    if (manual) { s.manual = target; s.t = Math.asin(clamp(target / AMP, -1, 1)); }
    s.s += (target - s.s) * (1 - Math.exp(-dt * (s.drag !== null ? 34 : 16)));
    return { t, phi: s.phi, s: s.s, e1: L.e1, e2: L.e2, axis: L.axis, quality: L.quality, reduced, unrest: 0.25 + 0.75 * d };
  };
  const geoCb = useRef<(g: ReflexGeo, glow: number) => void>(() => {});
  geoCb.current = (g, glow) => {
    geoRef.current = g;
    ringRef.current?.style.setProperty('--rt-glow', glow.toFixed(3));
  };
  const onDrag = (p: { x: number; y: number } | null) => {
    if (busy) { sw.current.drag = null; return; }
    if (!p) { sw.current.drag = null; return; }
    const P = (sw.current.phi * Math.PI) / 180;
    sw.current.drag = clamp(p.x * Math.cos(P) - p.y * Math.sin(P), -2.1, 2.1);
    update((x) => (x.touched.sweep ? x : { ...x, touched: { ...x.touched, sweep: true } }));
  };

  // low-rate HUD sync (motion guide + neutral flag)
  useEffect(() => {
    const id = window.setInterval(() => {
      const g = geoRef.current;
      if (!g) return;
      const q = live.current.quality;
      const neutral = q !== 'absent' && g.q <= TOL[q];
      setUi((u) => (u.motion === g.motion && u.neutral === neutral ? u : { motion: g.motion, neutral }));
      if (neutral && !wasNeutral.current && !live.current.busy && d < 0.6) ctx.audio.play('sparkle', { volume: 0.22 });
      wasNeutral.current = neutral;
    }, 140);
    return () => clearInterval(id);
  }, []);

  // sweep keys (hold)
  const setKey = (k: 'left' | 'right', v: boolean) => { sw.current[k] = v; };
  useEffect(() => {
    const up = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') setKey('left', false);
      if (e.key === 'ArrowRight') setKey('right', false);
    };
    const blur = () => { setKey('left', false); setKey('right', false); };
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);

  const sfx = (id: 'lens-click' | 'dial' | 'tick', pitch = 1, volume = 0.5) => {
    const now = performance.now();
    if (now - lastSfx.current < 40) return;
    lastSfx.current = now;
    ctx.audio.play(id, { pitch, volume });
  };

  const update = (fn: (s: EyeSession) => EyeSession) => {
    const e = eyeRef.current;
    setEyes((p) => ({ ...p, [e]: fn(p[e]) }));
  };
  const canAdjust = () => !busy && eyesRef.current[eyeRef.current].step !== 'done';

  const onLens = (n: number, big: boolean) => {
    if (!canAdjust()) return;
    update((s) => ({ ...s, lens: clamp(quarter(s.lens + n * (big ? 1 : 0.25)), LENS_MIN, LENS_MAX), touched: { ...s.touched, lens: true } }));
    sfx('lens-click', 0.9 + Math.min(0.5, Math.abs(live.current.lens) / 20), 0.5);
    setNote(null);
  };
  const onRotate = (phi: number, how: 'drag' | 'step') => {
    if (!canAdjust() || eyesRef.current[eyeRef.current].step !== 'm1') return;
    update((s) => (s.phi === phi ? s : { ...s, phi, touched: { ...s.touched, rot: true } }));
    sfx(how === 'drag' ? 'tick' : 'dial', 1.1, 0.3);
  };
  const rotateBy = (deg: number) => onRotate(wrapPhi(live.current.phi + deg), 'step');

  const switchEye = (e: Eye) => {
    if (busy || e === eyeRef.current) return;
    setEye(e);
    setSwitching((n) => n + 1);
    setNote(null);
    sw.current.manual = 0;
    ctx.audio.play('whoosh', { volume: 0.45 });
  };
  const switchRef = useRef(switchEye);
  switchRef.current = switchEye;

  const burstAt = (el: HTMLElement | null, perfect = false) => {
    const r = el?.getBoundingClientRect();
    if (r) ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: perfect ? 'stars' : 'sparks', count: perfect ? 28 : 14, color: '#2257f0' });
  };

  const pickReflex = (r: RetinoscopyReflex) => {
    if (busy || cur.step === 'done') return;
    update((s) => ({ ...s, reflex: r }));
    ctx.audio.play('select', { volume: 0.4 });
  };

  const lockMeridian = () => {
    const s = eyesRef.current[eyeRef.current];
    const L = live.current;
    const g = reflexGeo(L.e1, L.e2, L.axis, s.phi);
    const tol = TOL[L.quality];
    const neutral = tol > 0 && g.q <= tol;
    if (guide && d >= 0.5) assisted.current = true;
    const lock: MeridianLock = { phi: s.phi, gross: s.lens };
    setNote(neutral
      ? { text: t.noteNeutral(fmtGross(s.lens)), tone: 'ok' }
      : { text: g.motion === 'with' ? t.noteWith : g.motion === 'against' ? t.noteAgainst : t.noteBroken, tone: 'warn' });
    ctx.audio.play(neutral ? 'success' : 'select', { pitch: neutral ? 1.25 : 1, volume: 0.6 });
    burstAt(lockRef.current);
    if (s.step === 'm1') update((x) => ({ ...x, m1: lock, step: 'm2', phi: wrapPhi(lock.phi + 90) }));
    else update((x) => ({ ...x, m2: lock, step: 'wd' }));
  };

  const confirmEye = () => {
    const s = eyesRef.current[eyeRef.current];
    if (s.step === 'done') {
      update(() => ({ ...fresh(eyeRef.current) }));
      ctx.audio.play('back', { volume: 0.5 });
      return;
    }
    if (s.reflex === 'absent') {
      update((x) => ({ ...x, noReflex: true, net: null, step: 'done' }));
    } else if (s.m1 && s.m2 && s.reflex) {
      update((x) => ({ ...x, net: netFromLocks(s.m1!, s.m2!, s.wd), step: 'done' }));
    } else return;
    ctx.audio.play('success', { pitch: 1.1 });
    burstAt(lockRef.current, true);
    const other = otherEye(eyeRef.current);
    if (eyesRef.current[other].step !== 'done') later(reduced ? 150 : 650, () => switchRef.current(other));
  };

  const redo = () => {
    update(() => fresh(eyeRef.current));
    setNote(null);
    ctx.audio.play('back', { volume: 0.5 });
  };

  const primary = () => {
    if (busy) return;
    const s = eyesRef.current[eyeRef.current];
    if (s.step === 'done' || s.reflex === 'absent' || s.step === 'wd') confirmEye();
    else lockMeridian();
  };

  const entryOf = (e: Eye): EyeEntry | null => {
    const s = eyes[e];
    if (s.step !== 'done') return null;
    return { net: s.net, noReflex: s.noReflex, reflex: s.reflex, wdUsed: s.wd, m1: s.m1, m2: s.m2 };
  };
  const anyDone = EYES.some((e) => eyes[e].step === 'done');
  const record = () => {
    if (busy || !anyDone) return;
    const a = assess(f, wdTrue, { OD: entryOf('OD'), OS: entryOf('OS') }, performance.now() - t0.current, assisted.current);
    setResult(a);
    ctx.audio.play(a.perfect ? 'levelup' : 'success');
    const r = recordRef.current?.getBoundingClientRect();
    if (r) {
      ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: a.perfect ? 'stars' : 'sparks', count: a.perfect ? 40 : 18, color: '#2257f0' });
      if (a.perfect) ctx.fx.floatText(t.perfectFloat, r.left + r.width / 2, r.top - 12, { color: '#2257f0' });
    }
    setPhase(challenge ? 'challenge' : 'debrief');
  };
  const onAnswer = (ok: boolean) => {
    setAnswer(ok);
    ctx.audio.play(ok ? 'success' : 'fail');
    if (!ok && !reduced) ctx.fx.shake(4, 220);
  };
  const finish = () => {
    if (finished.current || !result) return;
    finished.current = true;
    const tech = result.accuracy;
    const accuracy = answer === null ? tech : 0.75 * tech + 0.25 * (answer ? 1 : 0);
    done({
      testId: ctx.testId,
      accuracy: Math.round(accuracy * 1000) / 1000,
      timeMs: Math.round(performance.now() - t0.current),
      findings: report(ctx.findings, ctx.patient, loc),
      perfect: result.perfect && answer !== false,
    });
  };
  const closeTutorial = () => {
    markTutorialSeen();
    setTutorial(false);
    t0.current = performance.now();
  };

  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey || busy) return;
    const tgt = e.target as HTMLElement;
    const onButton = !!tgt.closest?.('button');
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      setKey(e.key === 'ArrowLeft' ? 'left' : 'right', true);
      e.preventDefault();
      return;
    }
    const k = e.key;
    const fns: Record<string, () => void> = {
      ArrowUp: () => rotateBy(e.shiftKey ? 1 : 5),
      ArrowDown: () => rotateBy(e.shiftKey ? -1 : -5),
      '[': () => rotateBy(1),
      ']': () => rotateBy(-1),
      '+': () => onLens(1, e.shiftKey),
      '=': () => onLens(1, e.shiftKey),
      '-': () => onLens(-1, e.shiftKey),
      _: () => onLens(-1, true),
      PageUp: () => onLens(4, false),
      PageDown: () => onLens(-4, false),
      g: () => setGuide((v) => !v),
      e: () => switchEye(otherEye(eye)),
      l: primary,
    };
    if (!onButton) {
      fns.Enter = primary;
      fns[' '] = () => setAuto((v) => !v);
    }
    const fn = fns[k] ?? fns[k.toLowerCase()];
    if (fn) {
      e.preventDefault();
      fn();
    }
  };

  // ── derived view
  const otherE = otherEye(eye);
  const m1 = cur.m1;
  const m2 = cur.m2;
  const nextMeridian = cur.step === 'm1' ? 1 : 2;
  const wdNote = d <= 0.5 ? t.wdNote(wdTrue.toFixed(2), wdCm) : '';
  const hint = tutorial
    ? t.hintTutorial
    : cur.step === 'done'
      ? EYES.every((e) => eyes[e].step === 'done') ? t.hintBoth : t.hintSwitch(eye, otherE)
      : cur.reflex === 'absent'
        ? t.hintAbsent
        : cur.step === 'wd'
          ? t.hintWd(fmtGross(m1!.gross), fmtGross(m2!.gross), wdNote)
          : cur.step === 'm2'
            ? t.hintM2
            : ui.neutral && d < 0.6
              ? t.hintFlood
              : !cur.touched.sweep && !auto
                ? t.hintDrag
                : !cur.touched.lens
                  ? t.hintWithAgainst
                  : !cur.touched.rot && Math.abs(tr.cylinder) >= 0.5
                    ? t.hintTurn
                    : t.hintM1;

  const primaryLabel = cur.step === 'done' ? t.reMeasure(eye)
    : cur.reflex === 'absent' ? t.confirmNoReflex
      : cur.step === 'm1' ? t.lockM(1, fmtAxis(Math.round(cur.phi) || 180))
        : cur.step === 'm2' ? t.lockM(2, fmtAxis(Math.round(cur.phi) || 180))
          : !cur.reflex ? t.describeReflex : t.confirmNet;
  const primaryDisabled = busy || (cur.step === 'wd' && !cur.reflex && true);

  const net = m1 && m2 ? netFromLocks(m1, m2, cur.wd) : null;
  const look = useMemo<EyeLook>(() => {
    const dark = f.pupils?.sizeDarkMm?.[eye] ?? 6;
    return { skin: ctx.patient.avatar.skin, iris: ctx.patient.avatar.irisColor, seed: eye === 'OD' ? seeds.OD : seeds.OS, pupilFrac: clamp(dark / 11.8, 0.5, 0.6) };
  }, [eye]);
  const guideText = ui.motion === 'with' ? t.guideWith : ui.motion === 'against' ? t.guideAgainst : ui.motion === 'skew' ? t.guideBroken : t.guideNeutral;
  const sweepMeridian = fmtAxis(Math.round(cur.phi) || 180);
  const streakAxis = fmtAxis(Math.round(wrapPhi(cur.phi + 90)) || 180);

  return (
    <LocaleCtx.Provider value={loc}>
    <div class="rt-root" ref={rootRef} tabIndex={-1} onKeyDown={onKey}>
      <header class="rt-head">
        <div class="rt-head__title"><Icon name="retinoscopy" /> <span>{t.title}</span></div>
        <p class="rt-head__hint" key={hint} aria-live="polite">{hint}</p>
        <div class="rt-seg" role="radiogroup" aria-label={t.eyeGroup}>
          {EYES.map((e) => (
            <button key={e} type="button" role="radio" aria-checked={eye === e} class={`rt-seg__b${eye === e ? ' is-on' : ''}`} onClick={() => switchEye(e)} disabled={busy}>
              {e}
              {eyes[e].step === 'done' && <Icon name="check" class="rt-seg__ok" />}
            </button>
          ))}
        </div>
      </header>

      <main class="rt-stage">
        <section class={`rt-scope${switching ? ' is-switching' : ''}`} key={`scope-${switching}`} aria-label={t.scopeAria(eye)}>
          <div class="rt-bezel">
            <Scope look={look} frame={frameRef} onGeo={geoCb} onDrag={onDrag} disabled={busy} label={t.pupilAria(eye)} />
            <div class="rt-ring" ref={ringRef} aria-hidden="true" data-on={d < 0.6 || guide ? '1' : '0'} />
          </div>
          <span class="rt-scope__eye" aria-hidden="true">{eye}</span>
          <span class="rt-scope__wd" title={t.wdTitle}><Icon name="target" /> {t.cm(wdCm)}</span>
          {guide && cur.step !== 'done' && quality[eye] !== 'absent' && (
            <span class={`rt-guide rt-guide--${ui.motion}`} aria-live="off">
              <i aria-hidden="true">{ui.motion === 'with' ? '▸▸' : ui.motion === 'against' ? '◂▸' : ui.motion === 'skew' ? '✕' : '●'}</i> {guideText}
            </span>
          )}
          {cur.step === 'done' && <span class="rt-scope__lock"><Icon name="lock" /> {t.done}</span>}
          {!cur.touched.sweep && !auto && cur.step === 'm1' && !tutorial && <span class="rt-scope__tip">{t.dragTip}</span>}
        </section>

        <section class="rt-panel" aria-label={t.controls}>
          <div class="rt-row rt-row--dial">
            <MeridianDial value={cur.phi} onChange={onRotate} disabled={busy || cur.step !== 'm1'} />
            <div class="rt-dialinfo">
              <p class="rt-k">{t.sweepMeridian}</p>
              <p class="rt-big rt-num">{sweepMeridian}°</p>
              <p class="rt-sub">{t.streakAxis(streakAxis)}</p>
              <div class="rt-toggles">
                <button type="button" class={`rt-toggle${auto ? ' is-on' : ''}`} onClick={() => setAuto((v) => !v)} aria-pressed={auto} disabled={busy} title={t.autoSweepTitle}>
                  <Icon name={auto ? 'pause' : 'play'} /> {t.autoSweep}
                </button>
                <button type="button" class={`rt-toggle${guide ? ' is-on' : ''}`} onClick={() => setGuide((v) => !v)} aria-pressed={guide} disabled={busy} title={t.guideTitle}>
                  <Icon name="eye" /> {t.guide}
                </button>
              </div>
              {cur.step !== 'm1' && cur.step !== 'done' && <p class="rt-lockednote"><Icon name="lock" /> {t.secondMeridian}</p>}
            </div>
          </div>

          <div class="rt-lens">
            <div class="rt-lens__meta">
              <span class="rt-k">{t.trialLens}</span>
              <output class="rt-big rt-num rt-lens__v">{fmtGross(cur.lens)}</output>
            </div>
            <LensDrum value={cur.lens} min={LENS_MIN} max={LENS_MAX} onStep={onLens} disabled={busy || cur.step === 'done'} />
            <div class="rt-rack" dir="ltr" role="group" aria-label={t.lensRack}>
              {[-1, -0.25, 0.25, 1].map((v) => (
                <button key={v} type="button" class={`rt-jewel rt-jewel--${v < 0 ? 'minus' : 'plus'}`} onClick={() => onLens(v > 0 ? 1 : -1, Math.abs(v) === 1)} disabled={busy || cur.step === 'done'} aria-label={t.dioptres(fmtSigned(v))}>
                  {fmtSigned(v).replace('0.', '.').replace('1.00', '1')}
                </button>
              ))}
              <button type="button" class="rt-jewel rt-jewel--zero" onClick={() => onLens(-cur.lens / 0.25, false)} disabled={busy || cur.step === 'done' || cur.lens === 0} aria-label={t.resetLens}>0</button>
              <span class="rt-rack__spam" dir="auto" aria-hidden="true">{t.spam.map((x) => <span key={x.b}><b>{x.b}</b>{x.t}{x.sep}</span>)}</span>
            </div>
          </div>

          <div class="rt-reflex">
            <span class="rt-k" id="rt-reflex-k">{t.reflexQuality}</span>
            <div class="rt-chips" role="radiogroup" aria-labelledby="rt-reflex-k">
              {REFLEXES.map((r) => (
                <button key={r} type="button" role="radio" aria-checked={cur.reflex === r} class={`rt-chip${cur.reflex === r ? ' is-on' : ''}`} onClick={() => pickReflex(r)} disabled={busy || cur.step === 'done'}>
                  {t.reflexShort[r]}
                </button>
              ))}
            </div>
          </div>

          <div class="rt-cross">
            <PowerCross cur={cur} wd={cur.wd} />
            <div class="rt-cross__txt">
              {cur.step === 'wd' && (
                <div class="rt-wd" role="group" aria-label={t.wdGroup}>
                  <span class="rt-k">{t.subtractWd}</span>
                  <div class="rt-chips">
                    {WD_CHOICES.map((w) => (
                      <button key={w} type="button" class={`rt-chip${cur.wd === w ? ' is-on' : ''}`} onClick={() => { update((x) => ({ ...x, wd: w })); sfx('dial', 1.2, 0.4); }} disabled={busy}>
                        {w === 0 ? t.none : <bdi dir="ltr">{`+${w.toFixed(2)}`}</bdi>}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p class="rt-net"><span class="rt-k">{t.netRx}</span><b class="rt-num"><bdi>{cur.step === 'done' && cur.noReflex ? t.noReflex : net && (cur.step === 'wd' || cur.step === 'done') ? fmtRx(cur.net ?? net) : '—'}</bdi></b></p>
              {note && <p class={`rt-note rt-note--${note.tone}`} key={note.text}>{note.text}</p>}
            </div>
          </div>

          <div class="rt-lock" ref={lockRef}>
            <Button variant={cur.step === 'done' ? 'ghost' : 'glass'} size="sm" icon={cur.step === 'done' ? 'refresh' : 'lock'} block onClick={primary} disabled={primaryDisabled} sfx={false}>
              {primaryLabel}
            </Button>
            {cur.step !== 'm1' && cur.step !== 'done' && (
              <button type="button" class="rt-redo" onClick={redo} disabled={busy}>{t.startAgain}</button>
            )}
          </div>
        </section>
      </main>

      <footer class="rt-foot">
        <div class="rt-progress">
          {EYES.map((e) => {
            const s = eyes[e];
            return (
              <span key={e} class={`rt-progress__e${s.step === 'done' ? ' is-done' : ''}${e === eye ? ' is-cur' : ''}`}>
                <b>{e}</b>
                <span class="rt-num"><bdi>{s.step === 'done' ? (s.noReflex ? t.noReflexLower : fmtRx(s.net!)) : s.m1 ? t.meridianN(nextMeridian === 2 || s.step !== 'm1' ? '2' : '1') : t.notMeasured}</bdi></span>
              </span>
            );
          })}
        </div>
        <div ref={recordRef}>
          <Button variant="primary" icon="check" onClick={record} disabled={busy || !anyDone} sfx={false}>{t.recordFindings}</Button>
        </div>
      </footer>

      {tutorial && <Tutorial onClose={closeTutorial} />}
      {phase === 'challenge' && challenge && <ChallengeCard challenge={challenge} onAnswer={onAnswer} onNext={() => setPhase('debrief')} />}
      {phase === 'debrief' && result && (
        <Debrief assessment={result} practice={ctx.mode === 'practice'} challengeCorrect={answer} onDone={finish} />
      )}
    </div>
    </LocaleCtx.Provider>
  );
}

/** Power cross: the two locked meridians drawn at their real angles with gross (or net) values. */
function PowerCross({ cur, wd }: { cur: EyeSession; wd: number }) {
  const tx = useT();
  const arm = (lock: MeridianLock | null, idx: number): JSX.Element | null => {
    if (!lock) return null;
    const t = (lock.phi * Math.PI) / 180;
    const x = Math.cos(t);
    const y = -Math.sin(t);
    const showNet = cur.step === 'wd' || cur.step === 'done';
    const v = lock.gross - (showNet ? wd : 0);
    return (
      <g key={idx} class="rt-cross__arm">
        <line x1={60 - x * 40} y1={60 - y * 40} x2={60 + x * 40} y2={60 + y * 40} />
        <text x={60 + x * 49} y={60 + y * 49 + 3} class="rt-cross__n">{fmtSigned(v)}</text>
        <text x={60 - x * 49} y={60 - y * 49 + 3} class="rt-cross__d">{fmtAxis(Math.round(lock.phi) || 180)}</text>
      </g>
    );
  };
  const t = (cur.phi * Math.PI) / 180;
  return (
    <svg class="rt-crossv" dir="ltr" viewBox="0 0 120 120" role="img" aria-label={tx.crossAria}>
      <circle cx="60" cy="60" r="46" class="rt-cross__ring" />
      {cur.step !== 'done' && cur.step !== 'wd' && <line class="rt-cross__live" x1={60 - Math.cos(t) * 36} y1={60 + Math.sin(t) * 36} x2={60 + Math.cos(t) * 36} y2={60 - Math.sin(t) * 36} />}
      {arm(cur.m1, 1)}
      {arm(cur.m2, 2)}
      <circle cx="60" cy="60" r="2.6" class="rt-cross__hub" />
    </svg>
  );
}
