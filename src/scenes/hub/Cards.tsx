import { Badge, GlassPanel, Icon, IconOrText, useSfx } from '@ui-kit';
import type { ModeModule } from '@core';
import { rulesSummary, type WingView } from './logic';

export function ModeCard({ mode, index, lockedReason, onStart, pending }: {
  mode: ModeModule; index: number; lockedReason?: string; onStart: (m: ModeModule, el: HTMLElement) => void; pending: boolean;
}) {
  const play = useSfx();
  const locked = !!lockedReason;
  const click = (e: MouseEvent) => {
    if (locked) {
      play('error');
      const el = e.currentTarget as HTMLElement;
      el.classList.remove('is-denied');
      void el.offsetWidth;
      el.classList.add('is-denied');
      return;
    }
    if (!pending) onStart(mode, e.currentTarget as HTMLElement);
  };
  return (
    <GlassPanel
      interactive glow={!locked} accent={mode.accent} padding="none" sfx={locked ? false : 'select'}
      class={`hub-mode${locked ? ' is-locked' : ''}`} style={{ '--i': index, '--acc': mode.accent }}
      onClick={click} aria-disabled={locked || undefined}
      aria-label={`${mode.title}. ${locked ? `Locked: ${lockedReason}` : mode.tagline}`}
    >
      <div class="hub-mode__shine" aria-hidden="true" />
      <div class="hub-mode__body">
        <div class="hub-mode__medal" aria-hidden="true">
          {locked ? <Icon name="lock" size={30} /> : <IconOrText icon={mode.icon} size={34} />}
        </div>
        <div class="hub-mode__text">
          <h3 class="hub-mode__title">{mode.title}</h3>
          <p class="hub-mode__tag">{locked ? lockedReason : mode.tagline}</p>
        </div>
      </div>
      <div class="hub-mode__foot">
        <ul class="hub-mode__rules" aria-label="Rules">
          {rulesSummary(mode.rules).map((r) => <li key={r}>{r}</li>)}
        </ul>
        <span class="hub-mode__go" aria-hidden="true"><Icon name={locked ? 'lock' : 'arrow-right'} size={18} /></span>
      </div>
    </GlassPanel>
  );
}

export function WingTile({ wing, index, onOpen }: { wing: WingView; index: number; onOpen: (w: WingView) => void }) {
  const play = useSfx();
  const locked = !!wing.lockedReason;
  return (
    <GlassPanel
      interactive accent={wing.accent} padding="none" sfx={locked ? false : 'click'}
      class={`hub-wing${locked ? ' is-locked' : ''}`} style={{ '--i': index, '--acc': wing.accent }}
      onClick={() => (locked ? play('error') : onOpen(wing))}
      aria-label={`${wing.title}. ${locked ? `Locked: ${wing.lockedReason}` : wing.subtitle}${wing.badge ? `. ${wing.badge}` : ''}`}
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


