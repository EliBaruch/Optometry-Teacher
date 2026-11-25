import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, SceneProps } from '@core';
import {
  Badge, Button, Icon, Modal, RARITY_COLOR, RARITY_LABEL, Screen, TabPanel, Tabs, useReducedMotion, useSignal,
} from '@ui-kit';
import {
  CATALOG, COIN, CONTENT_ODDS, CRATES, DAILY_FULL_RATE, DAILY_PRACTICE_CAP, KIND_LABEL, PITY_LIMIT, itemById,
  type CatalogItem, type CrateKind, type ItemKind,
} from '../catalog';
import { formatCoins, publishedOdds } from '../logic';
import type { Economy, EconomyState } from '../store';
import { CoinGlyph } from './CoinGlyph';
import { CrateArt } from './CrateArt';
import { CrateOpening } from './CrateOpening';
import { ItemArt } from './ItemArt';
import { useEconomy } from './hooks';

type Tab = ItemKind | 'ledger';
const TABS: { id: Tab; label: string; icon: 'sparkle' | 'eye' | 'user' | 'book' }[] = [
  { id: 'theme', label: 'Clinic themes', icon: 'sparkle' },
  { id: 'frame', label: 'Eyewear', icon: 'eye' },
  { id: 'nameplate', label: 'Nameplates', icon: 'user' },
  { id: 'ledger', label: 'Ledger', icon: 'book' },
];

/** Scene 'boutique': velvet, brass and glass cases — cosmetics for lumens only. */
export function BoutiqueScene({ services }: SceneProps) {
  const store = useEconomy(services);
  const back = () => services.router.back();
  return (
    <Screen title="The Boutique" eyebrow="Lumen · after hours" onBack={back} escToBack backdrop="hub" class="eco-boutique-screen" contentClass="eco-shop-scroll">
      {store ? <Shop services={services} store={store} /> : <p class="eco-shop__closed">The Boutique is closed tonight.</p>}
    </Screen>
  );
}

