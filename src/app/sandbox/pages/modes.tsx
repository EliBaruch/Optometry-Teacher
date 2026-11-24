import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { ClinicalCase, GameServices, ModeModule, RunSnapshot } from '@core';
import { useRegistry } from '@ui-kit';
import { isLumenLearning, type CardView } from '@learning';
import type { SandboxPage } from '../Sandbox';

/**
 * Diagnostics for game modes & spaced repetition:
 *   ?sandbox=page/modes
 * Lists every mode with its lock state, simulates a run (which cases each mode
 * would serve) against the registered cases, and shows the learning state.
 * The sandbox page loader skips mode discovery, so this page loads modes itself.
 */

type ModeNamespace = { default: ModeModule } & Record<string, unknown>;
const MODE_LOADERS = import.meta.glob<ModeNamespace>('../../../modes/*/index.ts');
const ENDLESS_PREVIEW = 10;
const RESET_TIMEOUT_MS = 6000;

type Outcome = 'all' | 'mixed';
type ComboFn = (combo: number) => number;
interface SimStep { kase: ClinicalCase; ok: boolean; mult?: number }
interface SimResult { steps: SimStep[]; end: string; error?: string }

const isEmergency = (c: ClinicalCase) => !!c.emergency || c.urgency === 'emergency';

function simulate(services: GameServices, mode: ModeModule, seed: string, outcome: Outcome, combo?: ComboFn): SimResult {
  const len = mode.rules.length;
  const max = len === 'endless' ? ENDLESS_PREVIEW : len;
  let snap: RunSnapshot = {
    modeId: mode.id, completed: [], failed: [], totalScore: 0, lives: mode.rules.lives ?? null, combo: 0, seed,
  };
  const steps: SimStep[] = [];
  try {
    for (let i = 0; i < max; i++) {
      if (snap.lives !== null && snap.lives <= 0) return { steps, end: 'out of lives' };
      const kase = mode.pickNext(services, snap);
      if (!kase) return { steps, end: steps.length ? 'pool exhausted' : 'no cases' };
      const ok = outcome === 'all' || i % 3 !== 2;
      steps.push({ kase, ok, mult: combo?.(snap.combo) });
      snap = {
        ...snap,
        completed: ok ? [...snap.completed, kase.id] : snap.completed,
        failed: ok ? snap.failed : [...snap.failed, kase.id],
        lives: snap.lives === null ? null : ok ? snap.lives : snap.lives - 1,
        combo: ok ? snap.combo + 1 : 0,
      };
    }
    return { steps, end: len === 'endless' ? `preview capped at ${ENDLESS_PREVIEW}` : 'run complete' };
  } catch (err) {
    return { steps, end: 'error', error: String(err) };
  }
}

/** Loads every mode folder; also collects an optional exported `*ComboMultiplier` per mode. */
function useModes(services: GameServices) {
  const list = useRegistry(services.registries.modes);
  const [failed, setFailed] = useState<string[]>([]);
  const [combos, setCombos] = useState<Record<string, ComboFn>>({});
  useEffect(() => {
    let alive = true;
    const entries = Object.entries(MODE_LOADERS);
    void Promise.allSettled(entries.map(([, load]) => load())).then((res) => {
      if (!alive) return;
      const bad: string[] = [];
      const fns: Record<string, ComboFn> = {};
      res.forEach((r, i) => {
        const name = entries[i]![0].replace(/^.*modes\/(.*)\/index\.ts$/, '$1');
        if (r.status === 'rejected' || !r.value.default) {
          bad.push(name);
          return;
        }
        const m = r.value.default;
        const fn = Object.entries(r.value).find(([k, v]) => /ComboMultiplier$/.test(k) && typeof v === 'function')?.[1];
        if (fn) fns[m.id] = fn as ComboFn;
        if (!services.registries.modes.has(m.id)) services.registries.modes.register(m);
      });
      setFailed(bad);
      setCombos(fns);
    });
    return () => { alive = false; };
  }, [services]);
  const modes = useMemo(() => [...list].sort((a, b) => a.order - b.order), [list]);
  return { modes, failed, combos };
}

function useLearningTick(services: GameServices) {
  const [tick, setTick] = useState(0);
  useEffect(() => {
    const bump = () => setTick((n) => n + 1);
    const offs = [services.bus.on('learning:reviewed', bump), services.bus.on('case:completed', bump)];
    const l = services.learning;
    if (isLumenLearning(l)) offs.push(l.state.subscribe(bump));
    return () => offs.forEach((o) => o());
  }, [services]);
  return tick;
}

