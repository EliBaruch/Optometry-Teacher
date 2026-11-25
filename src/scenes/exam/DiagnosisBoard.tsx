import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ClinicalCase, Confidence, Diagnosis, GameServices, Urgency } from '@core';
import { Backdrop, Button, Icon, IconButton, Ornament, useFocusTrap, useReducedMotion, useSfx } from '@ui-kit';
import {
  boardOrder, CATEGORY_INFO, CONFIDENCE_INFO, CONFIDENCE_LIST, prettifyId, URGENCY_INFO, URGENCY_LIST,
} from './logic';

const STAMP_HOLD_MS = 1750;

export interface DiagnosisBoardProps {
  services: GameServices;
  kase: ClinicalCase;
  pinned: readonly string[];
  /** Formatted clock text when the case is timed */
  clock?: string;
  pressure: number;
  onClose: () => void;
  /** Files the diagnosis (session.submit). May throw. */
  onSubmit: (dx: string, urgency: Urgency, confidence: Confidence) => void;
  /** Called once the stamp has landed and the player moves on to results. */
  onFinished: () => void;
}

/** Full-screen diagnosis board: pick the diagnosis, how urgent it is, how sure you are, then stamp it. */
export function DiagnosisBoard({ services, kase, pinned, clock, pressure, onClose, onSubmit, onFinished }: DiagnosisBoardProps) {
  const reduced = useReducedMotion();
  const play = useSfx();
  const root = useRef<HTMLDivElement>(null);
  const [dx, setDx] = useState<string | null>(null);
  const [urgency, setUrgency] = useState<Urgency | null>(null);
  const [conf, setConf] = useState<Confidence | null>(null);
  const [stamped, setStamped] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  useFocusTrap(root, !stamped, '.exm-dx input');

  const ids = useMemo(() => boardOrder(kase), [kase]);
  const byId = useMemo(() => new Map(services.registries.diagnoses.all().map((d) => [d.id, d] as const)), [services]);
  const dxOf = (id: string): Pick<Diagnosis, 'name' | 'category'> | undefined => byId.get(id);
  const nameOf = (id: string) => dxOf(id)?.name ?? prettifyId(id);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  // Escape backs out of the board (never while the stamp is landing).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !stamped) {
        e.preventDefault();
        e.stopPropagation();
        play('back');
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [stamped, onClose]);

  // Gentle reveal of the next step as the previous one is answered.
  const step2 = useRef<HTMLFieldSetElement>(null);
  const step3 = useRef<HTMLFieldSetElement>(null);
  const reveal = (el: HTMLElement | null) => {
    if (!el) return;
    timers.current.push(setTimeout(() => el.scrollIntoView?.({ behavior: reduced ? 'auto' : 'smooth', block: 'center' }), 120));
  };

  const ready = !!(dx && urgency && conf);
  const commit = () => {
    if (!dx || !urgency || !conf || stamped) return;
    try {
      onSubmit(dx, urgency, conf);
    } catch (err) {
      console.error('[exam] could not file the diagnosis', err);
      setError('The chart would not close. Please try again.');
      return;
    }
    setError(null);
    setStamped(true);
    timers.current.push(
      setTimeout(() => {
        play('stamp');
        services.fx.shake(0.9, 360);
        services.fx.flash('#ffd27a', 260);
      }, reduced ? 0 : 330),
      setTimeout(onFinished, reduced ? 500 : STAMP_HOLD_MS),
    );
  };

  return (
    <div
      ref={root}
      class={`exm-board${stamped ? ' is-stamped' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-labelledby="exm-board-title"
      style={{ '--p': pressure }}
    >
      <Backdrop variant="exam" />
      {pressure > 0 && <div class="exm-pressure" aria-hidden="true" />}
      <div class="exm-board__scroll">
        <header class="exm-board__head">
          <IconButton icon="chevron-left" label="Back to the exam room" onClick={onClose} sfx="back" disabled={stamped} />
          <div class="exm-board__titles">
            <div class="lm-eyebrow">The moment of decision</div>
            <h1 id="exm-board-title" class="lm-display">What is wrong with {kase.patient.name.split(' ')[0]}?</h1>
          </div>
          {clock && <span class="exm-clock exm-clock--red lm-num" aria-label="Time left">{clock}</span>}
        </header>
        <Ornament class="exm-board__orn" width={170} />

        <form class="exm-board__form" onSubmit={(e) => { e.preventDefault(); commit(); }}>
          <fieldset class="exm-step">
            <legend><span class="exm-step__n lm-num">1</span> Your diagnosis</legend>
            <div class="exm-dx-grid" role="radiogroup" aria-label="Diagnosis">
              {ids.map((id, i) => {
                const d = dxOf(id);
                const cat = d ? CATEGORY_INFO[d.category] : undefined;
                const pinIdx = pinned.indexOf(id);
                return (
                  <label key={id} class={`exm-dx${dx === id ? ' is-picked' : ''}`} style={{ '--i': i }}>
                    <input
                      type="radio"
                      name="dx"
                      value={id}
                      checked={dx === id}
                      onChange={() => {
                        const first = dx === null;
                        setDx(id);
                        play('select');
                        if (first) reveal(step2.current);
                      }}
                    />
                    <span class="exm-dx__card">
                      <span class="exm-dx__gem" aria-hidden="true"><Icon name={cat?.icon ?? 'eye'} size={26} /></span>
                      <span class="exm-dx__name lm-display">{nameOf(id)}</span>
                      <span class="exm-dx__cat">{cat?.label ?? 'Condition'}</span>
                      {pinIdx >= 0 && <span class="exm-dx__pin lm-num" title="One of your suspects">Suspect {pinIdx + 1}</span>}
                      <span class="exm-dx__tick" aria-hidden="true"><Icon name="check" size={16} strokeWidth={2.6} /></span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset class="exm-step" ref={step2} disabled={!dx}>
            <legend><span class="exm-step__n lm-num">2</span> How urgent is it?</legend>
            <div class="exm-urg-grid" role="radiogroup" aria-label="Urgency">
              {URGENCY_LIST.map((u) => {
                const info = URGENCY_INFO[u];
                return (
                  <label key={u} class={`exm-urg${urgency === u ? ' is-picked' : ''}`} style={{ '--c': info.color }}>
                    <input
                      type="radio"
                      name="urgency"
                      value={u}
                      checked={urgency === u}
                      onChange={() => {
                        const first = urgency === null;
                        setUrgency(u);
                        play(u === 'emergency' ? 'alarm' : 'select', { volume: 0.5 });
                        if (first) reveal(step3.current);
                      }}
                    />
                    <span class="exm-urg__card">
                      <span class="exm-urg__meter" aria-hidden="true">
                        {[1, 2, 3, 4].map((n) => <i key={n} class={n <= info.level ? 'on' : ''} />)}
                      </span>
                      <span class="exm-urg__label lm-display">{info.label}</span>
                      <span class="exm-urg__blurb">{info.blurb}</span>
                      <span class="exm-urg__detail">{info.detail}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <fieldset class="exm-step" ref={step3} disabled={!dx || !urgency}>
            <legend><span class="exm-step__n lm-num">3</span> How sure are you?</legend>
            <div class="exm-conf" role="radiogroup" aria-label="Confidence">
              {CONFIDENCE_LIST.map((c) => {
                const info = CONFIDENCE_INFO[c];
                return (
                  <label key={c} class={`exm-conf__opt${conf === c ? ' is-picked' : ''}`}>
                    <input type="radio" name="conf" value={c} checked={conf === c} onChange={() => { setConf(c); play('select'); }} />
                    <span class="exm-conf__card">
                      <span class="exm-conf__dots" aria-hidden="true">
                        {[1, 2, 3].map((n) => <i key={n} class={n <= info.level ? 'on' : ''} />)}
                      </span>
                      <b>{info.label}</b>
                      <small>{info.blurb}</small>
                    </span>
                  </label>
                );
              })}
            </div>
          </fieldset>

          <div class="exm-board__foot">
            <p class="exm-board__sum" aria-live="polite">
              {ready ? (
                <>
                  <b>{nameOf(dx!)}</b> · {URGENCY_INFO[urgency!].label} · {CONFIDENCE_INFO[conf!].label}
                </>
              ) : (
                <span class="lm-muted">Choose a diagnosis, an urgency and your confidence to sign off.</span>
              )}
            </p>
            {error && <p class="exm-board__err" role="alert">{error}</p>}
            <Button type="submit" variant="primary" size="lg" icon="check" disabled={!ready || stamped} sfx={false}>
              Sign off the diagnosis
            </Button>
          </div>
        </form>
      </div>

      {stamped && dx && (
        <div class="exm-stamp-layer" aria-live="assertive">
          <div class="exm-stamp" role="img" aria-label={`Diagnosis filed: ${nameOf(dx)}`}>
            <span class="exm-stamp__ring" />
            <span class="exm-stamp__top">Diagnosis</span>
            <span class="exm-stamp__name lm-display">{nameOf(dx)}</span>
            <span class="exm-stamp__bot">Filed</span>
          </div>
        </div>
      )}
    </div>
  );
}
