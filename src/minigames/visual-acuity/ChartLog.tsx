/** Examiner's chart log: what has been recorded so far plus a technique checklist. */
import { Icon } from '@ui-kit';
import type { Slot } from './scoring';
import { useT } from './strings';

interface LogRecord {
  notation: string;
  full: string;
  pinhole: boolean;
  verdict?: string;
}

export function ChartLog(p: { slots: Slot[]; records: Partial<Record<Slot, LogRecord>>; current: Slot; isPH: boolean }) {
  const t = useT();
  return (
    <section class="va-log" aria-label={t.logTitle}>
      <div class="va-log__title">{p.isPH ? t.logTitlePh : t.logTitle}</div>
      <ul>
        {p.slots.map((s) => {
          const r = p.records[s];
          return (
            <li key={s} class={`${r ? 'is-done' : ''}${p.current === s ? ' is-cur' : ''}`}>
              <span class="va-log__eye">{s}</span>
              <span class="va-log__name">{t.logNames[s]}</span>
              <b>{r ? (r.verdict === 'not-needed' ? t.notNeeded : r.full) : s === 'OU' ? t.optional : t.notYetCharted}</b>
              {r && <Icon name="check" size={13} class="va-log__ok" />}
            </li>
          );
        })}
      </ul>
      <p class="va-log__tip">
        {p.isPH ? t.logTipPh : t.logTipVa}
      </p>
    </section>
  );
}
