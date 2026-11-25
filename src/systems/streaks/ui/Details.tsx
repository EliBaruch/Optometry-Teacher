/** Full streak details (modal body): hero flame, calendar, milestones, bests per mode, the rules. */
import type { GameServices } from '@core';
import { CountUp, Icon, IconOrText, useRegistry } from '@ui-kit';
import { FREEZE_EVERY, FREEZE_MAX, MEND_NEED, nextMilestone } from '../daily';
import { TIERS, formatMult } from '../combo';
import { bestFor } from '../state';
import { StreakCalendar, MilestoneTrack } from './Calendar';
import { Flame, FreezeGlyph } from './Flame';
import { dailyIntensity, days, flameVariant, statusLine } from './copy';
import { useStreaks } from './hooks';

export function StreaksDetails({ services }: { services: GameServices }) {
  const { ctl, state } = useStreaks(services);
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
            <span>day streak</span>
          </div>
          <p class="sk-hero__status">{statusLine(view, d.best)}</p>
          <p class="sk-hero__next lm-muted">
            <Icon name="target" size={13} /> {days(toGo)} to the {next.days}-day milestone · +{next.coins} lumens
          </p>
        </div>
      </section>

      <div class="sk-stats">
        <Stat label="Best streak" value={days(d.best)} />
        <Stat label="Days practised" value={String(d.totalDays)} />
        <Stat label="Best combo" value={state.bestCombo ? `${state.bestCombo} in a row` : '—'} />
        <div class="sk-stat">
          <span class="sk-stat__label">Freezes</span>
          <span class="sk-stat__freezes" aria-label={`${d.freezes} of ${FREEZE_MAX} freezes banked`}>
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
            <b>{Math.max(1, MEND_NEED - view.mend.progress)} more correct diagnosis{MEND_NEED - view.mend.progress > 1 ? 'es' : ''}</b> by tomorrow
            rekindles your {view.mend.lost}-day streak. A Second Opinion review counts double.
          </span>
        </p>
      )}

      <div class="sk-details__grid">
        <section class="sk-block">
          <h4 class="sk-block__title">Last five weeks</h4>
          <StreakCalendar daily={d} view={view} today={today} />
          <MilestoneTrack streak={view.streak} />
        </section>

        <section class="sk-block">
          <h4 class="sk-block__title">Personal bests</h4>
          {modes.length ? (
            <table class="sk-bests">
              <thead>
                <tr>
                  <th scope="col">Mode</th>
                  <th scope="col">Best run</th>
                  <th scope="col">Best patient</th>
                  <th scope="col">Combo</th>
                </tr>
              </thead>
              <tbody>
                {modes.map((m) => {
                  const b = bestFor(state, m.id);
                  return (
                    <tr key={m.id}>
                      <th scope="row">
                        <span class="sk-bests__mode" style={{ '--sk-c': m.accent }}>
                          <IconOrText icon={m.icon} size={14} /> {m.title}
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
            <p class="lm-muted">Finish a run to set your first personal best.</p>
          )}

          <h4 class="sk-block__title">How it works</h4>
          <ul class="sk-rules">
            <li><Flame size={14} intensity={1} embers={false} /><span>One finished patient a day keeps the flame lit.</span></li>
            <li>
              <FreezeGlyph size={14} />
              <span>
                Every {FREEZE_EVERY} solid cases (grade B or better) bank a freeze, up to {FREEZE_MAX}. A freeze is used automatically on a day
                you rest.
              </span>
            </li>
            <li><Icon name="heart" size={14} /><span>If the flame rests, {MEND_NEED} correct diagnoses by the next day rekindle it.</span></li>
            <li>
              <Icon name="lightning" size={14} />
              <span>
                Consecutive correct diagnoses build a combo:{' '}
                {TIERS.slice(1).map((t, i) => (
                  <span key={t.key}>
                    {i > 0 && ', '}
                    <b style={{ color: t.color }}>{formatMult(t.mult)}</b> at {t.min}
                  </span>
                ))}
                . The bonus grows with the quality of your work-up — never with time spent.
              </span>
            </li>
            <li>
              <Icon name="check" size={14} />
              <span>Once per run, a miss after a complete essential work-up and correct triage keeps your combo.</span>
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
