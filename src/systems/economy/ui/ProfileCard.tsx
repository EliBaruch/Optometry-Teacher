import type { GameServices } from '@core';
import { Button, GlassPanel, useSignal } from '@ui-kit';
import { CATALOG, COIN, ECONOMY_COLOR, itemById } from '../catalog';
import { formatCoins } from '../logic';
import type { Economy } from '../store';
import { FrameArt, Nameplate } from './ItemArt';
import { useEconomy } from './hooks';

/** profile slot: the player's nameplate, eyewear and Boutique stats. */
export function ProfileCard({ services }: { services: GameServices }) {
  const store = useEconomy(services);
  const settings = useSignal(services.settings);
  if (!store) return null;
  return <Card services={services} name={settings.playerName} store={store} />;
}

function Card(props: { services: GameServices; name: string; store: Economy }) {
  const state = useSignal(props.store.state);
  const theme = itemById(state.equipped.theme);
  const frame = itemById(state.equipped.frame);
  const ownedCount = state.owned.filter((id) => CATALOG.some((c) => c.id === id)).length;
  return (
    <GlassPanel class="eco-wardrobe" accent={ECONOMY_COLOR} eyebrow="Boutique" title="Wardrobe" icon="gem"
      actions={<Button variant="ghost" size="sm" trailingIcon="chevron-right" onClick={() => props.services.router.go('boutique')}>Visit</Button>}
    >
      <div class="eco-wardrobe__grid">
        <div class="eco-wardrobe__plate">
          <Nameplate id={state.equipped.nameplate} name={props.name} size="lg" />
        </div>
        <div class="eco-wardrobe__frame">
          <FrameArt id={state.equipped.frame} width="100%" />
          <span>{frame?.name}</span>
        </div>
      </div>
      <dl class="eco-wardrobe__stats">
        <div><dt>Clinic theme</dt><dd>{theme?.name}</dd></div>
        <div><dt>Collection</dt><dd class="lm-num">{ownedCount}/{CATALOG.length}</dd></div>
        <div><dt>Lumens earned</dt><dd class="lm-num">{formatCoins(state.lifetimeEarned)} {COIN}</dd></div>
        <div><dt>Crates opened</dt><dd class="lm-num">{state.cratesOpened}</dd></div>
      </dl>
    </GlassPanel>
  );
}
