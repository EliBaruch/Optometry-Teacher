import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, type Eye, type MiniGameContext, type MiniGameResult, type SfxId } from '@core';
import { Button, Icon, Kbd, ProgressBar } from '@ui-kit';
import { FundusView, PatientAvatar, type FundusMark, type FundusViewport } from '@render';
import { LensDial } from './Dial';
import { Debrief, Quiz } from './Debrief';
import { ExamSide } from './ExamSide';
import { DiscForm, VesselForm, VitreousForm } from './Forms';
import { MarkerLayer, ViewStore, type Marker } from './Markers';
import { Radial, type RadialChoice } from './Radial';
import { ReflexStep } from './Reflex';
import { Tutorial, tutorialSeen } from './Tutorial';
import { buildChallenge } from './practice';
import { report } from './report';
import {
  TAGS, eyeComplete, focusBlur, focusNeeded, matchTag, maculaTouched, scoreEye, scoreExam, seedFor, tolerance, truthFor,
  type EyeScore, type EyeTruth, type EyeWork, type ReflexChoice, type Tag,
} from './model';

type Phase = 'reflex' | 'exam' | 'challenge' | 'debrief';
type Mode = 'direct' | 'indirect';
type SheetId = 'disc' | 'vessels' | 'vitreous' | null;

const EYE_NAME: Record<Eye, string> = { OD: 'right eye', OS: 'left eye' };
const emptyWork = (): EyeWork => ({ reflex: null, disc: null, vessels: null, vitreous: null, tags: [], misfires: 0 });
const MEDIA: Record<string, { blur: number; bright: number }> = {
  normal: { blur: 0, bright: 1 }, dull: { blur: 0.8, bright: 0.9 }, asymmetric: { blur: 0.8, bright: 0.9 }, absent: { blur: 2.6, bright: 0.62 }, leukocoria: { blur: 3.2, bright: 0.7 },
};

export interface GameProps {
  ctx: MiniGameContext;
  finish: (r: MiniGameResult) => void;
}

