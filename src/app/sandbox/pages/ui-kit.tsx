import { useState } from 'preact/hooks';
import type { GameServices, Grade, RewardGrant } from '@core';
import { ALL_TESTS, TEST_CATALOG } from '@core';
import {
  BACKDROP_VARIANTS, Badge, Button, Card, Chip, CountUp, Divider, GlassPanel, GradeStamp, ICON_NAMES, Icon, IconButton,
  Kbd, Modal, Ornament, ProgressBar, RewardChip, RingMeter, Screen, ScrollArea, SpeechBubble, Stars, TabPanel, Tabs,
  ToastHost, Tooltip, setLiteRendering, useLiteRendering, type BackdropVariant, type IconName,
} from '@ui-kit';
import type { SandboxPage } from '../Sandbox';

/* Page-local layout only — every visual comes from the design system. */
const CSS = `
.uk { max-width: 1240px; margin: 0 auto; display: grid; gap: 22px; }
.uk-hero { text-align: center; padding: 40px 8px 16px; display: grid; justify-items: center; gap: 16px; }
.uk-hero h2 { font-size: var(--lm-fs-5xl); font-weight: 800; letter-spacing: -0.045em; line-height: 0.98; color: var(--lm-ink); }
.uk-hero h2 em { font-style: normal; background: var(--lm-accent-gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
.uk-hero p { max-width: 620px; color: var(--lm-ink-3); font-size: var(--lm-fs-lg); }
.uk-hero__facts { display: flex; flex-wrap: wrap; justify-content: center; gap: 10px 40px; margin-top: 10px; padding-top: 22px; border-top: 1px solid var(--lm-rule); width: min(720px, 100%); }
.uk-fact { display: grid; gap: 4px; text-align: center; }
.uk-fact b { font: 700 var(--lm-fs-3xl)/1 var(--lm-font-num); letter-spacing: -0.03em; color: var(--lm-ink); }
.uk-fact span { font: 600 var(--lm-fs-2xs)/1 var(--lm-font-ui); letter-spacing: .08em; text-transform: uppercase; color: var(--lm-ink-3); }
.uk-grid { display: grid; gap: 22px; grid-template-columns: repeat(12, minmax(0, 1fr)); align-items: stretch; }
.uk-grid > .lm-panel { display: flex; flex-direction: column; }
.uk-fill { flex: 1; display: flex; flex-direction: column; justify-content: center; }
.uk-col { display: grid; gap: 22px; align-content: stretch; grid-auto-rows: auto; }
.uk-col > .lm-panel { display: flex; flex-direction: column; }
.uk-c12 { grid-column: span 12; } .uk-c8 { grid-column: span 8; } .uk-c7 { grid-column: span 7; } .uk-c6 { grid-column: span 6; }
.uk-c5 { grid-column: span 5; } .uk-c4 { grid-column: span 4; }
@media (max-width: 980px) { .uk-c8, .uk-c7, .uk-c6, .uk-c5, .uk-c4 { grid-column: span 12; } }
.uk-sub { font: 600 var(--lm-fs-2xs)/1 var(--lm-font-ui); letter-spacing: .08em; text-transform: uppercase; color: var(--lm-ink-3); margin: 18px 0 10px; }
.uk-sub:first-child, .lm-panel__header + .uk-sub { margin-top: 0; }
.uk-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; }
.uk-sw { border-radius: 16px; overflow: hidden; box-shadow: 0 0 0 1px var(--lm-border), var(--lm-shadow-1); background: var(--lm-surface); }
.uk-sw i { display: block; height: 52px; box-shadow: inset 0 -1px 0 rgba(10, 22, 51,.06); }
.uk-sw div { padding: 7px 9px 8px; font-size: 11.5px; line-height: 1.3; }
.uk-sw b { display: block; font-weight: 600; color: var(--lm-ink); }
.uk-sw span { font-family: var(--lm-font-num); color: var(--lm-muted); font-size: 10.5px; }
.uk-type .d1 { font-family: var(--lm-font-display); font-size: var(--lm-fs-4xl); line-height: 1.02; font-weight: 800; letter-spacing: var(--lm-tracking-display); }
.uk-type .d2 { font-family: var(--lm-font-ui); font-size: var(--lm-fs-xl); font-weight: 500; color: var(--lm-ink-2); letter-spacing: -0.01em; }
.uk-type .num { font-family: var(--lm-font-num); font-size: var(--lm-fs-3xl); font-weight: 700; letter-spacing: .01em; display: flex; flex-wrap: wrap; column-gap: .32em; row-gap: 6px; line-height: 1.1; }
.uk-type .num-g { display: inline-flex; align-items: baseline; white-space: nowrap; position: relative; padding-bottom: 16px; }
.uk-type .num-g em { font-style: normal; font-size: .5em; color: var(--lm-ink-2); }
.uk-type .num-g small { position: absolute; left: 0; bottom: 0; font: 600 10px/1 var(--lm-font-ui); letter-spacing: .14em; text-transform: uppercase; color: var(--lm-ink-3); }
.uk-type .num-sep { font-style: normal; color: var(--lm-ink-3); margin-right: .32em; }
.uk-type .num-g:has(.num-sep) small { left: .64em; }
.uk-type p { color: var(--lm-ink-3); max-width: 56ch; }
.uk-sep { width: 1px; height: 22px; background: var(--lm-rule); margin: 0 4px; }
.uk-materials { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 14px; position: relative; padding: 20px; border-radius: var(--lm-r-lg); overflow: hidden; isolation: isolate; }
.uk-materials::before { content: ''; position: absolute; inset: 0; z-index: -1;
  background: radial-gradient(60% 90% at 12% 20%, var(--lm-vivid-sky), transparent 70%), radial-gradient(55% 80% at 88% 30%, var(--lm-vivid-pink), transparent 70%), radial-gradient(60% 90% at 50% 110%, var(--lm-vivid-yellow), transparent 70%), var(--lm-brand-200); opacity: .85; }
.uk-mat { min-height: 112px; padding: 14px 16px; border-radius: var(--lm-r-md); display: grid; align-content: end; gap: 3px; }
.uk-mat b { font: 700 var(--lm-fs-md)/1.2 var(--lm-font-display); color: var(--lm-ink); }
.uk-mat span { font: 500 var(--lm-fs-xs)/1.35 var(--lm-font-ui); color: var(--lm-ink-2); }
.uk-mat--opaque { background: var(--lm-surface); box-shadow: 0 0 0 1px var(--lm-border), var(--lm-shadow-2); }
.uk-mat--strong { background: var(--lm-glass-sheen), var(--lm-glass-bg-strong); backdrop-filter: var(--lm-glass-blur); -webkit-backdrop-filter: var(--lm-glass-blur); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); }
.uk-board { display: grid; gap: 0; border-radius: 16px; overflow: hidden; background: var(--lm-surface); box-shadow: 0 0 0 1px var(--lm-border); }
.uk-board__row { display: grid; grid-template-columns: 1.4fr 1fr 1fr; align-items: center; gap: 12px; padding: 10px 14px; font-size: var(--lm-fs-sm); color: var(--lm-ink); border-top: 1px solid var(--lm-rule); }
.uk-board__row:first-child { border-top: 0; background: var(--lm-surface-2); font: 650 var(--lm-fs-2xs)/1 var(--lm-font-ui); letter-spacing: .08em; text-transform: uppercase; color: var(--lm-ink-3); }
.uk-board .lm-label { justify-content: center; width: 100%; height: 28px; border-radius: 8px; }
.uk-rule-head { display: grid; gap: 6px; padding-bottom: 14px; margin-bottom: 4px; border-bottom: 1px solid var(--lm-rule); }
.uk-num { font: 700 var(--lm-fs-5xl)/0.95 var(--lm-font-num); letter-spacing: -0.045em; color: var(--lm-ink); }
.uk-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.uk-meters { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 18px; align-items: center; justify-items: center; }
.uk-ring-val { font-family: var(--lm-font-num); font-size: 24px; font-weight: 700; color: var(--lm-ink); }
.uk-ring-lbl { font-size: 10px; letter-spacing: .08em; text-transform: uppercase; color: var(--lm-ink-3); margin-top: 3px; }
.uk-big { font-size: 56px; line-height: 1; font-weight: 700; letter-spacing: -0.04em; color: var(--lm-ink); }
.uk-stamps { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; justify-items: center; align-items: center; padding: 26px 0 30px; }
@media (max-width: 760px) { .uk-stamps { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 26px; padding: 18px 8px 6px; } }
.uk-rewards { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.uk-patient { display: grid; grid-template-columns: 84px 1fr; gap: 18px; align-items: start; }
.uk-portrait { width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; color: var(--lm-accent-text);
  background: var(--lm-brand-50); box-shadow: inset 0 0 0 1px var(--lm-brand-100); }
.uk-findings { display: grid; gap: 8px; }
.uk-finding { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; background: var(--lm-surface-2); box-shadow: inset 0 0 0 1px var(--lm-border); font-size: var(--lm-fs-sm); }
.uk-finding .k { color: var(--lm-ink-3); min-width: 92px; font-size: 12px; }
.uk-finding .v { flex: 1; color: var(--lm-ink); font-family: var(--lm-font-num); }
.uk-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
.uk-icon { display: grid; justify-items: center; gap: 8px; padding: 16px 6px 12px; border-radius: 14px; color: var(--lm-ink-2);
  background: var(--lm-surface); box-shadow: 0 0 0 1px var(--lm-border), var(--lm-shadow-1); transition: all var(--lm-dur-ui) var(--lm-ease-out); }
.uk-icon:hover { color: var(--lm-accent-text); box-shadow: 0 0 0 1px var(--lm-brand-200), var(--lm-shadow-2); transform: translateY(-2px); }
.uk-icon svg { width: 28px; height: 28px; }
.uk-icon span { font-size: 10.5px; color: var(--lm-ink-3); text-align: center; line-height: 1.25; }
.uk-icon small { font-size: 9.5px; color: var(--lm-ink-3); margin-top: -6px; }
.uk-icons--tests { grid-template-columns: repeat(8, minmax(0, 1fr)); gap: 10px; }
.uk-icons--tests .uk-icon { align-content: start; padding: 18px 8px 14px; gap: 10px; background: var(--lm-surface); }
.uk-icon__well { font-style: normal; display: grid; place-items: center; width: 54px; height: 54px; border-radius: 50%; color: var(--lm-accent-text);
  background: var(--lm-brand-50);
  transition: transform var(--lm-dur-ui) var(--lm-ease-spring), background var(--lm-dur-ui) var(--lm-ease-out); }
.uk-icons--tests .uk-icon svg { width: 30px; height: 30px; }
.uk-icons--tests .uk-icon span { color: var(--lm-ink-2); font-size: 11.5px; font-weight: 500; }
.uk-icons--tests .uk-icon:hover .uk-icon__well { transform: scale(1.06); background: var(--lm-brand-100); }
@media (max-width: 1100px) { .uk-icons--tests { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.uk-toasts { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; align-content: center; }
.uk-skills { display: grid; gap: 8px; width: 100%; }
.uk-skill { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 8px 12px; border-radius: 12px; background: var(--lm-surface-2); box-shadow: inset 0 0 0 1px var(--lm-border); font-size: var(--lm-fs-sm); color: var(--lm-ink-2); }
.uk-alert { display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: start; }
.uk-alert p { color: var(--lm-ink-3); font-size: var(--lm-fs-sm); }
.uk-tabpanel { padding-top: 16px; color: var(--lm-ink-3); font-size: var(--lm-fs-sm); min-height: 64px; }
@media (max-width: 560px) {
  .uk-swatches { grid-template-columns: repeat(auto-fill, minmax(70px, 1fr)); gap: 8px; }
  .uk-sw i { height: 40px; }
  .uk-icons { grid-template-columns: repeat(auto-fill, minmax(64px, 1fr)); gap: 6px; }
  .uk-icon span { font-size: 9.5px; overflow-wrap: anywhere; }
  .uk-icon { padding: 12px 4px 10px; gap: 6px; }
  .uk-icon svg { width: 24px; height: 24px; }
  .uk-icon small { display: none; }
  .uk-icons--tests { grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 6px; }
  .uk-icons--tests .uk-icon { padding: 12px 4px 10px; }
  .uk-icon__well { width: 42px; height: 42px; }
  .uk-icons--tests .uk-icon svg { width: 24px; height: 24px; }
  .uk-icons--tests .uk-icon span { font-size: 9.5px; }
  .uk-patient { grid-template-columns: 52px 1fr; gap: 12px; }
  .uk-portrait { width: 52px; height: 52px; }
  .uk-portrait svg { width: 28px; height: 28px; }
  .uk-finding { display: grid; grid-template-columns: 1fr auto; row-gap: 4px; }
  .uk-finding .k { grid-column: 1; }
  .uk-finding .v { grid-column: 1 / -1; grid-row: 2; }
  .uk-finding .lm-badge { grid-column: 2; grid-row: 1; }
}
.uk-footer { text-align: center; padding: 18px 0 8px; color: var(--lm-ink-3); font-size: 12px; display: grid; justify-items: center; gap: 10px; }
`;

