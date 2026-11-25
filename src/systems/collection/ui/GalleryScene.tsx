import { useEffect, useMemo, useState } from 'preact/hooks';
import type { DiagnosisCategory, GameServices } from '@core';
import { Button, Chip, CountUp, Icon, RingMeter, Screen, cx, useRegistry, useSfx, useSignal, useStrings } from '@ui-kit';
import { orderedDiagnoses, setProgress } from '../catalog';
import { CARD_RARITIES, frameFor, setReward, type CardRarity } from '../model';
import { GALLERY_COLOR, RARITY_HEX, type CollectionStore } from '../store';
import { S, wingText } from '../strings';
import { CardInspect } from './CardInspect';
import { GhostCard, IrisCard, type CardView } from './IrisCard';
import { OddsModal } from './OddsModal';
import { viewFor } from './views';
import './gallery.css';

type WingFilter = 'all' | DiagnosisCategory;
type RarityFilter = 'all' | CardRarity;

export function GalleryScene({ store, services }: { store: CollectionStore; services: GameServices }) {
  const t = useStrings(S);
  const state = useSignal(store.state);
  const active = useSignal(store.active);
  const diagnoses = useRegistry(services.registries.diagnoses);
  const catalog = useMemo(() => orderedDiagnoses(diagnoses), [diagnoses]);
  const sets = useMemo(() => setProgress(state, catalog), [state, catalog]);
  const play = useSfx();

  const [wing, setWing] = useState<WingFilter>('all');
  const [rarity, setRarity] = useState<RarityFilter>('all');
  const [ownedOnly, setOwnedOnly] = useState(false);
  const [study, setStudy] = useState(false);
  const [inspect, setInspect] = useState<string | null>(null);
  const [odds, setOdds] = useState(false);
  // NEW ribbons are frozen for this visit, then cleared when the player leaves.
  const [fresh] = useState(() => new Set(Object.values(store.state.get().cards).filter((c) => !c.seen).map((c) => c.dx)));
  useEffect(() => () => store.markAllSeen(), []);

  const owned = Object.keys(state.cards).filter((id) => catalog.some((d) => d.id === id)).length;
  const total = catalog.length;
  const tally = CARD_RARITIES.map((r) => ({ r, n: Object.values(state.cards).filter((c) => c.rarity === r).length }));
  const polished = Object.values(state.cards).filter((c) => frameFor(c.shine) !== 'bronze').length;

  // Wings you have started hang first; untouched wings wait further down the hall.
  const visibleSets = sets.filter((s) => wing === 'all' || s.category === wing).sort((a, b) => Number(b.owned > 0) - Number(a.owned > 0));
  const showCard = (id: string) => {
    const c = state.cards[id];
    if (!c) return !ownedOnly && rarity === 'all';
    return rarity === 'all' || c.rarity === rarity;
  };
  /** Owned cards in the current filter, in wall order — inspector navigates these. */
  const inspectList: CardView[] = visibleSets.flatMap((s) =>
    catalog.filter((d) => d.category === s.category && state.cards[d.id] && showCard(d.id)).map((d) => viewFor(state, catalog, d.id)!),
  );

  if (!active) return null;
  let cellIndex = 0;

  return (
    <Screen
      title={t.sceneTitle}
      eyebrow={t.sceneEyebrow}
      backdrop="calm"
      onBack={() => services.router.back()}
      escToBack={!inspect && !odds}
      class="gs-screen"
      contentClass="gs-content"
    >
      <div class="gs-lights" aria-hidden="true">
        {[0, 1, 2].map((i) => <span key={i} style={{ '--i': i }} />)}
      </div>

      <section class="gs-hero">
        <RingMeter value={total ? owned / total : 0} size={128} thickness={7} accent={GALLERY_COLOR} accent2="#ffd27a" ariaLabel={t.ringLabel(owned, total)}>
          <div class="gs-ring">
            <CountUp value={owned} class="gs-ring__n" />
            <span class="gs-ring__of">{t.ringOf(total)}</span>
          </div>
        </RingMeter>
        <div class="gs-hero__text">
          <h2 class="gs-hero__title">{t.heroTitle}</h2>
          <p class="gs-hero__sub">{t.heroSub}</p>
          <div class="gs-hero__actions">
            <Button size="sm" variant="ghost" icon="info" onClick={() => setOdds(true)}>{t.oddsBtn}</Button>
          </div>
        </div>
        <ul class="gs-tally" aria-label={t.tallyLabel}>
          {tally.slice().reverse().map(({ r, n }) => (
            <li key={r} style={{ '--c': RARITY_HEX[r] }}>
              <i class="gs-tally__gem" />
              <span class="gs-tally__n lm-num">{n}</span>
              <span class="gs-tally__l">{t.rarity[r]}</span>
            </li>
          ))}
          <li style={{ '--c': '#dfe6f2' }}>
            <Icon name="sparkle" class="gs-tally__icon" />
            <span class="gs-tally__n lm-num">{polished}</span>
            <span class="gs-tally__l">{t.polished}</span>
          </li>
        </ul>
      </section>

      <nav class="gs-wings" aria-label={t.wingsNav}>
        <button type="button" class={cx('gs-wing', wing === 'all' && 'is-on')} aria-pressed={wing === 'all'} onClick={() => { play('select'); setWing('all'); }}>
          <span class="gs-wing__name">{t.allWings}</span>
          <span class="gs-wing__count lm-num">{owned}/{total}</span>
          <span class="gs-wing__bar"><i style={{ width: `${total ? (owned / total) * 100 : 0}%` }} /></span>
        </button>
        {sets.map((s) => (
          <button
            type="button"
            key={s.category}
            class={cx('gs-wing', wing === s.category && 'is-on', s.complete && 'is-complete')}
            style={{ '--c': s.info.color }}
            aria-pressed={wing === s.category}
            onClick={() => { play('select'); setWing(s.category); }}
          >
            <span class="gs-wing__name">{s.complete && <Icon name="check" class="gs-wing__check" />}{wingText(t, s.category).label}</span>
            <span class="gs-wing__count lm-num">{s.owned}/{s.total}</span>
            <span class="gs-wing__bar"><i style={{ width: `${(s.owned / s.total) * 100}%` }} /></span>
          </button>
        ))}
      </nav>

      <div class="gs-tools">
        <div class="gs-tools__group" role="group" aria-label={t.filterRarity}>
          <Chip size="sm" selected={rarity === 'all'} onClick={() => setRarity('all')}>{t.anyRarity}</Chip>
          {CARD_RARITIES.map((r) => (
            <Chip key={r} size="sm" accent={RARITY_HEX[r]} selected={rarity === r} onClick={() => setRarity(rarity === r ? 'all' : r)}>{t.rarity[r]}</Chip>
          ))}
        </div>
        <div class="gs-tools__group">
          <Chip size="sm" icon="eye" selected={ownedOnly} onClick={() => setOwnedOnly(!ownedOnly)}>{t.collectedOnly}</Chip>
          <Chip size="sm" icon="book" accent="#ffd27a" selected={study} onClick={() => setStudy(!study)}>{t.flashMode}</Chip>
        </div>
      </div>

      {owned === 0 && (
        <div class="gs-empty">
          <Icon name="gem" />
          <div>
            <strong>{t.emptyStrong}</strong>{t.emptyRest}
          </div>
        </div>
      )}

      {visibleSets.map((s) => {
        const members = catalog.filter((d) => d.category === s.category && showCard(d.id));
        if (!members.length) return null;
        const reward = setReward(s.total);
        return (
          <section key={s.category} class={cx('gs-room', s.complete && 'is-complete')} style={{ '--c': s.info.color }} aria-label={wingText(t, s.category).wing}>
            <header class="gs-room__head">
              <h3 class="gs-room__title">{wingText(t, s.category).wing}</h3>
              <span class="gs-room__count lm-num">{s.owned} / {s.total}</span>
              <span class="gs-room__seal" title={s.complete ? t.setComplete : t.completeSetTitle(reward.xp, reward.coins)}>
                {s.complete ? <><Icon name="trophy" /> {t.complete}</> : <>{t.setReward(reward.xp)}</>}
              </span>
            </header>
            <div class="gs-wall">
              {members.map((d) => {
                const i = cellIndex++;
                const view = viewFor(state, catalog, d.id);
                const no = catalog.indexOf(d) + 1;
                return (
                  <div class="gs-cell" key={d.id} style={{ '--i': Math.min(i, 24) }}>
                    {view ? (
                      <IrisCard
                        view={view}
                        size="sm"
                        study={study}
                        ribbon={fresh.has(d.id) ? t.newRibbon : undefined}
                        onActivate={() => {
                          play('reveal', { volume: 0.6 });
                          setInspect(d.id);
                        }}
                      />
                    ) : (
                      <GhostCard number={no} total={total} category={d.category} glimpsedName={state.glimpsed.includes(d.id) ? d.name : undefined} />
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <CardInspect
        store={store}
        list={inspectList}
        current={inspect}
        study={study}
        onNavigate={setInspect}
        onClose={() => setInspect(null)}
      />
      <OddsModal open={odds} onClose={() => setOdds(false)} />
    </Screen>
  );
}
