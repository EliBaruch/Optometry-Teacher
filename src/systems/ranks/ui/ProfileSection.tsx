import { useMemo } from 'preact/hooks';
import type { GameServices } from '@core';
import { Button, CountUp, GlassPanel, Icon, IconOrText, ProgressBar, useStrings, useLocale, type IconName } from '@ui-kit';
import { achText } from '../model/locale';
import { S } from '../strings';
import { ACHIEVEMENTS } from '../model/achievements';
import { CAREER_COLOR, buildEnv } from '../engine';
import type { RanksState } from '../model/state';
import { Crest } from './Crest';
import { ACTIVE, useRanks } from './hooks';
import { XpProgress } from './XpProgress';

export function careerStats(s: RanksState, mastered: number, t: { stats: Record<string, string> }) {
  const unlocked = Object.keys(s.achievements).length;
  return [
    { icon: 'chart' as IconName, label: t.stats.cases, value: s.cases },
    { icon: 'target' as IconName, label: t.stats.accuracy, value: s.cases ? Math.round((100 * s.correct) / s.cases) : 0, suffix: '%' },
    { icon: 'star' as IconName, label: t.stats.sGrades, value: s.sGrades },
    { icon: 'gem' as IconName, label: t.stats.perfect, value: s.perfect },
    { icon: 'sparkle' as IconName, label: t.stats.mastered, value: mastered },
    { icon: 'trophy' as IconName, label: t.stats.trophies, value: unlocked, suffix: ` / ${ACHIEVEMENTS.length}` },
  ];
}

/** Player profile section: crest, rank, XP and the headline stats. */
export function ProfileSection({ services }: { services: GameServices }) {
  if (!ACTIVE.has(services)) return null;
  return <ProfileInner services={services} />;
}

function ProfileInner({ services }: { services: GameServices }) {
  const { s, info } = useRanks(services);
  const t = useStrings(S);
  const mastered = useMemo(() => {
    const env = buildEnv(services, s);
    return env.diagnoses.filter((d) => env.stars(d.id) >= 3).length;
  }, [s]);
  return (
    <GlassPanel class="rk-profile" accent={CAREER_COLOR} eyebrow={t.career} title={t.rankMastery} icon="crown">
      <div class="rk-profile__head">
        <Crest rankIndex={info.rankIndex} tier={info.tier} size={84} animate />
        <div class="rk-profile__rank">
          <div class="rk-profile__title">{info.title}</div>
          <div class="rk-profile__motto">{info.rank.motto}</div>
          <XpProgress from={s.xp} to={s.xp} />
        </div>
      </div>
      <dl class="rk-stats">
        {careerStats(s, mastered, t).map((st) => (
          <div key={st.label} class="rk-stat">
            <dt>
              <Icon name={st.icon} size={14} /> {st.label}
            </dt>
            <dd>
              <CountUp value={st.value} suffix={st.suffix} />
            </dd>
          </div>
        ))}
      </dl>
      <div class="rk-profile__foot">
        <Button variant="glass" size="sm" trailingIcon="arrow-right" onClick={() => services.router.go('career')}>
          {t.openCareer}
        </Button>
      </div>
    </GlassPanel>
  );
}

/** Hub sidebar card: the trophy you are closest to — a nudge toward what to practise next. */
export function NextTrophyCard({ services }: { services: GameServices }) {
  if (!ACTIVE.has(services)) return null;
  return <NextTrophyInner services={services} />;
}

function NextTrophyInner({ services }: { services: GameServices }) {
  const { s } = useRanks(services);
  const t = useStrings(S);
  const locale = useLocale();
  const next = useMemo(() => {
    const env = buildEnv(services, s);
    let best: { def: (typeof ACHIEVEMENTS)[number]; cur: number; max: number; ratio: number } | null = null;
    for (const def of ACHIEVEMENTS) {
      if (s.achievements[def.id] || def.secret) continue;
      const [cur, max] = def.progress(s, env);
      if (max <= 0) continue;
      const ratio = cur / max;
      if (!best || ratio > best.ratio) best = { def, cur, max, ratio };
    }
    return best;
  }, [s]);
  if (!next) return null;
  const txt = achText(next.def, locale);
  return (
    <GlassPanel
      class="rk-next"
      accent={CAREER_COLOR}
      padding="sm"
      interactive
      onClick={() => services.router.go('career', { tab: 'trophies' })}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          services.router.go('career', { tab: 'trophies' });
        }
      }}
      role="button"
      aria-label={t.nextTrophyLabel(txt.title, txt.description)}
    >
      <div class="rk-next__row">
        <span class="rk-next__medal">
          <IconOrText icon={next.def.icon} size={18} />
        </span>
        <div class="rk-next__text">
          <div class="lm-eyebrow">{t.nextTrophy}</div>
          <div class="rk-next__title">{txt.title}</div>
        </div>
      </div>
      <p class="rk-next__desc">{txt.description}</p>
      {next.max > 1 && <ProgressBar value={next.cur} max={next.max} size="sm" accent={CAREER_COLOR} valueText={`${next.cur} / ${next.max}`} />}
    </GlassPanel>
  );
}
