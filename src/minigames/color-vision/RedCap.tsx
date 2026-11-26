import { useEffect, useRef, useState } from 'preact/hooks';
import type { AudioPort, Eye, Locale, PatientFindings } from '@core';
import { T } from './strings';
import { Button } from '@ui-kit';
import { redSaturationPct } from './clinical';
import { Dial } from './Dial';

export interface RedCapResult {
  done: boolean;
  match?: number;
}

const CAP_RED: [number, number, number] = [214, 38, 46];

/** CSS colour of the cap red at a given perceived saturation (equal-luminance grey mix). */
export function desaturatedRed(pct: number): string {
  const k = Math.max(0, Math.min(100, pct)) / 100;
  const y = 0.2126 * CAP_RED[0] + 0.7152 * CAP_RED[1] + 0.0722 * CAP_RED[2];
  const grey = Math.min(255, y * 1.35 + 18);
  const c = CAP_RED.map((v) => Math.round(grey + (v - grey) * k));
  return `rgb(${c[0]},${c[1]},${c[2]})`;
}

export function capRemark(pct: number, locale: Locale = 'en'): string {
  const r = T(locale).capRemarks;
  if (pct >= 95) return r[0]!;
  if (pct >= 65) return r[1]!;
  if (pct >= 40) return r[2]!;
  return r[3]!;
}

export function matchRemark(dial: number, target: number, locale: Locale = 'en'): { text: string; matched: boolean } {
  const r = T(locale).matchRemarks;
  if (Math.abs(dial - target) <= 7) return { text: r[0]!, matched: true };
  if (dial > target) return { text: r[1]!, matched: false };
  return { text: r[2]!, matched: false };
}

function Cap(props: { tint: string; lifted: boolean }) {
  return (
    <svg class={`cv-cap ${props.lifted ? 'is-lifted' : ''}`} viewBox="0 0 160 170" aria-hidden="true">
      <defs>
        <linearGradient id="cv-cap-body" x1="0" x2="1">
          <stop offset="0" stop-color="#000" stop-opacity="0.45" />
          <stop offset="0.22" stop-color="#fff" stop-opacity="0.28" />
          <stop offset="0.38" stop-color="#fff" stop-opacity="0.05" />
          <stop offset="0.8" stop-color="#000" stop-opacity="0.25" />
          <stop offset="1" stop-color="#000" stop-opacity="0.55" />
        </linearGradient>
        <pattern id="cv-cap-ridges" width="7" height="10" patternUnits="userSpaceOnUse">
          <rect width="3.2" height="10" fill="#000" opacity="0.16" />
        </pattern>
        <radialGradient id="cv-cap-top" cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stop-color="#fff" stop-opacity="0.55" />
          <stop offset="0.4" stop-color="#fff" stop-opacity="0.08" />
          <stop offset="1" stop-color="#000" stop-opacity="0.3" />
        </radialGradient>
        <radialGradient id="cv-cap-shadow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="#000" stop-opacity="0.55" />
          <stop offset="1" stop-color="#000" stop-opacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx="80" cy="152" rx="64" ry="12" fill="url(#cv-cap-shadow)" />
      <g class="cv-cap__body">
        <path d="M26 46 L26 132 Q80 150 134 132 L134 46 Z" fill={props.tint} />
        <path d="M26 46 L26 132 Q80 150 134 132 L134 46 Z" fill="url(#cv-cap-ridges)" />
        <path d="M26 46 L26 132 Q80 150 134 132 L134 46 Z" fill="url(#cv-cap-body)" />
        <ellipse cx="80" cy="46" rx="54" ry="16" fill={props.tint} />
        <ellipse cx="80" cy="46" rx="54" ry="16" fill="url(#cv-cap-top)" />
        <path d="M44 40 Q70 32 104 36" stroke="#fff" stroke-opacity="0.6" stroke-width="3" fill="none" stroke-linecap="round" />
        <rect x="40" y="62" width="6" height="62" rx="3" fill="#fff" opacity="0.22" />
      </g>
    </svg>
  );
}

export interface RedCapProps {
  findings: PatientFindings;
  audio: AudioPort;
  initial: RedCapResult & { shown: Eye[] };
  onClose: (r: RedCapResult & { shown: Eye[] }) => void;
  say: (text: string) => void;
  locale?: Locale;
}

