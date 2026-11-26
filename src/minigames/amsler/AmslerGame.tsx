import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { EYES, otherEye, type Eye, type MiniGameContext, type MiniGameResult, type SfxId } from '@core';
import { Button, Icon, Kbd, SpeechBubble } from '@ui-kit';
import { PatientAvatar } from '@render';
import { Card } from './Card';
import { Dial } from './Dial';
import { ClassGlyph } from './ClassGlyph';
import { Tutorial, tutorialSeen } from './Tutorial';
import {
  classOf, createMask, maskCount, paintStroke, scoreEye, scoreExam, type AmslerClass, type EyeScore, type Mask,
} from './geometry';
import { buildChallenge, patientSays } from './practice';
import { describeAmsler, reportFor } from './report';
import { T } from './strings';

interface EyeWork {
  asked: boolean;
  cls: AmslerClass | null;
  mask: Mask;
  version: number;
  history: Mask[];
}

type Phase = 'exam' | 'challenge' | 'debrief';

const CLASS_OPTIONS: { id: AmslerClass; key: string }[] = [
  { id: 'normal', key: '1' },
  { id: 'metamorphopsia', key: '2' },
  { id: 'scotoma', key: '3' },
];

export interface AmslerGameProps {
  ctx: MiniGameContext;
  finish: (r: MiniGameResult) => void;
}

