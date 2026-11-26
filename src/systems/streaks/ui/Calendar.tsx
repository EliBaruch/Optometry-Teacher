/** Five-week streak calendar and the milestone track. */
import { cx, useLocale, useStrings } from '@ui-kit';
import { S, WEEKDAYS_HE_SUN, text } from '../strings';
import { addDays, calendarWeeks, daysBetween, parseDay, shortDate, WEEKDAY_INITIALS } from '../days';
import { MILESTONES, nextMilestone, type DailyState, type DailyView } from '../daily';
import { Flame, FreezeGlyph } from './Flame';

type CellKind = 'played' | 'frozen' | 'pending' | 'today' | 'future' | 'empty';

export function StreakCalendar({ daily, view, today, weeks = 5 }: { daily: DailyState; view: DailyView; today: string; weeks?: number }) {
  const locale = useLocale();
  const t = text(locale);
  const he = locale === 'he';
  const played = new Set(daily.played);
  const frozen = new Set(daily.frozen);
  const pending = new Set(view.pendingFrozen);
  const rows = calendarWeeks(today, weeks, he ? 'sun' : 'mon');
  const kind = (k: string): CellKind => {
    if (played.has(k)) return 'played';
    if (frozen.has(k)) return 'frozen';
    if (pending.has(k)) return 'pending';
    const d = daysBetween(today, k);
    if (d === 0) return 'today';
    return d > 0 ? 'future' : 'empty';
  };
  const label: Record<CellKind, string> = {
    played: t.calPlayed, frozen: t.calFrozen, pending: t.calPending, today: t.calToday, future: '', empty: t.calEmpty,
  };
  return (
    <div class="sk-cal" role="table" aria-label={t.calAria}>
      <div class="sk-cal__row sk-cal__row--head" role="row">
        {(he ? WEEKDAYS_HE_SUN : WEEKDAY_INITIALS).map((d, i) => (
          <span key={i} class="sk-cal__wd" role="columnheader">{d}</span>
        ))}
      </div>
      {rows.map((row, r) => (
        <div class="sk-cal__row" role="row" key={r}>
          {row.map((k, c) => {
            const kd = kind(k);
            const isToday = k === today;
            const run = kd === 'played' && played.has(addDays(k, -1)) ? ' is-linked' : '';
            return (
              <span
                key={k}
                role="cell"
                class={cx('sk-cal__cell', `is-${kd}`, isToday && 'is-now', run)}
                style={{ '--sk-i': r * 7 + c }}
                title={`${shortDate(k, locale)}${label[kd] ? ` — ${label[kd]}` : ''}`}
                aria-label={`${shortDate(k, locale)}${label[kd] ? `: ${label[kd]}` : ''}`}
              >
                <span class="sk-cal__num lm-num">{parseDay(k).getDate()}</span>
                {(kd === 'frozen' || kd === 'pending') && <FreezeGlyph size={10} />}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
}

/** 3 · 7 · 14 · 30 with a glowing fill up to the current streak. */
export function MilestoneTrack({ streak }: { streak: number }) {
  const t = useStrings(S);
  const marks = streak >= 30 ? [...MILESTONES.map((m) => m.days).slice(1), nextMilestone(streak).days] : MILESTONES.map((m) => m.days);
  const top = marks[marks.length - 1];
  const pct = Math.min(100, (streak / top) * 100);
  return (
    <div class="sk-track" role="img" aria-label={t.trackAria(streak, marks.join(', '))}>
      <div class="sk-track__rail">
        <span class="sk-track__fill" style={{ width: `${pct}%` }} />
      </div>
      {marks.map((d) => (
        <span key={d} class={cx('sk-track__mark', streak >= d && 'is-hit')} style={{ insetInlineStart: `${(d / top) * 100}%` }}>
          <span class="sk-track__gem">{streak >= d ? <Flame size={12} intensity={1} embers={false} /> : null}</span>
          <span class="sk-track__label lm-num">{d}</span>
        </span>
      ))}
    </div>
  );
}