const rel = (ms: number) => {
  const a = Math.abs(ms);
  const s = a < 60_000 ? `${Math.round(a / 1000)}s` : a < 3_600_000 ? `${Math.round(a / 60_000)}m`
    : a < 86_400_000 ? `${Math.round(a / 3_600_000)}h` : `${Math.round(a / 86_400_000)}d`;
  return ms >= 0 ? `in ${s}` : `${s} ago`;
};

function ruleChips(m: ModeModule, combo?: ComboFn): string[] {
  const r = m.rules;
  const out = [r.length === 'endless' ? '∞ patients' : `${r.length} patients`];
  if (r.lives) out.push(`${r.lives} lives`);
  if (r.timeLimitSec) out.push(`${r.timeLimitSec}s clock*`);
  if (r.scoreMultiplier && r.scoreMultiplier !== 1) out.push(`×${r.scoreMultiplier} score`);
  if (combo) out.push(`streak ×${combo(0).toFixed(1)} → ×${combo(99).toFixed(1)}`);
  out.push(r.hints ? 'hints' : 'no hints');
  out.push(r.autoRun ? 'tech assist' : 'hands-on');
  return out;
}

/** Tiny difficulty curve: how the run ramps, patient by patient. */
function Curve(props: { steps: SimStep[] }) {
  const { steps } = props;
  if (steps.length < 2) return null;
  const w = 100, h = 28, pad = 3;
  const x = (i: number) => pad + (i * (w - 2 * pad)) / (steps.length - 1);
  const y = (d: number) => h - pad - ((d - 1) * (h - 2 * pad)) / 4;
  const pts = steps.map((s, i) => `${x(i).toFixed(1)},${y(s.kase.difficulty).toFixed(1)}`);
  return (
    <svg class="mdx-curve" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden="true">
      <polygon class="mdx-curve__fill" points={`${x(0)},${h} ${pts.join(' ')} ${x(steps.length - 1)},${h}`} />
      <polyline class="mdx-curve__line" points={pts.join(' ')} vector-effect="non-scaling-stroke" />
    </svg>
  );
}

function Pips(props: { d: number }) {
  return (
    <span class="mdx-pips" role="img" aria-label={`difficulty ${props.d} of 5`}>
      {[1, 2, 3, 4, 5].map((n) => <i key={n} class={n <= props.d ? 'on' : ''} />)}
    </span>
  );
}

function ModeCard(props: { services: GameServices; mode: ModeModule; sim: SimResult; index: number; combo?: ComboFn }) {
  const { mode, sim, services, combo } = props;
  let reason: string | undefined;
  let lockErr: string | undefined;
  try { reason = mode.locked?.(services); } catch (e) { lockErr = String(e); }
  const locked = !!(reason || lockErr);
  const dxName = (id: string) => services.registries.diagnoses.get(id)?.name ?? id;
  const emergencies = sim.steps.filter((s) => isEmergency(s.kase)).length;
  const avg = sim.steps.length ? sim.steps.reduce((t, s) => t + s.kase.difficulty, 0) / sim.steps.length : 0;
  return (
    <article class={`mdx-card${locked ? ' is-locked' : ''}${mode.rules.length === 'endless' ? ' is-wide' : ''}`} style={{ '--accent': mode.accent, '--i': props.index } as never} data-mode={mode.id}>
      <header class="mdx-card__head">
        <span class="mdx-card__icon" aria-hidden="true">{mode.icon}</span>
        <div class="mdx-card__titles">
          <h3 class="mdx-card__title">{mode.title}</h3>
          <p class="mdx-card__tag">{mode.tagline}</p>
        </div>
        <span class={`mdx-lock ${locked ? 'is-locked' : 'is-open'}`}>
          <span aria-hidden="true">{locked ? '◆ ' : '● '}</span>{locked ? 'Locked' : 'Open'}
        </span>
      </header>
      {locked && <p class="mdx-reason">{lockErr ? `locked() threw: ${lockErr}` : reason}</p>}
      <ul class="mdx-chips" aria-label="Rules">{ruleChips(mode, combo).map((c) => <li key={c}>{c}</li>)}</ul>
      <Curve steps={sim.steps} />
      <ol class="mdx-sim" aria-label={`Simulated ${mode.title} run`}>
        {sim.steps.map((s, i) => (
          <li key={`${s.kase.id}-${i}`} class={s.ok ? 'ok' : 'miss'} style={{ '--j': i } as never}>
            <span class="mdx-sim__n">{i + 1}</span>
            <span class="mdx-sim__who">
              <span class="mdx-sim__dx">{dxName(s.kase.diagnosis)}</span>
              <code class="mdx-sim__id">{s.kase.id}</code>
            </span>
            <span class="mdx-sim__tags">
              {isEmergency(s.kase) ? <span class="mdx-urg is-emergency">emergency</span>
                : s.kase.urgency === 'urgent' ? <span class="mdx-urg is-urgent">urgent</span> : null}
              {s.mult !== undefined && <span class="mdx-mult num">×{s.mult.toFixed(1)}</span>}
              {!s.ok && <span class="mdx-urg is-miss">missed</span>}
            </span>
            <Pips d={s.kase.difficulty} />
          </li>
        ))}
        {!sim.steps.length && <li class="mdx-empty">{sim.end === 'no cases' ? 'No eligible cases registered yet.' : sim.end}</li>}
      </ol>
      <footer class="mdx-card__foot">
        <span><span class="num">{sim.steps.length}</span> served · {sim.end}</span>
        {sim.steps.length > 0 && (
          <span>
            avg difficulty <span class="num">{avg.toFixed(1)}</span>
            {emergencies > 0 && <> · <span class="num">{emergencies}</span> emergenc{emergencies === 1 ? 'y' : 'ies'}</>}
          </span>
        )}
        {sim.error && <span class="mdx-err">{sim.error}</span>}
      </footer>
    </article>
  );
}

