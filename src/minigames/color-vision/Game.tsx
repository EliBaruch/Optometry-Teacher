import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { Eye, MiniGameContext, MiniGameResult } from '@core';
import { Button, IconButton, SpeechBubble } from '@ui-kit';
import { PatientAvatar } from '@render';
import { eyeVision, interpret, report, scoreSession, type Interpretation, type Score } from './clinical';
import { Dial } from './Dial';
import { ClassifyPanel, RevealPanel, Tutorial } from './Overlays';
import { PlateBook } from './PlateBook';
import { generatePlates, respond, type PlateResponse } from './plates';
import { RedCap, type RedCapResult } from './RedCap';
import { ScoreSheet, keyLabel } from './ScoreSheet';
import { PlateStore } from './store';
import './color-vision.css';

const TUTORIAL_KEY = 'lumen:color-vision:tutorial-seen';
type Phase = 'plates' | 'redcap' | 'classify' | 'reveal';
type Responses = Record<Eye, Record<number, PlateResponse>>;

function tutorialSeen(): boolean {
  try {
    return localStorage.getItem(TUTORIAL_KEY) === '1';
  } catch {
    return false;
  }
}
function markTutorialSeen(): void {
  try {
    localStorage.setItem(TUTORIAL_KEY, '1');
  } catch {
    /* private mode */
  }
}

export interface GameProps {
  ctx: MiniGameContext;
  finish: (r: MiniGameResult) => void;
}

