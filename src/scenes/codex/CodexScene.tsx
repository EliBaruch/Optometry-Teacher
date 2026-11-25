import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { SceneProps } from '@core';
import { Button, Icon, IconButton, Kbd, Modal, ProgressBar, Screen, cx, useReducedMotion, useRegistry, useSignal, useStrings } from '@ui-kit';
import { EntryDetail } from './EntryDetail';
import { CATEGORY_ORDER, categoryMeta, groupDiagnoses, neighbour, toRoman } from './logic';
import { EntryCard, Illumination, RarityGem, SearchGlyph, useNarrow, useParallax } from './parts';
import { S } from './strings';
import './codex.css';

interface CodexPrefs {
  study: boolean;
}

export function CodexScene({ services, params }: SceneProps) {
  const t = useStrings(S);
  const reduced = useReducedMotion();
  const all = useRegistry(services.registries.diagnoses);
  const prefsSlot = useMemo(() => services.save.slot<CodexPrefs>('scene:codex', { study: false }), []);
  const prefs = useSignal(prefsSlot);
  const study = prefs.study;

  const deepLink = typeof params.diagnosisId === 'string' ? params.diagnosisId : null;
  const [openId, setOpenId] = useState<string | null>(deepLink);
  const [lockedId, setLockedId] = useState<string | null>(null);
  const [category, setCategory] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);
  const heroRef = useRef<HTMLDivElement>(null);
  useParallax(heroRef, reduced);
  // Phones: the top bar is too narrow for title + HUD, so the title wins (the HUD lives on the Profile screen).
  const narrow = useNarrow();

  // The learning port is not reactive: re-read it whenever a review is recorded.
  const [, setTick] = useState(0);
  useEffect(() => services.bus.on('learning:reviewed', () => setTick((n) => n + 1)), []);
  const seen = (id: string) => services.learning.seen(id);
  const isUnlocked = (id: string) => study || seen(id) || id === deepLink;

  const discovered = all.filter((d) => seen(d.id)).length;
  const mastered = all.filter((d) => seen(d.id) && services.learning.mastery(d.id) >= 0.8).length;
  const groups = useMemo(() => groupDiagnoses(all, { category, query }), [all, category, query]);
  const categories = useMemo(() => {
    const present = new Set(all.map((d) => d.category));
    return [...CATEGORY_ORDER.filter((c) => present.has(c)), ...[...present].filter((c) => !CATEGORY_ORDER.includes(c))];
  }, [all]);
  /** Stable page numbers across the whole atlas (filters don't renumber the folios). */
  const folio = useMemo(() => new Map(groupDiagnoses(all).flatMap((g) => g.items).map((d, i) => [d.id, i + 1])), [all]);
  const flatOpenIds = groups.flatMap((g) => g.items.map((d) => d.id)).filter(isUnlocked);

  /* '/' focuses search; ←/→ page through entries while one is open */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const typing = (e.target as HTMLElement | null)?.closest?.('input, textarea, [contenteditable]');
      if (e.key === '/' && !typing && !openId) {
        e.preventDefault();
        searchRef.current?.focus();
      } else if (openId && !typing && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
        const next = neighbour(flatOpenIds, openId, (e.key === 'ArrowRight') === (services.locale !== 'he') ? 1 : -1);
        if (next) {
          e.preventDefault();
          services.audio.play('whoosh', { volume: 0.4 });
          setOpenId(next);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [openId, flatOpenIds.join('|')]);

  const open = (id: string) => {
    if (isUnlocked(id)) {
      services.audio.play('reveal', { volume: 0.6 });
      setOpenId(id);
    } else {
      services.audio.play('thud', { volume: 0.5 });
      setLockedId(id);
    }
  };
  const setStudy = (on: boolean) => {
    prefsSlot.update((p) => ({ ...p, study: on }));
    services.audio.play(on ? 'unlock' : 'back', { volume: 0.7 });
  };

  const current = openId ? services.registries.diagnoses.get(openId) : undefined;
  const lockedDx = lockedId ? services.registries.diagnoses.get(lockedId) : undefined;
  const ratio = all.length ? discovered / all.length : 0;
  /** Category metadata with this edition's words. */
  const cm = (c: string) => {
    const m = categoryMeta(c);
    const l = t.cat[c as keyof typeof t.cat];
    return l ? { ...m, ...l } : m;
  };
  let cardIndex = 0;

  return (
    <Screen title={t.title} eyebrow={t.eyebrow} onBack={() => services.router.back()} escToBack hud={!narrow} backdrop="calm" class="codex-scene" contentClass="codex-content">
      <div class="codex-hero" ref={heroRef}>
        <svg class="codex-hero__chart" viewBox="0 0 400 200" aria-hidden="true">
          <g class="codex-hero__rings">
            {[30, 58, 86, 114].map((r) => <circle key={r} cx="330" cy="40" r={r} />)}
          </g>
          <g class="codex-hero__stars">
            <path d="M40 150 90 120 140 135 175 95 230 110" />
            {[[40, 150], [90, 120], [140, 135], [175, 95], [230, 110], [300, 160], [260, 60], [60, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4} />)}
          </g>
        </svg>
        <div class="codex-hero__text lm-enter">
          <p class="codex-hero__lede">{t.lede}</p>
          <div class="codex-hero__progress">
            <ProgressBar value={discovered} max={Math.max(1, all.length)} label={t.discovered} valueText={<bdi dir="ltr"><b>{discovered}</b> / {all.length}</bdi>} shimmer={ratio > 0 && ratio < 1} />
            <span class="codex-hero__mastered"><Icon name="star" /> <b class="lm-num">{mastered}</b> {t.masteredN}</span>
          </div>
          {discovered === 0 && all.length > 0 && !study && (
            <p class="codex-hero__hint"><Icon name="sparkle" /> {t.sealedHint}</p>
          )}
        </div>
        <div class="codex-hero__tools lm-enter" style={{ '--lm-delay': '120ms' }}>
          <label class="codex-search">
            <SearchGlyph class="codex-search__icon" />
            <span class="lm-sr-only">{t.searchLabel}</span>
            <input ref={searchRef} type="search" placeholder={t.searchPlaceholder} value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
              onKeyDown={(e) => {
                if (e.key === 'Escape' && query) {
                  e.preventDefault();
                  e.stopPropagation();
                  setQuery('');
                }
              }} />
            {query ? <IconButton icon="close" label={t.clearSearch} variant="ghost" size="sm" onClick={() => setQuery('')} /> : <Kbd class="codex-search__kbd">/</Kbd>}
          </label>
          <button type="button" role="switch" aria-checked={study} class={cx('codex-study', study && 'is-on')} onClick={() => setStudy(!study)}>
            <span class="codex-study__track"><span class="codex-study__knob"><Icon name={study ? 'unlock' : 'lock'} /></span></span>
            <span class="codex-study__text">
              <b>{t.studyA}<span class="codex-study__long">{t.studyB}</span></b>
              <small>{study ? t.studyOn : t.studyOff}</small>
            </span>
          </button>
        </div>
      </div>

      <nav class="codex-cats" aria-label={t.categories}>
        <button type="button" class={cx('codex-cat', !category && 'is-active')} aria-pressed={!category} onClick={() => { setCategory(null); services.audio.play('select', { volume: 0.5 }); }}>
          {t.all} <span class="lm-num">{all.length}</span>
        </button>
        {categories.map((c) => {
          const m = cm(c);
          const total = all.filter((d) => d.category === c).length;
          const found = all.filter((d) => d.category === c && seen(d.id)).length;
          return (
            <button key={c} type="button" class={cx('codex-cat', category === c && 'is-active')} style={{ '--acc': m.accent }} aria-pressed={category === c}
              onClick={() => { setCategory(category === c ? null : c); services.audio.play('select', { volume: 0.5 }); }}>
              {m.label} <span class="lm-num">{found}/{total}</span>
            </button>
          );
        })}
      </nav>

      {all.length === 0 && (
        <div class="codex-empty lm-enter">
          <Illumination letter="L" accent="#ffd27a" size={88} />
          <h2>{t.emptyTitle}</h2>
          <p>{t.emptyBody}</p>
        </div>
      )}
      {all.length > 0 && groups.length === 0 && (
        <div class="codex-empty lm-enter">
          <h2>{t.noMatchTitle(query)}</h2>
          <p>{t.noMatchBody}</p>
          <Button variant="ghost" icon="close" onClick={() => setQuery('')}>{t.clearSearch}</Button>
        </div>
      )}

      <div class="codex-groups">
        {groups.map((g, gi) => {
          const m = cm(g.category);
          return (
            <section key={g.category} class="codex-group" style={{ '--acc': m.accent }} aria-labelledby={`cat-${g.category}`}>
              <header class="codex-group__head lm-enter" style={{ '--lm-delay': `${reduced ? 0 : 60 + gi * 60}ms` }}>
                <Illumination letter={m.label.charAt(0)} accent={m.accent} size={52} icon={m.icon} />
                <div>
                  <h2 id={`cat-${g.category}`} class="codex-group__title">{m.label}</h2>
                  {m.blurb && <p class="codex-group__blurb">{m.blurb}</p>}
                </div>
                <span class="codex-group__rule" aria-hidden="true" />
                <span class="codex-group__count lm-num" aria-label={t.discoveredOf(g.items.filter((d) => seen(d.id)).length, g.items.length)}>
                  {g.items.filter((d) => seen(d.id)).length}<small>/{g.items.length}</small>
                </span>
              </header>
              <div class="codex-grid">
                {g.items.map((d) => {
                  const s = seen(d.id);
                  return (
                    <EntryCard key={d.id} d={d} cm={cm} unlocked={isUnlocked(d.id)} seen={s} mastery={s ? services.learning.mastery(d.id) : 0}
                      index={cardIndex++} folio={folio.get(d.id)} reduced={reduced} onOpen={() => open(d.id)} />
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      <Modal open={!!current} onClose={() => setOpenId(null)} size="lg" ariaLabel={current?.name ?? t.entryFallback} accent={current ? cm(current.category).accent : undefined} class="codex-modal"
        footer={flatOpenIds.length > 1 && openId ? (
          <div class="codex-pager">
            <Button variant="ghost" size="sm" icon="chevron-left" onClick={() => { const n = neighbour(flatOpenIds, openId, -1); if (n) setOpenId(n); }} sfx="whoosh">{t.previous}</Button>
            <span class="codex-pager__hint"><Kbd>←</Kbd><Kbd>→</Kbd></span>
            <Button variant="ghost" size="sm" trailingIcon="chevron-right" onClick={() => { const n = neighbour(flatOpenIds, openId, 1); if (n) setOpenId(n); }} sfx="whoosh">{t.next}</Button>
          </div>
        ) : undefined}>
        {current && <EntryDetail key={current.id} services={services} cm={cm} d={current} isUnlocked={isUnlocked} onNavigate={open} />}
      </Modal>

      <Modal open={!!lockedDx} onClose={() => setLockedId(null)} size="sm" eyebrow={lockedDx ? cm(lockedDx.category).label : ''} title={t.undiscovered} icon="lock"
        class="codex-locked-modal" accent={lockedDx ? cm(lockedDx.category).accent : undefined}
        footer={<>
          <Button variant="ghost" onClick={() => setLockedId(null)}>{t.notNow}</Button>
          <Button variant="primary" icon="unlock" sfx={false} onClick={() => { const id = lockedId; setLockedId(null); setStudy(true); if (id) setOpenId(id); }}>{t.openStudy}</Button>
        </>}>
        {lockedDx && (
          <div class="codex-locked" style={{ '--acc': cm(lockedDx.category).accent }}>
            <Illumination letter="?" accent={cm(lockedDx.category).accent} size={64} locked />
            <div>
              <p class="codex-locked__folio">{t.folio(toRoman(folio.get(lockedDx.id) ?? 0), folio.get(lockedDx.id) ?? 0)} · {t.sealed}{lockedDx.rarity !== 'common' && <> · <RarityGem rarity={lockedDx.rarity} suffix={t.findSuffix} /></>}</p>
              <p class="codex-locked-copy">
                {t.lockedCopy1} {t.lockedCopy2}
              </p>
            </div>
          </div>
        )}
      </Modal>
    </Screen>
  );
}
