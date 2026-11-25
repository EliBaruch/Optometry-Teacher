/** Hub sidebar card: the flame, the five-week calendar and what's next. */
import { useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Button, CountUp, GlassPanel, Icon } from '@ui-kit';
import { FREEZE_EVERY, FREEZE_MAX, nextMilestone } from '../daily';
import { ACCENT } from '../state';
import { StreakCalendar } from './Calendar';
import { DetailsModal } from './DetailsModal';
import { Flame, FreezeGlyph } from './Flame';
import { dailyIntensity, days, flameVariant, statusLine } from './copy';
import { useStreaks } from './hooks';

export function StreakCard({ services }: { services: GameServices }) {
  const { ctl, state } = useStreaks(services);
  const [open, setOpen] = useState(false);
  if (!ctl) return null;
  const view = ctl.view();
  const d = state.daily;
  const next = nextMilestone(view.streak);
  const toGo = next.days - view.streak;

  return (
    <GlassPanel as="section" class={`sk-card is-${view.status}`} accent={ACCENT} glow={view.status === 'lit'} eyebrow="Streaks" title="Clinic flame" icon="flame"
      actions={<Button size="sm" variant="ghost" onClick={() => setOpen(true)} aria-label="Open streak details">Details</Button>}
    >
      <div class="sk-card__top">
        <Flame size={58} intensity={dailyIntensity(view.streak)} variant={flameVariant(view.status)} />
        <div class="sk-card__meta">
          <div class="sk-card__count">
            <CountUp value={view.streak} class="sk-card__num" />
            <span class="sk-card__unit">{view.streak === 1 ? 'day' : 'days'}</span>
          </div>
          <p class="sk-card__status">{statusLine(view, d.best)}</p>
        </div>
      </div>

      <StreakCalendar daily={d} view={view} today={ctl.today()} />

      <div class="sk-card__foot">
        <span class="sk-card__pill" title={`Next milestone: ${next.days} days (+${next.coins} lumens)`}>
          <Icon name="target" size={13} /> <b class="lm-num">{toGo}</b>&nbsp;to {next.days}-day
        </span>
        <span
          class="sk-card__pill sk-card__pill--ice"
          title={d.freezes >= FREEZE_MAX ? 'Freeze bank full' : `${FREEZE_EVERY - d.freezeProgress} more solid cases bank a freeze`}
        >
          {Array.from({ length: FREEZE_MAX }, (_, i) => <FreezeGlyph key={i} size={13} dim={i >= d.freezes} />)}
          <span class="sk-sr">{d.freezes} of {FREEZE_MAX} freezes</span>
        </span>
        {d.best > 0 && (
          <span class="sk-card__pill" title="Longest streak">
            <Icon name="trophy" size={13} /> {days(d.best)}
          </span>
        )}
      </div>

      <DetailsModal services={services} open={open} onClose={() => setOpen(false)} />
    </GlassPanel>
  );
}
