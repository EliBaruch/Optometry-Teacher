/**
 * Results panel: combo status, the flame and one-more nudges against your own bests.
 * Display only — it never navigates (the results scene owns "Next patient").
 */
import type { GameServices, RunSnapshot } from '@core';
import { GlassPanel, Icon, cx, useSignal } from '@ui-kit';
import { TIERS, formatMult, tierFor, tierIndex, type ComboStep } from '../combo';
import { nudges, type Nudge } from '../nudges';
import { bestFor } from '../state';
import type { RunEcho, StreaksController } from '../controller';
import { Flame, FreezeGlyph } from './Flame';
import { dailyIntensity, days, flameVariant } from './copy';
import { useStreaks } from './hooks';

export function MomentumPanel({ services }: { services: GameServices }) {
  const { ctl, combo, echo, runEcho } = useStreaks(services);
  const session = useSignal(services.session.state);
  const run = useSignal(services.run.state);
  const route = useSignal(services.router.current);
  if (!ctl) return null;
  if (route.id === 'run-summary' && runEcho) return <RunMomentum ctl={ctl} run={runEcho} />;
  if (!echo || (session && session.caseId !== echo.caseId)) return null;

  const runActive = !!run && run.modeId === echo.modeId && moreToCome(services, run);
  const state = ctl.state.get();
  const view = ctl.view();
  const list = nudges({
    combo, outcome: echo.step.outcome, prevCount: echo.step.prevCount, runActive,
    runTotal: run && run.modeId === echo.modeId ? run.totalScore : 0,
    runBest: bestFor(state, echo.modeId).run,
    modeTitle: ctl.modeTitle(echo.modeId),
    caseScore: echo.caseScore, prevCaseBest: echo.prevCaseBest, daily: state.daily, view,
  });
  const tier = echo.step.tier;

  return (
    <GlassPanel
      as="section" class={cx('sk-mo', `is-${tier.key}`)} accent={tier.mult > 1 ? tier.color : '#fb923c'} glow={echo.step.tierUp} strong
      icon="flame" eyebrow="Streaks" title={runActive ? 'Next patient' : 'Momentum'}
      actions={<DayChip ctl={ctl} />}
      style={{ '--sk-tier': tier.color }}
    >
      <div class="sk-mo__hero">
        <div class="sk-mo__flame">
          <Flame size={64} intensity={tierIndex(echo.step.combo.count)} variant={echo.step.combo.count ? 'fire' : 'ember'} />
        </div>
        <div class="sk-mo__main">
          <div class="sk-mo__mult">
            <span class="sk-mo__x lm-num" key={tier.key}>{formatMult(tier.mult)}</span>
            <span class="sk-mo__word">{tier.mult > 1 ? `${tier.name} combo` : 'combo'}</span>
            {echo.step.bonusXp > 0 && <span class="sk-mo__xp lm-num">+{echo.step.bonusXp} XP</span>}
          </div>
          <p class="sk-mo__line">{outcomeLine(echo.step)}</p>
        </div>
      </div>
      <Ladder count={echo.step.combo.count} />
      <NudgeList items={list} />
    </GlassPanel>
  );
}

