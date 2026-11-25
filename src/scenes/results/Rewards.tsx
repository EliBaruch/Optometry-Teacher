import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, RewardGrant } from '@core';
import { HudSlot, RewardChip, useRegistry, useStrings } from '@ui-kit';
import { S } from './strings';

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
  const t = useStrings(S);
  const seq = useRef(initial.length);
  const [items, setItems] = useState<Item[]>(() => initial.map((grant, i) => ({ key: i, grant, index: i })));

  useEffect(
    () =>
      services.bus.on('reward:granted', (grant) => {
        const key = seq.current++;
        setItems((prev) => [...prev, { key, grant, index: 0 }]);
      }),
    [services],
  );

  if (!items.length) return null;
  return (
    <section class="rs-rewards" aria-label={t.rewards}>
      <div class="rs-rewards__chips" aria-live="polite">
        {shown && items.map((it) => <RewardChip key={it.key} grant={it.grant} index={it.index} stagger={170} animate={!instant} sfx={!instant || it.index === 0} />)}
      </div>
    </section>
  );
}

/** Does any engagement system contribute a results panel? (Empty slot → the rail collapses.) */
export function useClinicPanels(services: GameServices): boolean {
  return useRegistry(services.registries.hud).some((w) => w.slot === 'results-extra');
}

/**
 * The 'results-extra' HUD slot (career, lumens, rivals, gallery…). Mounted at the
 * rewards beat so each system's own entrance animation plays when the player can see it.
 */
export function ClinicPanels({ shown }: { shown: boolean }) {
  if (!shown) return <div class="rs-clinic__placeholder" aria-hidden="true" />;
  return (
    <div class="rs-clinic__panels">
      <HudSlot slot="results-extra" />
    </div>
  );
}