const SWATCHES: [string, string, string][] = [
  ['Canvas', 'var(--lm-canvas)', '#eef2fa'],
  ['Surface', 'var(--lm-surface)', '#ffffff'],
  ['Hairline', 'var(--lm-border-strong)', 'ink 16%'],
  ['Azure', 'var(--lm-brand-600)', '#2257f0'],
  ['Azure tint', 'var(--lm-brand-100)', '#dce6ff'],
  ['Navy ink', 'var(--lm-ink)', '#0a1633'],
  ['Secondary', 'var(--lm-ink-3)', '#56637d'],
  ['Coin', 'var(--lm-coin)', '#f5a524'],
];
const VIVID: [string, string, string][] = [
  ['Green', 'var(--lm-vivid-green)', '#00c875'],
  ['Lime', 'var(--lm-vivid-lime)', '#9cd326'],
  ['Yellow', 'var(--lm-vivid-yellow)', '#ffcb00'],
  ['Orange', 'var(--lm-vivid-orange)', '#fdab3d'],
  ['Red', 'var(--lm-vivid-red)', '#ff5a6e'],
  ['Pink', 'var(--lm-vivid-pink)', '#ff6ec7'],
  ['Purple', 'var(--lm-vivid-purple)', '#a25ddc'],
  ['Blue', 'var(--lm-vivid-blue)', '#579bfc'],
  ['Sky', 'var(--lm-vivid-sky)', '#4eccf5'],
  ['Teal', 'var(--lm-vivid-teal)', '#2dd4bf'],
];
const SYSTEMS: [string, string, string][] = [
  ['Career', 'var(--lm-career)', '#7c3aed'],
  ['Boutique', 'var(--lm-economy)', '#d97706'],
  ['Rivals', 'var(--lm-rivals)', '#059669'],
  ['Streaks', 'var(--lm-streaks)', '#ea580c'],
  ['Gallery', 'var(--lm-gallery)', '#db2777'],
  ['Code Red', 'var(--lm-code-red)', '#e11d48'],
  ['Lounge', 'var(--lm-lounge)', '#0284c7'],
];
const CLINICAL: [string, string, string][] = [
  ['Normal', 'var(--lm-normal)', '#059669'],
  ['Abnormal', 'var(--lm-abnormal)', '#d97706'],
  ['Critical', 'var(--lm-critical)', '#e11d48'],
  ['Common', 'var(--lm-rarity-common)', '#64748b'],
  ['Rare', 'var(--lm-rarity-rare)', '#2257f0'],
  ['Epic', 'var(--lm-rarity-epic)', '#9333ea'],
  ['Legendary', 'var(--lm-iridescent)', 'iridescent'],
];

