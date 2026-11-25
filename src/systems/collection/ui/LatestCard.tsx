import { useMemo } from 'preact/hooks';
import { Badge, ProgressBar, useRegistry, useSfx, useSignal, useStrings } from '@ui-kit';
import { orderedDiagnoses } from '../catalog';
import { unseenCount } from '../model';
import { GALLERY_COLOR, RARITY_HEX, type CollectionStore } from '../store';
import { S, wingText } from '../strings';
import { EyeGlyph, IrisCard } from './IrisCard';
import { viewFor } from './views';
import './reveal.css';

/** Hub sidebar: the most recent acquisition, gently swaying, one tap from the Gallery. */
export function LatestCard({ store }: { store: CollectionStore }) {
  const { services } = store;
  const t = useStrings(S);
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
      aria-label={view ? t.latestLabel(view.dx?.name ?? view.dxId, owned, catalog.length) : t.latestNone}
    >
      <div class="gl-card">
        {view ? <IrisCard view={view} size="xs" sway tilt={false} /> : <div class="gl-empty"><EyeGlyph /></div>}
      </div>
      <div class="gl-body">
        <div class="gl-eyebrow">
          <span class="lm-eyebrow">{t.hubTitle}</span>
          {unseen > 0 && <Badge color={GALLERY_COLOR} pulse size="sm">{t.newBadge(unseen)}</Badge>}
        </div>
        {view ? (
          <>
            <p class="gl-name">{view.dx?.name ?? view.dxId}</p>
            <p class="gl-meta">
              <span style={{ color: RARITY_HEX[view.card.rarity] }}>{t.rarity[view.card.rarity]}</span> · {wingText(t, view.dx?.category).label}
            </p>
          </>
        ) : (
          <p class="gl-meta">{t.latestEmpty}</p>
        )}
        <ProgressBar value={owned} max={Math.max(1, catalog.length)} size="sm" accent={GALLERY_COLOR} valueText={`\u2066${owned} / ${catalog.length}\u2069`} label={t.collected} />
      </div>
    </div>
  );
}
