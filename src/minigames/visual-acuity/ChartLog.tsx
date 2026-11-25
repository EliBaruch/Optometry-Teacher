/** Examiner's chart log: what has been recorded so far plus a technique checklist. */
import { Icon } from '@ui-kit';
import type { Slot } from './scoring';

interface LogRecord {
  notation: string;
  full: string;
  pinhole: boolean;
  verdict?: string;
}

const NAMES: Record<Slot, string> = { OD: 'Right eye', OS: 'Left eye', OU: 'Both eyes' };

export function ChartLog(p: { slots: Slot[]; records: Partial<Record<Slot, LogRecord>>; current: Slot; isPH: boolean }) {
  return (
    <section class="va-log" aria-label="Chart log">
      <div class="va-log__title">{p.isPH ? 'Pinhole log' : 'Chart log'}</div>
      <ul>
        {p.slots.map((s) => {
          const r = p.records[s];
          return (
            <li key={s} class={`${r ? 'is-done' : ''}${p.current === s ? ' is-cur' : ''}`}>
              <span class="va-log__eye">{s}</span>
              <span class="va-log__name">{NAMES[s]}</span>
              <b>{r ? (r.verdict === 'not-needed' ? 'not needed' : r.full) : s === 'OU' ? 'optional' : 'not yet charted'}</b>
              {r && <Icon name="check" size={13} class="va-log__ok" />}
            </li>
          );
        })}
      </ul>
      <p class="va-log__tip">
        {p.isPH
          ? 'Read the line unaided first, then through the pinhole: refractive blur clears, disease does not.'
          : 'Threshold = the smallest line with more than half its letters correct. Cover one eye at a time.'}
      </p>
    </section>
  );
}
