import { useEffect, useMemo } from 'preact/hooks';
import type { GameServices } from '@core';
import { Divider, IconOrText, Icon, ProgressBar, RARITY_COLOR, useStrings, useLocale } from '@ui-kit';
import { achText, groupLabel, rarityLabel } from '../model/locale';
import { S } from '../strings';
import { ACHIEVEMENTS, type AchievementDef, type TrophyGroup } from '../model/achievements';
import type { RanksState } from '../model/state';
import { buildEnv, markSeen } from '../engine';
import { ranksSlot } from '../model/state';

const GROUPS: TrophyGroup[] = ['milestones', 'technique', 'learning', 'triage', 'crests', 'career'];
const fmtDate = (ms: number, locale: string) => {
  try {
    return new Date(ms).toLocaleDateString(locale === 'he' ? 'he-IL' : undefined, { day: 'numeric', month: 'short', year: 'numeric' });
  } catch {
    return '';
  }
};

/** The trophy wall: lit medallions for earned trophies, silhouettes (with progress) for the rest. */
export function TrophyWall({ services, s }: { services: GameServices; s: RanksState }) {
  const t = useStrings(S);
  const locale = useLocale();
  const env = useMemo(() => buildEnv(services, s), [s, services]);
  const unseenAtOpen = useMemo(() => new Set(s.unseen), []);

  useEffect(() => {
    if (!s.unseen.length) return;
    const t = setTimeout(() => markSeen(ranksSlot(services)), 2600);
    return () => clearTimeout(t);
  }, []);

  const unlocked = Object.keys(s.achievements).length;
  return (
    <div class="rk-wall">
      <div class="rk-wall__summary">
        <ProgressBar value={unlocked} max={ACHIEVEMENTS.length} label={t.trophiesEarned} valueText={`\u2066${unlocked} / ${ACHIEVEMENTS.length}\u2069`} accent="#ffd27a" shimmer />
      </div>
      {GROUPS.map((g) => {
        const defs = ACHIEVEMENTS.filter((a) => a.group === g);
        const got = defs.filter((a) => s.achievements[a.id]).length;
        return (
          <section key={g} class="rk-wall__group" aria-label={groupLabel(g, locale)}>
            <Divider label={`${groupLabel(g, locale)} · ${got}/${defs.length}`} />
            <ul class="rk-wall__grid">
              {defs.map((def, i) => {
                const at = s.achievements[def.id];
                const [cur, max] = def.progress(s, env);
                return <Plaque key={def.id} def={def} at={at} cur={cur} max={max} fresh={unseenAtOpen.has(def.id)} index={i} />;
              })}
            </ul>
          </section>
        );
      })}
    </div>
  );
}

function Plaque({ def, at, cur, max, fresh, index }: { def: AchievementDef; at?: number; cur: number; max: number; fresh: boolean; index: number }) {
  const t = useStrings(S);
  const locale = useLocale();
  const txt = achText(def, locale);
  const got = !!at;
  const hidden = !got && def.secret;
  const color = RARITY_COLOR[def.rarity];
  return (
    <li
      class={`rk-plaque rk-plaque--${def.rarity}${got ? ' is-got' : ' is-locked'}${fresh ? ' is-fresh' : ''} lm-enter`}
      style={{ '--rk-r': color, '--lm-delay': `${Math.min(index, 10) * 45}ms` }}
      tabIndex={0}
      aria-label={t.plaqueLabel(hidden ? t.secretTrophy : txt.title, got ? t.earned : t.locked, hidden ? '' : txt.description)}
    >
      {fresh && <span class="rk-plaque__new">{t.newTag}</span>}
      <span class="rk-plaque__medal" aria-hidden="true">
        <span class="rk-plaque__face">{hidden ? <Icon name="lock" size={22} /> : <IconOrText icon={def.icon} size={24} />}</span>
        {!got && !hidden && (
          <span class="rk-plaque__lock">
            <Icon name="lock" size={11} />
          </span>
        )}
      </span>
      <span class="rk-plaque__body">
        <span class="rk-plaque__title">{hidden ? '???' : txt.title}</span>
        <span class="rk-plaque__desc">{hidden ? t.secretDesc : txt.description}</span>
        <span class="rk-plaque__meta">
          <span class="rk-plaque__rarity">{rarityLabel(def.rarity, locale)}</span>
          {got ? (
            <span class="rk-plaque__date">{fmtDate(at!, locale)}</span>
          ) : (
            !hidden && max > 1 && (
              <span class="rk-plaque__prog lm-num">
                {cur}/{max}
              </span>
            )
          )}
        </span>
        {!got && !hidden && max > 1 && (
          <span class="rk-plaque__bar" aria-hidden="true">
            <span style={{ width: `${Math.round((100 * cur) / max)}%` }} />
          </span>
        )}
      </span>
    </li>
  );
}
