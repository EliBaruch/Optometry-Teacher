import { formatNumber, useStrings, useLocale } from '@ui-kit';
import { RANKS, TIERS_PER_RANK, localRank, xpAtLevel, type LevelInfo } from '../model/ladder';
import { S } from '../strings';
import { Crest } from './Crest';

/** The seven-rung career ladder, from Student to Living Legend. */
export function Ladder({ info }: { info: LevelInfo }) {
  const t = useStrings(S);
  const locale = useLocale();
  return (
    <ol class="rk-ladder">
      {RANKS.map((rr, i) => {
        const r = localRank(rr, locale);
        const at = xpAtLevel(i * TIERS_PER_RANK);
        const state = i < info.rankIndex ? 'done' : i === info.rankIndex ? 'current' : 'locked';
        return (
          <li
            key={rr.id}
            class={`rk-rung is-${state} lm-enter`}
            style={{ '--rk-c': rr.color, '--rk-c2': rr.color2, '--lm-delay': `${i * 80}ms` }}
            aria-current={state === 'current' ? 'step' : undefined}
          >
            <span class="rk-rung__crest">
              <Crest rankIndex={i} tier={state === 'current' ? info.tier : state === 'done' ? TIERS_PER_RANK : 1} size={state === 'current' ? 78 : 58} locked={state === 'locked'} animate={state === 'current'} />
            </span>
            <span class="rk-rung__body">
              <span class="rk-rung__title">{r.title}</span>
              <span class="rk-rung__motto">{r.motto}</span>
              <span class="rk-rung__xp lm-num">{i === 0 ? t.start : `${formatNumber(at)} XP`}</span>
              {state === 'current' && <span class="rk-rung__here">{t.here(info.title)}</span>}
              {state === 'current' && <RankProgress info={info} />}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

/** Progress through the whole current rank (all three tiers), toward the next rank. */
function RankProgress({ info }: { info: LevelInfo }) {
  const t = useStrings(S);
  const start = xpAtLevel(info.rankIndex * TIERS_PER_RANK);
  if (!info.nextRank) {
    return (
      <span class="rk-rung__prog lm-num">
        {t.xpTo(formatNumber(info.toNext), info.nextTitle)}
      </span>
    );
  }
  const end = xpAtLevel((info.rankIndex + 1) * TIERS_PER_RANK);
  const pct = Math.max(0, Math.min(1, (info.xp - start) / (end - start)));
  return (
    <span class="rk-rung__prog">
      <span class="rk-rung__bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(pct * 100)} aria-label={t.progressTo(info.nextRank.title)}>
        {Array.from({ length: TIERS_PER_RANK - 1 }, (_, i) => {
          const at = (xpAtLevel(info.rankIndex * TIERS_PER_RANK + i + 1) - start) / (end - start);
          return <i key={i} class="rk-rung__tick" style={{ insetInlineStart: `${at * 100}%` }} />;
        })}
        <span class="rk-rung__fill" style={{ width: `${pct * 100}%` }} />
      </span>
      <span class="rk-rung__left lm-num">
        <b>{formatNumber(info.toNextRank)}</b> {t.xpTail(info.nextRank.title)}
      </span>
    </span>
  );
}
