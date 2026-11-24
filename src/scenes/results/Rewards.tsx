import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, RewardGrant } from '@core';
import { HudSlot, RewardChip, useRegistry } from '@ui-kit';

interface Item {
  key: number;
  grant: RewardGrant;
  index: number;
}

/**
 * Rewards that systems granted while the case was active (buffered on the
 * session, fired synchronously on submit) cascade in once `shown` is true;
 * rewards that arrive later on the bus pop in as they come.
 */
export function Rewards({ services, initial, shown, instant }: { services: GameServices; initial: RewardGrant[]; shown: boolean; instant: boolean }) {
  const seq = useRef(initial.length);
  const [items, setItems] = useState<Item[]>(() => initial.map((grant, i) => ({ key: i, grant, index: i })));
  const widgets = useRegistry(services.registries.hud).filter((w) => w.slot === 'results-extra');

  useEffect(
    () =>
      services.bus.on('reward:granted', (grant) => {
        const key = seq.current++;
        setItems((prev) => [...prev, { key, grant, index: 0 }]);
      }),
    [services],
  );

  if (!items.length && !widgets.length) return null;
  return (
    <section class="rs-rewards" aria-label="Rewards">
      {items.length > 0 && (
        <div class="rs-rewards__chips" aria-live="polite">
          {shown && items.map((it) => <RewardChip key={it.key} grant={it.grant} index={it.index} stagger={170} animate={!instant} sfx={!instant || it.index === 0} />)}
        </div>
      )}
      {widgets.length > 0 && (
        <div class={`rs-rewards__extra${shown ? ' is-shown' : ''}`}>
          <HudSlot slot="results-extra" />
        </div>
      )}
    </section>
  );
}
