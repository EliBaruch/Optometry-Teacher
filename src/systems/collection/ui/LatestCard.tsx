import { useMemo } from 'preact/hooks';
import { Badge, ProgressBar, useRegistry, useSfx, useSignal } from '@ui-kit';
import { orderedDiagnoses, wingOf } from '../catalog';
import { unseenCount } from '../model';
import { GALLERY_COLOR, RARITY_HEX, RARITY_NAME, type CollectionStore } from '../store';
import { EyeGlyph, IrisCard } from './IrisCard';
import { viewFor } from './views';
import './reveal.css';

/** Hub sidebar: the most recent acquisition, gently swaying, one tap from the Gallery. */
export function LatestCard({ store }: { store: CollectionStore }) {
  const { services } = store;
  const state = useSignal(store.state);
  const diagnoses = useRegistry(services.registries.diagnoses);
  const catalog = useMemo(() => orderedDiagnoses(diagnoses), [diagnoses]);
  const play = useSfx();
  const latest = Object.values(state.cards).sort((a, b) => b.lastAt - a.lastAt)[0];
  const view = latest ? viewFor(state, catalog, latest.dx) : undefined;
  const owned = Object.keys(state.cards).length;
  const unseen = unseenCount(state);
  const openGallery = () => {
    play('click');
    services.router.go('gallery');
  };

  return (
    <div
      class="gl"
      role="button"
      tabIndex={0}
      onClick={openGallery}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          openGallery();
        }
      }}
      aria-label={view ? `Gallery: latest card ${view.dx?.name ?? view.dxId}. ${owned} of ${catalog.length} collected.` : 'Gallery: no cards yet'}
    >
      <div class="gl-card">
        {view ? <IrisCard view={view} size="sm" sway tilt={false} /> : <div class="gl-empty"><EyeGlyph /></div>}
      </div>
      <div class="gl-body">
        <div class="gl-eyebrow">
          <span class="lm-eyebrow">Gallery · latest</span>
          {unseen > 0 && <Badge color={GALLERY_COLOR} pulse size="sm">{unseen} NEW</Badge>}
        </div>
        {view ? (
          <>
            <p class="gl-name">{view.dx?.name ?? view.dxId}</p>
            <p class="gl-meta">
              <span style={{ color: RARITY_HEX[view.card.rarity] }}>{RARITY_NAME[view.card.rarity]}</span> · {wingOf(view.dx?.category).label}
            </p>
          </>
        ) : (
          <p class="gl-meta">Diagnose a patient correctly to collect their iris as a holographic card.</p>
        )}
        <ProgressBar value={owned} max={Math.max(1, catalog.length)} size="sm" accent={GALLERY_COLOR} valueText={`${owned} / ${catalog.length}`} label="Collected" />
      </div>
    </div>
  );
}