export function ColorVisionGame({ ctx, finish }: GameProps) {
  const { findings, patient, audio, fx, reducedMotion } = ctx;
  const store = useMemo(() => {
    const base = ctx.rng.fork('color-vision');
    const plates = generatePlates(base.fork('plates'));
    const seeds = plates.map(() => base.int(1, 0x7fffffff));
    return new PlateStore(plates, seeds);
  }, []);
  const plates = store.plates;
  const t0 = useRef(performance.now());
  const root = useRef<HTMLDivElement>(null);

  const [phase, setPhase] = useState<Phase>('plates');
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [eye, setEye] = useState<Eye>('OD');
  const [idx, setIdx] = useState(0);
  const [dir, setDir] = useState(1);
  const [responses, setResponses] = useState<Responses>({ OD: {}, OS: {} });
  const [speech, setSpeech] = useState<{ text: string; key: number } | null>(null);
  const [thinking, setThinking] = useState(false);
  const [redCap, setRedCap] = useState<RedCapResult & { shown: Eye[] }>({ done: false, shown: [] });
  const [answer, setAnswer] = useState<Interpretation | null>(null);
  const [score, setScore] = useState<Score | null>(null);
  const speechKey = useRef(0);
  const finished = useRef(false);

  const say = (text: string) => setSpeech({ text, key: ++speechKey.current });

  useEffect(() => () => store.dispose(), [store]);

  // The patient reads the plate once it has been held in view for a moment.
  useEffect(() => {
    if (phase !== 'plates' || tutorial) return;
    const known = responses[eye][idx];
    if (known) {
      setThinking(false);
      say(known.said);
      return;
    }
    const dwell = reducedMotion ? 220 : 420;
    const answerAt = reducedMotion ? 520 : 1050;
    const t1 = setTimeout(() => setThinking(true), dwell);
    const t2 = setTimeout(() => {
      const r = respond(plates[idx]!, eyeVision(findings, eye));
      setThinking(false);
      setResponses((prev) => ({ ...prev, [eye]: { ...prev[eye], [idx]: r } }));
      say(r.said);
      audio.play('pop', { volume: 0.35, pitch: r.correct ? 1.15 : 0.9 });
    }, answerAt);
    // paint the next page in idle time so the flip is instant
    const t3 = setTimeout(() => {
      if (idx + 1 < plates.length) store.canvas(idx + 1);
    }, answerAt + 120);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [eye, idx, phase, tutorial]);

  const turnTo = (i: number) => {
    const n = Math.max(0, Math.min(plates.length - 1, i));
    if (n === idx) return;
    setDir(n > idx ? 1 : -1);
    setIdx(n);
    audio.play('dial', { volume: 0.4, pitch: 0.9 + (n % 4) * 0.06 });
  };

  const switchEye = (e: Eye) => {
    if (e === eye) return;
    audio.play('lens-click');
    setEye(e);
    setDir(-1);
    setIdx(0);
    setThinking(false);
    say(e === 'OD' ? 'Left eye covered. Ready.' : 'Right eye covered. Ready.');
  };

  // keyboard: ←/→ pages, R/L occluder
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'plates' || tutorial || e.defaultPrevented || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement as HTMLElement | null;
      const inside = !el || el === document.body || !!root.current?.contains(el);
      if (!inside || el?.getAttribute('role') === 'slider' || el?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight') turnTo(idx + 1);
      else if (e.key === 'ArrowLeft') turnTo(idx - 1);
      else if (e.key === 'r' || e.key === 'R') switchEye('OD');
      else if (e.key === 'l' || e.key === 'L') switchEye('OS');
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const shownFor = (e: Eye) => Object.keys(responses[e]).map(Number).sort((a, b) => a - b);
  const total = shownFor('OD').length + shownFor('OS').length;

  const submit = (given: Interpretation) => {
    const timeMs = Math.round(performance.now() - t0.current);
    const s = scoreSession(findings, { shown: { OD: shownFor('OD'), OS: shownFor('OS') }, redCapDone: redCap.done, redCapMatch: redCap.match, answer: given, timeMs });
    setAnswer(given);
    setScore(s);
    setPhase('reveal');
    audio.play('stamp');
    const r = root.current?.getBoundingClientRect();
    const x = r ? r.left + r.width / 2 : innerWidth / 2;
    const y = r ? r.top + r.height * 0.3 : innerHeight / 3;
    if (s.parts.type === 1 && s.parts.eye === 1) {
      setTimeout(() => {
        audio.play(s.perfect ? 'sparkle' : 'success');
        fx.burst(x, y, { kind: s.perfect ? 'stars' : 'sparks', count: s.perfect ? 36 : 22, color: '#ffd27a' });
        if (s.perfect) fx.floatText('Flawless', x, y - 30, { color: '#ffd27a', size: 26 });
      }, 220);
    } else {
      audio.play('fail', { volume: 0.6 });
      if (!reducedMotion) fx.shake(3, 220);
    }
  };

  const complete = () => {
    if (finished.current || !score) return;
    finished.current = true;
    audio.play('whoosh', { volume: 0.4 });
    finish({
      testId: ctx.testId,
      accuracy: Math.round(score.accuracy * 1000) / 1000,
      timeMs: Math.round(performance.now() - t0.current),
      findings: report(findings, patient),
      perfect: score.perfect,
    });
  };

  const covered: Eye = eye === 'OD' ? 'OS' : 'OD';
  const current = responses[eye][idx];
  const expression = current?.blur ? 'squint' : thinking ? 'neutral' : 'neutral';
  const plate = plates[idx]!;
  const firstName = patient.name.split(' ')[0] ?? patient.name;

  return (
    <div ref={root} class={`cv-root ${reducedMotion ? 'is-reduced' : ''}`} data-phase={phase}>
      <header class="cv-head">
        <div class="cv-head__text">
          <div class="cv-eyebrow">Colour plates · daylight lamp</div>
          <p class="cv-head__instr">Show each plate to one eye at a time — the patient reads what they see.</p>
        </div>
        <div class="cv-occluder" role="group" aria-label="Eye being tested">
          {(['OD', 'OS'] as Eye[]).map((e) => (
            <button key={e} type="button" class={`cv-occluder__btn ${eye === e ? 'is-on' : ''}`} aria-pressed={eye === e} onClick={() => switchEye(e)}>
              <span class="cv-occluder__lens" aria-hidden="true" />
              <span class="cv-occluder__eye">{e}</span>
              <span class="cv-occluder__sub">{e === 'OD' ? 'right' : 'left'}</span>
            </button>
          ))}
        </div>
      </header>

      <main class="cv-stage">
        <section class="cv-bookcol" aria-label="Plate book">
          <PlateBook store={store} index={idx} direction={dir} reducedMotion={reducedMotion} label={`Plate ${idx + 1} of ${plates.length}`} />
          <div class="cv-turn">
            <IconButton icon="chevron-left" label="Previous plate" sfx={false} disabled={idx === 0} onClick={() => turnTo(idx - 1)} />
            <Dial value={idx} min={0} max={plates.length - 1} degPerStep={27} onChange={turnTo} label="Plate selector" valueText={`Plate ${idx + 1} of ${plates.length}`} size={68} />
            <IconButton icon="chevron-right" label="Next plate" sfx={false} disabled={idx === plates.length - 1} onClick={() => turnTo(idx + 1)} />
          </div>
        </section>

        <section class="cv-patientcol" aria-label="Patient and record sheet">
          <div class="cv-patient">
            <div class="cv-patient__portrait">
              <PatientAvatar spec={patient.avatar} age={patient.age} sex={patient.sex} expression={expression}
                external={{ ...(findings.external ?? {}), eyePatch: covered }} lookAt={{ x: -0.45, y: 0.35 }}
                size={112} reducedMotion={reducedMotion} label={`${patient.name}, ${covered} occluded`} />
            </div>
            <div class="cv-patient__talk" aria-live="polite">
              {thinking ? (
                <div class="cv-thinking" aria-label="The patient is looking"><span /><span /><span /></div>
              ) : speech ? (
                <SpeechBubble key={speech.key} text={speech.text} speaker={firstName} voice={false} tail="left" speed={reducedMotion ? 400 : 60} />
              ) : (
                <div class="cv-patient__idle">{firstName} · {patient.age} · testing {eye}</div>
              )}
            </div>
          </div>
          <div class="cv-sheetwrap">
            <ScoreSheet plates={plates} responses={responses} current={idx} eye={eye} onPick={turnTo} />
          </div>
          <div class="cv-keynote">Key for this plate: <b>{keyLabel(plate)}</b>{plate.kind === 'hidden' ? ' (normals see nothing)' : plate.kind === 'demo' ? ' (everyone)' : ''}</div>
        </section>
      </main>

      <footer class="cv-foot">
        <div class="cv-progress" aria-label="Plates shown">
          {(['OD', 'OS'] as Eye[]).map((e) => (
            <div key={e} class={`cv-progress__row ${e === eye ? 'is-eye' : ''}`}>
              <span class="cv-progress__eye">{e}</span>
              <span class="cv-progress__pips">
                {plates.map((_, i) => {
                  const r = responses[e][i];
                  return <i key={i} class={r ? (r.correct ? 'is-ok' : 'is-miss') : ''} />;
                })}
              </span>
            </div>
          ))}
        </div>
        <div class="cv-foot__actions">
          <Button variant="glass" size="md" sfx={false} icon={redCap.done ? 'check' : 'target'} onClick={() => { audio.play('select'); setPhase('redcap'); }}>
            Red cap
          </Button>
          <Button variant="primary" size="md" sfx={false} icon="chart" disabled={total < 2} onClick={() => { audio.play('click'); setPhase('classify'); }}>
            Record findings
          </Button>
        </div>
      </footer>

      {tutorial && <Tutorial onClose={() => { markTutorialSeen(); audio.play('select'); setTutorial(false); }} />}
      {phase === 'redcap' && (
        <RedCap findings={findings} audio={audio} initial={redCap} say={say}
          onClose={(r) => { setRedCap(r); setPhase('plates'); }} />
      )}
      {phase === 'classify' && (
        <ClassifyPanel initial={answer} onPick={() => audio.play('select', { volume: 0.5 })} onBack={() => setPhase('plates')} onSubmit={submit} />
      )}
      {phase === 'reveal' && score && answer && (
        <RevealPanel truth={interpret(findings)} given={answer} score={score} lines={report(findings, patient)} findings={findings} store={store} mode={ctx.mode} onContinue={complete} />
      )}
    </div>
  );
}
