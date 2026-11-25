import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, formatDiopters, formatRx, pickStrings, type Eye, type MiniGameContext, type MiniGameDone } from '@core';
import { AvatarBust } from '@render';
import { Button, Icon, Kbd, SpeechBubble } from '@ui-kit';
import { ChartView } from './ChartView';
import { windowFor, type ChartFrame } from './chart';
import { Debrief } from './Debrief';
import { Dial } from './Dial';
import {
  blurKernel, clamp, duochromeResiduals, effectiveResidual, jccRedAxis, jccVector, lensFromRx, lensMagnification, makeEyeModel,
  perceivedVA, snapLens, snellen, toVector, type EyeModel, type JccMode, type Lens,
} from './optics';
import { balance, compareJcc, compareLenses, duochrome, readChart, type Listener } from './patient';
import { Phoropter } from './Phoropter';
import { autorefraction, makeChallenge, type Challenge } from './practice';
import { report } from './report';
import { assess, type Assessment } from './scoring';
import {
  changedSinceAsk, eyeComplete, hint, initSession, recordAsk, setActive, stages, stepAxis, stepCyl, stepSphere,
  type Battery, type SessionState,
} from './session';
import { Tutorial } from './Tutorial';
import { LocaleCtx, S } from './strings';

type DeckTab = 'sph' | 'cyl' | 'axis' | 'tools' | 'bal';
type Present = { kind: 'lens' | 'jcc'; phase: 1 | 2 } | { kind: 'think' };

const TUT_KEY = 'lumen.phoropter.tutorial.v1';
/** In-memory fallback so Skip sticks for the session even when storage is blocked. */
let tutSeenInSession = false;
function tutorialSeen(): boolean {
  if (tutSeenInSession) return true;
  try { return localStorage.getItem(TUT_KEY) === '1'; } catch { return false; }
}
function markTutorialSeen(): void {
  tutSeenInSession = true;
  try { localStorage.setItem(TUT_KEY, '1'); } catch { /* private mode */ }
}

const lensRx = (l: Lens) => formatRx({ sphere: l.sphere, cylinder: l.cyl, axis: l.axis });

