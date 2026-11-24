import { useState } from 'preact/hooks';
import type { GameServices, Grade, RewardGrant } from '@core';
import { ALL_TESTS, TEST_CATALOG } from '@core';
import {
  BACKDROP_VARIANTS, Badge, Button, Card, Chip, CountUp, Divider, GlassPanel, GradeStamp, ICON_NAMES, Icon, IconButton,
  Kbd, Modal, Ornament, ProgressBar, RewardChip, RingMeter, Screen, ScrollArea, SpeechBubble, Stars, TabPanel, Tabs,
  ToastHost, Tooltip, type BackdropVariant, type IconName,
} from '@ui-kit';
import type { SandboxPage } from '../Sandbox';

/* Page-local layout only — every visual comes from the design system. */
const CSS = `
.uk { max-width: 1240px; margin: 0 auto; display: grid; gap: 22px; }
.uk-hero { text-align: center; padding: 36px 8px 8px; display: grid; justify-items: center; gap: 14px; }
.uk-hero h2 { font-size: var(--lm-fs-5xl); font-weight: 480; letter-spacing: -0.02em; line-height: 1; }
.uk-hero p { max-width: 620px; color: var(--lm-text-muted); font-size: var(--lm-fs-lg); }
.uk-grid { display: grid; gap: 22px; grid-template-columns: repeat(12, minmax(0, 1fr)); align-items: start; }
.uk-c12 { grid-column: span 12; } .uk-c8 { grid-column: span 8; } .uk-c7 { grid-column: span 7; } .uk-c6 { grid-column: span 6; }
.uk-c5 { grid-column: span 5; } .uk-c4 { grid-column: span 4; }
@media (max-width: 980px) { .uk-c8, .uk-c7, .uk-c6, .uk-c5, .uk-c4 { grid-column: span 12; } }
.uk-sub { font: 600 var(--lm-fs-2xs)/1 var(--lm-font-ui); letter-spacing: .12em; text-transform: uppercase; color: var(--lm-muted-2); margin: 18px 0 10px; }
.uk-sub:first-child { margin-top: 0; }
.uk-swatches { display: grid; grid-template-columns: repeat(auto-fill, minmax(84px, 1fr)); gap: 10px; }
.uk-sw { border-radius: 14px; overflow: hidden; box-shadow: inset 0 0 0 1px var(--lm-glass-border); background: rgba(6,3,14,.35); }
.uk-sw i { display: block; height: 52px; box-shadow: inset 0 -1px 0 rgba(255,255,255,.06); }
.uk-sw div { padding: 7px 9px 8px; font-size: 11.5px; line-height: 1.3; }
.uk-sw b { display: block; font-weight: 600; color: var(--lm-ivory); }
.uk-sw span { font-family: var(--lm-font-num); color: var(--lm-muted); font-size: 10.5px; }
.uk-type .d1 { font-family: var(--lm-font-display); font-size: var(--lm-fs-4xl); line-height: 1.05; font-weight: 500; }
.uk-type .d2 { font-family: var(--lm-font-display); font-size: var(--lm-fs-2xl); font-style: italic; font-weight: 380; color: var(--lm-ivory-dim); }
.uk-type .num { font-family: var(--lm-font-num); font-size: var(--lm-fs-3xl); font-weight: 700; letter-spacing: .01em; }
.uk-type p { color: var(--lm-text-muted); max-width: 56ch; }
.uk-row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
.uk-meters { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 18px; align-items: center; justify-items: center; }
.uk-ring-val { font-family: var(--lm-font-num); font-size: 24px; font-weight: 700; color: var(--lm-ivory); }
.uk-ring-lbl { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: var(--lm-muted); margin-top: 3px; }
.uk-big { font-size: 46px; font-weight: 700; color: var(--lm-gold); text-shadow: var(--lm-text-glow); }
.uk-stamps { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; justify-items: center; align-items: center; padding: 26px 0 30px; }
@media (max-width: 760px) { .uk-stamps { grid-template-columns: repeat(3, minmax(0, 1fr)); row-gap: 26px; padding: 18px 8px 6px; } }
.uk-rewards { display: grid; grid-template-columns: repeat(auto-fill, minmax(250px, 1fr)); gap: 12px; }
.uk-patient { display: grid; grid-template-columns: 84px 1fr; gap: 18px; align-items: start; }
.uk-portrait { width: 84px; height: 84px; border-radius: 50%; display: grid; place-items: center; color: var(--lm-gold);
  background: radial-gradient(circle at 50% 30%, rgba(255,210,122,.25), rgba(60,36,100,.6) 70%); box-shadow: inset 0 0 0 1px var(--lm-glass-border-hi), 0 0 30px -6px rgba(255,210,122,.5); }
.uk-findings { display: grid; gap: 8px; }
.uk-finding { display: flex; gap: 10px; align-items: center; padding: 10px 12px; border-radius: 12px; background: rgba(6,3,14,.35); box-shadow: inset 0 0 0 1px var(--lm-hairline); font-size: var(--lm-fs-sm); }
.uk-finding .k { color: var(--lm-muted); min-width: 92px; font-size: 12px; }
.uk-finding .v { flex: 1; color: var(--lm-ivory); font-family: var(--lm-font-num); }
.uk-icons { display: grid; grid-template-columns: repeat(auto-fill, minmax(104px, 1fr)); gap: 8px; }
.uk-icon { display: grid; justify-items: center; gap: 8px; padding: 16px 6px 12px; border-radius: 14px; color: var(--lm-ivory-dim);
  background: rgba(6,3,14,.28); box-shadow: inset 0 0 0 1px var(--lm-hairline); transition: all var(--lm-dur-ui) var(--lm-ease-out); }
.uk-icon:hover { color: var(--lm-gold); background: rgba(255,210,122,.07); box-shadow: inset 0 0 0 1px rgba(255,210,122,.35), 0 0 22px -8px rgba(255,210,122,.6); transform: translateY(-2px); }
.uk-icon svg { width: 28px; height: 28px; }
.uk-icon span { font-size: 10.5px; color: var(--lm-muted); text-align: center; line-height: 1.25; }
.uk-icon small { font-size: 9.5px; color: var(--lm-muted-2); margin-top: -6px; }
.uk-tabpanel { padding-top: 16px; color: var(--lm-text-muted); font-size: var(--lm-fs-sm); min-height: 64px; }
.uk-footer { text-align: center; padding: 18px 0 8px; color: var(--lm-muted-2); font-size: 12px; display: grid; justify-items: center; gap: 10px; }
`;