/** Two-step, in-page confirmation (no browser chrome). Escape or a timeout backs out. */
function ResetButton(props: { onConfirm: () => void; onArm: () => void }) {
  const [armed, setArmed] = useState(false);
  const cancelRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!armed) return;
    cancelRef.current?.focus();
    const t = setTimeout(() => setArmed(false), RESET_TIMEOUT_MS);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setArmed(false); };
    window.addEventListener('keydown', onKey);
    return () => { clearTimeout(t); window.removeEventListener('keydown', onKey); };
  }, [armed]);
  if (!armed) {
    return <button type="button" class="mdx-reset" onClick={() => { setArmed(true); props.onArm(); }}>Reset learning state…</button>;
  }
  return (
    <div class="mdx-confirm" role="alertdialog" aria-labelledby="mdx-confirm-q">
      <span id="mdx-confirm-q">Erase all spaced-repetition progress on this device?</span>
      <button type="button" ref={cancelRef} onClick={() => setArmed(false)}>Keep it</button>
      <button type="button" class="mdx-danger" onClick={() => { setArmed(false); props.onConfirm(); }}>Yes, erase</button>
    </div>
  );
}

function LearningPanel(props: { services: GameServices }) {
  const { services } = props;
  useLearningTick(services);
  const learning = services.learning;
  const lumen = isLumenLearning(learning) ? learning : null;
  const stats = learning.stats();
  const cards: CardView[] = lumen ? lumen.cards() : [];
  const dx = useRegistry(services.registries.diagnoses);
  const cases = useRegistry(services.registries.cases);
  const options = useMemo(
    () => [...new Set([...dx.map((d) => d.id), ...cases.map((c) => c.diagnosis)])].sort(),
    [dx, cases],
  );
  const [target, setTarget] = useState('');
  const now = services.clock.now();
  const name = (id: string) => services.registries.diagnoses.get(id)?.name ?? id;
  const rec = (q: number) => {
    const id = target.trim();
    if (!id) return;
    learning.record(id, q);
    services.bus.emit('learning:reviewed', { diagnosisId: id, quality: q });
    services.audio.play(q >= 3 ? 'success' : 'fail');
  };

  return (
    <section class="mdx-panel" aria-labelledby="mdx-learning">
      <div class="mdx-panel__head">
        <div>
          <p class="mdx-eyebrow">Spaced repetition</p>
          <h2 id="mdx-learning">Learning state</h2>
        </div>
        <dl class="mdx-stats">
          <div><dt>seen</dt><dd>{stats.seen}</dd></div>
          <div><dt>mastered</dt><dd>{stats.mastered}</dd></div>
          <div class={stats.due ? 'is-due' : ''}><dt>due</dt><dd>{stats.due}</dd></div>
        </dl>
      </div>
      <form class="mdx-rec" onSubmit={(e) => { e.preventDefault(); rec(5); }}>
        <label>
          <span>Diagnosis</span>
          <input list="mdx-dx" value={target} placeholder="e.g. poag" onInput={(e) => setTarget((e.target as HTMLInputElement).value)} />
          <datalist id="mdx-dx">{options.map((o) => <option key={o} value={o} />)}</datalist>
        </label>
        <div class="mdx-q" role="group" aria-label="Record review quality, 0 to 5">
          {[0, 1, 2, 3, 4, 5].map((q) => (
            <button type="button" key={q} class={q >= 3 ? 'pass' : 'fail'} disabled={!target.trim()} onClick={() => rec(q)}
              aria-label={`Record quality ${q}`}>q{q}</button>
          ))}
          {lumen && (
            <button type="button" class="ghost" disabled={!target.trim()} onClick={() => { lumen.confuse(target.trim()); services.audio.play('click'); }}>
              mix-up
            </button>
          )}
        </div>
      </form>
      {!lumen && <p class="mdx-note">The active learning adapter exposes no per-diagnosis table (only the summary above).</p>}
      {lumen && !cards.length && <p class="mdx-note">No diagnoses tracked yet. Finish a case, or record a review above.</p>}
      {lumen && cards.length > 0 && (
        <div class="mdx-tablewrap" tabIndex={0} role="region" aria-label="Per-diagnosis learning table">
          <table class="mdx-table">
            <thead>
              <tr><th>Diagnosis</th><th>Mastery</th><th>Due</th><th>Reps</th><th>Interval</th><th>Ease</th><th>Lapses</th><th>Mix-ups</th><th>Seen</th><th>Last q</th></tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id} class={c.isDue ? 'is-due' : ''}>
                  <th scope="row">{name(c.id)}{name(c.id) !== c.id && <small>{c.id}</small>}</th>
                  <td>
                    <span class="mdx-bar" style={{ '--m': c.mastery } as never} role="meter" aria-valuemin={0} aria-valuemax={100}
                      aria-valuenow={Math.round(c.mastery * 100)} aria-label={`${name(c.id)} mastery`} />
                    <span class="num">{Math.round(c.mastery * 100)}%</span>
                  </td>
                  <td class={c.isDue ? 'due' : ''}>{c.isDue ? `due ${rel(c.due - now)}` : rel(c.due - now)}</td>
                  <td class="num">{c.reps}</td>
                  <td class="num">{c.intervalDays}d</td>
                  <td class="num">{c.ease.toFixed(2)}</td>
                  <td class="num">{c.lapses}</td>
                  <td class="num">{c.confusions}</td>
                  <td class="num">{c.seen}</td>
                  <td class="num">{c.lastQuality ?? '·'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {lumen && cards.length > 0 && (
        <ResetButton onArm={() => services.audio.play('click')} onConfirm={() => { lumen.reset(); services.audio.play('thud'); }} />
      )}
    </section>
  );
}

function ModesPage(props: { services: GameServices }) {
  const { services } = props;
  const { modes, failed, combos } = useModes(services);
  const cases = useRegistry(services.registries.cases);
  const dxCount = useRegistry(services.registries.diagnoses).length;
  const tick = useLearningTick(services);
  const [base] = useState(() => services.clock.now());
  const [reseed, setReseed] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>('all');

  const sims = useMemo(
    () => new Map(modes.map((m) => [m.id, simulate(services, m, `${m.id}:${base + reseed * 7919}`, outcome, combos[m.id])])),
    [services, modes, cases, combos, reseed, outcome, tick, base],
  );

  return (
    <div class="mdx">
      <style>{CSS}</style>
      <header class="mdx-hero">
        <p class="mdx-eyebrow">Sandbox · diagnostics</p>
        <h1>Modes &amp; learning</h1>
        <ul class="mdx-counts" aria-label="Registry totals">
          <li><span class="num">{modes.length}</span> modes</li>
          <li><span class="num">{cases.length}</span> cases</li>
          <li><span class="num">{dxCount}</span> diagnoses</li>
          {failed.length > 0 && <li class="mdx-err">failed to load: {failed.join(', ')}</li>}
        </ul>
        <div class="mdx-controls">
          <button type="button" onClick={() => { setReseed((n) => n + 1); services.audio.play('dial'); }}>
            <span aria-hidden="true">↻ </span>Reseed runs
          </button>
          <div class="mdx-seg" role="group" aria-label="Simulated outcomes">
            {(['all', 'mixed'] as const).map((o) => (
              <button type="button" key={o} aria-pressed={outcome === o} class={outcome === o ? 'on' : ''}
                onClick={() => { setOutcome(o); services.audio.play('select'); }}>
                {o === 'all' ? 'All correct' : 'Every 3rd missed'}
              </button>
            ))}
          </div>
        </div>
      </header>

      {!cases.length && (
        <p class="mdx-banner">No cases are registered yet: lock states are live, but runs will stay empty until content lands in <code>src/content/cases</code>.</p>
      )}

      <section class="mdx-grid" aria-label="Modes">
        {modes.map((m, i) => (
          <ModeCard key={m.id} services={services} mode={m} sim={sims.get(m.id)!} index={i} combo={combos[m.id]} />
        ))}
        {!modes.length && <p class="mdx-note">Loading modes…</p>}
      </section>
      <p class="mdx-foot">* The clock applies only to cases without their own emergency timer. Streak multipliers show the bonus each patient would earn.</p>

      <LearningPanel services={services} />
    </div>
  );
}

const CSS = `
.mdx { --ok: var(--lm-normal, #5eead4); --warn: var(--lm-abnormal, #fbbf24); --bad: var(--lm-critical, #f43f5e);
  --ivory: var(--lm-ivory, #f6efe4); --muted: var(--lm-muted, #a99bbd); --gold: var(--lm-gold, #ffd27a); --gold-hi: var(--lm-gold-100, #fff4da);
  --ease: cubic-bezier(.2,.8,.2,1);
  position: absolute; inset: 0; overflow: auto; box-sizing: border-box; padding: 44px clamp(16px, 4vw, 56px) 72px;
  color: var(--ivory); font-family: var(--lm-font-ui, 'Inter Variable', system-ui, sans-serif);
  background:
    radial-gradient(1200px 600px at 12% -10%, rgba(167,139,250,.16), transparent 60%),
    radial-gradient(900px 500px at 100% 10%, rgba(255,210,122,.10), transparent 60%),
    radial-gradient(800px 700px at 50% 120%, rgba(56,189,248,.08), transparent 60%),
    linear-gradient(180deg, var(--lm-ink-900, #0b0716), var(--lm-aubergine-700, #1a0f2e)); }
.mdx *, .mdx *::before, .mdx *::after { box-sizing: border-box; }
.mdx .num, .mdx code { font-family: var(--lm-font-num, 'Space Grotesk', ui-monospace, monospace); font-variant-numeric: tabular-nums; }
.mdx-hero { max-width: 1240px; margin: 0 auto 30px; }
.mdx-eyebrow { margin: 0 0 6px; text-transform: uppercase; letter-spacing: .22em; font-size: 11px; color: var(--gold); }
.mdx h1 { margin: 0; font-family: var(--lm-font-display, 'Fraunces Variable', Georgia, serif); font-weight: 500; font-size: clamp(32px, 5vw, 52px);
  letter-spacing: -.01em; line-height: 1.05; background: linear-gradient(100deg, var(--gold-hi), var(--gold) 45%, var(--lm-gold-500, #f5b942));
  -webkit-background-clip: text; background-clip: text; color: transparent; filter: drop-shadow(0 0 22px rgba(255,210,122,.18)); }
.mdx-counts { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; margin: 14px 0 20px; padding: 0; font-size: 13px; color: var(--muted); }
.mdx-counts li { padding: 4px 12px; border-radius: 999px; background: rgba(255,255,255,.04); border: 1px solid var(--lm-hairline, rgba(255,236,210,.09)); }
.mdx-counts .num { color: var(--gold-hi); font-weight: 600; margin-right: 2px; }
.mdx-controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.mdx button { font: inherit; font-size: 13px; color: var(--ivory); background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px; padding: 8px 14px; min-height: 36px; cursor: pointer;
  transition: background .2s var(--ease), border-color .2s var(--ease), box-shadow .2s var(--ease), transform .15s var(--ease); }
.mdx button:hover:not(:disabled) { background: rgba(255,210,122,.12); border-color: rgba(255,210,122,.5); box-shadow: 0 0 18px -6px rgba(255,210,122,.6); }
.mdx button:active:not(:disabled) { transform: scale(.97); }
.mdx button:focus-visible, .mdx input:focus-visible, .mdx-tablewrap:focus-visible { outline: 2px solid var(--gold); outline-offset: 2px; }
.mdx button:disabled { opacity: .4; cursor: not-allowed; }
.mdx-seg { display: inline-flex; gap: 2px; padding: 3px; border-radius: 999px; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.08); }
.mdx-seg button { border-color: transparent; background: transparent; padding: 6px 14px; }
.mdx-seg button.on { background: linear-gradient(180deg, rgba(255,210,122,.22), rgba(255,210,122,.1)); border-color: rgba(255,210,122,.5); color: var(--gold-hi);
  box-shadow: inset 0 1px 0 rgba(255,245,230,.15), 0 0 16px -6px rgba(255,210,122,.7); }
.mdx-banner { max-width: 1240px; margin: 0 auto 20px; padding: 12px 16px; border-radius: 14px; font-size: 13px; color: var(--lm-gold-200, #ffe7b3);
  background: rgba(255,210,122,.07); border: 1px solid rgba(255,210,122,.25); }

/* Paired rows of equal height (footers pinned to the bottom); endless modes take a full row
   with a two-column run list, so no card leaves a dead hole beside it. */
.mdx-grid { max-width: 1240px; margin: 0 auto; display: grid; gap: 18px; align-items: stretch; grid-auto-flow: row dense;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 420px), 1fr)); }
.mdx-card.is-wide { grid-column: 1 / -1; }
.mdx-card { position: relative; display: flex; flex-direction: column; min-width: 0; padding: 18px 18px 14px; border-radius: 20px; overflow: hidden;
  background:
    radial-gradient(420px 160px at 0% 0%, color-mix(in srgb, var(--accent) 16%, transparent), transparent 70%),
    linear-gradient(160deg, color-mix(in srgb, var(--accent) 9%, rgba(20,12,38,.72)), rgba(16,10,31,.82) 55%);
  border: 1px solid color-mix(in srgb, var(--accent) 34%, rgba(255,255,255,.08));
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 18px 40px -20px color-mix(in srgb, var(--accent) 50%, transparent), var(--lm-shadow-2, 0 10px 30px rgba(0,0,0,.35));
  backdrop-filter: blur(14px); animation: mdx-rise .6s var(--ease) both; animation-delay: calc(var(--i) * 70ms);
  transition: transform .35s var(--ease), box-shadow .35s var(--ease), border-color .35s var(--ease); }
.mdx-card:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--accent) 55%, rgba(255,255,255,.1));
  box-shadow: 0 1px 0 rgba(255,255,255,.1) inset, 0 26px 50px -20px color-mix(in srgb, var(--accent) 60%, transparent), var(--lm-shadow-2, 0 10px 30px rgba(0,0,0,.35)); }
.mdx-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 2px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: .9; }
.mdx-card.is-locked .mdx-card__icon { filter: saturate(.55); }
.mdx-card__head { display: grid; grid-template-columns: auto minmax(0, 1fr) auto; gap: 12px; align-items: start; }
.mdx-card__icon { width: 46px; height: 46px; display: grid; place-items: center; font-size: 22px; border-radius: 14px;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 45%, transparent), rgba(0,0,0,.2));
  border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); box-shadow: 0 0 22px -6px var(--accent), inset 0 1px 0 rgba(255,255,255,.15); }
.mdx-card__title { margin: 2px 0 4px; font-family: var(--lm-font-display, 'Fraunces Variable', Georgia, serif); font-weight: 600; font-size: 21px; color: var(--gold-hi); }
.mdx-card__tag { margin: 0; font-size: 13px; line-height: 1.45; color: var(--lm-ivory-dim, #ddd3c4); }
.mdx-lock { font-size: 10px; text-transform: uppercase; letter-spacing: .16em; padding: 5px 10px; border-radius: 999px; white-space: nowrap; }
.mdx-lock span { font-size: 8px; vertical-align: 1px; }
.mdx-lock.is-open { color: var(--ok); background: color-mix(in srgb, var(--ok) 10%, transparent); border: 1px solid color-mix(in srgb, var(--ok) 38%, transparent); }
.mdx-lock.is-locked { color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); border: 1px solid color-mix(in srgb, var(--warn) 38%, transparent); }
.mdx-reason { margin: 12px 0 0; padding: 8px 12px; border-radius: 12px; font-size: 13px; line-height: 1.45; color: var(--lm-gold-200, #ffe7b3);
  background: color-mix(in srgb, var(--warn) 7%, transparent); border-left: 2px solid color-mix(in srgb, var(--warn) 60%, transparent); }
.mdx-chips { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 14px 0 10px; padding: 0; }
.mdx-chips li { font-size: 11.5px; padding: 3px 9px; border-radius: 999px; color: color-mix(in srgb, var(--accent) 55%, #fff); background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
.mdx-curve { display: block; width: 100%; height: 28px; margin: 0 0 8px; overflow: visible; }
.mdx-curve__line { fill: none; stroke: var(--accent); stroke-width: 1.6; stroke-linejoin: round; stroke-linecap: round; filter: drop-shadow(0 0 4px var(--accent)); }
.mdx-curve__fill { fill: color-mix(in srgb, var(--accent) 14%, transparent); }
.mdx-sim { list-style: none; margin: 0 0 2px; padding: 0; display: grid; gap: 4px; }
.mdx-card.is-wide .mdx-sim { grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr)); gap: 4px 10px; }
.mdx-sim li { display: grid; grid-template-columns: 22px minmax(0, 1fr) auto auto; gap: 10px; align-items: center; font-size: 13px;
  padding: 7px 10px; border-radius: 11px; background: rgba(0,0,0,.24); border: 1px solid rgba(255,255,255,.05);
  animation: mdx-fade .45s var(--ease) both; animation-delay: calc(var(--i) * 70ms + var(--j) * 40ms + 120ms); }
.mdx-sim li.miss { border-color: color-mix(in srgb, var(--bad) 38%, transparent); background: color-mix(in srgb, var(--bad) 7%, transparent); }
.mdx-sim__n { font-family: var(--lm-font-num, 'Space Grotesk', monospace); color: var(--muted); font-size: 12px; text-align: center; }
.mdx-sim__who { display: grid; min-width: 0; line-height: 1.25; }
.mdx-sim__dx { color: var(--ivory); font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mdx-sim__id { color: var(--muted); font-size: 11px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mdx-sim__tags { display: flex; gap: 5px; align-items: center; }
.mdx-urg { font-size: 9.5px; text-transform: uppercase; letter-spacing: .1em; padding: 2px 6px; border-radius: 6px; }
.mdx-urg.is-emergency { color: #ffd1d9; background: color-mix(in srgb, var(--bad) 22%, transparent); border: 1px solid color-mix(in srgb, var(--bad) 55%, transparent); }
.mdx-urg.is-urgent { color: var(--warn); background: color-mix(in srgb, var(--warn) 10%, transparent); border: 1px solid color-mix(in srgb, var(--warn) 35%, transparent); }
.mdx-urg.is-miss { color: #fecdd3; border: 1px dashed color-mix(in srgb, var(--bad) 55%, transparent); }
.mdx-mult { font-size: 11.5px; font-weight: 600; color: color-mix(in srgb, var(--accent) 60%, #fff); }
.mdx-pips { display: inline-flex; gap: 3px; }
.mdx-pips i { width: 5px; height: 5px; border-radius: 50%; background: rgba(255,255,255,.14); }
.mdx-pips i.on { background: var(--accent); box-shadow: 0 0 6px color-mix(in srgb, var(--accent) 70%, transparent); }
.mdx-sim li.mdx-empty { display: block; color: var(--muted); font-style: italic; text-align: center; padding: 14px; }
.mdx-card__foot { margin-top: auto; padding-top: 12px; display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 12px; font-size: 12px; color: var(--muted); }
.mdx-card__foot .num { color: var(--lm-ivory-dim, #ddd3c4); }
.mdx-err { color: #fca5a5; }
.mdx-foot { max-width: 1240px; margin: 14px auto 36px; font-size: 12px; line-height: 1.5; color: var(--muted); }
.mdx-note { color: var(--muted); font-size: 13px; }

.mdx-panel { max-width: 1240px; margin: 0 auto; padding: 22px; border-radius: 22px; background: var(--lm-glass-bg, rgba(16,10,31,.7));
  border: 1px solid var(--lm-glass-border, rgba(255,255,255,.09)); box-shadow: var(--lm-glass-highlight, inset 0 1px 0 rgba(255,255,255,.06)), var(--lm-shadow-3, 0 20px 50px rgba(0,0,0,.35));
  backdrop-filter: var(--lm-glass-blur, blur(14px)); animation: mdx-rise .6s var(--ease) both; animation-delay: .35s; }
.mdx-panel__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 14px; }
.mdx-panel h2 { margin: 0; font-family: var(--lm-font-display, 'Fraunces Variable', Georgia, serif); font-weight: 500; font-size: 28px; color: var(--gold-hi); }
.mdx-stats { display: flex; gap: 10px; margin: 0; }
.mdx-stats div { min-width: 82px; padding: 8px 12px; border-radius: 14px; background: rgba(167,139,250,.08); border: 1px solid rgba(167,139,250,.25); text-align: center; }
.mdx-stats div.is-due { background: color-mix(in srgb, var(--warn) 9%, transparent); border-color: color-mix(in srgb, var(--warn) 40%, transparent); }
.mdx-stats dt { font-size: 10px; text-transform: uppercase; letter-spacing: .16em; color: var(--muted); }
.mdx-stats dd { margin: 2px 0 0; font-family: var(--lm-font-num, 'Space Grotesk', monospace); font-size: 24px; font-weight: 700; color: var(--gold-hi); }
.mdx-rec { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin: 18px 0 8px; }
.mdx-rec label { display: grid; gap: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); }
.mdx-rec input { font: inherit; font-size: 14px; text-transform: none; letter-spacing: 0; color: var(--ivory); width: min(260px, 80vw); min-height: 38px; padding: 8px 12px; border-radius: 12px;
  background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.14); }
.mdx-q { display: flex; flex-wrap: wrap; gap: 6px; }
.mdx-q button { padding: 7px 12px; font-family: var(--lm-font-num, 'Space Grotesk', monospace); }
.mdx-q button.pass { border-color: color-mix(in srgb, var(--ok) 38%, transparent); }
.mdx-q button.fail { border-color: color-mix(in srgb, var(--bad) 38%, transparent); }
.mdx-tablewrap { overflow-x: auto; margin-top: 10px; border-radius: 14px; border: 1px solid rgba(255,255,255,.07); }
.mdx-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
.mdx-table th, .mdx-table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.05); white-space: nowrap; }
.mdx-table thead th { font-size: 10px; text-transform: uppercase; letter-spacing: .14em; color: var(--muted); font-weight: 500; background: rgba(0,0,0,.25); }
.mdx-table tbody tr { transition: background .2s var(--ease); }
.mdx-table tbody tr:hover { background: rgba(255,255,255,.03); }
.mdx-table tbody th { font-weight: 600; }
.mdx-table tbody th small { display: block; font-weight: 400; color: var(--muted); font-size: 11.5px; }
.mdx-table tr.is-due { background: color-mix(in srgb, var(--warn) 5%, transparent); }
.mdx-table td.due { color: var(--warn); }
.mdx-bar { display: inline-block; vertical-align: middle; width: 90px; height: 6px; margin-right: 8px; border-radius: 999px; background: rgba(255,255,255,.08); position: relative; overflow: hidden; }
.mdx-bar::after { content: ''; position: absolute; inset: 0; transform-origin: left; transform: scaleX(var(--m)); border-radius: inherit;
  background: linear-gradient(90deg, var(--bad), var(--warn) 45%, var(--ok)); background-size: 90px 100%; transition: transform .6s var(--ease); }
.mdx-reset { margin-top: 16px; color: #fecdd3 !important; border-color: color-mix(in srgb, var(--bad) 35%, transparent) !important; }
.mdx-confirm { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 16px; padding: 10px 12px 10px 16px; border-radius: 16px;
  background: color-mix(in srgb, var(--bad) 9%, rgba(16,10,31,.6)); border: 1px solid color-mix(in srgb, var(--bad) 40%, transparent);
  box-shadow: 0 0 28px -12px var(--bad); animation: mdx-fade .3s var(--ease) both; font-size: 13px; color: #ffe4e6; }
.mdx-confirm span { flex: 1 1 220px; }
.mdx button.mdx-danger { background: color-mix(in srgb, var(--bad) 30%, transparent); border-color: color-mix(in srgb, var(--bad) 70%, transparent); color: #fff; font-weight: 600; }
.mdx button.mdx-danger:hover { background: color-mix(in srgb, var(--bad) 45%, transparent); border-color: var(--bad); box-shadow: 0 0 18px -4px var(--bad); }
@keyframes mdx-rise { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes mdx-fade { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) {
  .mdx-card, .mdx-sim li, .mdx-panel, .mdx-confirm { animation: none; }
  .mdx-card, .mdx-card:hover { transition: none; transform: none; }
  .mdx-bar::after { transition: none; }
}
:root.reduced-motion .mdx-card, :root.reduced-motion .mdx-sim li, :root.reduced-motion .mdx-panel, :root.reduced-motion .mdx-confirm { animation: none; }
:root.reduced-motion .mdx-card:hover { transform: none; }
@media (max-width: 520px) {
  .mdx { padding: 26px 16px 52px; }
  .mdx button { min-height: 44px; padding: 10px 16px; }
  .mdx-q button { min-width: 44px; padding: 10px 12px; }
  .mdx-seg button { padding: 10px 14px; }
  .mdx-rec input { min-height: 44px; width: 100%; }
  .mdx-rec label { width: 100%; }
  .mdx-sim li { grid-template-columns: 18px minmax(0, 1fr) auto; gap: 8px; }
  .mdx-sim__tags { grid-column: 2 / -1; grid-row: 2; }
  .mdx-sim__tags:empty { display: none; }
  .mdx-stats div { min-width: 0; flex: 1; }
  .mdx-stats { width: 100%; }
}
`;

const page: SandboxPage = { id: 'modes', title: 'Modes & learning', component: ModesPage };
export default page;
