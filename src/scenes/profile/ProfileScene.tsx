import { useEffect, useRef, useState } from 'preact/hooks';
import { useNarrow } from './useNarrow';
import { useParallax } from './useParallax';
import { beginRun, hashString, type SceneProps } from '@core';
import {
  Button, CountUp, Divider, GlassPanel, HudSlot, Icon, ProgressBar, RingMeter, Screen, cx,
  useReducedMotion, useRegistry, useSignal, type IconName,
} from '@ui-kit';
import { Crest } from './Crest';
import { categoryLabel, categoryStats, cleanName, crestPalette, crestTier, greeting, initials, NAME_MAX, strongestWeakest } from './logic';
import './profile.css';

export function ProfileScene({ services }: SceneProps) {
  const settings = useSignal(services.settings);
  const reduced = useReducedMotion();
  const narrow = useNarrow();
  // Phones: give the top bar to the title — the same HUD widgets appear below in "Clinic record".
  const compactBar = useNarrow(560);
  const ring = narrow ? 76 : 104;
  const diagnoses = useRegistry(services.registries.diagnoses);
  const modes = useRegistry(services.registries.modes);
  const scenes = useRegistry(services.registries.scenes);
  const hasProfileWidgets = useRegistry(services.registries.hud).some((w) => w.slot === 'profile');
  const learning = services.learning;

  const stats = learning.stats();
  const total = diagnoses.length;
  // The learning port is not reactive: re-read it whenever a review is recorded.
  const [, setTick] = useState(0);
  useEffect(() => services.bus.on('learning:reviewed', () => setTick((n) => n + 1)), []);
  const cats = categoryStats(diagnoses, (id) => learning.seen(id), (id) => learning.mastery(id));
  const { strongest, weakest } = strongestWeakest(cats);
  const tier = crestTier(stats.mastered);
  const seed = hashString(settings.playerName.toLowerCase());
  const palette = crestPalette(seed);
  const reviewMode = modes.find((m) => m.id === 'review');
  const reviewLocked = reviewMode?.locked?.(services);

  /* parallax on the hero */
  const heroRef = useRef<HTMLDivElement>(null);
  useParallax(heroRef, reduced);

  /* inline name editing */
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(settings.playerName);
  const inputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (editing) {
      setDraft(services.settings.get().playerName);
      requestAnimationFrame(() => inputRef.current?.select());
    }
  }, [editing]);
  const saveName = () => {
    const next = cleanName(draft);
    setEditing(false);
    if (next === services.settings.get().playerName) return;
    services.settings.update((s) => ({ ...s, playerName: next }));
    services.audio.play('sparkle');
    const r = heroRef.current?.querySelector('.profile-crest')?.getBoundingClientRect();
    if (r) services.fx.burst(r.left + r.width / 2, r.top + r.height / 2, { kind: 'sparks', count: 26, color: palette[1] });
  };

  const go = (id: string) => scenes.some((s) => s.id === id) && services.router.go(id);
  const links: { id: string; title: string; sub: string; icon: IconName; accent: string }[] = [
    { id: 'codex', title: 'Codex', sub: 'Every condition you have met', icon: 'book', accent: '#ffd27a' },
    { id: 'arcade', title: 'Practice Arcade', sub: 'Sharpen each instrument', icon: 'target', accent: '#5eead4' },
    { id: 'settings', title: 'Settings', sub: 'Sound, comfort & data', icon: 'settings', accent: '#a78bfa' },
  ].filter((l) => scenes.some((s) => s.id === l.id)) as typeof links;

  const d = (i: number) => ({ '--lm-delay': `${reduced ? 0 : 120 + i * 80}ms` });
  const hour = new Date(services.clock.now()).getHours();

  return (
    <Screen title="Profile" eyebrow="Your clinician's record" onBack={() => services.router.back()} escToBack={!editing} hud={!compactBar} backdrop="hub" class="profile-scene" contentClass="profile-content">
      <section class="profile-hero" ref={heroRef}>
        <div class="profile-hero__crest">
          <Crest seed={seed} palette={palette} rarity={tier.rarity} size={narrow ? 124 : 176} initials={initials(settings.playerName)} />
        </div>
        <div class="profile-hero__id lm-enter" style={d(0)}>
          <div class="lm-eyebrow">{greeting(hour)}</div>
          {editing ? (
            <form class="profile-name profile-name--edit" onSubmit={(e) => { e.preventDefault(); saveName(); }}>
              <label for="profile-name-input" class="lm-sr-only">Your name</label>
              <input id="profile-name-input" ref={inputRef} value={draft} maxLength={NAME_MAX} spellcheck={false} autoComplete="nickname"
                onInput={(e) => setDraft((e.currentTarget as HTMLInputElement).value)}
                onBlur={saveName}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    e.stopPropagation();
                    setEditing(false);
                  }
                }} />
              <Button icon="check" variant="primary" size="sm" type="submit" aria-label="Save name" onPointerDown={(e) => e.preventDefault()} sfx={false} />
            </form>
          ) : (
            <h2 class="profile-name">
              <span class="profile-name__text">{settings.playerName}</span>
              <Button size="sm" variant="glass" class="profile-name__edit" onClick={() => setEditing(true)} aria-label="Rename">Rename</Button>
            </h2>
          )}
          <p class="profile-hero__role">Optometrist · Lumen Observatory Clinic</p>
          <div class="profile-hero__tier">
            <span class={cx('profile-tier', `profile-tier--${tier.rarity}`)}><Icon name="gem" /> {tier.label} crest</span>
            <span class="profile-hero__next">
              {tier.next
                ? <>Master <b class="lm-num">{tier.next.remaining}</b> more diagnos{tier.next.remaining === 1 ? 'is' : 'es'} to make it {tier.next.label.toLowerCase()}.</>
                : 'Your crest shines at its brightest.'}
            </span>
          </div>
        </div>
      </section>

      <Divider />

      <section class="profile-stats" aria-label="Learning">
        <GlassPanel class="profile-stat lm-enter" style={d(1)} accent="#5eead4" glow>
          <RingMeter value={total ? stats.seen / total : 0} size={ring} accent="#5eead4" ariaLabel="Diagnoses encountered">
            <CountUp value={stats.seen} class="profile-stat__num" delay={reduced ? 0 : 300} />
          </RingMeter>
          <div class="profile-stat__text">
            <div class="profile-stat__label">Encountered</div>
            <div class="profile-stat__sub">{total ? <>of <span class="lm-num">{total}</span> conditions in the Codex</> : 'conditions met in clinic'}</div>
          </div>
        </GlassPanel>
        <GlassPanel class="profile-stat lm-enter" style={d(2)} accent="#ffd27a" glow>
          <RingMeter value={stats.seen ? stats.mastered / stats.seen : 0} size={ring} accent="#ffd27a" ariaLabel="Diagnoses mastered">
            <CountUp value={stats.mastered} class="profile-stat__num" delay={reduced ? 0 : 420} />
          </RingMeter>
          <div class="profile-stat__text">
            <div class="profile-stat__label">Mastered</div>
            <div class="profile-stat__sub">recalled reliably over time</div>
          </div>
        </GlassPanel>
        <GlassPanel class={cx('profile-stat lm-enter', stats.due > 0 && 'is-due')} style={d(3)} accent="#38bdf8" glow={stats.due > 0}>
          <RingMeter value={stats.seen ? Math.min(1, stats.due / stats.seen) : 0} size={ring} accent="#38bdf8" ariaLabel="Diagnoses due for review">
            <CountUp value={stats.due} class="profile-stat__num" delay={reduced ? 0 : 540} />
          </RingMeter>
          <div class="profile-stat__text">
            <div class="profile-stat__label">Due for review</div>
            <div class="profile-stat__sub">{stats.due > 0 ? 'ready for a second look' : stats.seen ? 'all caught up' : 'nothing yet — see some patients'}</div>
            {reviewMode && stats.due > 0 && (
              <Button size="sm" variant="primary" icon="refresh" class="profile-stat__cta" disabled={!!reviewLocked} title={reviewLocked}
                onClick={() => beginRun(services, 'review')} sfx="select">
                {reviewMode.title}
              </Button>
            )}
          </div>
        </GlassPanel>
      </section>

      <div class="profile-grid">
        <GlassPanel as="section" class="profile-cats lm-enter" style={d(4)} icon="chart" eyebrow="Atlas" title="Mastery by specialty">
          {cats.length === 0 ? (
            <p class="profile-empty">The Codex is empty for now.</p>
          ) : (
            <>
              {(strongest || weakest) && (
                <div class="profile-insight">
                  {strongest && <span><Icon name="trophy" /> Strongest: <b>{categoryLabel(strongest.category).label}</b></span>}
                  {weakest && <span><Icon name="target" /> Next focus: <b>{categoryLabel(weakest.category).label}</b></span>}
                </div>
              )}
              <ul class="profile-cats__list" role="list">
                {cats.map((c, i) => {
                  const meta = categoryLabel(c.category);
                  return (
                    <li key={c.category} style={{ '--i': i }}>
                      <ProgressBar value={c.mastery} accent={meta.accent} size="sm"
                        label={meta.label}
                        valueText={<><span class="lm-num">{c.seen}</span>/<span class="lm-num">{c.total}</span> met{c.mastered > 0 && <> · <span class="lm-num">{c.mastered}</span><Icon name="star" class="profile-cats__star" /></>}</>} />
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </GlassPanel>

        {links.length > 0 && (
          <nav class="profile-links lm-enter" style={d(5)} aria-label="More">
            {links.map((l) => (
              <button key={l.id} type="button" class="profile-link" style={{ '--acc': l.accent }} onClick={() => go(l.id)}
                onPointerEnter={() => services.audio.play('hover', { volume: 0.25 })}>
                <span class="profile-link__icon"><Icon name={l.icon} /></span>
                <span class="profile-link__text"><b>{l.title}</b><small>{l.sub}</small></span>
                <Icon name="chevron-right" class="profile-link__chev" />
              </button>
            ))}
          </nav>
        )}
      </div>

      {hasProfileWidgets && (
        <section class="profile-record lm-enter" style={d(6)} aria-label="Clinic record">
          <Divider label="Clinic record" />
          <HudSlot slot="profile" class="profile-slot__widgets" />
        </section>
      )}
    </Screen>
  );
}
