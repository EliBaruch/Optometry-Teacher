/** Hub sidebar card: the flame, the five-week calendar and what's next. */
import { useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Button, CountUp, GlassPanel, Icon, useStrings } from '@ui-kit';
import { S } from '../strings';
import { FREEZE_EVERY, FREEZE_MAX, nextMilestone } from '../daily';
import { ACCENT } from '../state';
import { StreakCalendar } from './Calendar';
import { DetailsModal } from './DetailsModal';
import { Flame, FreezeGlyph } from './Flame';
import { dailyIntensity, days, flameVariant, statusLine } from './copy';
import { useStreaks } from './hooks';

export function StreakCard({ services }: { services: GameServices }) {
  const { ctl, state } = useStreaks(services);
  const t = useStrings(S);
  const [open, setOpen] = useState(false);
  if (!ctl) return null;
  const view = ctl.view();
  const d = state.daily;
  const next = nextMilestone(view.streak);
  const toGo = next.days - view.streak;

  return (
    <GlassPanel as="section" class={`sk-card is-${view.status}`} accent={ACCENT} glow={view.status === 'lit'} eyebrow={t.eyebrow} title={t.cardTitle} icon="flame"
      actions={<Button size="sm" variant="ghost" onClick={() => setOpen(true)} aria-label={t.openDetails}>{t.details}</Button>}
    >
      <div class="sk-card__top">
        <Flame size={58} intensity={dailyIntensity(view.streak)} variant={flameVariant(view.status)} />
        <div class="sk-card__meta">
          <div class="sk-card__count">
            <CountUp value={view.streak} class="sk-card__num" />
            <span class="sk-card__unit">{t.unitDay(view.streak)}</span>
          </div>
          <p class="sk-card__status">{statusLine(view, d.best, t)}</p>
        </div>
      </div>

      <StreakCalendar daily={d} view={view} today={ctl.today()} />

      <div class="sk-card__foot">
        <span class="sk-card__pill" title={t.milestoneTitle(next.days, next.coins)}>
          <Icon name="target" size={13} /> {t.toGoPre}<b class="lm-num">{toGo}</b>{t.toGoPost(next.days)}
        </span>
        <span
          class="sk-card__pill sk-card__pill--ice"
          title={d.freezes >= FREEZE_MAX ? t.freezeFull : t.freezeNeed(FREEZE_EVERY - d.freezeProgress)}
        >
          {Array.from({ length: FREEZE_MAX }, (_, i) => <FreezeGlyph key={i} size={13} dim={i >= d.freezes} />)}
          <span class="sk-sr">{t.freezesSr(d.freezes, FREEZE_MAX)}</span>
        </span>
        {d.best > 0 && (
          <span class="sk-card__pill" title={t.longest}>
            <Icon name="trophy" size={13} /> {days(d.best, t)}
          </span>
        )}
      </div>

      <DetailsModal services={services} open={open} onClose={() => setOpen(false)} />
    </GlassPanel>
  );
}