function Shop({ services, store }: { services: GameServices; store: Economy }) {
  const state = useSignal(store.state);
  const settings = useSignal(services.settings);
  const [tab, setTab] = useState<Tab>('theme');
  const [opening, setOpening] = useState<string | null>(null);
  const [odds, setOdds] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const shelfRef = useRef<HTMLUListElement>(null);
  const oddsRef = useRef<HTMLDivElement>(null);

  /** The crate button that opened the theatre may be gone: land focus on the shelf. */
  const closeOpening = () => {
    setOpening(null);
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body && document.contains(active)) return;
      const target = shelfRef.current?.querySelector<HTMLElement>('button') ?? oddsRef.current?.querySelector<HTMLElement>('button');
      target?.focus({ preventScroll: true });
    }, 40);
  };

  useEffect(() => () => store.preview(null), [store]);
  useEffect(() => {
    if (tab !== 'theme' && preview) {
      setPreview(null);
      store.preview(null);
    }
  }, [tab]);

  const togglePreview = (id: string) => {
    const next = preview === id ? null : id;
    setPreview(next);
    store.preview(next);
    services.audio.play(next ? 'sparkle' : 'back', { volume: 0.6 });
  };

  const items = CATALOG.filter((i) => i.kind === tab).sort((a, b) => a.price - b.price);
  const count = (k: ItemKind) => {
    const all = CATALOG.filter((i) => i.kind === k);
    return `${all.filter((i) => state.owned.includes(i.id)).length}/${all.length}`;
  };

  return (
    <div class="eco-shop">
      <header class="eco-shop__hero">
        <div class="eco-shop__curtain" aria-hidden="true" />
        <div class="eco-shop__intro">
          <p class="lm-eyebrow">Cosmetics for the discerning clinician</p>
          <h2>Boutique</h2>
          <p>Every lumen here was earned at the slit lamp. Nothing is for sale but style — and nothing costs real money.</p>
        </div>
        <div class="eco-shop__purse" aria-label={`Wallet: ${formatCoins(state.balance)} lumens, ${state.hintTokens} consult notes`}>
          <CoinGlyph size={52} spin />
          <div>
            <span class="eco-shop__balance lm-num" aria-hidden="true">{formatCoins(state.balance)}<small> {COIN}</small></span>
            <span class="eco-shop__notes" aria-hidden="true">
              <Icon name="book" size={14} /> {state.hintTokens} consult note{state.hintTokens === 1 ? '' : 's'}
            </span>
          </div>
        </div>
      </header>

      <section class="eco-shelf" aria-labelledby="eco-shelf-h">
        <div class="eco-shelf__head" ref={oddsRef}>
          <h3 id="eco-shelf-h">Supply crates</h3>
          <Button variant="ghost" size="sm" icon="info" onClick={() => setOdds(true)}>Drop odds</Button>
        </div>
        {state.crates.length ? (
          <ul class="eco-shelf__row" role="list" ref={shelfRef}>
            {state.crates.slice(0, 8).map((c, i) => (
              <li key={c.id} class="eco-shelf__slot" style={{ '--i': i, '--trim': CRATES[c.kind].trim }}>
                <button
                  type="button" class="eco-shelf__crate"
                  aria-label={`Open ${CRATES[c.kind].name}: ${c.reason}`}
                  onClick={() => {
                    services.audio.play('whoosh', { volume: 0.5 });
                    setOpening(c.id);
                  }}
                >
                  <CrateArt kind={c.kind} size={96} class="eco-crate--idle" />
                  <span class="eco-shelf__name">{CRATES[c.kind].name}</span>
                </button>
              </li>
            ))}
            {state.crates.length > 8 && (
              <li class="eco-shelf__more lm-num" aria-label={`${state.crates.length - 8} more crates waiting`}>+{state.crates.length - 8}</li>
            )}
          </ul>
        ) : (
          <p class="eco-shelf__empty">
            <Icon name="crate" size={22} /> No crates waiting. Earn them with exemplary (S) cases, runs of correct diagnoses and promotions.
          </p>
        )}
        <div class="eco-shelf__brass" aria-hidden="true" />
      </section>

      <Tabs
        id="eco-tabs" label="Boutique departments" value={tab} onChange={(t) => setTab(t as Tab)} accent="var(--lm-gold-500)" class="eco-shop__tabs"
        items={TABS.map((t) => ({ id: t.id, label: t.label, icon: t.icon, badge: t.id === 'ledger' ? undefined : count(t.id as ItemKind) }))}
      />
      {TABS.map((t) => (
        <TabPanel key={t.id} tabsId="eco-tabs" id={t.id} value={tab} class="eco-shop__panel">
          {t.id === 'ledger' ? (
            <Ledger state={state} />
          ) : (
            <div class={`eco-cases eco-cases--n${items.length}`}>
              {items.map((item, i) => (
                <ItemCase
                  key={item.id} item={item} index={i} services={services} store={store} playerName={settings.playerName}
                  previewing={preview === item.id} onPreview={() => togglePreview(item.id)}
                />
              ))}
            </div>
          )}
        </TabPanel>
      ))}

      {opening && <CrateOpening services={services} store={store} crateId={opening} onClose={closeOpening} />}
      <Modal open={odds} onClose={() => setOdds(false)} title="Supply crate odds" eyebrow="Published in full" icon="info" size="md" accent="#f5b942">
        <OddsTable pity={state.pity} />
      </Modal>
    </div>
  );
}

