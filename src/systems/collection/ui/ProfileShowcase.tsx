import { useMemo } from 'preact/hooks';
import { useRegistry, useSfx, useSignal, useStrings } from '@ui-kit';
import { orderedDiagnoses, setProgress } from '../catalog';
import { CARD_RARITIES, finestCards, frameFor } from '../model';
import { RARITY_HEX, type CollectionStore } from '../store';
import { S } from '../strings';
import { IrisCard } from './IrisCard';
import { viewFor } from './views';
import './reveal.css';

/** Profile: a small vitrine with the player's three finest iris cards and collection stats. */
export function ProfileShowcase({ store }: { store: CollectionStore }) {
  const { services } = store;
  const t = useStrings(S);
  const state = useSignal(store.state);
  const diagnoses = useRegistry(services.registries.diagnoses);
  const catalog = useMemo(() => orderedDiagnoses(diagnoses), [diagnoses]);
  const play = useSfx();
  const finest = finestCards(state, 3);
  const owned = Object.keys(state.cards).length;
  const sets = setProgress(state, catalog);
  const complete = sets.filter((s) => s.complete).length;
  const polished = Object.values(state.cards).filter((c) => frameFor(c.shine) !== 'bronze').length;
  const open = () => {
    play('click');
    services.router.go('gallery');
  };

  return (
    <section class="gpf" aria-label={t.profileLabel}>
      <header class="gpf-head">
        <span class="lm-eyebrow gpf-eyebrow">{t.hubTitle}</span>
        <button type="button" class="gpf-link" onClick={open}>{t.visit}</button>
      </header>
      {finest.length ? (
        <div class="gpf-vitrine">
          {finest.map((c, i) => {
            const v = viewFor(state, catalog, c.dx);
            return v ? (
              <div key={c.dx} class="gpf-slot" style={{ '--i': i }}>
                <IrisCard view={v} size="xs" tilt={false} />
                <span class="gpf-cap">{v.dx?.name ?? v.dxId}</span>
              </div>
            ) : null;
          })}
        </div>
      ) : (
        <p class="gpf-empty">{t.profileEmpty}</p>
      )}
      <dl class="gpf-stats">
        <div><dt>{t.collected}</dt><dd class="lm-num">{owned}<small>/{catalog.length}</small></dd></div>
        <div><dt>{t.wingsComplete}</dt><dd class="lm-num">{complete}<small>/{sets.length}</small></dd></div>
        <div><dt>{t.polished}</dt><dd class="lm-num">{polished}</dd></div>
        {CARD_RARITIES.slice(1).reverse().map((r) => (
          <div key={r}>
            <dt style={{ color: RARITY_HEX[r] }}>{t.rarity[r]}</dt>
            <dd class="lm-num">{Object.values(state.cards).filter((c) => c.rarity === r).length}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
