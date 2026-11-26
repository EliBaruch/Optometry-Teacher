import type { Eye, Locale } from '@core';
import { T } from './strings';
import type { Plate, PlateResponse } from './plates';

const SYMBOL_GLYPH: Record<string, string> = { circle: '○', triangle: '△', cross: '✕', path: '∿' };

export function showReading(r: string): string {
  if (!r) return '—';
  return SYMBOL_GLYPH[r] ?? r;
}

export function keyLabel(p: Plate): string {
  if (p.kind === 'hidden') return '—';
  return showReading(p.key);
}

export interface ScoreSheetProps {
  plates: readonly Plate[];
  responses: Record<Eye, Record<number, PlateResponse>>;
  current: number;
  eye: Eye;
  onPick: (i: number) => void;
  locale?: Locale;
}

/** The examiner's record sheet: answer key + what the patient read, per eye. */
export function ScoreSheet({ plates, responses, current, eye, onPick, locale = 'en' }: ScoreSheetProps) {
  const t = T(locale);
  const cell = (e: Eye, i: number) => {
    const r = responses[e][i];
    if (!r) return <td class={`cv-sheet__cell ${e === eye ? 'is-eye' : ''}`}><span class="cv-sheet__empty">·</span></td>;
    return (
      <td class={`cv-sheet__cell ${e === eye ? 'is-eye' : ''} ${r.correct ? 'is-ok' : 'is-miss'}`}>
        <span class="cv-sheet__read">{r.blur ? '?' : showReading(r.reading)}</span>
        <span class="cv-sheet__mark" aria-label={r.correct ? t.correct : t.error}>{r.correct ? '✓' : '✗'}</span>
      </td>
    );
  };
  return (
    <table class="cv-sheet" aria-label={t.sheetAria} dir="ltr">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">{t.sheetKey}</th>
          <th scope="col" class={eye === 'OD' ? 'is-eye' : ''}>OD</th>
          <th scope="col" class={eye === 'OS' ? 'is-eye' : ''}>OS</th>
        </tr>
      </thead>
      <tbody>
        {plates.map((p, i) => (
          <tr key={i} class={i === current ? 'is-current' : ''} onClick={() => onPick(i)}>
            <th scope="row">{i === 0 ? 'D' : i + 1}</th>
            <td class="cv-sheet__key">{keyLabel(p)}</td>
            {cell('OD', i)}
            {cell('OS', i)}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
