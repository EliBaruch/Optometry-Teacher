import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices, SceneProps } from '@core';
import {
  Badge, Button, Icon, Modal, RARITY_COLOR, Screen, TabPanel, Tabs, useLocale, useReducedMotion, useSignal, useStrings,
} from '@ui-kit';
import { pickStrings } from '@core';
import { S } from '../strings';
import { crateText, itemText, kindLabel } from '../text';
import {
  CATALOG, COIN, CONTENT_ODDS, CRATES, DAILY_FULL_RATE, DAILY_PRACTICE_CAP, PITY_LIMIT, itemById,
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
const TABS: { id: Tab; icon: 'sparkle' | 'eye' | 'user' | 'book' }[] = [
  { id: 'theme', icon: 'sparkle' },
  { id: 'frame', icon: 'eye' },
  { id: 'nameplate', icon: 'user' },
  { id: 'ledger', icon: 'book' },
];

/** Scene 'boutique': velvet, brass and glass cases — cosmetics for lumens only. */
export function BoutiqueScene({ services }: SceneProps) {
  const store = useEconomy(services);
  const back = () => services.router.back();
  const t = useStrings(S);
  return (
    <Screen title={t.sceneTitle} eyebrow={t.sceneEyebrow} onBack={back} escToBack backdrop="hub" class="eco-boutique-screen" contentClass="eco-shop-scroll">
      {store ? <Shop services={services} store={store} /> : <p class="eco-shop__closed">{t.closed}</p>}
    </Screen>
  );
}

function Shop({ services, store }: { services: GameServices; store: Economy }) {
  const state = useSignal(store.state);
  const t = useStrings(S);
  const locale = useLocale();
  const tabLabel: Record<Tab, string> = { theme: t.tabThemes, frame: t.tabEyewear, nameplate: t.tabNameplates, ledger: t.tabLedger };
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
          <p class="lm-eyebrow">{t.heroEyebrow}</p>
          <h2>{t.heroTitle}</h2>
          <p>{t.heroText}</p>
        </div>
        <div class="eco-shop__purse" aria-label={t.purseLabel(formatCoins(state.balance), state.hintTokens)}>
          <CoinGlyph size={52} spin />
          <div>
            <span class="eco-shop__balance lm-num" dir="ltr" aria-hidden="true">{formatCoins(state.balance)}<small> {COIN}</small></span>
            <span class="eco-shop__notes" aria-hidden="true">
              <Icon name="book" size={14} /> {t.notes(state.hintTokens)}
            </span>
          </div>
        </div>
      </header>

      <section class="eco-shelf" aria-labelledby="eco-shelf-h">
        <div class="eco-shelf__head" ref={oddsRef}>
          <h3 id="eco-shelf-h">{t.shelfTitle}</h3>
          <Button variant="ghost" size="sm" icon="info" onClick={() => setOdds(true)}>{t.dropOdds}</Button>
        </div>
        {state.crates.length ? (
          <ul class="eco-shelf__row" role="list" ref={shelfRef}>
            {state.crates.slice(0, 8).map((c, i) => (
              <li key={c.id} class="eco-shelf__slot" style={{ '--i': i, '--trim': CRATES[c.kind].trim }}>
                <button
                  type="button" class="eco-shelf__crate"
                  aria-label={t.openCrateLabel(crateText(c.kind, locale).name, c.reason)}
                  onClick={() => {
                    services.audio.play('whoosh', { volume: 0.5 });
                    setOpening(c.id);
                  }}
                >
                  <CrateArt kind={c.kind} size={96} class="eco-crate--idle" />
                  <span class="eco-shelf__name">{crateText(c.kind, locale).name}</span>
                </button>
              </li>
            ))}
            {state.crates.length > 8 && (
              <li class="eco-shelf__more lm-num" aria-label={t.moreCrates(state.crates.length - 8)}>+{state.crates.length - 8}</li>
            )}
          </ul>
        ) : (
          <p class="eco-shelf__empty">
            <Icon name="crate" size={22} /> {t.shelfEmpty}
          </p>
        )}
        <div class="eco-shelf__brass" aria-hidden="true" />
      </section>

      <Tabs
        id="eco-tabs" label={t.deptLabel} value={tab} onChange={(v) => setTab(v as Tab)} accent="var(--lm-gold-500)" class="eco-shop__tabs"
        items={TABS.map((x) => ({ id: x.id, label: tabLabel[x.id], icon: x.icon, badge: x.id === 'ledger' ? undefined : count(x.id as ItemKind) }))}
      />
      {TABS.map((x) => (
        <TabPanel key={x.id} tabsId="eco-tabs" id={x.id} value={tab} class="eco-shop__panel">
          {x.id === 'ledger' ? (
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
      <Modal open={odds} onClose={() => setOdds(false)} title={t.oddsTitle} eyebrow={t.oddsEyebrow} icon="info" size="md" accent="#f5b942">
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
  const t = useStrings(S);
  const locale = useLocale();
  const txt = itemText(item, locale);
  const rarityName = pickStrings(S, locale).rarity[item.rarity]!;
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
      aria-label={t.itemLabel(txt.name, rarityName, kindLabel(item.kind, locale))}
    >
      <div class="eco-case__vitrine">
        <div class="eco-case__spot" aria-hidden="true" />
        <div class={`eco-case__art eco-case__art--${item.kind}`}>
          <ItemArt item={item} playerName={props.playerName} compact />
        </div>
        <div class="eco-case__glass" aria-hidden="true" />
        <span class="eco-case__gem" title={rarityName}>{rarityName}</span>
        {item.kind === 'theme' && !equipped && (
          <button
            type="button" class="eco-case__preview" aria-pressed={props.previewing} onClick={props.onPreview}
            aria-label={props.previewing ? t.stopPreview(txt.name) : t.previewAcross(txt.name)}
          >
            <Icon name="eye" size={14} /> {props.previewing ? t.previewing : t.preview}
          </button>
        )}
      </div>
      <div class="eco-case__plaque">
        <h4>{txt.name}</h4>
        <p>{txt.blurb}</p>
      </div>
      <div class="eco-case__actions">
        {equipped ? (
          <Badge tone="good" icon="check">{t.equipped}</Badge>
        ) : owned ? (
          <Button variant="glass" size="sm" icon="sparkle" onClick={equip} sfx={false}>{t.equip}</Button>
        ) : short > 0 ? (
          <>
            <Button variant="glass" size="sm" disabled class="eco-price">
              {COIN} {formatCoins(item.price)}
            </Button>
            <span class="eco-case__short lm-num">{t.more(formatCoins(short))}</span>
          </>
        ) : (
          <Button variant={confirm ? 'primary' : 'glass'} size="sm" class={`eco-price${confirm ? ' is-confirm' : ''}`} onClick={buy} sfx={false}>
            {confirm ? t.confirm(`${COIN} ${formatCoins(item.price)}`) : `${COIN} ${formatCoins(item.price)}`}
          </Button>
        )}
      </div>
    </article>
  );
}

function Ledger({ state }: { state: EconomyState }) {
  const t = useStrings(S);
  const locale = useLocale();
  const T = pickStrings(S, locale);
  return (
    <div class="eco-ledger">
      <section class="eco-ledger__col">
        <h4>{t.recent}</h4>
        {state.drops.length ? (
          <ul role="list" class="eco-ledger__drops">
            {state.drops.map((d, i) => {
              const c = d.content;
              const text =
                c.type === 'coins' ? `${formatCoins(c.amount)} ${COIN}` : c.type === 'hints' ? t.notes(c.amount) : (() => { const it = itemById(c.itemId); return it ? itemText(it, locale).name : c.itemId; })();
              return (
                <li key={i} style={{ '--rc': RARITY_COLOR[d.rarity] }}>
                  <i aria-hidden="true" />
                  <span>{text}</span>
                  <small>{T.rarity[d.rarity]} · {crateText(d.kind, locale).name}</small>
                </li>
              );
            })}
          </ul>
        ) : (
          <p class="eco-ledger__empty">{t.noFinds}</p>
        )}
      </section>
      <section class="eco-ledger__col">
        <h4>{t.howEarned}</h4>
        <ul role="list" class="eco-ledger__rules">
          <li><b>{t.ruleFee}</b>{t.ruleFeeText}</li>
          <li><b>{t.ruleGrade}</b>{t.ruleGradeText}</li>
          <li><b>{t.ruleMomentum}</b>{t.ruleMomentumText}</li>
          <li><b>{t.rulePerfect}</b>{t.rulePerfectText}</li>
          <li><b>{t.rulePractice}</b>{t.rulePracticeText(DAILY_PRACTICE_CAP)}</li>
          <li><b>{t.rulePacing}</b>{t.rulePacingText(formatCoins(DAILY_FULL_RATE))}</li>
          <li><b>{t.ruleNotes}</b>{t.ruleNotesText}<span class="lm-num">{state.hintTokens}</span>.</li>
        </ul>
        <p class="eco-ledger__totals lm-num">
          {t.lifetime(formatCoins(state.lifetimeEarned), formatCoins(state.lifetimeSpent), state.cratesOpened)}
        </p>
      </section>
    </div>
  );
}

function OddsTable({ pity }: { pity: number }) {
  const t = useStrings(S);
  const locale = useLocale();
  const T = pickStrings(S, locale);
  const kinds = Object.keys(CRATES) as CrateKind[];
  return (
    <div class="eco-odds">
      <p>{t.oddsIntro}</p>
      <table>
        <thead>
          <tr>
            <th scope="col">{t.crateCol}</th>
            {publishedOdds('case').map((o) => <th key={o.rarity} scope="col" style={{ color: RARITY_COLOR[o.rarity] }}>{T.rarity[o.rarity]}</th>)}
          </tr>
        </thead>
        <tbody>
          {kinds.map((k) => (
            <tr key={k}>
              <th scope="row">
                {crateText(k, locale).name}
                <small>{crateText(k, locale).earn}</small>
              </th>
              {publishedOdds(k).map((o) => <td key={o.rarity} class="lm-num">{o.pct}%</td>)}
            </tr>
          ))}
        </tbody>
      </table>
      <p class="lm-num">{t.contents(CONTENT_ODDS.coins, CONTENT_ODDS.cosmetic, CONTENT_ODDS.hints)}</p>
      <p>
        {t.guarantee(PITY_LIMIT - 1, PITY_LIMIT)}{Math.max(1, PITY_LIMIT - pity) === 1 && t.crateOne ? <b>{t.crateOne}</b> : <><b class="lm-num">{Math.max(1, PITY_LIMIT - pity)}</b> {t.crates(Math.max(1, PITY_LIMIT - pity))}</>}.
      </p>
      <p class="eco-odds__foot">{t.oddsFoot}</p>
    </div>
  );
}