const REWARDS: RewardGrant[] = [
  { source: 'core', label: 'Lumens earned', value: '+120', icon: 'coin', rarity: 'common' },
  { source: 'core', label: 'Career XP', value: '+340', icon: 'star', color: '#7c3aed', rarity: 'common' },
  { source: 'core', label: 'Supply crate', value: 'Rare', icon: 'crate', rarity: 'rare' },
  { source: 'core', label: 'Combo streak', value: 'x4', icon: 'flame', color: '#ea580c', rarity: 'rare' },
  { source: 'core', label: 'Iris card · Heterochromia', value: 'NEW!', icon: 'eye', rarity: 'epic' },
  { source: 'core', label: 'Perfect diagnosis seal', value: 'S', icon: 'crown', rarity: 'legendary' },
];

const FINDINGS: [string, string, 'normal' | 'abnormal' | 'critical'][] = [
  ['VA (dist, sc)', 'OD 6/12 (20/40) · OS 6/7.5 (20/25)', 'abnormal'],
  ['Pinhole', 'OD 6/7.5 · OS 6/6 — improves', 'normal'],
  ['Pupils', 'PERRL, no RAPD', 'normal'],
  ['IOP (GAT)', 'OD 16 · OS 17 mmHg', 'normal'],
  ['Cornea', 'Clear, no staining', 'normal'],
  ['Anterior chamber', 'Deep and quiet', 'normal'],
  ['Lens', 'Nuclear sclerosis 2+ OD, 1+ OS', 'abnormal'],
  ['Red reflex', 'Dull OD', 'abnormal'],
  ['Optic disc', 'C/D 0.3 OU, healthy rim', 'normal'],
  ['Macula', 'Flat, foveal reflex present', 'normal'],
];
const SKILLS: [string, number][] = [['Refraction', 3], ['Anterior segment', 2], ['Neuro-ophthalmology', 1]];
const FLAG_ICON = { normal: 'check', abnormal: 'warning', critical: 'alert' } as const;

