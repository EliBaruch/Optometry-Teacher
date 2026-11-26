import { Badge, GlassPanel, Icon, IconOrText, useLocale, useSfx, useStrings } from '@ui-kit';
import { modeText, type ModeModule } from '@core';
import { S } from './strings';
import { rulesSummary, type WingView } from './logic';

function deny(el: HTMLElement) {
  el.classList.remove('is-denied');
  void el.offsetWidth;
  el.classList.add('is-denied');
}

/** A playable session, as a wide card: icon tile, story, rule chips, go. The first one is the featured session. */
export function ModeCard({ mode, index, onStart, pending }: {
  mode: ModeModule; index: number; onStart: (m: ModeModule, el: HTMLElement) => void; pending: boolean;
}) {
  const locale = useLocale();
  const t = useStrings(S);
  const mt = modeText(mode, locale);
  const rules = rulesSummary(mode.rules, locale);
  const featured = index === 0;
  return (
    <GlassPanel
      interactive glow={featured} accent={mode.accent} padding="none" sfx="select"
      class={`hub-mode${featured ? ' hub-mode--featured' : ''}`} style={{ '--i': index, '--acc': mode.accent }}
      onClick={(e: MouseEvent) => { if (!pending) onStart(mode, e.currentTarget as HTMLElement); }}
      aria-label={`${mt.title}. ${mt.tagline}. ${rules.join(', ')}`}
    >
      <div class="hub-mode__tile" aria-hidden="true"><IconOrText icon={mode.icon} size={featured ? 30 : 26} /></div>
      <div class="hub-mode__text">
        <h3 class="hub-mode__title">{mt.title}</h3>
        <p class="hub-mode__tag">{mt.tagline}</p>
      </div>
      <ul class="hub-mode__rules" aria-hidden="true">
        {rules.map((r) => <li key={r}>{r}</li>)}
      </ul>
      <span class="hub-mode__go" aria-hidden="true">
        {featured && <span class="hub-mode__go-label">{t.start}</span>}
        <Icon name="arrow-right" size={18} />
      </span>
    </GlassPanel>
  );
}

/** A locked session, shown compactly in the "Coming up" row. */
export function SoonCard({ mode, reason, onDenied }: { mode: ModeModule; reason: string; onDenied: (m: ModeModule, reason: string) => void }) {
  const play = useSfx();
  const t = useStrings(S);
  const title = modeText(mode, useLocale()).title;
  return (
    <GlassPanel
      interactive accent={mode.accent} padding="none" sfx={false}
      class="hub-soon" style={{ '--acc': mode.accent }} aria-disabled="true"
      onClick={(e: MouseEvent) => { play('error'); deny(e.currentTarget as HTMLElement); onDenied(mode, reason); }}
      aria-label={`${title}. ${t.locked}: ${reason}`}
    >
      <span class="hub-soon__lock" aria-hidden="true"><Icon name="lock" size={16} /></span>
      <span class="hub-soon__text">
        <span class="hub-soon__title">{title}</span>
        <span class="hub-soon__why">{reason}</span>
      </span>
    </GlassPanel>
  );
}

export function WingTile({ wing, index, onOpen }: { wing: WingView; index: number; onOpen: (w: WingView) => void }) {
  const play = useSfx();
  const t = useStrings(S);
  const locked = !!wing.lockedReason;
  return (
    <GlassPanel
      interactive accent={wing.accent} padding="none" sfx={locked ? false : 'click'}
      class={`hub-wing${locked ? ' is-locked' : ''}`} style={{ '--i': index, '--acc': wing.accent }}
      onClick={() => (locked ? play('error') : onOpen(wing))} aria-disabled={locked || undefined}
      aria-label={`${wing.title}. ${locked ? `${t.locked}: ${wing.lockedReason}` : wing.subtitle}${wing.badge ? `. ${wing.badge}` : ''}`}
    >
      <span class="hub-wing__icon" aria-hidden="true">
        {locked ? <Icon name="lock" size={22} /> : <IconOrText icon={wing.icon} size={24} />}
      </span>
      <span class="hub-wing__text">
        <span class="hub-wing__title">{wing.title}</span>
        <span class="hub-wing__sub">{locked ? wing.lockedReason : wing.subtitle}</span>
      </span>
      {wing.badge && !locked && <Badge color={wing.accent} size="sm" pulse class="hub-wing__badge">{wing.badge}</Badge>}
    </GlassPanel>
  );
}
