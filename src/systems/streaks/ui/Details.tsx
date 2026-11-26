/** Full streak details (modal body): hero flame, calendar, milestones, bests per mode, the rules. */
import type { GameServices } from '@core';
import { CountUp, Icon, IconOrText, useRegistry, useStrings } from '@ui-kit';
import { modeText } from '@core';
import { S } from '../strings';
import { FREEZE_EVERY, FREEZE_MAX, MEND_NEED, nextMilestone } from '../daily';
import { TIERS, formatMult } from '../combo';
import { bestFor } from '../state';
import { StreakCalendar, MilestoneTrack } from './Calendar';
import { Flame, FreezeGlyph } from './Flame';
import { dailyIntensity, days, flameVariant, statusLine } from './copy';
import { useStreaks } from './hooks';

export function StreaksDetails({ services }: { services: GameServices }) {
  const { ctl, state } = useStreaks(services);
  const t = useStrings(S);
  const modes = useRegistry(services.registries.modes).slice().sort((a, b) => a.order - b.order);
  if (!ctl) return null;
  const view = ctl.view();
  const today = ctl.today();
  const d = state.daily;
  const next = nextMilestone(view.streak);
  const toGo = next.days - view.streak;

  return (
    <div class="sk-details">
      <section class="sk-hero">
        <Flame size={92} intensity={dailyIntensity(view.streak)} variant={flameVariant(view.status)} />
        <div class="sk-hero__text">
          <div class="sk-hero__num">
            <CountUp value={view.streak} class="sk-hero__count" />
            <span>{t.dayStreak}</span>
          </div>
          <p class="sk-hero__status">{statusLine(view, d.best, t)}</p>
          <p class="sk-hero__next lm-muted">
            <Icon name="target" size={13} /> {t.heroNext(toGo, next.days, next.coins)}
          </p>
        </div>
      </section>

      <div class="sk-stats">
        <Stat label={t.statBestStreak} value={days(d.best, t)} />
        <Stat label={t.statDaysPractised} value={String(d.totalDays)} />
        <Stat label={t.statBestCombo} value={state.bestCombo ? t.statInARow(state.bestCombo) : '—'} />
        <div class="sk-stat">
          <span class="sk-stat__label">{t.statFreezes}</span>
          <span class="sk-stat__freezes" aria-label={t.freezesBanked(d.freezes, FREEZE_MAX)}>
            {Array.from({ length: FREEZE_MAX }, (_, i) => (
              <FreezeGlyph key={i} size={18} dim={i >= d.freezes} />
            ))}
          </span>
        </div>
      </div>

      {view.mend && (
        <p class="sk-mend">
          <Icon name="heart" size={15} />
          <span>
            <b>{t.mendLead(Math.max(1, MEND_NEED - view.mend.progress), MEND_NEED - view.mend.progress > 1)}</b>{t.mendRest(view.mend.lost)}
          </span>
        </p>
      )}

      <div class="sk-details__grid">
        <section class="sk-block">
          <h4 class="sk-block__title">{t.lastWeeks}</h4>
          <StreakCalendar daily={d} view={view} today={today} />
          <MilestoneTrack streak={view.streak} />
        </section>

        <section class="sk-block">
          <h4 class="sk-block__title">{t.bests}</h4>
          {modes.length ? (
            <table class="sk-bests">
              <thead>
                <tr>
                  <th scope="col">{t.colMode}</th>
                  <th scope="col">{t.colBestRun}</th>
                  <th scope="col">{t.colBestPatient}</th>
                  <th scope="col">{t.colCombo}</th>
                </tr>
              </thead>
              <tbody>
                {modes.map((m) => {
                  const b = bestFor(state, m.id);
                  return (
                    <tr key={m.id}>
                      <th scope="row">
                        <span class="sk-bests__mode" style={{ '--sk-c': m.accent }}>
                          <IconOrText icon={m.icon} size={14} /> {modeText(m, services.locale).title}
                        </span>
                      </th>
                      <td class="lm-num">{b.run || '—'}</td>
                      <td class="lm-num">{b.caseScore || '—'}</td>
                      <td class="lm-num">{b.combo || '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p class="lm-muted">{t.firstBest}</p>
          )}

          <h4 class="sk-block__title">{t.howItWorks}</h4>
          <ul class="sk-rules">
            <li><Flame size={14} intensity={1} embers={false} /><span>{t.rule1}</span></li>
            <li>
              <FreezeGlyph size={14} />
              <span>
                {t.rule2(FREEZE_EVERY, FREEZE_MAX)}
              </span>
            </li>
            <li><Icon name="heart" size={14} /><span>{t.rule3(MEND_NEED)}</span></li>
            <li>
              <Icon name="lightning" size={14} />
              <span>
                {t.rule4Pre}
                {TIERS.slice(1).map((tier, i) => (
                  <span key={tier.key}>
                    {i > 0 && ', '}
                    <b style={{ color: tier.color }} dir="ltr">{formatMult(tier.mult)}</b>{t.rule4At(tier.min)}
                  </span>
                ))}
                {t.rule4Post}
              </span>
            </li>
            <li>
              <Icon name="check" size={14} />
              <span>{t.rule5}</span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div class="sk-stat">
      <span class="sk-stat__label">{label}</span>
      <span class="sk-stat__value lm-num">{value}</span>
    </div>
  );
}