const SWATCHES: [string, string, string][] = [
  ['Ink', 'var(--lm-ink-900)', '#0b0716'],
  ['Aubergine', 'var(--lm-aubergine-700)', '#1a0f2e'],
  ['Plum', 'var(--lm-plum-500)', '#2f1d52'],
  ['Candle gold', 'var(--lm-gold)', '#ffd27a'],
  ['Deep gold', 'var(--lm-gold-500)', '#f5b942'],
  ['Ivory', 'var(--lm-ivory)', '#f6efe4'],
  ['Muted', 'var(--lm-muted)', '#a99bbd'],
];
const SYSTEMS: [string, string, string][] = [
  ['Career', 'var(--lm-career)', '#a78bfa'],
  ['Boutique', 'var(--lm-economy)', '#f5b942'],
  ['Rivals', 'var(--lm-rivals)', '#4ade80'],
  ['Streaks', 'var(--lm-streaks)', '#fb923c'],
  ['Gallery', 'var(--lm-gallery)', '#f472b6'],
  ['Code Red', 'var(--lm-code-red)', '#ef4444'],
  ['Lounge', 'var(--lm-lounge)', '#38bdf8'],
];
const CLINICAL: [string, string, string][] = [
  ['Normal', 'var(--lm-normal)', '#5eead4'],
  ['Abnormal', 'var(--lm-abnormal)', '#fbbf24'],
  ['Critical', 'var(--lm-critical)', '#f43f5e'],
  ['Common', 'var(--lm-rarity-common)', '#cbd5e1'],
  ['Rare', 'var(--lm-rarity-rare)', '#38bdf8'],
  ['Epic', 'var(--lm-rarity-epic)', '#c084fc'],
  ['Legendary', 'var(--lm-iridescent)', 'iridescent'],
];

