import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, type Eye, type MiniGameContext, type MiniGameDone } from '@core';
import { Button, Icon } from '@ui-kit';
import { Drum } from './Drum';
import { Stick } from './Stick';
import { Prep } from './Prep';
import { Tutorial } from './Tutorial';
import { Debrief } from './Debrief';
import { FieldPainter } from './painter';
import {
  alignQuality, apparentOffset, CENTRE_TOL, centreError, clamp, CONTACT_LIMIT_S, CONTACT_WARN_S, DIAL_MAX, DIAL_MIN, DIAL_PRESET, drift,
  dyeBias, dyeState, endpointOf, fmtGrams, ICARE_SHOTS, icareMean, icareSd, icareShot, METHOD_LABEL, pulse, pulseAmp, type IcareShot, type Method,
} from './optics';
import { assess, type EyeMeasure } from './scoring';
import { makeChallenge } from './practice';
import { buildReport } from './report';

interface Sim {
  t: number;
  active: number;
  dial: number;
  stickX: number; stickY: number; keyX: number; keyY: number;
  hx: number; hy: number;
  dye: number;
  contact: number;
  blinkAt: number; blinkStart: number;
  shot: number; shotDir: number;
  tickAt: number;
  phase: number;
  start: Record<Eye, { x: number; y: number }>;
}

const gauss = (rng: { next(): number }) => Math.sqrt(-2 * Math.log(1 - rng.next())) * Math.cos(2 * Math.PI * rng.next());