function ItemCase(props: {
  item: CatalogItem; index: number; services: GameServices; store: Economy; playerName: string; previewing: boolean; onPreview: () => void;
}) {
  const { item, services, store } = props;
  const state = useSignal(store.state);
  const reduced = useReducedMotion();
  const [confirm, setConfirm] = useState(false);
  const [fresh, setFresh] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  useEffect(() => () => clearTimeout(timer.current), []);

  const owned = state.owned.includes(item.id);
  const equipped = state.equipped[item.kind] === item.id;
  const short = item.price - state.balance;
  const color = RARITY_COLOR[item.rarity];

  const buy = (e: MouseEvent) => {
    if (!confirm) {
      setConfirm(true);
      services.audio.play('select');
      clearTimeout(timer.current);
      timer.current = setTimeout(() => setConfirm(false), 3200);
      return;
    }
    clearTimeout(timer.current);
    setConfirm(false);
    const res = store.buy(item.id);
    if (res !== 'ok') {
      services.audio.play('error');
      return;
    }
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    services.audio.play('unlock');
    services.audio.play(item.rarity === 'legendary' ? 'legendary' : item.rarity === 'common' ? 'sparkle' : 'rare', { volume: 0.7 });
    if (!reduced) services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 34, color });
    services.fx.floatText(`−${formatCoins(item.price)} ${COIN}`, r.left + r.width / 2, r.top - 6, { color: '#f5b942', size: 16 });
    setFresh(true);
    timer.current = setTimeout(() => setFresh(false), 1400);
  };

  const equip = () => {
    if (store.equip(item.id)) {
      services.audio.play(item.kind === 'theme' ? 'reveal' : 'select');
      if (item.kind === 'theme') services.fx.flash(item.palette!.accent, 260);
    }
  };

  return (
    <article
      class={`eco-case eco-case--${item.rarity}${owned ? ' is-owned' : ''}${equipped ? ' is-equipped' : ''}${fresh ? ' is-fresh' : ''}${props.previewing ? ' is-previewing' : ''}`}
      style={{ '--rc': color, '--i': props.index }}
      aria-label={`${item.name}, ${RARITY_LABEL[item.rarity]} ${KIND_LABEL[item.kind].toLowerCase()}`}
    >
      <div class="eco-case__vitrine">
        <div class="eco-case__spot" aria-hidden="true" />
        <div class={`eco-case__art eco-case__art--${item.kind}`}>
          <ItemArt item={item} playerName={props.playerName} compact />
        </div>
        <div class="eco-case__glass" aria-hidden="true" />
        <span class="eco-case__gem" title={RARITY_LABEL[item.rarity]}>{RARITY_LABEL[item.rarity]}</span>
        {item.kind === 'theme' && !equipped && (
          <button
            type="button" class="eco-case__preview" aria-pressed={props.previewing} onClick={props.onPreview}
            aria-label={props.previewing ? `Stop previewing ${item.name}` : `Preview ${item.name} across the clinic`}
          >
            <Icon name="eye" size={14} /> {props.previewing ? 'Previewing' : 'Preview'}
          </button>
        )}
      </div>
      <div class="eco-case__plaque">
        <h4>{item.name}</h4>
        <p>{item.blurb}</p>
      </div>
      <div class="eco-case__actions">
        {equipped ? (
          <Badge tone="good" icon="check">Equipped</Badge>
        ) : owned ? (
          <Button variant="glass" size="sm" icon="sparkle" onClick={equip} sfx={false}>Equip</Button>
        ) : short > 0 ? (
          <>
            <Button variant="glass" size="sm" disabled class="eco-price">
              {COIN} {formatCoins(item.price)}
            </Button>
            <span class="eco-case__short lm-num">{formatCoins(short)} more</span>
          </>
        ) : (
          <Button variant={confirm ? 'primary' : 'glass'} size="sm" class={`eco-price${confirm ? ' is-confirm' : ''}`} onClick={buy} sfx={false}>
            {confirm ? `Confirm ${COIN} ${formatCoins(item.price)}` : `${COIN} ${formatCoins(item.price)}`}
          </Button>
        )}
      </div>
    </article>
  );
}