export function Game({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const loc = ctx.locale;
  const t = pickStrings(S, loc);
  const f = ctx.findings;
  const models = useMemo<Record<Eye, EyeModel>>(() => ({
    OD: makeEyeModel(f.refraction.OD, f.va.OD.bestCorrected, f.accommodation.amplitudeD.OD, f.va.OD.uncorrected),
    OS: makeEyeModel(f.refraction.OS, f.va.OS.bestCorrected, f.accommodation.amplitudeD.OS, f.va.OS.uncorrected),
  }), []);
  const truths = useMemo<Record<Eye, Lens>>(() => ({ OD: snapLens(lensFromRx(f.refraction.OD)), OS: snapLens(lensFromRx(f.refraction.OS)) }), []);
  const start = useMemo<Record<Eye, Lens>>(() => {
    const r = ctx.rng.fork('autorefraction');
    return { OD: autorefraction(truths.OD, ctx.patient.age, ctx.difficulty, r), OS: autorefraction(truths.OS, ctx.patient.age, ctx.difficulty, r) };
  }, []);
  const listener = useMemo<Listener>(() => ({ rng: ctx.rng.fork('patient'), difficulty: ctx.difficulty, locale: loc }), []);
  const challenge = useMemo<Challenge | null>(() => (ctx.mode === 'practice' ? makeChallenge(f, ctx.rng.fork('challenge'), loc) : null), []);
  const first = ctx.patient.name.split(' ')[0] ?? ctx.patient.name;
  /** Spectacles come off behind the refractor. */
  const avatarSpec = useMemo(() => ({ ...ctx.patient.avatar, glasses: 'none' as const }), []);

  const [s, setS] = useState<SessionState>(() => initSession(start));
  const live = useRef(s);
  live.current = s;
  const [present, setPresent] = useState<Present | null>(null);
  const [flipKey, setFlipKey] = useState(0);
  const [speech, setSpeech] = useState({ id: 0, text: t.greeting(first) });
  const [note, setNote] = useState<string | null>(null);
  const [tab, setTab] = useState<DeckTab>('sph');
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [result, setResult] = useState<Assessment | null>(null);
  const timers = useRef<number[]>([]);
  const finished = useRef(false);
  const t0 = useRef(performance.now());
  const recordBtn = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  // Keyboard shortcuts live on the root: give it focus once the tutorial is out of the way.
  useEffect(() => {
    if (!tutorial && !result && !rootRef.current?.contains(document.activeElement)) rootRef.current?.focus({ preventScroll: true });
  }, [tutorial]);

  const later = (ms: number, fn: () => void) => {
    const id = window.setTimeout(() => {
      timers.current = timers.current.filter((t) => t !== id);
      fn();
    }, ms);
    timers.current.push(id);
  };
  useEffect(() => () => { timers.current.forEach((t) => clearTimeout(t)); timers.current = []; }, []);

  const say = (text: string) => setSpeech((p) => ({ id: p.id + 1, text }));
  const flash = (text: string) => {
    setNote(text);
    later(2600, () => setNote((n) => (n === text ? null : n)));
  };
  const busy = present !== null || result !== null || tutorial;
  const phaseMs = ctx.reducedMotion ? 420 : 760;
  const single: Eye | null = s.active === 'OU' ? null : s.active;

  // ── dial handlers
  const onSphere = (n: number) => {
    if (busy) return;
    setS((p) => stepSphere(p, n, models));
    ctx.audio.play('lens-click', { pitch: n > 0 ? 1.08 : 0.94, volume: 0.7 });
  };
  const onCyl = (n: number) => {
    if (busy || !single) return;
    const r = stepCyl(live.current, n, models);
    setS(r.state);
    ctx.audio.play('lens-click', { pitch: 1.2, volume: 0.6 });
    if (r.seShift) flash(t.flashSphere(formatDiopters(r.seShift)));
  };
  const onAxis = (n: number, fine: boolean) => {
    if (busy || !single) return;
    setS((p) => stepAxis(p, n, fine));
    ctx.audio.play('dial', { pitch: fine ? 1.25 : 1, volume: 0.6 });
  };
  const nudge = (eye: Eye, n: number) => {
    if (busy) return;
    setS((p) => stepSphere(p, n, models, eye));
    ctx.audio.play('lens-click', { pitch: n > 0 ? 1.08 : 0.94, volume: 0.7 });
  };

  const setBattery = (b: Battery) => {
    if (busy || s.active === b) return;
    setS((p) => setActive(p, b));
    ctx.audio.play('whoosh', { volume: 0.5 });
  };
  const setJcc = (m: JccMode | null) => {
    if (busy || !single) return;
    setS((p) => ({ ...p, jcc: m, duo: m ? false : p.duo }));
    ctx.audio.play(m ? 'whoosh' : 'click', { volume: 0.5, pitch: m ? 1.2 : 1 });
  };
  const toggleDuo = () => {
    if (busy || !single) return;
    setS((p) => ({ ...p, duo: !p.duo, jcc: p.duo ? p.jcc : null }));
    ctx.audio.play('select');
  };
  const togglePrism = () => {
    if (busy || s.active !== 'OU') return;
    setS((p) => ({ ...p, prism: !p.prism }));
    ctx.audio.play('dial');
  };

  // ── questions
  const answerLater = (fn: () => void, ms = ctx.reducedMotion ? 200 : 420) => {
    setPresent({ kind: 'think' });
    later(ms, () => {
      setPresent(null);
      fn();
      ctx.audio.play('pop', { volume: 0.5 });
    });
  };

  const ask = () => {
    if (busy) return;
    const st = live.current;
    if (single && st.duo) {
      setS((p) => recordAsk(p, 'duochrome'));
      answerLater(() => say(duochrome(models[single], st.lenses[single], listener).text));
      return;
    }
    if (!single && st.prism) {
      setS((p) => recordAsk(p, 'balance'));
      answerLater(() => say(balance(models, st.lenses, listener).text));
      return;
    }
    if (single && st.jcc) {
      const mode = st.jcc;
      setPresent({ kind: 'jcc', phase: 1 });
      setFlipKey((k) => k + 1);
      ctx.audio.play('click', { pitch: 1.3 });
      later(phaseMs, () => {
        setPresent({ kind: 'jcc', phase: 2 });
        setFlipKey((k) => k + 1);
        ctx.audio.play('click', { pitch: 1.1 });
        later(phaseMs, () => {
          setPresent(null);
          setS((p) => recordAsk(p, mode === 'axis' ? 'jcc-axis' : 'jcc-power'));
          say(compareJcc(models[single], st.lenses[single], mode, listener).text);
          ctx.audio.play('pop', { volume: 0.5 });
        });
      });
      return;
    }
    if (!changedSinceAsk(st)) {
      flash(t.flashChange);
      ctx.audio.play('error', { volume: 0.4 });
      return;
    }
    setPresent({ kind: 'lens', phase: 1 });
    ctx.audio.play('lens-click');
    later(phaseMs, () => {
      setPresent({ kind: 'lens', phase: 2 });
      ctx.audio.play('lens-click', { pitch: 1.1 });
      later(phaseMs, () => {
        setPresent(null);
        const eye: Eye = single ?? (perceivedVA(models.OD, st.lenses.OD) <= perceivedVA(models.OS, st.lenses.OS) ? 'OD' : 'OS');
        say(compareLenses(models[eye], st.base[eye], st.lenses[eye], listener).text);
        setS((p) => recordAsk(p, 'lens'));
        ctx.audio.play('pop', { volume: 0.5 });
      });
    });
  };

  const read = () => {
    if (busy) return;
    const st = live.current;
    setS((p) => recordAsk(p, 'read'));
    const va = single ? perceivedVA(models[single], st.lenses[single]) : Math.min(perceivedVA(models.OD, st.lenses.OD), perceivedVA(models.OS, st.lenses.OS)) - 0.02;
    answerLater(() => say(readChart(va, listener.rng, loc).text), ctx.reducedMotion ? 200 : 600);
  };

  // ── recording
  const record = () => {
    if (busy || finished.current) return;
    const st = live.current;
    const a = assess(
      st.lenses, truths, st.proto,
      { OD: { trueCyl: -truths.OD.cyl, best: models.OD.best }, OS: { trueCyl: -truths.OS.cyl, best: models.OS.best } },
      st.balanceChecked,
    );
    setResult(a);
    ctx.audio.play(a.perfect ? 'success' : 'reveal');
    const r = recordBtn.current?.getBoundingClientRect();
    if (r) {
      ctx.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: a.perfect ? 'stars' : 'sparks', count: a.perfect ? 40 : 18, color: '#ffd27a' });
      if (a.perfect) ctx.fx.floatText(t.perfectFloat, r.left + r.width / 2, r.top - 10, { color: '#ffd27a' });
    }
    // Case mode has no recognition check: the findings go straight to the chart.
    if (ctx.mode === 'case') finish(a, null);
  };

  const finish = (a: Assessment, challengeCorrect: boolean | null) => {
    if (finished.current) return;
    finished.current = true;
    const tech = a.accuracy;
    const accuracy = challengeCorrect === null ? tech : 0.75 * tech + 0.25 * (challengeCorrect ? 1 : 0);
    done({
      testId: ctx.testId,
      accuracy: Math.round(accuracy * 1000) / 1000,
      timeMs: Math.round(performance.now() - t0.current),
      findings: report(ctx.findings, ctx.patient, loc),
      perfect: a.perfect && challengeCorrect !== false,
    });
  };

  // ── keyboard shortcuts (scoped to the game root)
  const onKey = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
    const k = e.key.toLowerCase();
    const map: Record<string, () => void> = {
      a: ask, r: read, d: toggleDuo, p: togglePrism,
      j: () => setJcc(s.jcc === null ? 'axis' : s.jcc === 'axis' ? 'power' : null),
      e: () => setBattery(s.active === 'OD' ? 'OS' : s.active === 'OS' ? 'OU' : 'OD'),
      '+': () => onSphere(1), '=': () => onSphere(1), '-': () => onSphere(-1), _: () => onSphere(-1),
    };
    const fn = map[k];
    if (fn && !tutorial && !result) {
      e.preventDefault();
      fn();
    }
  };

  // ── what the patient sees
  const frame = useMemo<ChartFrame>(() => {
    const haze = (e: Eye) => clamp((models[e].best - 0.15) * 0.6, 0, 0.45);
    if (!single) {
      if (s.prism) {
        const k = (e: Eye) => blurKernel(models[e], effectiveResidual(models[e], s.lenses[e]).eff);
        return { layout: 'balance', a: k('OD'), b: k('OS'), scale: 1, haze: Math.max(haze('OD'), haze('OS')) * 0.6, dim: 0 };
      }
      const eye: Eye = perceivedVA(models.OD, s.lenses.OD) <= perceivedVA(models.OS, s.lenses.OS) ? 'OD' : 'OS';
      const r = effectiveResidual(models[eye], s.lenses[eye]);
      return { layout: 'full', a: blurKernel(models[eye], r.eff), scale: lensMagnification(toVector(s.lenses[eye]).M), haze: haze(eye), dim: clamp(r.acc / 1.5, 0, 1), win: windowFor(perceivedVA(models[eye], s.lenses[eye])) };
    }
    const lens = present?.kind === 'lens' && present.phase === 1 ? s.base[single] : s.lenses[single];
    const scale = lensMagnification(toVector(lens).M);
    if (s.duo) {
      const d = duochromeResiduals(models[single], lens);
      return { layout: 'duochrome', a: blurKernel(models[single], d.red), b: blurKernel(models[single], d.green), scale, haze: haze(single), dim: 0, win: 2 };
    }
    const flip = present?.kind === 'jcc' ? present.phase : 1;
    const extra = s.jcc ? jccVector(jccRedAxis(s.jcc, lens.axis, flip)) : undefined;
    const r = effectiveResidual(models[single], lens, extra);
    return { layout: 'full', a: blurKernel(models[single], r.eff), scale, haze: haze(single), dim: clamp(r.acc / 1.5, 0, 1), win: windowFor(perceivedVA(models[single], s.lenses[single])) };
  }, [s.lenses, s.base, s.active, s.duo, s.jcc, s.prism, present]);

  const vaNow = single ? perceivedVA(models[single], s.lenses[single]) : Math.min(perceivedVA(models.OD, s.lenses.OD), perceivedVA(models.OS, s.lenses.OS));
  const expression = present ? 'neutral' : vaNow > 0.55 ? 'squint' : vaNow < 0.05 ? 'happy' : 'neutral';
  const badge = present && present.kind !== 'think' ? (present.phase === 1 ? '1' : '2') : null;
  const jccRed = single && s.jcc ? jccRedAxis(s.jcc, s.lenses[single].axis, present?.kind === 'jcc' ? present.phase : 1) : null;
  const askLabel = single && s.duo ? t.askDuo : !single && s.prism ? t.askBalance : single && s.jcc ? t.askJcc : t.askLens;
  const lens = single ? s.lenses[single] : s.lenses.OD;
  const steps = s.proto.OD.asks + s.proto.OS.asks;
  const tabs: [DeckTab, string][] = single ? [['sph', t.sphere], ['cyl', t.cylinder], ['axis', t.axis], ['tools', t.toolsTab]] : [['sph', t.sphere], ['bal', t.balanceTab]];
  const activeTab: DeckTab = tabs.some(([k]) => k === tab) ? tab : 'sph';
  const pickTab = (k: DeckTab) => { setTab(k); ctx.audio.play('click', { volume: 0.4, pitch: 1.2 }); };

  return (
    <LocaleCtx.Provider value={loc}>
    <div ref={rootRef} class={`php-root${ctx.reducedMotion ? ' is-reduced' : ''}`} tabIndex={-1} onKeyDown={onKey} data-busy={busy || undefined}>
      <header class="php-head">
        <div class="php-head__title"><Icon name="phoropter" /><span>{t.title}</span></div>
        <p class="php-head__hint" aria-live="polite">{note ?? hint(s, loc)}</p>
        <div class="php-seg" dir="ltr" role="group" aria-label={t.eyeUnderTest}>
          {(['OD', 'OS', 'OU'] as const).map((b) => (
            <button key={b} type="button" class={`php-seg__b${s.active === b ? ' is-on' : ''}`} aria-pressed={s.active === b} onClick={() => setBattery(b)} disabled={busy && s.active !== b}>
              {b}
              {b !== 'OU' && eyeComplete(s, b) && <Icon name="check" class="php-seg__ok" />}
            </button>
          ))}
        </div>
      </header>

      <main class="php-stage">
        <section class="php-instr" aria-label={t.refractor}>
          <div class="php-instr__head">
            <div class="php-slip" title={t.slipTitle}>
              <span class="php-slip__k">{t.slipLabel}</span>
              {EYES.map((e) => <span key={e} class="php-slip__v"><b>{e}</b> {lensRx(s.start[e])}</span>)}
            </div>
          </div>
          <div class="php-instr__body">
            <Phoropter
              lenses={s.lenses}
              active={s.active}
              occluded={{ OD: s.active === 'OS', OS: s.active === 'OD' }}
              jcc={s.jcc}
              jccRed={jccRed}
              flipKey={flipKey}
              prism={s.prism && s.active === 'OU'}
              badge={badge}
            />
            <div class="php-readout" dir="ltr" aria-hidden="true">
              {EYES.map((e) => (
                <div key={e} class={`php-readout__eye${s.active === e || s.active === 'OU' ? ' is-on' : ''}`}>
                  <span class="php-readout__k" dir="auto">{t.trialLens(e)}</span>
                  <span class="php-readout__v php-num">{lensRx(s.lenses[e])}</span>
                  <span class="php-readout__va php-num">VA {snellen(perceivedVA(models[e], s.lenses[e]))}</span>
                </div>
              ))}
            </div>
          </div>
          <div class={`php-deck${single ? '' : ' php-deck--ou'}`} data-tab={activeTab}>
            <div class="php-tabs" role="tablist" aria-label={t.controls}>
              {tabs.map(([k, l]) => (
                <button key={k} type="button" role="tab" aria-selected={activeTab === k} class={`php-tab${activeTab === k ? ' is-on' : ''}`} onClick={() => pickTab(k)}>{l}</button>
              ))}
            </div>
            {single ? (
              <>
                <Dial id="php-sph" pane="sph" label={t.sphere} size="lg" value={lens.sphere} min={-20} max={20} rotation={lens.sphere * 4 * 15} display={formatDiopters(lens.sphere)} onStep={(n) => onSphere(n)} disabled={busy} sub={t.sphereSub} />
                <Dial id="php-cyl" pane="cyl" label={t.cylinder} value={lens.cyl} min={-8} max={0} rotation={lens.cyl * 4 * 20} display={lens.cyl < 0 ? formatDiopters(lens.cyl) : '0.00'} onStep={(n) => onCyl(-n)} disabled={busy} sub={t.cylSub} accent="#c4b5fd" />
                <Dial id="php-axis" pane="axis" fine label={t.axis} value={lens.axis} min={1} max={180} rotation={90 - lens.axis} dragSign={-1} mark="line" display={`${String(lens.axis).padStart(3, '0')}°`} onStep={onAxis} disabled={busy || lens.cyl === 0} sub={t.axisSub} accent="#7dd3fc" />
                <div class="php-tools" data-pane="tools">
                  <div class="php-seg php-seg--sm" role="group" aria-label={t.crossCyl}>
                    <span class="php-seg__k">JCC</span>
                    {([[null, t.off], ['axis', t.axisBtn], ['power', t.power]] as const).map(([m, l]) => (
                      <button key={l} type="button" class={`php-seg__b${s.jcc === m ? ' is-on' : ''}`} aria-pressed={s.jcc === m} onClick={() => setJcc(m)} disabled={busy}>{l}</button>
                    ))}
                  </div>
                  <button type="button" class={`php-toggle php-toggle--duo${s.duo ? ' is-on' : ''}`} aria-pressed={s.duo} onClick={toggleDuo} disabled={busy}>
                    <span class="php-duo-swatch" aria-hidden="true" /> {t.duochrome} <Kbd>D</Kbd>
                  </button>
                </div>
              </>
            ) : (
              <>
                <Dial id="php-sph-ou" pane="sph" label={t.sphereOu} size="lg" value={s.lenses.OD.sphere} min={-20} max={20} rotation={s.lenses.OD.sphere * 60} display={t.bothEyes} onStep={(n) => onSphere(n)} disabled={busy} sub={t.fogTogether} />
                <div class="php-nudges" data-pane="sph">
                  {EYES.map((e) => (
                    <div class="php-nudge" key={e}>
                      <span class="php-nudge__eye">{e}</span>
                      <button type="button" onClick={() => nudge(e, -1)} disabled={busy} aria-label={t.nudgeMinus(e)}>−0.25</button>
                      <output class="php-num">{formatDiopters(s.lenses[e].sphere)}</output>
                      <button type="button" onClick={() => nudge(e, 1)} disabled={busy} aria-label={t.nudgePlus(e)}>+0.25</button>
                    </div>
                  ))}
                </div>
                <div class="php-tools" data-pane="bal">
                  <button type="button" class={`php-toggle${s.prism ? ' is-on' : ''}`} aria-pressed={s.prism} onClick={togglePrism} disabled={busy}>
                    {t.prism} <Kbd>P</Kbd>
                  </button>
                </div>
              </>
            )}
          </div>
        </section>

        <section class="php-view" aria-label={t.patientSection}>
          <div class="php-patient">
            <div class="php-patient__avatar">
              <AvatarBust spec={avatarSpec} age={ctx.patient.age} sex={ctx.patient.sex} expression={expression} size={64} animated reducedMotion={ctx.reducedMotion} external={{ squinting: expression === 'squint' }} label={t.patientAria(ctx.patient.name)} />
            </div>
            <div class="php-patient__say" aria-live="polite">
              {present?.kind === 'think' ? (
                <div class="php-thinking" aria-label={t.looking}><span /><span /><span /></div>
              ) : present ? (
                <p class="php-you">{present.phase === 1 ? t.youOne : t.youTwo}</p>
              ) : (
                <SpeechBubble key={speech.id} text={speech.text} speaker={first} tail={loc === 'he' ? 'right' : 'left'} voice={false} speed={ctx.reducedMotion ? 400 : 130} />
              )}
            </div>
          </div>
          <div class="php-view__label">
            <span class="php-eyebrow">{t.viewLabel(s.active, s.duo, s.prism)}</span>
            <span class="php-view__va" title={t.seesTitle}>
              <span class="php-view__q php-num">{steps} {t.qShort} · </span>{t.seesWord} <b class="php-num" dir="ltr">{vaNow >= 1.25 ? '<20/200' : snellen(vaNow)}</b>
            </span>
          </div>
          <ChartView frame={frame} reducedMotion={ctx.reducedMotion} badge={badge} caption={`≈ ${vaNow >= 1.25 ? '<20/200' : snellen(vaNow)}`} />
          <div class="php-asks">
            <Button variant="glass" size="md" sfx={false} onClick={ask} disabled={busy} class="php-ask">
              <span class="php-ask__n">1·2</span> {askLabel} <Kbd>A</Kbd>
            </Button>
            <Button variant="ghost" size="md" sfx={false} onClick={read} disabled={busy} icon="eye">
              {t.read} <Kbd>R</Kbd>
            </Button>
          </div>
        </section>
      </main>

      <footer class="php-foot">
        <div class={`php-progress${single ? '' : ' php-progress--ou'}`} aria-label={t.protocolProgress}>
          {EYES.map((e) => {
            const st = stages(s, e);
            const okList = [st.fog, st.sphere, st.axis, st.power, st.duo];
            const items: [string, string, boolean][] = t.stages.map(([l, sh], i) => [l, sh, okList[i]!]);
            return (
              <div class={`php-pips${s.active === e ? ' is-active' : ''}`} key={e} role="list" aria-label={t.stagesAria(e)}>
                <span class="php-pips__eye">{e}</span>
                {items.map(([l, short, ok]) => (
                  <span key={l} role="listitem" class={`php-pip${ok ? ' is-done' : ''}`} title={l} aria-label={t.stageAria(e, l, ok)}>
                    <i aria-hidden="true" /><span class="php-long" aria-hidden="true">{l}</span><span class="php-short" aria-hidden="true">{short}</span>
                  </span>
                ))}
              </div>
            );
          })}
        </div>
        <span class="php-steps php-num" title={t.qTitle}>{steps} {t.qShort}</span>
        <div ref={recordBtn}>
          <Button variant="primary" size="md" sfx={false} icon="chart" onClick={record} disabled={busy} aria-label={t.recordLong}><span class="php-long">{t.recordLong}</span><span class="php-short">{t.recordShort}</span></Button>
        </div>
      </footer>

      {result && ctx.mode === 'case' && (
        <div class="php-recorded" role="status"><span><Icon name="check" /> {t.recordedToChart}</span></div>
      )}
      {tutorial && <Tutorial onClose={() => { markTutorialSeen(); setTutorial(false); ctx.audio.play('select'); }} />}
      {result && ctx.mode === 'practice' && (
        <Debrief
          mode={ctx.mode}
          assessment={result}
          finals={s.lenses}
          truths={truths}
          models={models}
          protocol={s.proto}
          challenge={challenge}
          audio={ctx.audio}
          onFinish={(c) => finish(result, c)}
        />
      )}
    </div>
    </LocaleCtx.Provider>
  );
}