const REWARDS: RewardGrant[] = [
  { source: 'core', label: 'Lumens earned', value: '+120', icon: 'coin', rarity: 'common' },
  { source: 'core', label: 'Career XP', value: '+340', icon: 'star', color: '#a78bfa', rarity: 'common' },
  { source: 'core', label: 'Supply crate', value: 'Rare', icon: 'crate', rarity: 'rare' },
  { source: 'core', label: 'Combo streak', value: 'x4', icon: 'flame', color: '#fb923c', rarity: 'rare' },
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
          <div class="lm-eyebrow">Observatory at midnight</div>
          <h2 class="lm-display lm-gold-text">Lumen</h2>
          <Ornament width={180} />
          <p>Glass, candlelight and brass instruments. Every scene, instrument and reward in the clinic is built from these pieces.</p>
          <div class="uk-row" style={{ justifyContent: 'center', marginTop: 6 }}>
            <Button variant="primary" size="lg" icon="eye" onClick={() => toast('epic', 'The clinic is open — first patient arriving.', 'sparkle')}>
              Open the clinic
            </Button>
            <Button size="lg" icon="book" onClick={() => setModal(true)}>
              Read the brief
            </Button>
          </div>
        </section>

        <div class="uk-grid">
          {/* ── Backdrop ─────────────────────────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow="Scene backdrop" title="Six moods for six rooms" icon="sparkle"
            actions={<Badge tone="good" pulse>Live</Badge>}>
            <div class="uk-row">
              {VARIANTS.map((v) => (
                <Chip key={v} selected={variant === v} onClick={() => setVariant(v)} icon={v === 'emergency' ? 'alert' : v === 'results' ? 'trophy' : v === 'exam' ? 'eye' : v === 'calm' ? 'heart' : v === 'title' ? 'star' : 'home'}
                  accent={v === 'emergency' ? '#ef4444' : v === 'calm' ? '#38bdf8' : v === 'exam' ? '#5eead4' : undefined}>
                  {v}
                </Chip>
              ))}
            </div>
          </GlassPanel>

          {/* ── Palette ──────────────────────────────────────────── */}
          <GlassPanel class="uk-c7" eyebrow="Tokens" title="Palette" icon="gem">
            <div class="uk-sub">Night &amp; candlelight</div>
            <div class="uk-swatches">{SWATCHES.map(([n, c, h]) => <Swatch key={n} name={n} css={c} hex={h} />)}</div>
            <div class="uk-sub">Clinic wings</div>
            <div class="uk-swatches">{SYSTEMS.map(([n, c, h]) => <Swatch key={n} name={n} css={c} hex={h} />)}</div>
            <div class="uk-sub">Clinical states · rarity</div>
            <div class="uk-swatches">{CLINICAL.map(([n, c, h]) => <Swatch key={n} name={n} css={c} hex={h} />)}</div>
          </GlassPanel>

          {/* ── Typography ───────────────────────────────────────── */}
          <GlassPanel class="uk-c5 uk-type" eyebrow="Tokens" title="Typography" icon="book">
            <div class="lm-stack" style={{ '--lm-stack-gap': '14px' }}>
              <div class="lm-eyebrow">Fraunces · display</div>
              <div class="d1">Acute angle closure</div>
              <div class="d2">“The lights have rainbow halos, doctor.”</div>
              <div class="lm-eyebrow" style={{ marginTop: 8 }}>Inter · interface</div>
              <p>Intraocular pressure 52 mmHg OD with a mid-dilated, poorly reactive pupil and a shallow anterior chamber. Same-day referral.</p>
              <div class="lm-eyebrow" style={{ marginTop: 8 }}>Space Grotesk · readouts</div>
              <div class="num">
                20/40 <span class="lm-muted">·</span> 52<span style={{ fontSize: '.5em' }}> mmHg</span> <span class="lm-muted">·</span> −2.25
              </div>
            </div>
          </GlassPanel>

          {/* ── Buttons ──────────────────────────────────────────── */}
          <GlassPanel class="uk-c7" eyebrow="Components" title="Buttons" icon="target">
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
          <GlassPanel class="uk-c5" eyebrow="Components" title="Chips, badges & hints" icon="sparkle">
            <div class="uk-sub">History chips</div>
            <div class="uk-row">
              {[['onset', 'Sudden onset?'], ['pain', 'Any pain?'], ['halos', 'Halos around lights?'], ['meds', 'Medications?']].map(([k, l]) => (
                <Chip key={k} size="sm" selected={!!chips[k!]} onClick={() => toggle(k!)}>{l}</Chip>
              ))}
              <Chip size="sm" icon="flame" accent="#fb923c">Combo x3</Chip>
              <Chip size="sm" onRemove={() => toast('info', 'Filter removed')}>Retina</Chip>
            </div>
            <div class="uk-sub">Badges</div>
            <div class="uk-row">
              <Badge tone="normal" icon="check">Normal</Badge>
              <Badge tone="abnormal" icon="warning">Abnormal</Badge>
              <Badge tone="critical" variant="solid" pulse>Critical</Badge>
              <Badge tone="gold" variant="solid">3 new</Badge>
              <Badge color="#a78bfa" variant="outline">Resident</Badge>
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
          <GlassPanel class="uk-c6" eyebrow="Components" title="Tabs" icon="chart">
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
            <Tabs id="uk-tabs2" variant="underline" label="Eye" value={tab2} onChange={setTab2} accent="#5eead4" items={[
              { id: 'od', label: 'Right eye (OD)' }, { id: 'os', label: 'Left eye (OS)' }, { id: 'ou', label: 'Both (OU)' },
            ]} />
          </GlassPanel>

          {/* ── Speech ───────────────────────────────────────────── */}
          <GlassPanel class="uk-c6" eyebrow="Components" title="Speech bubble" icon="user"
            actions={<IconButton icon="refresh" size="sm" label="Replay" onClick={() => setLineKey((k) => k + 1)} />}>
            <div class="uk-patient">
              <div class="uk-portrait"><Icon name="user" size={40} /></div>
              <SpeechBubble key={lineKey} speaker="Margaret · 71 · retired librarian"
                text="It's like looking through a dirty window… worse at night, and the headlights have halos around them. My reading glasses don't help any more." />
            </div>
            <p class="lm-muted" style={{ fontSize: 12, marginTop: 12 }}>Click the bubble or press <Kbd>Enter</Kbd> to skip.</p>
          </GlassPanel>

          {/* ── Meters ───────────────────────────────────────────── */}
          <GlassPanel class="uk-c8" eyebrow="Components" title="Meters & numbers" icon="stats"
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
              <RingMeter value={0.3} size={124} accent="#5eead4" accent2="#d1fff6" ariaLabel="Cup to disc">
                <div><div class="uk-ring-val">0.3</div><div class="uk-ring-lbl">C/D ratio</div></div>
              </RingMeter>
              <RingMeter value={Math.min(1, 52 / 60)} size={124} accent="#f43f5e" accent2="#ffc2cd" ariaLabel="Intraocular pressure">
                <div><div class="uk-ring-val">52</div><div class="uk-ring-lbl">IOP mmHg</div></div>
              </RingMeter>
              <div style={{ textAlign: 'center' }}>
                <div class="uk-big"><CountUp value={score} tickSfx="tick" /></div>
                <div class="uk-ring-lbl">Shift score</div>
              </div>
            </div>
          </GlassPanel>

          <GlassPanel class="uk-c4" eyebrow="Components" title="Mastery stars" icon="star"
            actions={<IconButton icon="refresh" size="sm" label="Replay" onClick={() => setReplay((r) => r + 1)} />}>
            <div class="lm-stack" style={{ alignItems: 'center', '--lm-stack-gap': '18px', paddingTop: 8 }}>
              <Stars key={`s${replay}-${stars}`} value={stars} size={52} />
              <div class="uk-row" style={{ justifyContent: 'center' }}>
                {[0, 1, 2, 3].map((n) => <Chip key={n} size="sm" selected={stars === n} onClick={() => setStars(n)}>{`${n} ★`}</Chip>)}
              </div>
              <Stars value={2} size={20} animate={false} />
            </div>
          </GlassPanel>

          {/* ── Grade stamps ─────────────────────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow="Components" title="Grade stamps" icon="trophy" glow
            actions={<Button size="sm" variant="primary" icon="refresh" onClick={() => setReplay((r) => r + 1)}>Slam again</Button>}>
            <div class="uk-stamps">
              {GRADES.map((g, i) => <GradeStamp key={`${g}-${replay}`} grade={g} size={i === 0 ? 150 : 118} delay={i * 220} shake={i === 0} />)}
            </div>
          </GlassPanel>

          {/* ── Rewards & toasts ─────────────────────────────────── */}
          <GlassPanel class="uk-c8" eyebrow="Components" title="Rewards" icon="gift"
            actions={<IconButton icon="refresh" size="sm" label="Replay" onClick={() => setRewardsKey((k) => k + 1)} />}>
            <div class="uk-rewards" key={rewardsKey}>
              {REWARDS.map((r, i) => <RewardChip key={r.label} grant={r} index={i} />)}
            </div>
          </GlassPanel>

          <GlassPanel class="uk-c4" eyebrow="Components" title="Toasts" icon="info">
            <div class="lm-stack">
              <Button block icon="info" onClick={() => toast('info', 'Patient 3 of 5 is in the waiting room.')}>Info</Button>
              <Button block icon="check" onClick={() => toast('good', 'Correct — angle closure caught in time.')}>Good</Button>
              <Button block icon="warning" onClick={() => toast('bad', 'Missed: no pressure check on a red, painful eye.')}>Bad</Button>
              <Button block variant="primary" icon="sparkle" onClick={() => toast('epic', 'Legendary iris card unlocked!', 'gem')}>Epic</Button>
            </div>
          </GlassPanel>

          {/* ── Scroll area · Modal ──────────────────────────────── */}
          <GlassPanel class="uk-c6" eyebrow="Components" title="Scroll area · the chart" icon="chart">
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

          <Card class="uk-c6" accent="var(--lm-lounge)" glow eyebrow="Components" title="Cards & dialogs" icon="heart"
            onClick={() => setModal(true)}>
            <p class="lm-muted">Interactive cards lift and glow on hover. This one opens a dialog with a focus trap, <Kbd>Esc</Kbd> to close, and a scale-and-blur entrance.</p>
            <Divider label="Lounge" />
            <div class="uk-row"><Badge tone="info">Daily gift ready</Badge><Badge tone="gold" variant="outline" icon="clock">Earned while away</Badge></div>
          </Card>

          {/* ── Icons ────────────────────────────────────────────── */}
          <GlassPanel class="uk-c12" eyebrow={`Icons · ${ICON_NAMES.length}`} title="Instruments & interface" icon="eye">
            <div class="uk-sub">Clinical tests</div>
            <div class="uk-icons">
              {ALL_TESTS.map((t) => (
                <div class="uk-icon" key={t} title={t}>
                  <Icon name={t as IconName} />
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

      <Modal open={modal} onClose={() => setModal(false)} eyebrow="Lumen" title="The clinic after hours" icon="book"
        footer={<><Button variant="ghost" onClick={() => setModal(false)}>Later</Button><Button variant="primary" icon="check" onClick={() => { setModal(false); toast('good', 'Welcome aboard, Doctor.'); }}>Begin shift</Button></>}>
        <p>You are the newest optometrist at Lumen, a glass observatory turned eye clinic. Patients drift in from the rain with blurry vision, red eyes, halos and curtains.</p>
        <Divider />
        <p>Take a focused history, run the right tests, and make the call: what is it, and how urgently must they be seen?</p>
      </Modal>
    </Screen>
  );
}

const page: SandboxPage = { id: 'ui-kit', title: 'Lumen design system', component: UiKitShowcase };
export default page;