function Ledger({ state }: { state: EconomyState }) {
  return (
    <div class="eco-ledger">
      <section class="eco-ledger__col">
        <h4>Recent finds</h4>
        {state.drops.length ? (
          <ul role="list" class="eco-ledger__drops">
            {state.drops.map((d, i) => {
              const c = d.content;
              const text =
                c.type === 'coins' ? `${formatCoins(c.amount)} ${COIN}` : c.type === 'hints' ? `${c.amount} consult note${c.amount > 1 ? 's' : ''}` : itemById(c.itemId)?.name ?? c.itemId;
              return (
                <li key={i} style={{ '--rc': RARITY_COLOR[d.rarity] }}>
                  <i aria-hidden="true" />
                  <span>{text}</span>
                  <small>{RARITY_LABEL[d.rarity]} · {CRATES[d.kind].name}</small>
                </li>
              );
            })}
          </ul>
        ) : (
          <p class="eco-ledger__empty">Nothing yet — your first crate is waiting at the end of an exemplary case.</p>
        )}
      </section>
      <section class="eco-ledger__col">
        <h4>How lumens are earned</h4>
        <ul role="list" class="eco-ledger__rules">
          <li><b>Consultation fee</b> — scales steeply with your case score and its difficulty. Accuracy pays; time spent does not.</li>
          <li><b>Grade bonus</b> — S cases pay +50%, A cases +20%.</li>
          <li><b>Momentum</b> — +5% per correct diagnosis in a row (up to +50%).</li>
          <li><b>Flawless work-up</b> — +25 for a perfect case: right call, right urgency, no missed or wasted tests.</li>
          <li><b>Practice room</b> — a little for technique, up to {DAILY_PRACTICE_CAP} {COIN} a day.</li>
          <li><b>Pacing</b> — after {formatCoins(DAILY_FULL_RATE)} {COIN} of fees in a day, fees are halved until tomorrow. Spaced practice beats cramming.</li>
          <li><b>Consult notes</b> — each one waives the fee cost of a hint. You hold <span class="lm-num">{state.hintTokens}</span>.</li>
        </ul>
        <p class="eco-ledger__totals lm-num">
          Lifetime: {formatCoins(state.lifetimeEarned)} {COIN} earned · {formatCoins(state.lifetimeSpent)} {COIN} spent · {state.cratesOpened} crates opened
        </p>
      </section>
    </div>
  );
}

function OddsTable({ pity }: { pity: number }) {
  const kinds = Object.keys(CRATES) as CrateKind[];
  return (
    <div class="eco-odds">
      <p>Rarity is rolled first, then what’s inside. Owned cosmetics are never repeated — they’re paid out in lumens instead.</p>
      <table>
        <thead>
          <tr>
            <th scope="col">Crate</th>
            {publishedOdds('case').map((o) => <th key={o.rarity} scope="col" style={{ color: RARITY_COLOR[o.rarity] }}>{RARITY_LABEL[o.rarity]}</th>)}
          </tr>
        </thead>
        <tbody>
          {kinds.map((k) => (
            <tr key={k}>
              <th scope="row">
                {CRATES[k].name}
                <small>{CRATES[k].earn}</small>
              </th>
              {publishedOdds(k).map((o) => <td key={o.rarity} class="lm-num">{o.pct}%</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p class="lm-num">Contents: {CONTENT_ODDS.coins}% lumens · {CONTENT_ODDS.cosmetic}% cosmetic · {CONTENT_ODDS.hints}% consult notes</p>
      <p>
        Guarantee: after {PITY_LIMIT - 1} crates in a row without an epic or better, crate {PITY_LIMIT} is always epic or better. Your next
        guaranteed epic is within <b class="lm-num">{Math.max(1, PITY_LIMIT - pity)}</b> crate{Math.max(1, PITY_LIMIT - pity) === 1 ? '' : 's'}.
      </p>
      <p class="eco-odds__foot">Crates are earned in play only. There is no real-money purchase anywhere in Lumen.</p>
    </div>
  );
}
