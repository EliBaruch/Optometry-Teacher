import { useEffect, useMemo, useState } from 'preact/hooks';
import type { ClinicalCase, GameServices, ModeModule, RunSnapshot } from '@core';
import { useRegistry } from '@ui-kit';
import { isLumenLearning, type CardView } from '@learning';
import type { SandboxPage } from '../Sandbox';

/**
 * Diagnostics for game modes & spaced repetition:
 *   ?sandbox=page/modes
 * Lists every mode with its lock state, simulates a run (which case ids each
 * mode would serve) against the registered cases, and shows the learning state.
 * The sandbox page loader skips mode discovery, so this page loads modes itself.
 */

const MODE_LOADERS = import.meta.glob<{ default: ModeModule }>('../../../modes/*/index.ts');
const ENDLESS_PREVIEW = 10;

type Outcome = 'all' | 'mixed';
interface SimStep { kase: ClinicalCase; ok: boolean }
interface SimResult { steps: SimStep[]; end: string; error?: string }

function simulate(services: GameServices, mode: ModeModule, seed: string, outcome: Outcome): SimResult {
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
      steps.push({ kase, ok });
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

function useModes(services: GameServices) {
  const modes = useRegistry(services.registries.modes);
  const [failed, setFailed] = useState<string[]>([]);
  useEffect(() => {
    let alive = true;
    const entries = Object.entries(MODE_LOADERS);
    void Promise.allSettled(entries.map(([, load]) => load())).then((res) => {
      if (!alive) return;
      const bad: string[] = [];
      res.forEach((r, i) => {
        const name = entries[i]![0].replace(/^.*modes\/(.*)\/index\.ts$/, '$1');
        if (r.status === 'rejected' || !r.value.default) {
          bad.push(name);
          return;
        }
        const m = r.value.default;
        if (!services.registries.modes.has(m.id)) services.registries.modes.register(m);
      });
      setFailed(bad);
    });
    return () => { alive = false; };
  }, [services]);
  return { modes: [...modes].sort((a, b) => a.order - b.order), failed };
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

function ruleChips(m: ModeModule): string[] {
  const r = m.rules;
  const out = [r.length === 'endless' ? '∞ patients' : `${r.length} patients`];
  if (r.lives) out.push(`${r.lives} lives`);
  if (r.timeLimitSec) out.push(`${r.timeLimitSec}s clock*`);
  if (r.scoreMultiplier && r.scoreMultiplier !== 1) out.push(`×${r.scoreMultiplier} score`);
  out.push(r.hints ? 'hints' : 'no hints');
  out.push(r.autoRun ? 'tech assist' : 'hands-on');
  return out;
}

function ModeCard(props: { services: GameServices; mode: ModeModule; sim: SimResult; index: number }) {
  const { mode, sim, services } = props;
  let reason: string | undefined;
  let lockErr: string | undefined;
  try { reason = mode.locked?.(services); } catch (e) { lockErr = String(e); }
  return (
    <article class="mdx-card" style={{ '--accent': mode.accent, '--i': props.index } as never} data-mode={mode.id}>
      <header class="mdx-card__head">
        <span class="mdx-card__icon" aria-hidden="true">{mode.icon}</span>
        <div>
          <h3 class="mdx-card__title">{mode.title}</h3>
          <p class="mdx-card__tag">{mode.tagline}</p>
        </div>
        <span class={`mdx-lock ${reason || lockErr ? 'is-locked' : 'is-open'}`}>{reason || lockErr ? 'Locked' : 'Open'}</span>
      </header>
      {(reason || lockErr) && <p class="mdx-reason">{lockErr ? `locked() threw: ${lockErr}` : reason}</p>}
      <ul class="mdx-chips">{ruleChips(mode).map((c) => <li key={c}>{c}</li>)}</ul>
      <ol class="mdx-sim">
        {sim.steps.map((s, i) => (
          <li key={`${s.kase.id}-${i}`} class={s.ok ? 'ok' : 'miss'} style={{ '--j': i } as never}>
            <span class="mdx-sim__n">{i + 1}</span>
            <code>{s.kase.id}</code>
            <span class="mdx-sim__dx">{s.kase.diagnosis}</span>
            <span class={`mdx-d d${s.kase.difficulty}`} title={`difficulty ${s.kase.difficulty}`}>{'●'.repeat(s.kase.difficulty)}</span>
            {s.kase.emergency || s.kase.urgency === 'emergency' ? <span class="mdx-urg">{s.kase.urgency}</span> : null}
          </li>
        ))}
        {!sim.steps.length && <li class="mdx-empty">{sim.end === 'no cases' ? 'No eligible cases registered yet.' : sim.end}</li>}
      </ol>
      <footer class="mdx-card__foot">
        <span>{sim.steps.length} served · {sim.end}</span>
        {sim.error && <span class="mdx-err">{sim.error}</span>}
      </footer>
    </article>
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
        <h2 id="mdx-learning">Spaced repetition</h2>
        <dl class="mdx-stats">
          <div><dt>seen</dt><dd>{stats.seen}</dd></div>
          <div><dt>mastered</dt><dd>{stats.mastered}</dd></div>
          <div><dt>due</dt><dd>{stats.due}</dd></div>
        </dl>
      </div>
      <form class="mdx-rec" onSubmit={(e) => { e.preventDefault(); rec(5); }}>
        <label>
          <span>Diagnosis</span>
          <input list="mdx-dx" value={target} placeholder="e.g. poag" onInput={(e) => setTarget((e.target as HTMLInputElement).value)} />
          <datalist id="mdx-dx">{options.map((o) => <option key={o} value={o} />)}</datalist>
        </label>
        <div class="mdx-q" role="group" aria-label="Record review quality">
          {[0, 1, 2, 3, 4, 5].map((q) => (
            <button type="button" key={q} class={q >= 3 ? 'pass' : 'fail'} disabled={!target.trim()} onClick={() => rec(q)}>q{q}</button>
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
        <div class="mdx-tablewrap">
          <table class="mdx-table">
            <thead>
              <tr><th>Diagnosis</th><th>Mastery</th><th>Due</th><th>Reps</th><th>Interval</th><th>Ease</th><th>Lapses</th><th>Mix-ups</th><th>Seen</th><th>Last q</th></tr>
            </thead>
            <tbody>
              {cards.map((c) => (
                <tr key={c.id} class={c.isDue ? 'is-due' : ''}>
                  <th scope="row">{name(c.id)}{name(c.id) !== c.id && <small>{c.id}</small>}</th>
                  <td>
                    <span class="mdx-bar" style={{ '--m': c.mastery } as never} role="meter" aria-valuemin={0} aria-valuemax={1} aria-valuenow={c.mastery} aria-label="mastery" />
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
        <button type="button" class="mdx-reset" onClick={() => { if (confirm('Erase all spaced-repetition progress on this device?')) lumen.reset(); }}>
          Reset learning state
        </button>
      )}
    </section>
  );
}

function ModesPage(props: { services: GameServices }) {
  const { services } = props;
  const { modes, failed } = useModes(services);
  const cases = useRegistry(services.registries.cases);
  const dxCount = useRegistry(services.registries.diagnoses).length;
  const tick = useLearningTick(services);
  const [base] = useState(() => services.clock.now());
  const [reseed, setReseed] = useState(0);
  const [outcome, setOutcome] = useState<Outcome>('all');

  const sims = useMemo(
    () => new Map(modes.map((m) => [m.id, simulate(services, m, `${m.id}:${base + reseed * 7919}`, outcome)])),
    [modes, cases, reseed, outcome, tick],
  );

  return (
    <div class="mdx">
      <style>{CSS}</style>
      <header class="mdx-hero">
        <p class="mdx-eyebrow">Sandbox · diagnostics</p>
        <h1>Modes &amp; learning</h1>
        <p class="mdx-sub">
          <span class="num">{modes.length}</span> modes · <span class="num">{cases.length}</span> cases ·{' '}
          <span class="num">{dxCount}</span> diagnoses
          {failed.length > 0 && <span class="mdx-err"> · failed to load: {failed.join(', ')}</span>}
        </p>
        <div class="mdx-controls">
          <button type="button" onClick={() => { setReseed((n) => n + 1); services.audio.play('click'); }}>↻ Reseed runs</button>
          <div class="mdx-seg" role="radiogroup" aria-label="Simulated outcomes">
            {(['all', 'mixed'] as const).map((o) => (
              <button type="button" key={o} role="radio" aria-checked={outcome === o} class={outcome === o ? 'on' : ''}
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
        {modes.map((m, i) => <ModeCard key={m.id} services={services} mode={m} sim={sims.get(m.id)!} index={i} />)}
        {!modes.length && <p class="mdx-note">Loading modes…</p>}
      </section>
      <p class="mdx-foot">* The clock applies only to cases without their own emergency timer.</p>

      <LearningPanel services={services} />
    </div>
  );
}

const CSS = `
.mdx { position: absolute; inset: 0; overflow: auto; box-sizing: border-box; padding: 40px clamp(16px, 4vw, 56px) 64px;
  color: var(--lm-ivory, #f6efe4); font-family: var(--lm-font-ui, 'Inter Variable', system-ui, sans-serif);
  background:
    radial-gradient(1200px 600px at 12% -10%, rgba(167,139,250,.16), transparent 60%),
    radial-gradient(900px 500px at 100% 10%, rgba(255,210,122,.10), transparent 60%),
    radial-gradient(800px 700px at 50% 120%, rgba(56,189,248,.08), transparent 60%),
    linear-gradient(180deg, var(--lm-ink-900, #0b0716), var(--lm-aubergine-700, #1a0f2e)); }
.mdx *, .mdx *::before { box-sizing: border-box; }
.mdx .num, .mdx code { font-family: var(--lm-font-num, 'Space Grotesk', ui-monospace, monospace); }
.mdx-hero { max-width: 1240px; margin: 0 auto 28px; }
.mdx-eyebrow { margin: 0 0 6px; text-transform: uppercase; letter-spacing: .22em; font-size: 11px; color: var(--lm-gold, #ffd27a); opacity: .85; }
.mdx h1 { margin: 0; font-family: var(--lm-font-display, 'Fraunces Variable', Georgia, serif); font-weight: 500; font-size: clamp(30px, 5vw, 48px);
  letter-spacing: -.01em; background: linear-gradient(100deg, #fff4da, #ffd27a 45%, #f5b942); -webkit-background-clip: text; background-clip: text; color: transparent; }
.mdx-sub { margin: 8px 0 18px; color: var(--lm-muted, #a99bbd); font-size: 14px; }
.mdx-controls { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
.mdx button { font: inherit; font-size: 13px; color: var(--lm-ivory, #f6efe4); background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.14);
  border-radius: 999px; padding: 8px 14px; cursor: pointer; transition: background .2s cubic-bezier(.2,.8,.2,1), border-color .2s, transform .15s; }
.mdx button:hover:not(:disabled) { background: rgba(255,210,122,.12); border-color: rgba(255,210,122,.5); }
.mdx button:active:not(:disabled) { transform: scale(.97); }
.mdx button:focus-visible, .mdx input:focus-visible { outline: 2px solid var(--lm-gold, #ffd27a); outline-offset: 2px; }
.mdx button:disabled { opacity: .4; cursor: not-allowed; }
.mdx-seg { display: inline-flex; padding: 3px; border-radius: 999px; background: rgba(0,0,0,.25); border: 1px solid rgba(255,255,255,.08); }
.mdx-seg button { border-color: transparent; background: transparent; padding: 6px 12px; }
.mdx-seg button.on { background: rgba(255,210,122,.16); border-color: rgba(255,210,122,.45); color: #fff4da; }
.mdx-banner { max-width: 1240px; margin: 0 auto 20px; padding: 12px 16px; border-radius: 14px; font-size: 13px; color: var(--lm-gold-200, #ffe7b3);
  background: rgba(255,210,122,.07); border: 1px solid rgba(255,210,122,.25); }
.mdx-grid { max-width: 1240px; margin: 0 auto; display: grid; gap: 18px; align-items: start; grid-template-columns: repeat(auto-fill, minmax(min(100%, 360px), 1fr)); }
.mdx-card { position: relative; padding: 18px 18px 14px; border-radius: 20px; overflow: hidden;
  background: linear-gradient(160deg, color-mix(in srgb, var(--accent) 13%, rgba(20,12,38,.72)), rgba(16,10,31,.78) 55%);
  border: 1px solid color-mix(in srgb, var(--accent) 38%, rgba(255,255,255,.08));
  box-shadow: 0 1px 0 rgba(255,255,255,.08) inset, 0 18px 40px -18px color-mix(in srgb, var(--accent) 45%, transparent), 0 10px 30px rgba(0,0,0,.35);
  backdrop-filter: blur(14px); animation: mdx-rise .6s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i) * 70ms); }
.mdx-card::before { content: ''; position: absolute; inset: 0 0 auto; height: 3px; background: linear-gradient(90deg, transparent, var(--accent), transparent); opacity: .9; }
.mdx-card__head { display: grid; grid-template-columns: auto 1fr auto; gap: 12px; align-items: start; }
.mdx-card__icon { width: 44px; height: 44px; display: grid; place-items: center; font-size: 22px; border-radius: 14px;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--accent) 45%, transparent), rgba(0,0,0,.2));
  border: 1px solid color-mix(in srgb, var(--accent) 50%, transparent); box-shadow: 0 0 22px -6px var(--accent); }
.mdx-card__title { margin: 2px 0 4px; font-family: var(--lm-font-display, 'Fraunces Variable', Georgia, serif); font-weight: 600; font-size: 21px; color: #fff; }
.mdx-card__tag { margin: 0; font-size: 13px; line-height: 1.45; color: var(--lm-ivory-dim, #ddd3c4); }
.mdx-lock { font-size: 10px; text-transform: uppercase; letter-spacing: .16em; padding: 5px 9px; border-radius: 999px; white-space: nowrap; }
.mdx-lock.is-open { color: #5eead4; background: rgba(94,234,212,.1); border: 1px solid rgba(94,234,212,.35); }
.mdx-lock.is-locked { color: #fbbf24; background: rgba(251,191,36,.1); border: 1px solid rgba(251,191,36,.35); }
.mdx-reason { margin: 12px 0 0; font-size: 13px; font-style: italic; color: #fde68a; }
.mdx-chips { display: flex; flex-wrap: wrap; gap: 6px; list-style: none; margin: 14px 0 12px; padding: 0; }
.mdx-chips li { font-size: 11px; padding: 3px 9px; border-radius: 999px; color: color-mix(in srgb, var(--accent) 70%, #fff); background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent); }
.mdx-sim { list-style: none; margin: 0; padding: 0; display: grid; gap: 4px; }
.mdx-sim li { display: grid; grid-template-columns: 22px minmax(0, 1.2fr) minmax(0, 1fr) auto auto; gap: 8px; align-items: center; font-size: 12.5px;
  padding: 6px 10px; border-radius: 10px; background: rgba(0,0,0,.22); border: 1px solid rgba(255,255,255,.05);
  animation: mdx-fade .45s cubic-bezier(.2,.8,.2,1) both; animation-delay: calc(var(--i) * 70ms + var(--j) * 45ms + 120ms); }
.mdx-sim li.miss { border-color: rgba(244,63,94,.35); background: rgba(244,63,94,.07); }
.mdx-sim li code { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #fff4da; }
.mdx-sim__n { font-family: var(--lm-font-num, 'Space Grotesk', monospace); color: var(--lm-muted, #a99bbd); font-size: 11px; }
.mdx-sim__dx { color: var(--lm-muted, #a99bbd); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mdx-d { font-size: 8px; letter-spacing: 1px; color: var(--accent); }
.mdx-urg { font-size: 9px; text-transform: uppercase; letter-spacing: .12em; color: #f43f5e; }
.mdx-sim li.mdx-empty { display: block; color: var(--lm-muted, #a99bbd); font-style: italic; text-align: center; padding: 14px; }
.mdx-card__foot { margin-top: 10px; display: flex; justify-content: space-between; gap: 8px; font-size: 11px; color: var(--lm-muted-2, #7d6f95); }
.mdx-err { color: #f87171; }
.mdx-foot { max-width: 1240px; margin: 10px auto 34px; font-size: 11px; color: var(--lm-muted-2, #7d6f95); }
.mdx-note { color: var(--lm-muted, #a99bbd); font-size: 13px; }
.mdx-panel { max-width: 1240px; margin: 0 auto; padding: 20px; border-radius: 22px; background: rgba(16,10,31,.7);
  border: 1px solid rgba(255,255,255,.09); box-shadow: 0 1px 0 rgba(255,255,255,.06) inset, 0 20px 50px rgba(0,0,0,.35); backdrop-filter: blur(14px); }
.mdx-panel__head { display: flex; flex-wrap: wrap; justify-content: space-between; align-items: end; gap: 12px; }
.mdx-panel h2 { margin: 0; font-family: var(--lm-font-display, 'Fraunces Variable', Georgia, serif); font-weight: 500; font-size: 26px; }
.mdx-stats { display: flex; gap: 10px; margin: 0; }
.mdx-stats div { min-width: 78px; padding: 8px 12px; border-radius: 14px; background: rgba(167,139,250,.08); border: 1px solid rgba(167,139,250,.25); text-align: center; }
.mdx-stats dt { font-size: 10px; text-transform: uppercase; letter-spacing: .16em; color: var(--lm-muted, #a99bbd); }
.mdx-stats dd { margin: 2px 0 0; font-family: var(--lm-font-num, 'Space Grotesk', monospace); font-size: 22px; font-weight: 700; color: #fff4da; }
.mdx-rec { display: flex; flex-wrap: wrap; gap: 12px; align-items: end; margin: 18px 0 8px; }
.mdx-rec label { display: grid; gap: 4px; font-size: 11px; text-transform: uppercase; letter-spacing: .14em; color: var(--lm-muted, #a99bbd); }
.mdx-rec input { font: inherit; font-size: 14px; text-transform: none; letter-spacing: 0; color: #fff; width: min(260px, 80vw); padding: 8px 12px; border-radius: 12px;
  background: rgba(0,0,0,.3); border: 1px solid rgba(255,255,255,.14); }
.mdx-q { display: flex; flex-wrap: wrap; gap: 6px; }
.mdx-q button { padding: 7px 11px; font-family: var(--lm-font-num, 'Space Grotesk', monospace); }
.mdx-q button.pass { border-color: rgba(94,234,212,.35); }
.mdx-q button.fail { border-color: rgba(244,63,94,.35); }
.mdx-tablewrap { overflow-x: auto; margin-top: 10px; border-radius: 14px; border: 1px solid rgba(255,255,255,.07); }
.mdx-table { width: 100%; border-collapse: collapse; font-size: 13px; min-width: 760px; }
.mdx-table th, .mdx-table td { padding: 9px 12px; text-align: left; border-bottom: 1px solid rgba(255,255,255,.05); white-space: nowrap; }
.mdx-table thead th { font-size: 10px; text-transform: uppercase; letter-spacing: .14em; color: var(--lm-muted, #a99bbd); font-weight: 500; background: rgba(0,0,0,.25); }
.mdx-table tbody th { font-weight: 600; }
.mdx-table tbody th small { display: block; font-weight: 400; color: var(--lm-muted-2, #7d6f95); font-size: 11px; }
.mdx-table tr.is-due { background: rgba(251,191,36,.05); }
.mdx-table td.due { color: #fbbf24; }
.mdx-bar { display: inline-block; vertical-align: middle; width: 90px; height: 6px; margin-right: 8px; border-radius: 999px; background: rgba(255,255,255,.08); position: relative; overflow: hidden; }
.mdx-bar::after { content: ''; position: absolute; inset: 0; transform-origin: left; transform: scaleX(var(--m)); border-radius: inherit;
  background: linear-gradient(90deg, #f43f5e, #fbbf24 45%, #5eead4); transition: transform .6s cubic-bezier(.2,.8,.2,1); }
.mdx-reset { margin-top: 14px; color: #fca5a5 !important; border-color: rgba(244,63,94,.3) !important; }
@keyframes mdx-rise { from { opacity: 0; transform: translateY(14px) scale(.985); } to { opacity: 1; transform: none; } }
@keyframes mdx-fade { from { opacity: 0; transform: translateX(-6px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .mdx-card, .mdx-sim li { animation: none; } .mdx-bar::after { transition: none; } }
:root.reduced-motion .mdx-card, :root.reduced-motion .mdx-sim li { animation: none; }
@media (max-width: 520px) {
  .mdx { padding: 24px 16px 48px; }
  .mdx-sim li { grid-template-columns: 20px minmax(0, 1fr) auto; }
  .mdx-sim__dx, .mdx-urg { display: none; }
  .mdx-stats div { min-width: 64px; }
}
`;

const page: SandboxPage = { id: 'modes', title: 'Modes & learning', component: ModesPage };
export default page;