export function Game({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const { audio, fx } = ctx;
  const reduced = ctx.reducedMotion;
  const rng = useMemo(() => ctx.rng.fork('tonometry'), []);
  const [method, setMethod] = useState<Method>('goldmann');
  const [eye, setEye] = useState<Eye>('OD');
  const [phase, setPhase] = useState<'prep' | 'measure' | 'debrief'>('prep');
  const [tutorial, setTutorial] = useState(true);
  const [numbed, setNumbed] = useState(false);
  const [measures, setMeasures] = useState<Partial<Record<Eye, EyeMeasure>>>({});
  const [shots, setShots] = useState<Record<Eye, IcareShot[]>>({ OD: [], OS: [] });
  const [ui, setUi] = useState({ cx: 0, cy: 0, contact: 0, err: 1, ep: 'apart' as ReturnType<typeof endpointOf>, dye: 0, dial: DIAL_PRESET });
  const [dyeUi, setDyeUi] = useState(0);
  const [lastShot, setLastShot] = useState<IcareShot | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const painter = useMemo(() => new FieldPainter(), []);
  const calledRef = useRef(false);
  const sim = useRef<Sim>({
    t: 0, active: 0, dial: DIAL_PRESET, stickX: 0, stickY: 0, keyX: 0, keyY: 0, hx: 0, hy: 0, dye: 0, contact: 0,
    blinkAt: 4, blinkStart: -9, shot: 0, shotDir: 0, tickAt: 0, phase: rng.float(0, 6.28),
    start: (() => {
      const mk = () => {
        const a = rng.float(0, Math.PI * 2);
        const m = rng.float(0.42, 0.75);
        return { x: Math.cos(a) * m, y: Math.sin(a) * m };
      };
      return { OD: mk(), OS: mk() };
    })(),
  });
  const S = sim.current;
  const live = useRef({ method, eye, phase, tutorial, shots, measures, ui });
  live.current = { method, eye, phase, tutorial, shots, measures, ui };
  const diffAmp = 0.025 + 0.09 * ctx.difficulty;

  const play = (id: Parameters<typeof audio.play>[0], o?: { volume?: number; pitch?: number }) => audio.play(id, o);

  // ───────────── render loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const g = canvas.getContext('2d');
    if (!g) return;
    let raf = 0;
    let last = performance.now();
    let uiAt = 0;
    let size = 0;
    let dpr = 1;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      dpr = Math.min(2, window.devicePixelRatio || 1);
      const px = Math.max(120, Math.round(r.width * dpr));
      if (px !== size) {
        size = px;
        canvas.width = canvas.height = px;
      }
    };
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(fit) : null;
    ro?.observe(canvas);
    fit();
    const loop = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const L = live.current;
      const s = sim.current;
      s.t += dt;
      const running = L.phase === 'measure' && !L.tutorial;
      if (running) {
        s.active += dt;
        const vx = clamp(s.stickX + s.keyX, -1, 1);
        const vy = clamp(s.stickY + s.keyY, -1, 1);
        s.hx = clamp(s.hx + vx * dt * 0.75, -1.6, 1.6);
        s.hy = clamp(s.hy + vy * dt * 0.75, -1.6, 1.6);
        if (L.method === 'goldmann') {
          s.contact += dt;
          s.dye = Math.max(0, s.dye - 0.0028 * dt);
        }
      }
      const st = s.start[L.eye];
      const dr = drift(s.t, reduced ? diffAmp * 0.3 : diffAmp, s.phase);
      const cx = st.x + dr.x + s.hx;
      const cy = st.y + dr.y + s.hy;
      // blink
      if (running && s.t > s.blinkAt) {
        s.blinkStart = s.t;
        s.blinkAt = s.t + rng.float(5, 9.5) - 2.5 * ctx.difficulty;
      }
      const bp = (s.t - s.blinkStart) / 0.5;
      const blink = bp >= 0 && bp <= 1 ? Math.sin(Math.PI * bp) ** 1.5 * (reduced ? 0.45 : 1) : 0;
      // iCare probe travel
      if (s.shotDir !== 0) {
        s.shot += s.shotDir * dt * 7;
        if (s.shot >= 1) { s.shot = 1; s.shotDir = -1; }
        if (s.shot <= 0) { s.shot = 0; s.shotDir = 0; }
      }
      const T = ctx.findings.iop[L.eye];
      const off = apparentOffset(s.dial, T, dyeBias(s.dye), pulse(s.t, pulseAmp(T, ctx.difficulty)));
      if (L.phase !== 'prep') {
        painter.draw(g, size, ctx.findings, L.eye, L.method, { t: s.t, cx, cy, offset: off, dye: s.dye, blink, shot: s.shot, reduced });
      }
      if (now - uiAt > 120) {
        uiAt = now;
        const err = centreError(cx, cy);
        const ep = endpointOf(apparentOffset(s.dial, T, dyeBias(s.dye), 0), 0.9);
        setUi({ cx, cy, contact: s.contact, err, ep, dye: s.dye, dial: s.dial });
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); ro?.disconnect(); };
  }, [phase]);

  // ───────────── keyboard
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const axis = (k: string): [number, number] | null =>
      k === 'w' || k === 'W' ? [0, -1] : k === 's' || k === 'S' ? [0, 1] : k === 'a' || k === 'A' ? [-1, 0] : k === 'd' || k === 'D' ? [1, 0] : null;
    const down = (e: KeyboardEvent) => {
      if (live.current.tutorial || live.current.phase === 'debrief' || e.ctrlKey || e.metaKey) return;
      const a = axis(e.key);
      if (a && live.current.phase === 'measure') {
        if (a[0]) sim.current.keyX = a[0];
        if (a[1]) sim.current.keyY = a[1];
        e.preventDefault();
        return;
      }
      if (live.current.phase !== 'measure') return;
      const onBtn = (e.target as HTMLElement).tagName === 'BUTTON';
      if (e.key === 'l' || e.key === 'L' || (e.key === 'Enter' && !onBtn)) { e.preventDefault(); live.current.method === 'goldmann' ? lock() : shoot(); }
      else if (e.key === ' ' && !(e.target as HTMLElement).closest('.tn-shoot, .tn-seg') && live.current.method === 'icare') { e.preventDefault(); shoot(); }
      else if (e.key === 'f' || e.key === 'F') addDye(0.12);
      else if (e.key === 'b' || e.key === 'B') addDye(-0.12);
    };
    const up = (e: KeyboardEvent) => {
      const a = axis(e.key);
      if (!a) return;
      if (a[0]) sim.current.keyX = 0;
      if (a[1]) sim.current.keyY = 0;
    };
    root.addEventListener('keydown', down);
    root.addEventListener('keyup', up);
    return () => { root.removeEventListener('keydown', down); root.removeEventListener('keyup', up); };
  }, []);

  useEffect(() => { rootRef.current?.focus({ preventScroll: true }); }, []);

  // ───────────── actions
  const timers = useRef<number[]>([]);
  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const addDye = (d: number) => {
    if (live.current.method !== 'goldmann') return;
    S.dye = clamp(S.dye + d, 0, 1);
    play('tick', { pitch: d > 0 ? 1.1 : 0.9 });
  };

  const setDial = (v: number) => {
    const nv = clamp(v, DIAL_MIN, DIAL_MAX);
    if (Math.round(nv) !== Math.round(S.dial) && S.t - S.tickAt > 0.035) {
      S.tickAt = S.t;
      play('dial', { pitch: 0.9 + nv / 100 });
    }
    S.dial = nv;
    setUi((u) => ({ ...u, dial: nv }));
  };

  const burstAtScope = (kind: 'sparks' | 'stars' | 'confetti') => {
    const r = canvasRef.current?.getBoundingClientRect();
    if (r) fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind, count: 26, color: '#ffd27a' });
  };

  const lock = () => {
    const L = live.current;
    if (L.method !== 'goldmann' || L.phase !== 'measure') return;
    const e = L.eye;
    const T = ctx.findings.iop[e];
    const st = S.start[e];
    const dr = drift(S.t, diffAmp, S.phase);
    const m: EyeMeasure = {
      eye: e, method: 'goldmann', reading: Math.round(S.dial), truth: T,
      centreErr: centreError(st.x + dr.x + S.hx, st.y + dr.y + S.hy), dye: S.dye, contactS: S.contact,
    };
    play('lens-click');
    const err = Math.abs(m.reading - T);
    if (err <= 1 && alignQuality(m.centreErr) > 0.85) { play('success'); burstAtScope('stars'); fx.floatText(`${m.reading} mmHg`, innerWidth / 2, innerHeight / 2, { color: '#ffd27a', size: 28 }); }
    setMeasures((p) => ({ ...p, [e]: m }));
    const other = EYES.find((x) => x !== e)!;
    if (!live.current.measures[other]) switchEye(other, true);
  };

  const shoot = () => {
    const L = live.current;
    if (L.method !== 'icare' || L.phase !== 'measure' || S.shotDir !== 0) return;
    const e = L.eye;
    const list = L.shots[e];
    if (list.filter((x) => x.accepted).length >= ICARE_SHOTS) return;
    const st = S.start[e];
    const dr = drift(S.t, diffAmp, S.phase);
    const c = centreError(st.x + dr.x + S.hx, st.y + dr.y + S.hy);
    const sh = icareShot(ctx.findings.iop[e], c, gauss(rng));
    S.shotDir = 1;
    play(sh.accepted ? 'tick' : 'error', { pitch: 1.3 });
    setLastShot(sh);
    const next = [...list, sh];
    setShots((p) => ({ ...p, [e]: next }));
    const acc = next.filter((x) => x.accepted);
    if (acc.length >= ICARE_SHOTS) {
      const mean = icareMean(next)!;
      const cErr = next.reduce((a, x) => a + x.err, 0) / next.length;
      const m: EyeMeasure = { eye: e, method: 'icare', reading: mean, truth: ctx.findings.iop[e], centreErr: cErr, dye: 0.5, contactS: 0, shots: acc.length };
      timers.current.push(window.setTimeout(() => {
        play('lens-click');
        setMeasures((p) => ({ ...p, [e]: m }));
        const other = EYES.find((x) => x !== e)!;
        if (!live.current.measures[other]) switchEye(other, true);
      }, 500));
    }
  };

  const switchEye = (e: Eye, auto = false) => {
    if (e === live.current.eye) return;
    S.hx = S.hy = 0;
    S.contact = 0;
    S.dial = live.current.measures[e]?.reading ?? DIAL_PRESET;
    S.shot = 0; S.shotDir = 0;
    live.current.eye = e;
    setEye(e);
    setLastShot(null);
    if (!auto) play('lens-click');
  };

  const chooseMethod = (m: Method) => {
    if (m === method || Object.keys(measures).length > 0) return;
    play('lens-click');
    S.dial = DIAL_PRESET; S.hx = S.hy = 0; S.contact = 0;
    live.current.method = m;
    setMethod(m);
    setPhase(m === 'icare' ? 'measure' : numbed && S.dye > 0.1 ? 'measure' : 'prep');
  };

  const enterMeasure = () => { play('whoosh'); S.dye = Math.max(S.dye, 0.1); S.contact = 0; setPhase('measure'); };

  // ───────────── finishing
  const both = EYES.every((e) => measures[e]);
  const assessment = useMemo(() => assess(measures, S.active * 1000), [measures, phase]);
  const challenge = useMemo(() => (ctx.mode === 'practice' && phase === 'debrief' ? makeChallenge(ctx.findings, rng.fork('quiz'), method) : null), [phase]);

  const record = () => { play('stamp'); setPhase('debrief'); };
  const finish = (quizCorrect: boolean | null) => {
    if (calledRef.current) return;
    calledRef.current = true;
    const a = assessment;
    const accuracy = quizCorrect === null ? a.accuracy : a.accuracy * 0.75 + (quizCorrect ? 0.25 : 0);
    const perfect = a.perfect && (quizCorrect === null || quizCorrect) && method === 'goldmann';
    play(accuracy > 0.65 ? 'success' : 'fail');
    done({
      testId: 'tonometry',
      accuracy: clamp(accuracy, 0, 1),
      timeMs: Math.round(S.active * 1000),
      findings: buildReport(ctx.findings, method),
      perfect,
    });
  };

  // ───────────── derived UI
  const centred = ui.err <= CENTRE_TOL;
  const ds = dyeState(ui.dye);
  const iShots = shots[eye];
  const accepted = iShots.filter((x) => x.accepted);
  const hint = tutorial ? 'Learn the instrument, then begin.'
    : phase === 'prep' ? 'Instil anaesthetic, then touch a fluorescein strip to the lower lid.'
    : method === 'icare' ? (centred ? 'Centred. Press Shoot: six accepted shots are averaged.' : 'Centre the cornea in the dashed ring with the joystick, then shoot.')
    : !centred ? 'Push the joystick to bring the ring into the gold target: the two arcs must be equal.'
    : ds !== 'good' ? (ds === 'thick' ? 'Mires too thick: they over-read. Blot a little dye.' : 'Mires too thin: they under-read. Add dye.')
    : 'Turn the drum until the inner edges of the arcs just touch, at mid-pulse. Then lock.';
  const longContact = ui.contact > CONTACT_WARN_S;

  return (
    <div class="tn-root" ref={rootRef} tabIndex={-1} data-phase={phase} data-centre-err={ui.err.toFixed(2)} data-endpoint={ui.ep} data-cx={ui.cx.toFixed(2)} data-cy={ui.cy.toFixed(2)}>
      <header class="tn-head">
        <div class="tn-head__title"><Icon name="tonometry" /> Tonometry</div>
        <p class="tn-head__hint" key={hint} aria-live="polite">{hint}</p>
        <div class="tn-seg" role="group" aria-label="Method">
          {(['goldmann', 'icare'] as Method[]).map((m) => (
            <button key={m} type="button" class={`tn-seg__b${method === m ? ' is-on' : ''}`} aria-pressed={method === m} disabled={Object.keys(measures).length > 0 && method !== m} onClick={() => chooseMethod(m)}>
              {m === 'goldmann' ? 'Goldmann' : 'iCare'}
            </button>
          ))}
        </div>
        <div class="tn-seg" role="group" aria-label="Eye">
          {EYES.map((e) => (
            <button key={e} type="button" class={`tn-seg__b${eye === e ? ' is-on' : ''}`} aria-pressed={eye === e} disabled={phase === 'prep'} onClick={() => switchEye(e)}>
              {e}{measures[e] && <Icon name="check" />}
            </button>
          ))}
        </div>
      </header>

      <main class="tn-stage">
        {phase === 'prep' ? (
          <Prep findings={ctx.findings} eye={eye} numbed={numbed} dye={dyeUi} reduced={reduced}
            onNumb={() => setNumbed(true)} onDye={(v) => { S.dye = v; setDyeUi(v); }} onDone={enterMeasure} play={play} />
        ) : (
          <>
            <section class="tn-scope" aria-label={`${eye} slit-lamp field`}>
              <canvas ref={canvasRef} class="tn-canvas" role="img" aria-label={method === 'goldmann' ? 'Fluorescein semicircles in the biprism' : 'Cornea with iCare probe'} />
              <span class="tn-scope__eye">{eye}</span>
              {method === 'goldmann' && (
                <span class={`tn-chip tn-chip--contact${longContact ? ' is-warn' : ''}${ui.contact > CONTACT_LIMIT_S ? ' is-bad' : ''}`}>
                  <Icon name="clock" /> {ui.contact.toFixed(0)}s contact
                </span>
              )}
              {!centred && <span class="tn-chip tn-chip--centre">Off-centre</span>}
            </section>
            <aside class="tn-panel">
              <div class="tn-lcd">
                {method === 'goldmann' ? (
                  <>
                    <span class="tn-lcd__big tn-num">{Math.round(ui.dial)}<small> mmHg</small></span>
                    <span class="tn-lcd__sub">{fmtGrams(ui.dial)} on the drum</span>
                    <span class="tn-ep">Read at mid-pulse</span>
                  </>
                ) : (
                  <>
                    <span class="tn-lcd__big tn-num">{lastShot ? (lastShot.accepted ? lastShot.reading : 'Err') : '--'}<small> mmHg</small></span>
                    <span class="tn-lcd__sub">{accepted.length ? `mean ${icareMean(iShots)} · sd ${icareSd(iShots).toFixed(1)}` : 'no readings yet'}</span>
                    <span class="tn-dots tn-dots--shots" aria-label={`${accepted.length} of ${ICARE_SHOTS} shots`}>
                      {Array.from({ length: ICARE_SHOTS }, (_, i) => <span key={i} class={i < accepted.length ? 'is-on' : ''} />)}
                    </span>
                  </>
                )}
              </div>
              <div class="tn-controls">
                <Stick external={{ x: S.keyX, y: S.keyY }} onChange={(x, y) => { S.stickX = x; S.stickY = y; }} />
                {method === 'goldmann' ? (
                  <Drum value={ui.dial} onChange={setDial} />
                ) : (
                  <Button variant="primary" size="lg" class="tn-shoot" sfx={false} disabled={!!measures[eye]} onClick={shoot}>Shoot</Button>
                )}
              </div>
              {method === 'goldmann' && (
                <div class="tn-actions">
                <div class="tn-dye">
                  <span class="tn-dye__label">Dye</span>
                  <Button variant="ghost" size="sm" sfx={false} icon="minus" onClick={() => addDye(-0.12)} aria-label="Blot excess dye" />
                  <div class="tn-gauge tn-gauge--sm" aria-hidden="true">
                    <span class="tn-gauge__band" style={{ left: '36%', width: '28%' }} />
                    <span class="tn-gauge__fill" style={{ width: `${ui.dye * 100}%` }} />
                  </div>
                  <Button variant="ghost" size="sm" sfx={false} icon="plus" onClick={() => addDye(0.12)} aria-label="Add fluorescein" />
                </div>
                <Button variant="glass" size="md" icon="lock" sfx={false} onClick={lock} class="tn-lock">
                  {measures[eye] ? `Re-lock ${eye} (${measures[eye]!.reading})` : `Lock ${eye}`}
                </Button>
                </div>
              )}
              {method === 'icare' && measures[eye] && <p class="tn-note">{eye} measured: {measures[eye]!.reading} mmHg (mean of {ICARE_SHOTS}).</p>}
            </aside>
          </>
        )}
      </main>

      <footer class="tn-foot">
        <div class="tn-prog" aria-label="Progress">
          {EYES.map((e) => <span key={e} class={`tn-prog__eye${measures[e] ? ' is-done' : ''}`}>{e} {measures[e] ? `${measures[e]!.reading} mmHg` : '...'}</span>)}
          <span class="tn-prog__method">{METHOD_LABEL[method]}</span>
        </div>
        <Button variant="primary" size="md" trailingIcon="check" sfx={false} disabled={!both || phase === 'debrief'} onClick={record}>Record findings</Button>
      </footer>

      {tutorial && <Tutorial onClose={() => { play('lens-click'); setTutorial(false); rootRef.current?.focus(); }} />}
      {phase === 'debrief' && <Debrief assessment={assessment} measures={measures} challenge={challenge} onFinish={finish} />}
    </div>
  );
}