function RunMomentum({ ctl, run }: { ctl: StreaksController; run: RunEcho }) {
  const state = ctl.state.get();
  const view = ctl.view();
  const title = ctl.modeTitle(run.modeId);
  const tier = tierFor(run.bestCombo);
  const list = nudges({
    combo: { modeId: run.modeId, count: 0, best: run.bestCombo, graceUsed: false, cases: run.cases }, outcome: null, prevCount: 0,
    runActive: false, runTotal: run.total, runBest: run.prevBest, modeTitle: title, caseScore: null, prevCaseBest: 0, daily: state.daily, view,
  }).filter((n) => n.id !== 'pace'); // the headline already compares the run with your best
  return (
    <GlassPanel as="section" class={cx('sk-mo sk-mo--run', `is-${tier.key}`)} style={{ '--sk-tier': tier.color }} accent={run.isNewBest ? '#ffd27a' : '#fb923c'} glow={run.isNewBest} strong icon="flame" eyebrow="Streaks" title="Run momentum"
      actions={<DayChip ctl={ctl} />}
    >
      <div class="sk-mo__hero">
        <div class="sk-mo__flame">
          <Flame size={64} intensity={tierIndex(run.bestCombo)} variant={run.bestCombo ? 'fire' : 'ember'} />
        </div>
        <div class="sk-mo__main">
          <div class="sk-mo__mult">
            <span class="sk-mo__x lm-num">{formatMult(tier.mult)}</span>
            <span class="sk-mo__word">{run.bestCombo > 0 ? `peak combo · ${run.bestCombo} in a row` : 'peak combo'}</span>
          </div>
          <p class="sk-mo__line">
            {run.isNewBest
              ? run.prevBest > 0
                ? `New personal best in ${title} — ${run.total - run.prevBest} points past your old mark.`
                : `Your first ${title} on the books: ${run.total} points.`
              : run.prevBest > 0
                ? `Your best ${title} stands at ${run.prevBest}.`
                : `${run.total} points this run.`}
          </p>
        </div>
      </div>
      <NudgeList items={list} />
    </GlassPanel>
  );
}

function outcomeLine(step: ComboStep): string {
  const n = step.combo.count;
  switch (step.outcome) {
    case 'built':
      if (step.tierUp) return `Climbed to ${formatMult(step.tier.mult)} — ${n} correct diagnoses in a row.`;
      return n === 1 ? 'First correct call — one more lights the combo.' : `${n} correct diagnoses in a row.`;
    case 'saved':
      return 'Combo saved: your essential work-up was complete and triage was right. The safety net is spent for this run.';
    case 'reset':
      return step.prevCount >= 2 ? `Combo banked at ${step.prevCount} in a row — every correct call relights it.` : 'A fresh start — the next correct call builds your combo.';
  }
}

function Ladder({ count }: { count: number }) {
  const cur = tierIndex(count);
  return (
    <ol class="sk-ladder" aria-label="Combo tiers">
      {TIERS.map((t, i) => (
        <li key={t.key} class={cx('sk-ladder__step', i < cur && 'is-past', i === cur && 'is-now')} style={{ '--sk-c': t.color, '--sk-i': i }}>
          <span class="sk-ladder__mult lm-num">{formatMult(t.mult)}</span>
          <span class="sk-ladder__need">{t.min === 0 ? 'start' : `${t.min} in a row`}</span>
        </li>
      ))}
    </ol>
  );
}

function NudgeList({ items }: { items: Nudge[] }) {
  if (!items.length) return null;
  return (
    <ul class="sk-nudges">
      {items.map((n, i) => (
        <li key={n.id} class={`sk-nudge is-${n.tone}`} style={{ '--sk-i': i }}>
          <span class="sk-nudge__icon">{n.id === 'freeze' ? <FreezeGlyph size={14} /> : <Icon name={n.icon} size={14} />}</span>
          <span>
            <b>{n.lead}</b> {n.text}
          </span>
        </li>
      ))}
    </ul>
  );
}

function DayChip({ ctl }: { ctl: StreaksController }) {
  const view = ctl.view();
  const d = ctl.state.get().daily;
  return (
    <span class={`sk-daychip is-${view.status}`} title={`Daily streak: ${days(view.streak)}`}>
      <Flame size={14} intensity={dailyIntensity(view.streak)} variant={flameVariant(view.status)} embers={false} />
      <span class="lm-num">Day {view.streak}</span>
      {d.freezes > 0 && <FreezeGlyph size={11} />}
    </span>
  );
}

/** Will another patient follow in this run? */
function moreToCome(services: GameServices, run: RunSnapshot): boolean {
  const mode = services.run.mode() ?? services.registries.modes.get(run.modeId);
  if (!mode) return true;
  if (run.lives !== null && run.lives <= 0) return false;
  const len = mode.rules.length;
  return len === 'endless' || run.completed.length + run.failed.length < len;
}

