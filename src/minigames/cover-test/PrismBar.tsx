import { useRef } from 'preact/hooks';
import { Icon } from '@ui-kit';
import { MAX_PRISM, type Base, type Prism } from './model';
import type { Eye } from '@core';
import { useT } from './locale';

const BASES: { id: Base; arrow: string }[] = [
  { id: 'BO', arrow: '→' },
  { id: 'BI', arrow: '←' },
  { id: 'BU', arrow: '↑' },
  { id: 'BD', arrow: '↓' },
];
const TICKS = [0, 5, 10, 15, 20, 25, 30, 35, 40];

export interface PrismBarProps {
  prism: Prism;
  onChange: (p: Prism) => void;
  sound: (pitch: number) => void;
}

/** Graduated prism bar: drag, wheel, or arrow keys on the thumb. */
export function PrismBar({ prism, onChange, sound }: PrismBarProps) {
  const t = useT();
  const track = useRef<HTMLDivElement>(null);
  const setMag = (m: number) => {
    const v = Math.max(0, Math.min(MAX_PRISM, Math.round(m)));
    if (v !== prism.mag) { sound(0.8 + v / 50); onChange({ ...prism, mag: v }); }
  };
  const fromX = (clientX: number) => {
    const r = track.current!.getBoundingClientRect();
    return ((clientX - r.left) / r.width) * MAX_PRISM;
  };
  const down = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    setMag(fromX(e.clientX));
  };
  const move = (e: PointerEvent) => {
    if ((e.currentTarget as HTMLElement).hasPointerCapture(e.pointerId)) setMag(fromX(e.clientX));
  };
  const key = (e: KeyboardEvent) => {
    const d = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : e.key === 'ArrowLeft' || e.key === 'ArrowDown' ? -1 : e.key === 'PageUp' ? 5 : e.key === 'PageDown' ? -5 : 0;
    if (d) { e.preventDefault(); e.stopPropagation(); setMag(prism.mag + d); }
    else if (e.key === 'Home') { e.preventDefault(); setMag(0); }
    else if (e.key === 'End') { e.preventDefault(); setMag(MAX_PRISM); }
  };
  const wheel = (e: WheelEvent) => { e.preventDefault(); setMag(prism.mag + (e.deltaY < 0 ? 1 : -1)); };
  const pct = (prism.mag / MAX_PRISM) * 100;
  const setBase = (b: Base) => { sound(1.2); onChange({ ...prism, base: b }); };
  const setEye = (eye: Eye) => { sound(1.1); onChange({ ...prism, eye }); };
  return (
    <div class="cvt-prism" dir="ltr">
      <div class="cvt-prism__top">
        <span class="cvt-eyebrow">{t.prismBar}</span>
        <span class="cvt-prism__read cvt-num" aria-live="off">{prism.mag}<small>Δ</small></span>
      </div>
      <div class="cvt-prism__track" ref={track} onPointerDown={down} onPointerMove={move} onWheel={wheel}>
        <div class="cvt-prism__rail" />
        <div class="cvt-prism__fill" style={{ width: `${pct}%` }} />
        {TICKS.map((t) => <span key={t} class="cvt-prism__tick" style={{ left: `${(t / MAX_PRISM) * 100}%` }}><i />{t % 10 === 0 && <b>{t}</b>}</span>)}
        <div
          class="cvt-prism__thumb" style={{ left: `${pct}%` }} tabIndex={0} role="slider" aria-label={t.prismPower}
          aria-valuemin={0} aria-valuemax={MAX_PRISM} aria-valuenow={prism.mag} aria-valuetext={t.prismPowerText(prism.mag)} onKeyDown={key}
        />
      </div>
      <div class="cvt-prism__row cvt-prism__row--bases" role="radiogroup" aria-label={t.baseGroup}>
        {BASES.map((b) => (
          <button key={b.id} type="button" role="radio" aria-checked={prism.base === b.id} class={`cvt-chip${prism.base === b.id ? ' is-on' : ''}`} onClick={() => setBase(b.id)} title={t.baseTitles[b.id]}>
            <span class="cvt-chip__arrow" aria-hidden="true">{b.arrow}</span>{t.bases[b.id]}
          </button>
        ))}
      </div>
      <div class="cvt-prism__row" role="radiogroup" aria-label={t.prismEyeGroup}>
        <span class="cvt-prism__lab"><Icon name="eye" size={13} /> <span class="cvt-lab-t">{t.prismHeldOver}</span></span>
        {(['OD', 'OS'] as Eye[]).map((e) => (
          <button key={e} type="button" role="radio" aria-checked={prism.eye === e} class={`cvt-chip${prism.eye === e ? ' is-on' : ''}`} onClick={() => setEye(e)}>{e}</button>
        ))}
      </div>
    </div>
  );
}
