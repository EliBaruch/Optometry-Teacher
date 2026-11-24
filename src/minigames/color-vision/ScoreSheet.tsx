import type { Eye } from '@core';
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
}

/** The examiner's record sheet: answer key + what the patient read, per eye. */
export function ScoreSheet({ plates, responses, current, eye, onPick }: ScoreSheetProps) {
  const cell = (e: Eye, i: number) => {
    const r = responses[e][i];
    if (!r) return <td class={`cv-sheet__cell ${e === eye ? 'is-eye' : ''}`}><span class="cv-sheet__empty">·</span></td>;
    return (
      <td class={`cv-sheet__cell ${e === eye ? 'is-eye' : ''} ${r.correct ? 'is-ok' : 'is-miss'}`}>
        <span class="cv-sheet__read">{r.blur ? '?' : showReading(r.reading)}</span>
        <span class="cv-sheet__mark" aria-label={r.correct ? 'correct' : 'error'}>{r.correct ? '✓' : '✗'}</span>
      </td>
    );
  };
  return (
    <table class="cv-sheet" aria-label="Record sheet">
      <thead>
        <tr>
          <th scope="col">#</th>
          <th scope="col">Key</th>
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
