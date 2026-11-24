import { useMemo, useState } from 'preact/hooks';
import type { SceneProps } from '@core';
import { CountUp, Icon, Ornament, Screen, TabPanel, Tabs } from '@ui-kit';
import { ACHIEVEMENTS } from '../model/achievements';
import { buildEnv } from '../engine';
import { Constellations } from './Constellations';
import { Crest } from './Crest';
import { careerStats } from './ProfileSection';
import { Ladder } from './Ladder';
import { TrophyWall } from './TrophyWall';
import { useRanks } from './hooks';
import { XpProgress } from './XpProgress';
import './scene.css';

type Tab = 'sky' | 'trophies' | 'ladder';
const TABS: Tab[] = ['sky', 'trophies', 'ladder'];

/** Scene 'career': rank crest, XP, mastery constellations, trophy wall and the ladder. */
export function CareerScene({ services, params }: SceneProps) {
  const { s, info } = useRanks(services);
  const initial = TABS.includes(params.tab as Tab) ? (params.tab as Tab) : 'sky';
  const [tab, setTab] = useState<Tab>(initial);
  const env = useMemo(() => buildEnv(services, s), [s, services]);
  const dxTotal = env.diagnoses.length;
  const diagnosed = env.diagnoses.filter((d) => (s.dx[d.id]?.correct ?? 0) > 0).length;
  const mastered = env.diagnoses.filter((d) => env.stars(d.id) >= 3).length;
  const trophies = Object.keys(s.achievements).length;

  return (
    <Screen title="Career" eyebrow="Lumen Observatory" onBack={() => services.router.back()} escToBack backdrop="hub" class="rk-scene">
      <div class="rk-scene__wrap">
        <section class="rk-hero" style={{ '--rk-c': info.rank.color, '--rk-c2': info.rank.color2 }}>
          <div class="rk-hero__crest">
            <span class="rk-hero__aura" aria-hidden="true" />
            <Crest rankIndex={info.rankIndex} tier={info.tier} size={164} animate label={`${info.title} crest`} />
          </div>
          <div class="rk-hero__main">
            <div class="lm-eyebrow rk-hero__eyebrow">
              Level <span class="lm-num">{info.number}</span> · {services.settings.get().playerName}
            </div>
            <h2 class="rk-hero__title">{info.title}</h2>
            <p class="rk-hero__motto">{info.rank.motto}</p>
            <Ornament width={150} class="rk-hero__orn" />
            <XpProgress from={s.xp} to={s.xp} size="lg" />
          </div>
          <dl class="rk-hero__stats rk-stats">
            {careerStats(s, mastered).map((st, i) => (
              <div key={st.label} class="rk-stat lm-enter" style={{ '--lm-delay': `${200 + i * 60}ms` }}>
                <dt>
                  <Icon name={st.icon} size={14} /> {st.label}
                </dt>
                <dd>
                  <CountUp value={st.value} suffix={st.suffix} delay={250 + i * 60} />
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <Tabs
          id="rk-tabs"
          label="Career sections"
          value={tab}
          onChange={(v) => setTab(v as Tab)}
          accent="#a78bfa"
          class="rk-tabs"
          items={[
            { id: 'sky', label: 'Mastery sky', icon: 'star', badge: `${diagnosed}/${dxTotal}` },
            { id: 'trophies', label: 'Trophy wall', icon: 'trophy', badge: s.unseen.length ? `${s.unseen.length} new` : `${trophies}/${ACHIEVEMENTS.length}` },
            { id: 'ladder', label: 'Ladder', icon: 'crown' },
          ]}
        />
        <TabPanel tabsId="rk-tabs" id="sky" value={tab} class="rk-panel">
          <Constellations services={services} s={s} />
        </TabPanel>
        <TabPanel tabsId="rk-tabs" id="trophies" value={tab} class="rk-panel">
          <TrophyWall services={services} s={s} />
        </TabPanel>
        <TabPanel tabsId="rk-tabs" id="ladder" value={tab} class="rk-panel">
          <Ladder info={info} />
        </TabPanel>
      </div>
    </Screen>
  );
}
