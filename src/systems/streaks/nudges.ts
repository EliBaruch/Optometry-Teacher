/**
 * Near-miss nudges for the results screen ("120 points from your best Rush Hour",
 * "one more for a ×3 combo"). Always relative to the player's own past, always
 * positive — and after a long day they give way to a natural stopping cue.
 */
import { formatMult, nextTier, type ComboOutcome, type ComboState } from './combo';
import { FREEZE_EVERY, FREEZE_MAX, MEND_NEED, PAUSE_AFTER, nextMilestone, type DailyState, type DailyView } from './daily';

export type NudgeTone = 'fire' | 'gold' | 'ice' | 'calm';

export interface Nudge {
  id: 'pause' | 'combo-next' | 'combo-banked' | 'pace' | 'case-best' | 'freeze' | 'milestone' | 'mend' | 'run-done';
  icon: 'flame' | 'trophy' | 'star' | 'target' | 'sparkle' | 'heart' | 'clock' | 'check';
  /** The emphasised number/phrase, rendered bold before `text`. */
  lead: string;
  text: string;
  tone: NudgeTone;
}

export interface NudgeInput {
  combo: ComboState;
  outcome: ComboOutcome | null;
  prevCount: number;
  /** A run is still in progress (more patients may follow). */
  runActive: boolean;
  runTotal: number;
  /** Best finished run in this mode before this run (0 = none yet). */
  runBest: number;
  modeTitle: string;
  caseScore: number | null;
  /** Best single patient in this mode BEFORE this case. */
  prevCaseBest: number;
  daily: DailyState;
  view: DailyView;
}

const plural = (n: number, one: string, many = `${one}s`) => (n === 1 ? one : many);

export function nudges(i: NudgeInput, limit = 3): Nudge[] {
  const out: Nudge[] = [];
  if (i.view.casesToday >= PAUSE_AFTER) {
    out.push({
      id: 'pause', icon: 'clock', tone: 'calm',
      lead: `${i.view.casesToday} patients today.`,
      text: 'Spacing beats cramming — your flame is lit, and tomorrow’s session will stick better.',
    });
    return out;
  }

  const next = nextTier(i.combo.count);
  if (i.runActive && i.combo.count > 0 && next) {
    out.push({
      id: 'combo-next', icon: 'flame', tone: 'fire',
      lead: next.need === 1 ? 'One more' : `${next.need} more`,
      text: `correct ${plural(next.need, 'diagnosis', 'diagnoses')} for a ${formatMult(next.tier.mult)} combo`,
    });
  } else if (i.outcome === 'reset' && i.prevCount >= 2) {
    out.push({
      id: 'combo-banked', icon: 'star', tone: 'gold',
      lead: `${i.prevCount} in a row`,
      text: i.runActive ? 'banked. The next correct call lights a fresh combo.' : 'was this run’s best stretch.',
    });
  }

  if (i.runBest > 0 && i.runTotal > 0) {
    const diff = i.runBest - i.runTotal;
    if (diff < 0) {
      out.push({ id: 'pace', icon: 'trophy', tone: 'gold', lead: `${-diff} points`, text: `past your best ${i.modeTitle}` });
    } else if (diff > 0 && i.runActive && diff <= Math.max(200, i.runBest * 0.35)) {
      out.push({ id: 'pace', icon: 'target', tone: 'gold', lead: `${diff} points`, text: `from your best ${i.modeTitle}` });
    }
  }

  if (i.caseScore !== null && i.prevCaseBest > 0) {
    const gap = i.prevCaseBest - i.caseScore;
    if (gap < 0) out.push({ id: 'case-best', icon: 'star', tone: 'gold', lead: 'New best patient', text: `in ${i.modeTitle} — ${i.caseScore} points` });
    else if (gap > 0 && gap <= 60) out.push({ id: 'case-best', icon: 'target', tone: 'gold', lead: `${gap} points`, text: `shy of your best ${i.modeTitle} patient` });
  }

  const mend = i.view.mend;
  if (mend) {
    const left = Math.max(1, MEND_NEED - mend.progress);
    out.push({
      id: 'mend', icon: 'heart', tone: 'fire',
      lead: `${left} more correct ${plural(left, 'diagnosis', 'diagnoses')}`,
      text: `rekindles your ${mend.lost}-day streak (a Second Opinion review counts double)`,
    });
  }

  if (i.daily.freezes < FREEZE_MAX) {
    const left = FREEZE_EVERY - i.daily.freezeProgress;
    if (left <= 2) {
      out.push({ id: 'freeze', icon: 'sparkle', tone: 'ice', lead: `${left} more solid ${plural(left, 'case')}`, text: '(grade B or better) bank a streak freeze' });
    }
  }

  if (i.view.status === 'lit') {
    const m = nextMilestone(i.view.streak);
    if (m.days - i.view.streak === 1) {
      out.push({ id: 'milestone', icon: 'trophy', tone: 'fire', lead: 'Tomorrow', text: `your flame reaches the ${m.days}-day milestone` });
    }
  }

  if (!i.runActive) {
    // Temperance: the end of a run is a natural stopping point, said out loud.
    const done: Nudge = {
      id: 'run-done', icon: 'check', tone: 'calm', lead: 'A fine place to pause.',
      text: i.view.status === 'lit' ? 'Your flame is lit for today.' : 'Spaced sessions stick better than long ones.',
    };
    return [...out.slice(0, limit - 1), done];
  }
  return out.slice(0, limit);
}