/** Red-cap desaturation comparison + saturation-matching dial. */
export function RedCap({ findings, audio, initial, onClose, say, locale = 'en' }: RedCapProps) {
  const t = T(locale);
  const [shown, setShown] = useState<Eye[]>(initial.shown);
  const [active, setActive] = useState<Eye | null>(null);
  const [dial, setDial] = useState(initial.match ?? 100);
  const [recorded, setRecorded] = useState<number | undefined>(initial.match);
  const [feedback, setFeedback] = useState<string>('');
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const pct = { OD: redSaturationPct(findings.colorVision.OD), OS: redSaturationPct(findings.colorVision.OS) };
  const target = Math.min(pct.OD, pct.OS);
  const both = shown.length === 2;

  useEffect(() => () => clearTimeout(timer.current), []);

  const present = (eye: Eye) => {
    audio.play('whoosh', { volume: 0.4, pitch: eye === 'OD' ? 1.1 : 0.95 });
    setActive(eye);
    const next = shown.includes(eye) ? shown : [...shown, eye];
    setShown(next);
    let text = t.capEye(eye, capRemark(pct[eye], locale));
    if (next.length === 2) {
      if (pct.OD === pct.OS) text += t.capBothSame;
      else text += t.capDuller(pct.OD < pct.OS);
    }
    say(text);
  };

  const turn = (v: number) => {
    setDial(v);
    audio.play('dial', { volume: 0.3, pitch: 0.8 + v / 250 });
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setFeedback(matchRemark(v, target, locale).text), 380);
  };

  const record = () => {
    audio.play('lens-click');
    setRecorded(dial);
  };

  const close = () => onClose({ done: both, match: recorded, shown });

  return (
    <div class="cv-overlay" role="dialog" aria-modal="true" aria-labelledby="cv-cap-title">
      <div class="cv-sheetpanel cv-capstep">
        <header class="cv-sheetpanel__head">
          <div class="cv-eyebrow">{t.capEyebrow}</div>
          <h3 id="cv-cap-title" class="cv-sheetpanel__title">{t.capTitle}</h3>
          <p class="cv-sheetpanel__sub">{t.capSub}</p>
        </header>
        <div class="cv-capstep__body">
          <div class="cv-capstep__stage">
            <div class="cv-capstep__velvet" aria-hidden="true" />
            <Cap tint="rgb(214,38,46)" lifted={active !== null} />
            <div class="cv-capstep__eyes">
              {(['OD', 'OS'] as Eye[]).map((e) => (
                <Button key={e} variant={active === e ? 'primary' : 'glass'} size="sm" sfx={false} icon={shown.includes(e) ? 'check' : 'eye'} onClick={() => present(e)}>
                  {t.showTo(e)}
                </Button>
              ))}
            </div>
          </div>
          <div class={`cv-capstep__match ${both ? '' : 'is-locked'}`} aria-disabled={!both}>
            <div class="cv-capstep__swatches" dir="ltr">
              <figure>
                <span class="cv-swatch" style={{ background: desaturatedRed(100) }} />
                <figcaption>{t.reference}</figcaption>
              </figure>
              <figure>
                <span class="cv-swatch" style={{ background: desaturatedRed(dial) }} />
                <figcaption>{t.dullerEye} <b dir="ltr">{dial}%</b></figcaption>
              </figure>
            </div>
            <div class="cv-capstep__dial">
              <Dial value={dial} min={0} max={100} step={5} degPerStep={13.5} onChange={both ? turn : () => {}} label={t.dialLabel} valueText={t.percent(dial)} size={84} />
              <div class="cv-capstep__feedback" aria-live="polite">{both ? feedback || t.dialHint : t.showBothFirst}</div>
            </div>
            <Button variant="glass" size="sm" sfx={false} icon="check" disabled={!both} onClick={record}>
              {recorded !== undefined ? t.recorded(recorded) : t.recordMatch}
            </Button>
          </div>
        </div>
        <footer class="cv-sheetpanel__foot">
          <Button variant="primary" sfx={false} trailingIcon="arrow-right" onClick={close}>{t.backToPlates}</Button>
        </footer>
      </div>
    </div>
  );
}