export function Game({ ctx, finish }: GameProps) {
  const t0 = useRef(performance.now());
  const finished = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const areaRef = useRef<HTMLDivElement>(null);
  const store = useRef(new ViewStore()).current;
  const lastPtr = useRef<{ x: number; y: number; t: number } | null>(null);
  const nextId = useRef(1);
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);

  const truths = useMemo<Record<Eye, EyeTruth>>(
    () => ({ OD: truthFor(ctx.findings, 'OD', seedFor(ctx.patient.name, 'OD')), OS: truthFor(ctx.findings, 'OS', seedFor(ctx.patient.name, 'OS')) }),
    [],
  );
  const work = useRef<Record<Eye, EyeWork>>({ OD: emptyWork(), OS: emptyWork() });
  const discAt = useRef<Record<Eye, { x: number; y: number } | null>>({ OD: null, OS: null });
  const practice = ctx.mode === 'practice';
  const challenge = useMemo(() => (practice ? buildChallenge(ctx.findings, ctx.rng.fork('oph-challenge')) : null), []);

  const [phase, setPhase] = useState<Phase>('reflex');
  const [eye, setEye] = useState<Eye>('OD');
  const [mode, setMode] = useState<Mode>('direct');
  const [redFree, setRedFree] = useState(false);
  const [dial, setDial] = useState(0);
  const [lit, setLit] = useState(false);
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [radial, setRadial] = useState<{ x: number; y: number; wx: number; wy: number; W: number; H: number; group: string | null } | null>(null);
  const [sheet, setSheet] = useState<SheetId>(null);
  const [toast, setToast] = useState<{ text: string; k: number } | null>(null);
  const [size, setSize] = useState({ w: 520, h: 520 });
  const [jump, setJump] = useState<FundusViewport | null>(null);
  const [scores, setScores] = useState<Record<Eye, EyeScore> | null>(null);
  const [exam, setExam] = useState({ accuracy: 0, perfect: false, timeMs: 0 });
  const [choice, setChoice] = useState<string | null>(null);

  const play = (id: SfxId, opts?: { volume?: number; pitch?: number }) => {
    try {
      ctx.audio.play(id, opts);
    } catch {
      /* audio never breaks the game */
    }
  };
  const w = work.current[eye];
  const truth = truths[eye];
  const S = Math.max(220, Math.min(640, Math.floor(Math.min(size.w, size.h)) - 10));
  const lensR = Math.round((0.36 - 0.08 * Math.max(0, Math.min(1, ctx.difficulty))) * S);
  const reveal = phase === 'debrief';
  const inverted = mode === 'indirect';

  // ── layout measurement
  useEffect(() => {
    const el = areaRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    let raf = 0;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const r = el.getBoundingClientRect();
        setSize((o) => (Math.abs(o.w - r.width) < 2 && Math.abs(o.h - r.height) < 2 ? o : { w: r.width, h: r.height }));
      });
    });
    ro.observe(el);
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [phase === 'reflex']);

  // ── toast
  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => clearTimeout(id);
  }, [toast?.k]);
  const say = (text: string) => setToast({ text, k: (toast?.k ?? 0) + 1 });

  // ── progress
  const reflexDone = EYES.filter((e) => work.current[e].reflex).length;
  const coreDone = EYES.reduce((n, e) => n + (work.current[e].disc ? 1 : 0) + (work.current[e].vessels ? 1 : 0) + (maculaTouched(truths[e], work.current[e]) ? 1 : 0), 0);
  const progress = (reflexDone + coreDone) / 8;
  const anyComplete = EYES.some((e) => eyeComplete(truths[e], work.current[e]));

  // ── view helpers
  const startView = (m: Mode): FundusViewport => ({ cx: store.v.cx, cy: store.v.cy, zoom: m === 'direct' ? 2.4 : 1 });
  const viewKey = useRef(0);
  const initialView = useMemo<FundusViewport>(() => startView(mode), [eye, mode, reveal]);
  const switchMode = (m: Mode) => {
    if (m === mode || phase !== 'exam') return;
    setMode(m);
    setJump(null);
    setRadial(null);
    play('lens-click', { pitch: m === 'direct' ? 1 : 0.85 });
    say(m === 'direct' ? 'Direct: upright, about 15× magnification, narrow field.' : 'Indirect, 20 D lens: wide field, image inverted and reversed.');
  };
  const switchEye = (e: Eye) => {
    if (e === eye || phase === 'reflex' || phase === 'challenge') return;
    setEye(e);
    setRadial(null);
    setSheet(null);
    store.set({ cx: 0.5, cy: 0.5, zoom: store.v.zoom });
    setJump(null);
    play('lens-click', { pitch: e === 'OD' ? 1 : 1.12 });
  };
  const zoomBy = (f: number) => {
    const v = store.v;
    viewKey.current++;
    setJump({ cx: v.cx, cy: v.cy, zoom: Math.max(mode === 'direct' ? 1.8 : 1, Math.min(mode === 'direct' ? 6 : 3, v.zoom * f)) });
    play('dial', { volume: 0.4, pitch: f > 1 ? 1.2 : 0.85 });
  };
  const recentre = () => {
    setJump({ cx: 0.5, cy: 0.5, zoom: mode === 'direct' ? 2.4 : 1 });
    play('whoosh', { volume: 0.25 });
  };

  // ── tapping the fundus
  const onTap = (e: { x: number; y: number; marks: FundusMark[] }) => {
    if (phase !== 'exam' || sheet || tutorial) return;
    const v = store.v;
    if (mode === 'direct' && Math.hypot(e.x - v.cx, e.y - v.cy) * S * v.zoom > lensR) {
      say('Inside the light circle only: that spot is in the dark.');
      return;
    }
    const rect = rootRef.current?.getBoundingClientRect();
    const arect = areaRef.current?.getBoundingClientRect();
    const p = lastPtr.current;
    const W = rect?.width ?? 640;
    const H = rect?.height ?? 480;
    let px = arect && rect ? arect.left - rect.left + arect.width / 2 : W / 2;
    let py = arect && rect ? arect.top - rect.top + arect.height / 2 : H / 2;
    if (rect && p && performance.now() - p.t < 500) {
      px = p.x - rect.left;
      py = p.y - rect.top;
    }
    setRadial({ x: px, y: py, wx: e.x, wy: e.y, W, H, group: null });
    play('lens-click', { volume: 0.5 });
  };

  const nearestTag = (wx: number, wy: number): Tag | null => {
    const tol = tolerance(S, store.v.zoom) * 1.6;
    let best: Tag | null = null;
    let bd = Infinity;
    for (const t of w.tags) {
      const d = Math.hypot(t.x - wx, t.y - wy);
      if (d < tol && d < bd) {
        best = t;
        bd = d;
      }
    }
    return best;
  };

  const flyText = (text: string, color = '#ffd27a') => {
    const rect = rootRef.current?.getBoundingClientRect();
    if (!rect || !radial) return;
    ctx.fx.floatText(text, rect.left + radial.x, rect.top + radial.y - 24, { color });
  };

  const choose = (c: RadialChoice) => {
    const r = radial;
    if (!r) return;
    if (c.type === 'vessels') {
      setRadial(null);
      setSheet('vessels');
      return;
    }
    if (c.type === 'disc') {
      const d = truth.map.disc;
      if (Math.hypot((r.wx - d.x) / d.rx, (r.wy - d.y) / d.ry) > 2) {
        w.misfires++;
        play('fail', { volume: 0.5 });
        ctx.fx.shake(ctx.reducedMotion ? 0 : 0.2, 160);
        say('That is not the optic disc. Look for the pale round nerve head where the vessels converge.');
        setRadial(null);
        rerender();
        return;
      }
      discAt.current[eye] = { x: r.wx, y: r.wy };
      setRadial(null);
      setSheet('disc');
      return;
    }
    const dup = w.tags.find((t) => t.kind === c.kind && Math.hypot(t.x - r.wx, t.y - r.wy) < tolerance(S, store.v.zoom));
    if (dup) {
      say(`Already tagged: ${TAGS[c.kind].label}.`);
      setRadial(null);
      return;
    }
    w.tags.push({ id: nextId.current++, kind: c.kind, x: r.wx, y: r.wy, tol: tolerance(S, store.v.zoom) });
    play('select');
    flyText(TAGS[c.kind].label);
    setRadial(null);
    rerender();
  };

  const removeTag = (id: number) => {
    w.tags = w.tags.filter((t) => t.id !== id);
    work.current[eye] = w;
    play('back', { volume: 0.5 });
    rerender();
  };
  const removeNear = () => {
    if (!radial) return;
    const t = nearestTag(radial.wx, radial.wy);
    if (t) removeTag(t.id);
    setRadial(null);
  };

  // ── record & finish
  const record = () => {
    if (phase !== 'exam' || !anyComplete) return;
    const s = {} as Record<Eye, EyeScore>;
    for (const e of EYES) s[e] = scoreEye(truths[e], work.current[e], tolerance(S, 2));
    const timeMs = performance.now() - t0.current;
    const ex = scoreExam(EYES.map((e) => s[e]), timeMs);
    setScores(s);
    setExam({ ...ex, timeMs });
    setRadial(null);
    setSheet(null);
    play('stamp');
    setMode('indirect');
    setJump({ cx: 0.5, cy: 0.5, zoom: 1 });
    store.set({ cx: 0.5, cy: 0.5, zoom: 1 });
    if (practice && challenge) {
      setPhase('challenge');
    } else {
      toDebrief(ex.perfect);
    }
  };

  const toDebrief = (perfect: boolean) => {
    setPhase('debrief');
    play('reveal');
    if (perfect) {
      const r = rootRef.current?.getBoundingClientRect();
      if (r) ctx.fx.burst(r.left + r.width / 2, r.top + r.height * 0.4, { kind: 'sparks', count: 32, color: '#ffd27a' });
      play('sparkle');
    }
  };

  const answer = (id: string) => {
    if (choice || !challenge) return;
    setChoice(id);
    const ok = challenge.options.find((o) => o.id === id)?.correct ?? false;
    play(ok ? 'success' : 'fail');
    if (!ok) ctx.fx.shake(ctx.reducedMotion ? 0 : 0.35, 220);
    toDebrief(exam.perfect && ok);
  };

  const complete = () => {
    if (finished.current || !scores) return;
    finished.current = true;
    const ok = challenge?.options.find((o) => o.id === choice)?.correct ?? false;
    const accuracy = practice && challenge ? 0.65 * exam.accuracy + 0.35 * (ok ? 1 : 0) : exam.accuracy;
    const perfect = exam.perfect && (!practice || !challenge || ok);
    play('stamp');
    finish({
      testId: 'ophthalmoscopy',
      accuracy: Math.round(accuracy * 1000) / 1000,
      timeMs: Math.round(exam.timeMs),
      findings: report(ctx.findings, ctx.patient),
      perfect,
    });
  };

  const jumpTo = (e: Eye, id: string) => {
    if (e !== eye) setEye(e);
    const t = truths[e];
    let pos = { x: 0.5, y: 0.5 };
    if (id === 'macula') pos = t.map.fovea;
    else if (id === 'det') pos = t.map.lesions.find((m) => m.type === 'retinal-detachment') ?? pos;
    else pos = t.map.lesions.find((m) => `les:${m.source}` === id) ?? pos;
    setJump({ cx: pos.x, cy: pos.y, zoom: id === 'det' ? 1 : 2.2 });
    play('whoosh', { volume: 0.3 });
  };

  // ── keyboard shortcuts
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const h = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const t = e.target as HTMLElement | null;
      if (t?.closest('.oph-radial, .oph-sheet, .oph-tutorial, .oph-dial__knob') || t?.tagName === 'INPUT') return;
      if (phase === 'exam') {
        const k = e.key.toLowerCase();
        if (k === 'f') {
          setRedFree((v) => !v);
          play('lens-click', { pitch: 1.2 });
          e.preventDefault();
        } else if (k === 'm') {
          switchMode(mode === 'direct' ? 'indirect' : 'direct');
          e.preventDefault();
        } else if (k === 'd') {
          setSheet(null);
          e.preventDefault();
        }
      } else if (phase === 'challenge' && challenge && /^[1-4]$/.test(e.key)) {
        const o = challenge.options[Number(e.key) - 1];
        if (o) answer(o.id);
      }
    };
    el.addEventListener('keydown', h);
    return () => el.removeEventListener('keydown', h);
  });

  // ── derived visuals
  const needed = focusNeeded(ctx.findings, eye);
  const focusPx = mode === 'direct' && phase === 'exam' ? focusBlur(dial, needed) : 0;
  const media = MEDIA[ctx.findings.redReflex[eye]] ?? MEDIA.normal!;
  const scale = S / 430;
  const showMedia = phase === 'exam' || phase === 'challenge';
  const filter = reveal ? 'none' : `blur(${(((showMedia ? focusPx : 0) + (showMedia ? media.blur : 0)) * scale).toFixed(2)}px) brightness(${showMedia ? media.bright : 1})`;

  const markers: Marker[] = [];
  if (reveal) {
    const sc = scores?.[eye];
    const found = new Set(sc?.tags.found ?? []);
    for (const t of w.tags) {
      const m = matchTag(truth, t, tolerance(S, 2));
      markers.push({ id: `t${t.id}`, x: t.x, y: t.y, label: TAGS[t.kind].short, tone: m.itemId ? 'found' : 'false' });
    }
    for (const it of truth.items) {
      if (found.has(it.id)) continue;
      const pos = it.id === 'macula' ? truth.map.fovea : it.id === 'det' ? truth.map.lesions.find((m) => m.type === 'retinal-detachment') : truth.map.lesions.find((m) => `les:${m.source}` === it.id);
      if (pos) markers.push({ id: `m${it.id}`, x: pos.x, y: pos.y, label: `Missed: ${TAGS[it.kind].short}`, tone: 'missed' });
    }
  } else {
    for (const t of w.tags) markers.push({ id: `t${t.id}`, x: t.x, y: t.y, label: TAGS[t.kind].short, tone: 'tag' });
    const d = discAt.current[eye];
    if (w.disc && d) markers.push({ id: 'disc', x: d.x, y: d.y, label: `Disc ${w.disc.cdr.toFixed(2)}`, tone: 'disc' });
  }

  const instruction =
    phase === 'reflex' ? 'From arm’s length, compare the red reflex in the two pupils.'
      : phase === 'exam' ? (mode === 'direct' ? 'Drag to explore, tune the lens wheel until sharp, then tap what you find.' : 'Indirect view is inverted: drag to scan, tap to tag what you find.')
        : phase === 'challenge' ? 'One last recognition check.' : 'Your tags against the true fundus.';

  const sharpness = 1 - Math.min(1, focusBlur(dial, needed) / 6);
  const focusCue = mode === 'direct' && phase === 'exam' && !tutorial && focusBlur(dial, needed) >= 1;
  const maculaOk = maculaTouched(truth, w);
  const external = { ...(ctx.findings.external ?? {}) };

  return (
    <div class={`oph${ctx.reducedMotion ? ' is-reduced' : ''}`} ref={rootRef} data-phase={phase}>
      <header class="oph__head">
        <div class="oph__title">
          <Icon name="ophthalmoscopy" size={20} class="oph__title-icon" />
          <div>
            <h2>Ophthalmoscopy</h2>
            <p>{instruction}</p>
          </div>
        </div>
        <div class="oph-eyes" role="tablist" aria-label="Eye examined">
          {EYES.map((e) => {
            const done = eyeComplete(truths[e], work.current[e]);
            return (
              <button
                key={e}
                type="button"
                role="tab"
                aria-selected={eye === e}
                disabled={phase === 'reflex' || phase === 'challenge'}
                class={`oph-eyes__btn${eye === e ? ' is-on' : ''}${done ? ' is-done' : ''}`}
                onClick={() => switchEye(e)}
                data-testid={`oph-eye-${e}`}
              >
                <span class="oph-eyes__code">{e}</span>
                <span class="oph-eyes__name">{e === 'OD' ? 'Right' : 'Left'}</span>
                {done && <Icon name="check" size={14} class="oph-eyes__check" />}
              </button>
            );
          })}
        </div>
      </header>

      <div class="oph__body">
        {phase === 'reflex' ? (
          <ReflexStep
            findings={ctx.findings}
            patient={ctx.patient}
            calls={{ OD: work.current.OD.reflex, OS: work.current.OS.reflex }}
            onCall={(e: Eye, c: ReflexChoice) => {
              work.current[e].reflex = c;
              play('select');
              rerender();
            }}
            lit={lit}
            onLight={() => {
              setLit(true);
              play('flashlight');
            }}
            reducedMotion={ctx.reducedMotion}
            onContinue={() => {
              setPhase('exam');
              play('lens-click');
              const dense = EYES.some((e) => truths[e].obscured);
              if (dense) say('A dense opacity is blocking the light: expect a poor view of the retina.');
            }}
          />
        ) : (
          <>
            <section class="oph-stage">
              <div class="oph-scope-area" ref={areaRef}>
                <div
                  class={`oph-scope oph-scope--${mode}`}
                  style={{ width: `${S}px`, height: `${S}px` }}
                  onPointerUpCapture={(e) => { lastPtr.current = { x: e.clientX, y: e.clientY, t: performance.now() }; }}
                  data-testid="oph-scope"
                >
                  <div class="oph-scope__img" style={{ filter, transition: ctx.reducedMotion ? 'none' : 'filter 160ms ease-out' }}>
                    <FundusView
                      key={`${eye}-${mode}-${reveal}`}
                      post={ctx.findings.posterior[eye]}
                      eye={eye}
                      seed={truth.seed}
                      width={S}
                      height={S}
                      lensView={mode === 'direct' && !reveal ? { radius: lensR / S, follow: 'center' } : false}
                      inverted={inverted}
                      redFree={redFree}
                      initialView={initialView}
                      view={jump ?? undefined}
                      minZoom={mode === 'direct' && !reveal ? 1.8 : 1}
                      maxZoom={mode === 'direct' ? 6 : 3}
                      reducedMotion={ctx.reducedMotion}
                      onViewChange={(v) => store.set(v)}
                      onTap={onTap}
                      label={`Fundus of the ${EYE_NAME[eye]}, ${mode === 'direct' ? 'direct' : 'indirect, inverted'} view. Arrow keys travel, plus and minus zoom, Enter opens the tag wheel.`}
                    />
                  </div>
                  <MarkerLayer store={store} size={S} inverted={inverted} markers={markers} clipRadius={mode === 'direct' && !reveal ? lensR * 0.98 : S / 2 - 6} />
                </div>
                {toast && <div class="oph-toast" role="status" key={toast.k}>{toast.text}</div>}
                {focusCue && (
                  <div class="oph-hint is-cue" role="status" data-testid="oph-focus-cue"><Icon name="target" size={14} /> Out of focus: turn the lens wheel until the lamp lights</div>
                )}
                {!focusCue && phase === 'exam' && w.tags.length === 0 && !w.disc && (
                  <div class="oph-hint" aria-hidden="true"><Icon name="target" size={14} /> Tap the image to tag a finding</div>
                )}
              </div>

              <div class="oph-toolbar" role="toolbar" aria-label="Instrument controls">
                <div class="oph-seg2" role="group" aria-label="Instrument">
                  <button type="button" class={mode === 'direct' ? 'is-on' : ''} aria-pressed={mode === 'direct'} disabled={phase !== 'exam'} onClick={() => switchMode('direct')} data-testid="oph-mode-direct">Direct</button>
                  <button type="button" class={mode === 'indirect' ? 'is-on' : ''} aria-pressed={mode === 'indirect'} disabled={phase !== 'exam'} onClick={() => switchMode('indirect')} data-testid="oph-mode-indirect">Indirect 20 D</button>
                </div>
                <LensDial value={dial} cue={focusCue} disabled={mode !== 'direct' || phase !== 'exam'} sharpness={sharpness} onChange={(v) => { setDial(v); play('dial', { pitch: 0.8 + (v + 10) / 24 }); }} />
                <button type="button" class={`oph-tool${redFree ? ' is-on' : ''}`} aria-pressed={redFree} aria-label="Red-free filter" onClick={() => { setRedFree((v) => !v); play('lens-click', { pitch: 1.2 }); }} data-testid="oph-redfree" title="Red-free (green) light: haemorrhages turn black, nerve-fibre defects stand out">
                  <i class="oph-tool__swatch" /> <span class="oph-tool__label">Red-free</span> <Kbd>F</Kbd>
                </button>
                <div class="oph-zoom" role="group" aria-label="Zoom">
                  <button type="button" aria-label="Zoom out" onClick={() => zoomBy(1 / 1.4)}><Icon name="minus" size={16} /></button>
                  <button type="button" aria-label="Re-centre" data-zoom="recentre" onClick={recentre}><Icon name="target" size={16} /></button>
                  <button type="button" aria-label="Zoom in" onClick={() => zoomBy(1.4)}><Icon name="plus" size={16} /></button>
                </div>
              </div>

              {sheet === 'disc' && (
                <DiscForm
                  eye={eye}
                  initial={w.disc}
                  onTick={(v) => play('dial', { volume: 0.35, pitch: 0.7 + v })}
                  onCancel={() => setSheet(null)}
                  onSave={(c) => {
                    w.disc = c;
                    setSheet(null);
                    play('select');
                    ctx.fx.floatText(`C/D ${c.cdr.toFixed(2)}`, window.innerWidth / 2, window.innerHeight / 2.4, { color: '#ffd27a' });
                    rerender();
                  }}
                />
              )}
              {sheet === 'vessels' && (
                <VesselForm initial={w.vessels} onCancel={() => setSheet(null)} onSave={(c) => { w.vessels = c; setSheet(null); play('select'); rerender(); }} />
              )}
              {sheet === 'vitreous' && (
                <VitreousForm initial={w.vitreous} onCancel={() => setSheet(null)} onSave={(c) => { w.vitreous = c; setSheet(null); play('select'); rerender(); }} />
              )}
            </section>

            <aside class="oph-side">
              <div class="oph-patient">
                <div class="oph-patient__portrait">
                  <PatientAvatar spec={ctx.patient.avatar} age={ctx.patient.age} sex={ctx.patient.sex} external={external} size={56} lookAt={{ x: 0, y: 0.1 }} reducedMotion={ctx.reducedMotion} label={`${ctx.patient.name}, ${EYE_NAME[eye]} under examination`} />
                </div>
                <div>
                  <strong>{ctx.patient.name}</strong>
                  <span>{ctx.patient.age} y · dilated · {EYE_NAME[eye]}</span>
                </div>
              </div>

              {phase === 'exam' && (
                <ExamSide eyeName={EYE_NAME[eye]} work={w} maculaOk={maculaOk} mode={mode} needed={needed} onSheet={setSheet} onRemove={removeTag} />
              )}
              {phase === 'challenge' && challenge && <Quiz challenge={challenge} onAnswer={answer} />}
              {phase === 'debrief' && scores && (
                <Debrief scores={scores} truths={truths} work={work.current} accuracy={practice && challenge ? 0.65 * exam.accuracy + 0.35 * ((challenge.options.find((o) => o.id === choice)?.correct ?? false) ? 1 : 0) : exam.accuracy} perfect={exam.perfect} challenge={challenge} choice={choice} onJump={jumpTo} />
              )}
            </aside>
          </>
        )}
        {tutorial && <Tutorial reducedMotion={ctx.reducedMotion} onClose={() => setTutorial(false)} />}
      </div>

      {radial && phase === 'exam' && (
        <Radial
          x={radial.x}
          y={radial.y}
          stageW={radial.W}
          stageH={radial.H}
          group={radial.group}
          nearTag={!!nearestTag(radial.wx, radial.wy)}
          reducedMotion={ctx.reducedMotion}
          onGroup={(g) => { setRadial({ ...radial, group: g }); play('tick', { volume: 0.4 }); }}
          onChoose={choose}
          onRemoveNear={removeNear}
          onClose={() => setRadial(null)}
        />
      )}

      <footer class="oph__foot">
        <ProgressBar value={phase === 'debrief' || phase === 'challenge' ? 1 : progress} label={phase === 'reflex' ? 'Step 1 of 2' : phase === 'exam' ? 'Exam progress' : 'Findings recorded'} valueText={phase === 'reflex' ? `${reflexDone}/2 reflexes` : phase === 'exam' ? `${coreDone + reflexDone} of 8 steps` : undefined} size="sm" class="oph__progress" />
        <span class="oph__other">
          {EYES.map((e) => <i key={e} class={eyeComplete(truths[e], work.current[e]) ? 'is-on' : ''}>{e}</i>)}
        </span>
        {phase === 'exam' && !anyComplete && <span class="oph__need" id="oph-need">Finish one eye first: disc, vessels and macula.</span>}
        {phase === 'exam' && (
          <Button variant="primary" size="lg" icon="check" disabled={!anyComplete} sfx={false} onClick={record} data-testid="oph-record" aria-describedby={anyComplete ? undefined : 'oph-need'}>Record findings</Button>
        )}
        {phase === 'debrief' && (
          <Button variant="primary" size="lg" trailingIcon="arrow-right" sfx={false} onClick={complete} data-testid="oph-finish">Finish exam</Button>
        )}
      </footer>
    </div>
  );
}
