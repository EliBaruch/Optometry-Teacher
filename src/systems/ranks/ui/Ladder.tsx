import { formatNumber } from '@ui-kit';
import { RANKS, TIERS_PER_RANK, xpAtLevel, type LevelInfo } from '../model/ladder';
import { Crest } from './Crest';

/** The seven-rung career ladder, from Student to Living Legend. */
export function Ladder({ info }: { info: LevelInfo }) {
  return (
    <ol class="rk-ladder">
      {RANKS.map((r, i) => {
        const at = xpAtLevel(i * TIERS_PER_RANK);
        const state = i < info.rankIndex ? 'done' : i === info.rankIndex ? 'current' : 'locked';
        return (
          <li
            key={r.id}
            class={`rk-rung is-${state} lm-enter`}
            style={{ '--rk-c': r.color, '--rk-c2': r.color2, '--lm-delay': `${i * 80}ms` }}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span class="rk-rung__crest">
              <Crest rankIndex={i} tier={state === 'current' ? info.tier : state === 'done' ? TIERS_PER_RANK : 1} size={state === 'current' ? 78 : 58} locked={state === 'locked'} animate={state === 'current'} />
            </span>
            <span class="rk-rung__body">
              <span class="rk-rung__title">{r.title}</span>
              <span class="rk-rung__motto">{r.motto}</span>
              <span class="rk-rung__xp lm-num">{i === 0 ? 'Start' : `${formatNumber(at)} XP`}</span>
              {state === 'current' && <span class="rk-rung__here">You are here · {info.title}</span>}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