const GRADES: Grade[] = ['S', 'A', 'B', 'C', 'D', 'F'];
const VARIANTS = Object.keys(BACKDROP_VARIANTS) as BackdropVariant[];
const TEST_ICONS = new Set<string>(ALL_TESTS);

function Swatch({ name, css, hex }: { name: string; css: string; hex: string }) {
  return (
    <div class="uk-sw">
      <i style={{ background: css }} />
      <div>
        <b>{name}</b>
        <span>{hex}</span>
      </div>
    </div>
  );
}

function UiKitShowcase({ services }: { services: GameServices }) {
  const [variant, setVariant] = useState<BackdropVariant>('title');
  const lite = useLiteRendering();
  const [tab, setTab] = useState('history');
  const [tab2, setTab2] = useState('od');
  const [modal, setModal] = useState(false);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState(8640);
  const [ratio, setRatio] = useState(0.72);
  const [stars, setStars] = useState(3);
  const [replay, setReplay] = useState(0);
  const [rewardsKey, setRewardsKey] = useState(0);
  const [lineKey, setLineKey] = useState(0);
  const [chips, setChips] = useState<Record<string, boolean>>({ onset: true });
  const toggle = (k: string) => setChips((c) => ({ ...c, [k]: !c[k] }));
  const toast = (tone: 'info' | 'good' | 'bad' | 'epic', message: string, icon?: string) => services.bus.emit('toast', { message, tone, icon });

  return (
    <Screen
      title="Design System"
      eyebrow="Lumen · ui-kit"
      backdrop={variant}
      onBack={() => history.back()}
      right={<IconButton icon="info" label="About this page" onClick={() => setModal(true)} />}
    >
      <style>{CSS}</style>
      <ToastHost />
      <div class="uk">
        <section class="uk-hero lm-enter">
          <div class="lm-eyebrow">Design system · Clinic Glass</div>
          <h2 class="lm-display">Bright, precise,<br /><em>beautifully clear.</em></h2>
          <p>Luminous glass over daylight, vivid labels that carry meaning, and editorial type with room to breathe. Every screen, instrument frame and reward in the clinic is built from these pieces.</p>
          <div class="uk-row" style={{ justifyContent: 'center', marginTop: 6 }}>
            <Button variant="primary" size="lg" icon="eye" onClick={() => toast('epic', 'The clinic is open — first patient arriving.', 'sparkle')}>
              Open the clinic
            </Button>
            <Button size="lg" icon="book" onClick={() => setModal(true)}>
              Read the brief
            </Button>
          </div>
          <div class="uk-hero__facts" role="list">
            <div class="uk-fact" role="listitem"><b>3</b><span>Glass depths</span></div>
            <div class="uk-fact" role="listitem"><b>10</b><span>Vivid labels</span></div>
            <div class="uk-fact" role="listitem"><b>{ICON_NAMES.length}</b><span>Icons</span></div>
            <div class="uk-fact" role="listitem"><b>2</b><span>Languages</span></div>
          </div>
        </section>

        <div class="uk-grid">
          {/* ── Backdrop ─────────────────────────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow="01 — Backdrop" title="Six daylight moods for six rooms" icon="sparkle"
            actions={<Badge tone="good" pulse>Live</Badge>}>
            <div class="uk-row">
              {VARIANTS.map((v) => (
                <Chip key={v} selected={variant === v} onClick={() => setVariant(v)} icon={v === 'emergency' ? 'alert' : v === 'results' ? 'trophy' : v === 'exam' ? 'eye' : v === 'calm' ? 'heart' : v === 'title' ? 'star' : 'home'}
                  accent={v === 'emergency' ? 'var(--lm-vivid-red)' : v === 'calm' ? 'var(--lm-vivid-sky)' : v === 'exam' ? 'var(--lm-vivid-green)' : undefined}>
                  {v}
                </Chip>
              ))}
              <span class="uk-sep" aria-hidden="true" />
              <Tooltip content="Frosted blur behind floating bars. Switched off automatically on devices that cannot keep up.">
                <Chip icon="sparkle" selected={!lite} onClick={() => setLiteRendering(!lite)}>Frosted bars</Chip>
              </Tooltip>
            </div>
          </GlassPanel>

          {/* ── Materials ────────────────────────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow="02 — Materials" title="Liquid Glass, three depths" icon="gem">
            <div class="uk-materials">
              <div class="uk-mat lm-glass"><b>Glass</b><span>Cards, bars, chips, HUD capsules. Specular rim, soft navy shadow.</span></div>
              <div class="uk-mat uk-mat--strong"><b>Strong glass</b><span>Dense reading areas, sheets and dialogs.</span></div>
              <div class="uk-mat uk-mat--opaque"><b>Opaque white</b><span>Inputs, long text, data tables.</span></div>
              <div class="uk-mat" style={{ background: 'var(--lm-accent-gradient)', boxShadow: 'inset 0 1px 0.5px rgba(255,255,255,.45), 0 12px 28px -10px rgba(34,87,240,.6)' }}>
                <b style={{ color: '#fff' }}>Azure</b><span style={{ color: 'rgba(255,255,255,.88)' }}>The one primary action per view.</span>
              </div>
            </div>
          </GlassPanel>

          {/* ── Palette ──────────────────────────────────────────── */}
          <GlassPanel class="uk-c7" eyebrow="03 — Colour" title="Palette" icon="gem">
            <div class="uk-sub">Core · brand · ink</div>
            <div class="uk-swatches">{SWATCHES.map(([n, c, h]) => <Swatch key={n} name={n} css={c} hex={h} />)}</div>
            <div class="uk-sub">Vivid labels · navy text on top</div>
            <div class="uk-swatches">{VIVID.map(([n, c, h]) => <Swatch key={n} name={n} css={c} hex={h} />)}</div>
            <div class="uk-sub">Clinic wings · deep accents</div>
            <div class="uk-swatches">{SYSTEMS.map(([n, c, h]) => <Swatch key={n} name={n} css={c} hex={h} />)}</div>
            <div class="uk-sub">Clinical states · rarity</div>
            <div class="uk-swatches">{CLINICAL.map(([n, c, h]) => <Swatch key={n} name={n} css={c} hex={h} />)}</div>
          </GlassPanel>

          {/* ── Typography ───────────────────────────────────────── */}
          <GlassPanel class="uk-c5 uk-type" eyebrow="04 — Type" title="Typography" icon="book">
            <div class="lm-stack" style={{ '--lm-stack-gap': '14px' }}>
              <div class="lm-eyebrow">Plus Jakarta Sans · headlines</div>
              <div class="d1">Acute angle closure</div>
              <div class="d2">“The lights have rainbow halos, doctor.”</div>
              <div class="lm-eyebrow" style={{ marginTop: 8 }}>Inter · interface</div>
              <p>Intraocular pressure 52 mmHg OD with a mid-dilated, poorly reactive pupil and a shallow anterior chamber. Emergency: refer immediately.</p>
              <div class="lm-eyebrow" style={{ marginTop: 8 }}>Space Grotesk · numerals</div>
              <div class="num" role="list">
                <span class="num-g" role="listitem">20/40<small>VA OD</small></span>
                <span class="num-g" role="listitem"><i class="num-sep" aria-hidden="true">·</i>52<em> mmHg</em><small>IOP OD</small></span>
                <span class="num-g" role="listitem"><i class="num-sep" aria-hidden="true">·</i>−2.25<small>Sphere</small></span>
              </div>
            </div>
          </GlassPanel>

          {/* ── Buttons ──────────────────────────────────────────── */}
          <GlassPanel class="uk-c7" eyebrow="05 — Controls" title="Buttons" icon="target">
            <div class="uk-sub">Variants</div>
            <div class="uk-row">
              <Button variant="primary" icon="check">Confirm diagnosis</Button>
              <Button icon="chart">Open chart</Button>
              <Button variant="ghost">Skip</Button>
              <Button variant="danger" icon="alert">Refer — emergency</Button>
            </div>
            <div class="uk-sub">Sizes · states</div>
            <div class="uk-row">
              <Button variant="primary" size="sm">Small</Button>
              <Button variant="primary">Medium</Button>
              <Button variant="primary" size="lg" trailingIcon="arrow-right">Next patient</Button>
              <Button loading={busy} icon="refresh" onClick={() => { setBusy(true); setTimeout(() => setBusy(false), 1600); }}>
                {busy ? 'Saving…' : 'Press to load'}
              </Button>
              <Button disabled>Disabled</Button>
            </div>
            <div class="uk-sub">Icon buttons</div>
            <div class="uk-row">
              <IconButton icon="chevron-left" label="Back" />
              <IconButton icon="settings" label="Settings" />
              <IconButton icon="sound-on" label="Sound" pressed />
              <IconButton icon="gift" label="Daily gift" badge />
              <IconButton icon="users" label="Rivals" badge={3} />
              <IconButton icon="play" label="Play" variant="primary" size="lg" />
              <IconButton icon="close" label="Close" variant="ghost" />
            </div>
          </GlassPanel>

          {/* ── Chips, badges, tooltips ──────────────────────────── */}
          <GlassPanel class="uk-c5" eyebrow="05 — Controls" title="Chips, labels & hints" icon="sparkle">
            <div class="uk-sub">History chips</div>
            <div class="uk-row">
              {[['onset', 'Sudden onset?'], ['pain', 'Any pain?'], ['halos', 'Halos around lights?'], ['meds', 'Medications?']].map(([k, l]) => (
                <Chip key={k} size="sm" selected={!!chips[k!]} onClick={() => toggle(k!)}>{l}</Chip>
              ))}
              <Chip size="sm" icon="flame" accent="var(--lm-vivid-orange)" selected onClick={() => toast('info', 'Combo streak keeps going.')}>Combo x3</Chip>
              <Chip size="sm" onRemove={() => toast('info', 'Filter removed')}>Retina</Chip>
            </div>
            <div class="uk-sub">Vivid status labels</div>
            <div class="uk-row">
              <Badge tone="normal" icon="check">Normal</Badge>
              <Badge tone="abnormal" icon="warning">Abnormal</Badge>
              <Badge tone="critical" icon="alert">Critical</Badge>
              <Badge tone="info" pulse>In progress</Badge>
              <Badge tone="epic">Mastery</Badge>
              <Badge tone="gold" variant="solid">3 new</Badge>
              <Badge tone="critical" variant="solid" pulse>Urgent</Badge>
              <Badge color="#7c3aed" variant="outline">Resident</Badge>
            </div>
            <div class="uk-sub">Tooltips · keys</div>
            <div class="uk-row">
              <Tooltip content="Relative afferent pupillary defect: the affected pupil dilates when the light swings to it.">
                <Button size="sm" variant="ghost" icon="info">What is an RAPD?</Button>
              </Tooltip>
              <Tooltip placement="bottom" content="Costs 4 clinic minutes">
                <IconButton icon="clock" label="Time cost" size="sm" />
              </Tooltip>
              <span class="lm-muted" style={{ fontSize: 13 }}>
                Skip <Kbd>Space</Kbd> · Close <Kbd>Esc</Kbd> · Lens <Kbd>←</Kbd><Kbd>→</Kbd>
              </span>
            </div>
          </GlassPanel>

          {/* ── Tabs ─────────────────────────────────────────────── */}
          <GlassPanel class="uk-c6" eyebrow="06 — Navigation" title="Tabs" icon="chart">
            <Tabs id="uk-tabs" label="Exam sections" value={tab} onChange={setTab} items={[
              { id: 'history', label: 'History', icon: 'user' },
              { id: 'tests', label: 'Tests', icon: 'eye', badge: 4 },
              { id: 'chart', label: 'Chart', icon: 'chart' },
              { id: 'locked', label: 'Imaging', icon: 'lock', disabled: true },
            ]} />
            <TabPanel tabsId="uk-tabs" id="history" value={tab}><div class="uk-tabpanel">Ask focused questions — onset, duration, pain, associated symptoms, history, medications.</div></TabPanel>
            <TabPanel tabsId="uk-tabs" id="tests" value={tab}><div class="uk-tabpanel">Pick the tests that will change your management. Every test costs clinic minutes.</div></TabPanel>
            <TabPanel tabsId="uk-tabs" id="chart" value={tab}><div class="uk-tabpanel">Findings appear here as you uncover them, flagged normal, abnormal or critical.</div></TabPanel>
            <div style={{ height: 14 }} />
            <Tabs id="uk-tabs2" variant="underline" label="Eye" value={tab2} onChange={setTab2} items={[
              { id: 'od', label: 'Right eye (OD)' }, { id: 'os', label: 'Left eye (OS)' }, { id: 'ou', label: 'Both (OU)' },
            ]} />
          </GlassPanel>

          {/* ── Speech ───────────────────────────────────────────── */}
          <GlassPanel class="uk-c6" eyebrow="07 — Conversation" title="Speech bubble" icon="user"
            actions={<IconButton icon="refresh" size="sm" label="Replay" onClick={() => setLineKey((k) => k + 1)} />}>
            <div class="uk-patient">
              <div class="uk-portrait"><Icon name="user" size={40} /></div>
              <SpeechBubble key={lineKey} speaker="Margaret · 71 · retired librarian"
                text="It's like looking through a dirty window… worse at night, and the headlights have halos around them. My reading glasses don't help any more." />
            </div>
            <p class="lm-muted" style={{ fontSize: 12, marginTop: 12 }}>Click the bubble or press <Kbd>Enter</Kbd> to skip.</p>
          </GlassPanel>

          {/* ── Meters ───────────────────────────────────────────── */}
          <GlassPanel class="uk-c8" eyebrow="08 — Data" title="Meters & numbers" icon="stats"
            actions={<Button size="sm" icon="refresh" onClick={() => { setScore(Math.round(2000 + Math.random() * 12000)); setRatio(Math.round(Math.random() * 100) / 100); }}>Randomise</Button>}>
            <div class="lm-stack" style={{ '--lm-stack-gap': '16px' }}>
              <ProgressBar label="Resident → Associate" value={ratio * 1200} max={1200} valueText={`${Math.round(ratio * 1200)} / 1,200 XP`} shimmer />
              <ProgressBar label="Mastery · Retina" value={ratio * 0.8} valueText accent="var(--lm-career)" size="sm" />
              <ProgressBar label="Case clock" value={1 - ratio} valueText={`${Math.round((1 - ratio) * 90)}s`} accent="var(--lm-critical)" size="sm" />
            </div>
            <div class="uk-meters" style={{ marginTop: 22 }}>
              <RingMeter value={ratio} size={124} ariaLabel="Accuracy">
                <div><div class="uk-ring-val"><CountUp value={Math.round(ratio * 100)} suffix="%" /></div><div class="uk-ring-lbl">Accuracy</div></div>
              </RingMeter>
              <RingMeter value={0.3} size={124} accent="var(--lm-normal)" accent2="var(--lm-vivid-green)" ariaLabel="Cup to disc">
                <div><div class="uk-ring-val">0.3</div><div class="uk-ring-lbl">C/D ratio</div></div>
              </RingMeter>
              <RingMeter value={Math.min(1, 52 / 60)} size={124} accent="var(--lm-critical)" accent2="var(--lm-vivid-red)" ariaLabel="Intraocular pressure">
                <div><div class="uk-ring-val">52</div><div class="uk-ring-lbl">IOP mmHg</div></div>
              </RingMeter>
              <div style={{ textAlign: 'center' }}>
                <div class="uk-big"><CountUp value={score} tickSfx="tick" /></div>
                <div class="uk-ring-lbl">Shift score</div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel class="uk-c4" eyebrow="08 — Data" title="Mastery stars" icon="star"
            actions={<IconButton icon="refresh" size="sm" label="Replay" onClick={() => setReplay((r) => r + 1)} />}>
            <div class="lm-stack uk-fill" style={{ alignItems: 'center', '--lm-stack-gap': '16px' }}>
              <Stars key={`s${replay}-${stars}`} value={stars} size={52} />
              <div class="uk-row" style={{ justifyContent: 'center' }}>
                {[0, 1, 2, 3].map((n) => <Chip key={n} size="sm" selected={stars === n} onClick={() => setStars(n)}>{`${n} ★`}</Chip>)}
              </div>
              <div class="uk-skills">
                {SKILLS.map(([name, v]) => (
                  <div class="uk-skill" key={name}><span>{name}</span><Stars value={v} size={16} animate={false} /></div>
                ))}
              </div>
            </div>
          </GlassPanel>

          {/* ── Grade stamps ─────────────────────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow="09 — Rewards" title="Grade medals" icon="trophy"
            actions={<Button size="sm" variant="primary" icon="refresh" onClick={() => setReplay((r) => r + 1)}>Replay</Button>}>
            <div class="uk-stamps">
              {GRADES.map((g, i) => <GradeStamp key={`${g}-${replay}`} grade={g} size={i === 0 ? 150 : 118} delay={i * 220} shake={i === 0} />)}
            </div>
          </GlassPanel>

          {/* ── Rewards & toasts ─────────────────────────────────── */}
          <GlassPanel class="uk-c8" eyebrow="09 — Rewards" title="Rewards" icon="gift"
            actions={<IconButton icon="refresh" size="sm" label="Replay" onClick={() => setRewardsKey((k) => k + 1)} />}>
            <div class="uk-rewards" key={rewardsKey}>
              {REWARDS.map((r, i) => <RewardChip key={r.label} grant={r} index={i} />)}
            </div>
          </GlassPanel>

          <GlassPanel class="uk-c4" eyebrow="10 — Feedback" title="Toasts" icon="info">
            <div class="uk-toasts uk-fill">
              <Button block icon="info" onClick={() => toast('info', 'Patient 3 of 5 is in the waiting room.')}>Info</Button>
              <Button block icon="check" onClick={() => toast('good', 'Correct — angle closure caught in time.')}>Good</Button>
              <Button block icon="warning" onClick={() => toast('bad', 'Missed: no pressure check on a red, painful eye.')}>Bad</Button>
              <Button block variant="primary" icon="sparkle" onClick={() => toast('epic', 'Legendary iris card unlocked!', 'gem')}>Epic</Button>
            </div>
          </GlassPanel>

          {/* ── Status board (Monday-style) ──────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow="10 — Feedback" title="Colour is meaning" icon="stats">
            <div class="uk-board" role="table" aria-label="Status board">
              <div class="uk-board__row" role="row"><span role="columnheader">Patient</span><span role="columnheader">Status</span><span role="columnheader">Priority</span></div>
              {([
                ['Margaret, 71', 'Done', 'var(--lm-vivid-green)', 'Routine', 'var(--lm-vivid-sky)'],
                ['Daniel, 34', 'In progress', 'var(--lm-vivid-blue)', 'Soon', 'var(--lm-vivid-orange)'],
                ['Noa, 8', 'Waiting', 'var(--lm-vivid-yellow)', 'Routine', 'var(--lm-vivid-sky)'],
                ['Ruth, 58', 'Refer today', 'var(--lm-vivid-red)', 'Urgent', 'var(--lm-vivid-red)'],
              ] as const).map(([who, st, sc, pr, pc]) => (
                <div class="uk-board__row" role="row" key={who}>
                  <span role="cell">{who}</span>
                  <span role="cell"><span class="lm-label" style={{ '--label': sc }}>{st}</span></span>
                  <span role="cell"><span class="lm-label" style={{ '--label': pc }}>{pr}</span></span>
                </div>
              ))}
            </div>
          </GlassPanel>

          {/* ── Scroll area · Modal ──────────────────────────────── */}
          <GlassPanel class="uk-c6" eyebrow="11 — Layout" title="Scroll area · the chart" icon="chart">
            <ScrollArea maxHeight={260} ariaLabel="Findings">
              <div class="uk-findings">
                {FINDINGS.map(([k, v, f]) => (
                  <div class="uk-finding" key={k}>
                    <span class="k">{k}</span>
                    <span class="v">{v}</span>
                    <Badge tone={f} size="sm" icon={FLAG_ICON[f]}>{f}</Badge>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </GlassPanel>

          <div class="uk-c6 uk-col">
            <Card accent="var(--lm-lounge)" glow eyebrow="11 — Layout" title="Cards & dialogs" icon="heart"
              onClick={() => setModal(true)}>
              <p class="lm-muted">Interactive cards lift on hover and work with <Kbd>Enter</Kbd> or <Kbd>Space</Kbd>. This one opens a dialog with a focus trap, <Kbd>Esc</Kbd> to close, and a springy glass-sheet entrance.</p>
              <Divider label="Lounge" />
              <div class="uk-row"><Badge tone="info">Daily gift ready</Badge><Badge tone="gold" variant="outline" icon="clock">Earned while away</Badge></div>
            </Card>
            <GlassPanel accent="var(--lm-code-red)" strong padding="md">
              <div class="uk-alert">
                <span style={{ color: 'var(--lm-critical)' }}><Icon name="alert" size={28} /></span>
                <div class="lm-stack" style={{ '--lm-stack-gap': '8px' }}>
                  <div class="lm-row"><span class="lm-eyebrow" style={{ color: 'var(--lm-critical)' }}>Code Red · accent panel</span><Badge tone="critical" variant="solid" size="sm" pulse>Same day</Badge></div>
                  <p>New flashes and floaters with a shadow creeping in from one side: suspect a retinal detachment and arrange a dilated fundus exam today.</p>
                </div>
              </div>
            </GlassPanel>
          </div>

          {/* ── Icons ────────────────────────────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow={`12 — Icons · ${ICON_NAMES.length}`} title="Instruments & interface" icon="eye">
            <div class="uk-sub">Clinical tests</div>
            <div class="uk-icons uk-icons--tests">
              {ALL_TESTS.map((t) => (
                <div class="uk-icon" key={t} title={t}>
                  <i class="uk-icon__well" aria-hidden="true"><Icon name={t as IconName} /></i>
                  <span>{TEST_CATALOG[t].name}</span>
                  <small>{t}</small>
                </div>
              ))}
            </div>
            <div class="uk-sub">Interface</div>
            <div class="uk-icons">
              {ICON_NAMES.filter((n) => !TEST_ICONS.has(n)).map((n) => (
                <div class="uk-icon" key={n} title={n}>
                  <Icon name={n} />
                  <span>{n}</span>
                </div>
              ))}
            </div>
          </GlassPanel>
        </div>

        <footer class="uk-footer">
          <Ornament />
          <span>Import everything from <code>@ui-kit</code>. Tokens are CSS custom properties prefixed <code>--lm-</code>.</span>
        </footer>
      </div>

      <Modal open={modal} onClose={() => setModal(false)} eyebrow="Lumen" title="A bright day at the clinic" icon="book"
        footer={<><Button variant="ghost" onClick={() => setModal(false)}>Later</Button><Button variant="primary" icon="check" onClick={() => { setModal(false); toast('good', 'Welcome aboard, Doctor.'); }}>Begin shift</Button></>}>
        <p>You are the newest optometrist at Lumen, a bright, modern eye clinic. Patients walk in with blurry vision, red eyes, halos and curtains.</p>
        <Divider />
        <p>Take a focused history, run the right tests, and make the call: what is it, and how urgently must they be seen?</p>
      </Modal>
    </Screen>
  );
}

const page: SandboxPage = { id: 'ui-kit', title: 'Lumen design system', component: UiKitShowcase };
export default page;
