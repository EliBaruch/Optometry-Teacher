import { Icon, cx } from '@ui-kit';
import { GIFT_CALENDAR } from '../logic';

/**
 * The 7-evening gift calendar. Past evenings of the current cycle are stamped,
 * tonight's glows, the 7th is the grand satchel. Missing a day never resets it.
 */
export function GiftCalendar(props: { next: number; ready: boolean; totalClaims?: number; compact?: boolean; class?: string }) {
  // Just opened the 7th: show the completed week until tomorrow starts a new one.
  const weekDone = !props.ready && props.next === 0 && (props.totalClaims ?? 0) > 0;
  return (
    <ol class={cx('cf-cal', props.compact && 'cf-cal--compact', props.class)} aria-label="Gift calendar">
      {GIFT_CALENDAR.map((g, i) => {
        const done = weekDone || i < props.next;
        const today = !weekDone && i === props.next;
        const status = done ? 'opened' : today ? (props.ready ? 'ready now' : 'next') : 'coming up';
        return (
          <li
            key={g.day}
            class={cx('cf-cal__day', done && 'is-done', today && 'is-today', today && props.ready && 'is-ready', g.day === 7 && 'is-grand')}
            style={{ '--i': i }}
            aria-label={`Evening ${g.day}: ${g.coins} lumens${g.satchel ? ' plus a satchel' : ''}, ${status}`}
          >
            <span class="cf-cal__n lm-num" aria-hidden="true">{g.day}</span>
            {!props.compact && (
              <span class="cf-cal__icon" aria-hidden="true">
                <Icon name={done ? 'check' : g.satchel ? 'crate' : 'gift'} size={g.day === 7 ? 22 : 18} />
              </span>
            )}
            {!props.compact && (
              <span class="cf-cal__amt lm-num" aria-hidden="true">
                ✦{g.coins}
                {g.satchel && <em>+</em>}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