export function AmslerGame({ ctx, finish }: AmslerGameProps) {
  const loc = ctx.locale;
  const t = T(loc);
  const EYE_NAME = t.eyeName;
  const t0 = useRef(performance.now());
  const finished = useRef(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const recordRef = useRef<HTMLDivElement>(null);
  const work = useRef<Record<Eye, EyeWork>>({
    OD: { asked: false, cls: null, mask: createMask(), version: 0, history: [] },
    OS: { asked: false, cls: null, mask: createMask(), version: 0, history: [] },
  });
  const [, setTick] = useState(0);
  const rerender = () => setTick((n) => n + 1);
  const [eye, setEye] = useState<Eye>('OD');
  const [view, setView] = useState<'patient' | 'card'>('patient');
  const [tool, setTool] = useState<'paint' | 'erase'>('paint');
  const [brush, setBrush] = useState(1.5);
  const [rippleKey, setRippleKey] = useState(0);
  const [phase, setPhase] = useState<Phase>('exam');
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [scores, setScores] = useState<Record<Eye, EyeScore> | null>(null);
  const [examTime, setExamTime] = useState(0);
  const [choice, setChoice] = useState<string | null>(null);
  /** Margin labels on the grid: visual-field sides (nasal/temporal) for the eye under test. */
  const sideLabels: 'field' | 'patient' = 'field';
  const lastTick = useRef(0);
  const bodyRef = useRef<HTMLDivElement>(null);
  /** CSS selector to focus after the next render (keeps keyboard users inside the game). */
  const focusNext = useRef<string | null>(tutorialSeen() ? '[data-testid="amsler-ask"]' : null);
  const requestFocus = (sel: string) => {
    focusNext.current = sel;
  };

  const practice = ctx.mode === 'practice';
  const challenge = useMemo(() => (practice ? buildChallenge(ctx.findings, ctx.rng.fork('amsler-challenge'), loc) : null), []);
  // Subtler perception at higher difficulty: the player must look harder.
  const strength = 1 - 0.45 * Math.max(0, Math.min(1, ctx.difficulty));
  const w = work.current[eye];
  const finding = ctx.findings.amsler[eye] ?? { result: 'normal' as const };
  const play = (id: SfxId, opts?: { volume?: number; pitch?: number }) => {
    try {
      ctx.audio.play(id, opts);
    } catch {
      /* audio never breaks the game */
    }
  };

  const eyeDone = (e: Eye) => {
    const x = work.current[e];
    return x.asked && x.cls !== null && (x.cls === 'normal' || maskCount(x.mask) > 0);
  };
  const allDone = EYES.every(eyeDone);

  const ask = () => {
    if (w.asked) {
      setView('patient');
      setRippleKey((k) => k + 1);
      play('lens-click');
      return;
    }
    w.asked = true;
    setView('patient');
    setRippleKey((k) => k + 1);
    play('lens-click');
    play('whoosh', { volume: 0.35 });
    requestFocus('.amsler-card__canvas');
    rerender();
  };

  const switchEye = (e: Eye) => {
    if (e === eye || phase === 'challenge') return;
    setEye(e);
    play('lens-click', { pitch: e === 'OD' ? 1 : 1.12 });
    if (phase === 'exam' && work.current[e].asked) setRippleKey((k) => k + 1);
    if (phase === 'exam' && !work.current[e].asked && document.activeElement === document.body) requestFocus('[data-testid="amsler-ask"]');
  };

  const onStroke = (ax: number, ay: number, bx: number, by: number, start: boolean) => {
    if (phase !== 'exam' || !w.asked) return;
    if (start) {
      w.history.push(w.mask.slice());
      if (w.history.length > 30) w.history.shift();
    }
    const changed = paintStroke(w.mask, ax, ay, bx, by, brush, tool === 'erase' ? 0 : 1);
    if (changed) {
      w.version++;
      const now = performance.now();
      if (now - lastTick.current > 70) {
        lastTick.current = now;
        play('tick', { volume: 0.08, pitch: tool === 'erase' ? 0.8 : 1.3 + Math.random() * 0.2 });
      }
      rerender();
    }
  };

  const undo = () => {
    const prev = w.history.pop();
    if (!prev) return;
    w.mask.set(prev);
    w.version++;
    play('back', { volume: 0.5 });
    rerender();
  };
  const clear = () => {
    if (!maskCount(w.mask)) return;
    w.history.push(w.mask.slice());
    w.mask.fill(0);
    w.version++;
    play('whoosh', { volume: 0.3 });
    rerender();
  };
  const classify = (c: AmslerClass) => {
    if (!w.asked || phase !== 'exam') return;
    w.cls = c;
    play('select');
    rerender();
  };

  const computeScores = () => {
    const s = {} as Record<Eye, EyeScore>;
    for (const e of EYES) {
      const x = work.current[e];
      s[e] = scoreEye({ truth: ctx.findings.amsler[e] ?? { result: 'normal' }, marked: x.mask, chosen: x.cls });
    }
    return s;
  };

  const record = () => {
    if (!allDone || phase !== 'exam') return;
    const s = computeScores();
    setScores(s);
    setExamTime(performance.now() - t0.current);
    setView('patient');
    play('stamp');
    if (practice && challenge) {
      // show the grid the question is about, through the patient's eye
      if (challenge.eye !== eye) {
        setEye(challenge.eye);
        setRippleKey((k) => k + 1);
      }
      setPhase('challenge');
      requestFocus('[data-testid="amsler-quiz-0"]');
    } else {
      revealDebrief(s);
    }
    revealCardOnPhone();
  };

  /** On phones the card sits above the side panel: bring it back into view for the reveal. */
  const revealCardOnPhone = () => {
    const body = bodyRef.current;
    if (!body || body.scrollTop <= 0) return;
    body.scrollTo({ top: 0, behavior: ctx.reducedMotion ? 'auto' : 'smooth' });
  };

  const celebrate = (s: Record<Eye, EyeScore>) => {
    const perfect = EYES.every((e) => s[e].classOk && s[e].region >= 0.999);
    const r = recordRef.current?.getBoundingClientRect();
    if (perfect && r) {
      ctx.fx.burst(r.left + r.width / 2, r.top, { kind: 'sparks', count: 28, color: '#ffd27a' });
      play('sparkle');
    }
  };

  const revealDebrief = (s: Record<Eye, EyeScore>) => {
    setPhase('debrief');
    requestFocus('[data-testid="amsler-finish"]');
    play('reveal');
    celebrate(s);
    if (EYES.some((e) => !s[e].classOk)) ctx.fx.shake(ctx.reducedMotion ? 0 : 0.3, 220);
  };

  const answer = (id: string) => {
    if (choice || !challenge || !scores) return;
    setChoice(id);
    const ok = challenge.options.find((o) => o.id === id)?.correct ?? false;
    setEye(challenge.eye);
    if (ok) {
      play('success');
      const r = rootRef.current?.getBoundingClientRect();
      if (r) ctx.fx.floatText(t.floatCorrect, r.left + r.width / 2, r.top + r.height * 0.3, { color: '#5eead4' });
    } else {
      play('fail');
      ctx.fx.shake(ctx.reducedMotion ? 0 : 0.4, 240);
    }
    setPhase('debrief');
    requestFocus('[data-testid="amsler-finish"]');
    revealCardOnPhone();
    celebrate(scores);
  };

  const complete = () => {
    if (finished.current || !scores) return;
    finished.current = true;
    const exam = scoreExam(EYES.map((e) => scores[e]), examTime);
    let accuracy = exam.accuracy;
    let perfect = exam.perfect;
    if (practice && challenge) {
      const ok = challenge.options.find((o) => o.id === choice)?.correct ?? false;
      accuracy = 0.6 * exam.accuracy + 0.4 * (ok ? 1 : 0);
      perfect = perfect && ok;
    }
    play('stamp');
    finish({
      testId: 'amsler',
      accuracy: Math.round(accuracy * 1000) / 1000,
      timeMs: Math.round(examTime),
      findings: reportFor(ctx.findings, ctx.patient, loc),
      perfect,
    });
  };

  // global shortcuts (when focus is inside the game)
  const onKey = (e: KeyboardEvent): boolean => {
    if (e.ctrlKey || e.metaKey) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        undo();
        return true;
      }
      return false;
    }
    const k = e.key.toLowerCase();
    if (k === 'v') setView((v) => (v === 'patient' ? 'card' : 'patient'));
    else if (k === 'e') setTool((t) => (t === 'erase' ? 'paint' : 'erase'));
    else if (k === '[') setBrush((b) => Math.max(0.5, b - 0.25));
    else if (k === ']') setBrush((b) => Math.min(4, b + 0.25));
    else if (k === 'a') ask();
    else if (k === '1' || k === '2' || k === '3') classify(CLASS_OPTIONS[Number(k) - 1]!.id);
    else return false;
    e.preventDefault();
    return true;
  };

  const onKeyRef = useRef(onKey);
  onKeyRef.current = onKey;
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const h = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t?.closest('.amsler-card__canvas, .amsler-dial__knob, .amsler-tutorial')) return;
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      onKeyRef.current(e);
    };
    el.addEventListener('keydown', h);
    return () => el.removeEventListener('keydown', h);
  }, []);

  // honour focus requests once the DOM for the new state exists
  useEffect(() => {
    const sel = focusNext.current;
    if (!sel || tutorial) return;
    const el = rootRef.current?.querySelector<HTMLElement>(sel);
    if (el && !(el as HTMLButtonElement).disabled) {
      focusNext.current = null;
      el.focus({ preventScroll: true });
    }
  });

  const external = { ...(ctx.findings.external ?? {}), eyePatch: otherEye(eye) };
  const abnormalHere = finding.result !== 'normal';
  const speech = !w.asked
    ? t.speechAsk(EYE_NAME[otherEye(eye)])
    : patientSays(finding, loc);

  const progressDone = EYES.filter(eyeDone).length;

  return (
    <div class={`amsler${ctx.reducedMotion ? ' is-reduced' : ''}`} ref={rootRef}>
      <header class="amsler__head">
        <div class="amsler__title">
          <Icon name="amsler" size={20} class="amsler__title-icon" />
          <div>
            <h2>{t.title}</h2>
            <p>{phase === 'exam' ? t.subExam : phase === 'challenge' ? t.subChallenge : t.subDebrief}</p>
          </div>
        </div>
        <div class="amsler-eyes" role="tablist" aria-label={t.eyeTested} dir="ltr">
          {EYES.map((e) => (
            <button
              key={e}
              type="button"
              role="tab"
              aria-selected={eye === e}
              class={`amsler-eyes__btn${eye === e ? ' is-on' : ''}${eyeDone(e) ? ' is-done' : ''}`}
              onClick={() => switchEye(e)}
              disabled={phase === 'challenge'}
            >
              <span class="amsler-eyes__code">{e}</span>
              <span class="amsler-eyes__name">{e === 'OD' ? t.right : t.left}</span>
              {eyeDone(e) && <Icon name="check" size={14} class="amsler-eyes__check" />}
            </button>
          ))}
        </div>
      </header>

      <div class="amsler__body" ref={bodyRef}>
        <section class="amsler__stage">
          <Card
            finding={finding}
            eye={eye}
            perception={w.asked && view === 'patient' ? 1 : 0}
            strength={phase === 'exam' ? strength : 1}
            rippleKey={rippleKey}
            mask={w.mask}
            maskKey={`${eye}:${w.version}`}
            sideLabels={sideLabels}
            locale={loc}
            showTruth={phase === 'debrief'}
            idle={!w.asked}
            tool={tool}
            brush={brush}
            interactive={phase === 'exam' && w.asked}
            reducedMotion={ctx.reducedMotion}
            onStroke={onStroke}
            onStrokeEnd={() => rerender()}
            onKey={onKey}
            onWheelBrush={(dir) => setBrush((b) => {
              const nb = Math.max(0.5, Math.min(4, b + dir * 0.25));
              if (nb !== b) play('dial', { volume: 0.45, pitch: 0.8 + nb / 6 });
              return nb;
            })}
            label={t.cardLabel(EYE_NAME[eye], w.asked)}
          />
          {!w.asked && phase === 'exam' && (
            <div class="amsler__ask">
              <Button variant="primary" size="lg" icon="eye" sfx={false} onClick={ask} data-testid="amsler-ask">
                {t.askBtn}
              </Button>
              <span class="amsler__ask-hint">{t.testing(EYE_NAME[eye])} <Kbd>A</Kbd></span>
            </div>
          )}
          <div class={`amsler__viewtoggle${w.asked ? '' : ' is-hidden'}`} role="group" aria-label={t.viewAria} aria-hidden={!w.asked}>
            <button type="button" class={view === 'patient' ? 'is-on' : ''} aria-pressed={view === 'patient'} disabled={!w.asked} onClick={() => { setView('patient'); play('lens-click'); }}>{t.viewPatient}</button>
            <button type="button" class={view === 'card' ? 'is-on' : ''} aria-pressed={view === 'card'} disabled={!w.asked} onClick={() => { setView('card'); play('lens-click', { pitch: 0.9 }); }}>{t.viewCard}</button>
          </div>
        </section>

        <aside class="amsler__side">
          <div class="amsler-patient">
            <div class="amsler-patient__portrait">
              <PatientAvatar
                spec={ctx.patient.avatar}
                age={ctx.patient.age}
                sex={ctx.patient.sex}
                external={external}
                expression={w.asked && abnormalHere ? 'worried' : 'neutral'}
                lookAt={{ x: 0, y: 0.15 }}
                size={84}
                reducedMotion={ctx.reducedMotion}
                label={t.avatarLabel(ctx.patient.name, EYE_NAME[otherEye(eye)])}
              />
            </div>
            <SpeechBubble
              key={`${eye}-${w.asked}`}
              text={speech}
              speaker={ctx.patient.name}
              tail={loc === 'he' ? 'right' : 'left'}
              voice={false}
              speed={70}
              class="amsler-patient__bubble"
            />
          </div>

          {phase === 'exam' && (
            <>
              <div class="amsler-section">
                <h3>{t.reportQ}</h3>
                <div class="amsler-classes" role="radiogroup" aria-label={t.classAria}>
                  {CLASS_OPTIONS.map((o) => (
                    <button
                      key={o.id}
                      type="button"
                      role="radio"
                      aria-checked={w.cls === o.id}
                      disabled={!w.asked}
                      class={`amsler-class${w.cls === o.id ? ' is-on' : ''}`}
                      onClick={() => classify(o.id)}
                      data-testid={`amsler-class-${o.id}`}
                    >
                      <ClassGlyph kind={o.id} />
                      <span class="amsler-class__text">
                        <strong>{t.classOptions[o.id].title}</strong>
                        <small>{t.classOptions[o.id].sub}</small>
                      </span>
                      <Kbd class="amsler-class__kbd">{o.key}</Kbd>
                    </button>
                  ))}
                </div>
              </div>
              <div class="amsler-section amsler-tools">
                <div class="amsler-tools__row">
                  <div class="amsler-seg" role="group" aria-label={t.toolAria}>
                    <button type="button" class={tool === 'paint' ? 'is-on' : ''} aria-pressed={tool === 'paint'} onClick={() => { setTool('paint'); play('click'); }} disabled={!w.asked}>{t.mark}</button>
                    <button type="button" class={tool === 'erase' ? 'is-on' : ''} aria-pressed={tool === 'erase'} onClick={() => { setTool('erase'); play('click'); }} disabled={!w.asked}>{t.erase} <Kbd>E</Kbd></button>
                  </div>
                  <Dial
                    value={brush}
                    min={0.5}
                    max={4}
                    step={0.25}
                    label={t.dialLabel}
                    format={(v) => `${v.toFixed(2).replace(/0$/, '')}°`}
                    onChange={(v) => { setBrush(v); play('dial', { volume: 0.5, pitch: 0.8 + v / 6 }); }}
                    size={52}
                  />
                </div>
                <div class="amsler-tools__row amsler-tools__row--small">
                  <button type="button" class="amsler-link" onClick={undo} disabled={!w.history.length}>{t.undo} <Kbd>Ctrl Z</Kbd></button>
                  <button type="button" class="amsler-link" onClick={clear} disabled={!maskCount(w.mask)}>{t.clearMap}</button>
                  <span class="amsler-tools__hint"><Kbd>V</Kbd> {t.viewKey} · <Kbd>[</Kbd><Kbd>]</Kbd> {t.sizeKey}</span>
                </div>
              </div>
            </>
          )}

          {phase === 'challenge' && challenge && (
            <div class="amsler-section amsler-quiz">
              <h3>{challenge.question}</h3>
              <div class="amsler-quiz__opts">
                {challenge.options.map((o, i) => (
                  <button key={o.id} type="button" class="amsler-quiz__opt" onClick={() => answer(o.id)} data-testid={`amsler-quiz-${i}`}>
                    <span class="amsler-quiz__n">{String.fromCharCode(65 + i)}</span>
                    {o.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {phase === 'debrief' && scores && (
            <Debrief
              scores={scores}
              ctx={ctx}
              work={work.current}
              challenge={challenge}
              choice={choice}
              onEye={switchEye}
              eye={eye}
            />
          )}
        </aside>
      </div>

      <footer class="amsler__foot">
        <div class="amsler-progress" aria-label={t.mapped(progressDone)}>
          {EYES.map((e) => (
            <span key={e} class={`amsler-progress__pip${eyeDone(e) ? ' is-done' : ''}${eye === e ? ' is-cur' : ''}`}>
              <i />{e}
            </span>
          ))}
          <span class="amsler-progress__txt">
            {phase === 'exam'
              ? allDone ? t.pBoth : !w.asked ? t.pAsk(eye) : w.cls === null ? t.pClassify : w.cls !== 'normal' && !maskCount(w.mask) ? t.pMark : t.pNow(EYE_NAME[otherEye(eye)])
              : phase === 'challenge' ? t.pChoose : t.pDebrief}
          </span>
        </div>
        <div ref={recordRef}>
          {phase === 'exam' && (
            <Button variant="primary" icon="check" sfx={false} disabled={!allDone} onClick={record} data-testid="amsler-record">
              {t.record}
            </Button>
          )}
          {phase === 'debrief' && (
            <Button variant="primary" icon="arrow-right" sfx={false} onClick={complete} data-testid="amsler-finish">
              {practice ? t.finish : t.addToChart}
            </Button>
          )}
        </div>
      </footer>

      {tutorial && (
        <Tutorial
          locale={loc}
          reducedMotion={ctx.reducedMotion}
          onClose={() => {
            setTutorial(false);
            play('click');
            requestFocus(w.asked ? '.amsler-card__canvas' : '[data-testid="amsler-ask"]');
          }}
        />
      )}
    </div>
  );
}

function Debrief(props: {
  scores: Record<Eye, EyeScore>;
  ctx: MiniGameContext;
  work: Record<Eye, EyeWork>;
  challenge: ReturnType<typeof buildChallenge> | null;
  choice: string | null;
  eye: Eye;
  onEye: (e: Eye) => void;
}) {
  const { scores, ctx, work, challenge, choice } = props;
  const loc = ctx.locale;
  const t = T(loc);
  const picked = challenge?.options.find((o) => o.id === choice);
  const right = challenge?.options.find((o) => o.correct);
  return (
    <div class="amsler-section amsler-debrief">
      {challenge && picked && (
        <div class={`amsler-verdict ${picked.correct ? 'is-good' : 'is-bad'}`}>
          <strong>{picked.correct ? t.correct : t.notQuite}</strong>
          {!picked.correct && right && <span>{t.answer} {right.label}</span>}
          <p>{challenge.explanation}</p>
        </div>
      )}
      <ul class="amsler-debrief__eyes">
        {EYES.map((e) => {
          const s = scores[e];
          const truth = ctx.findings.amsler[e] ?? { result: 'normal' as const };
          const yours = work[e].cls;
          return (
            <li key={e}>
              <button type="button" class={`amsler-debrief__eye${props.eye === e ? ' is-on' : ''}`} onClick={() => props.onEye(e)}>
                <span class="amsler-debrief__code">{e}</span>
                <span class="amsler-debrief__body">
                  <span class="amsler-debrief__truth">{describeAmsler(truth, e, loc)}</span>
                  <span class="amsler-debrief__you">
                    <span class={s.classOk ? 'ok' : 'bad'}>
                      <Icon name={s.classOk ? 'check' : 'x'} size={13} /> {yours ? t.classShort[yours] : '—'}
                    </span>
                    {s.iou !== null
                      ? <span class={s.region >= 0.999 ? 'ok' : s.region > 0.5 ? 'meh' : 'bad'}>{t.overlap(Math.round(s.iou * 100))}</span>
                      : <span class={s.region >= 0.999 ? 'ok' : 'bad'}>{s.region >= 0.999 ? t.cleanMap : t.stray}</span>}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      <p class="amsler-debrief__legend">
        <span><i class="sw sw--you" /> {t.legendYou}</span>
        <span><i class="sw sw--truth" /> {t.legendTruth}</span>
        <span>{t.legendScale}</span>
      </p>
      {!challenge && <p class="amsler-debrief__teach">{teachFor(ctx)}</p>}
    </div>
  );
}

function teachFor(ctx: MiniGameContext): string {
  const kinds = EYES.map((e) => classOf(ctx.findings.amsler[e] ?? { result: 'normal' }));
  const t = T(ctx.locale);
  if (kinds.includes('metamorphopsia')) return ctx.patient.age >= 50 ? t.teachMetaOld : t.teachMetaYoung;
  if (kinds.includes('scotoma')) return t.teachScotoma;
  return t.teachNormal;
}
