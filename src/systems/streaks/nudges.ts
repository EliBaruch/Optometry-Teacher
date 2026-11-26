/**
 * Near-miss nudges for the results screen ("120 points from your best Rush Hour",
 * "one more for a ×3 combo"). Always relative to the player's own past, always
 * positive — and after a long day they give way to a natural stopping cue.
 */
import type { Locale } from '@core';
import { text } from './strings';
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
  /** Edition language (default English). */
  locale?: Locale;
}

export function nudges(i: NudgeInput, limit = 3): Nudge[] {
  const t = text(i.locale ?? 'en');
  const out: Nudge[] = [];
  if (i.view.casesToday >= PAUSE_AFTER) {
    out.push({ id: 'pause', icon: 'clock', tone: 'calm', lead: t.nPauseLead(i.view.casesToday), text: t.nPauseText });
    return out;
  }

  const next = nextTier(i.combo.count);
  if (i.runActive && i.combo.count > 0 && next) {
    out.push({ id: 'combo-next', icon: 'flame', tone: 'fire', lead: t.nNextLead(next.need), text: t.nNextText(next.need, formatMult(next.tier.mult)) });
  } else if (i.outcome === 'reset' && i.prevCount >= 2) {
    out.push({ id: 'combo-banked', icon: 'star', tone: 'gold', lead: t.nBankedLead(i.prevCount), text: i.runActive ? t.nBankedActive : t.nBankedDone });
  }

  if (i.runBest > 0 && i.runTotal > 0) {
    const diff = i.runBest - i.runTotal;
    if (diff < 0) {
      out.push({ id: 'pace', icon: 'trophy', tone: 'gold', lead: t.nPastLead(-diff), text: t.nPastText(i.modeTitle) });
    } else if (diff > 0 && i.runActive && diff <= Math.max(200, i.runBest * 0.35)) {
      out.push({ id: 'pace', icon: 'target', tone: 'gold', lead: t.nPastLead(diff), text: t.nFromText(i.modeTitle) });
    }
  }

  if (i.caseScore !== null && i.prevCaseBest > 0) {
    const gap = i.prevCaseBest - i.caseScore;
    if (gap < 0) out.push({ id: 'case-best', icon: 'star', tone: 'gold', lead: t.nCaseNewLead, text: t.nCaseNewText(i.modeTitle, i.caseScore) });
    else if (gap > 0 && gap <= 60) out.push({ id: 'case-best', icon: 'target', tone: 'gold', lead: t.nPastLead(gap), text: t.nCaseShyText(i.modeTitle) });
  }

  const mend = i.view.mend;
  if (mend) {
    const left = Math.max(1, MEND_NEED - mend.progress);
    out.push({ id: 'mend', icon: 'heart', tone: 'fire', lead: t.nMendLead(left), text: t.nMendText(mend.lost) });
  }

  if (i.daily.freezes < FREEZE_MAX) {
    const left = FREEZE_EVERY - i.daily.freezeProgress;
    if (left <= 2) {
      out.push({ id: 'freeze', icon: 'sparkle', tone: 'ice', lead: t.nFreezeLead(left), text: t.nFreezeText });
    }
  }

  if (i.view.status === 'lit') {
    const m = nextMilestone(i.view.streak);
    if (m.days - i.view.streak === 1) {
      out.push({ id: 'milestone', icon: 'trophy', tone: 'fire', lead: t.nMilestoneLead, text: t.nMilestoneText(m.days) });
    }
  }

  if (!i.runActive) {
    // Temperance: the end of a run is a natural stopping point, said out loud.
    const done: Nudge = {
      id: 'run-done', icon: 'check', tone: 'calm', lead: t.nDoneLead,
      text: i.view.status === 'lit' ? t.nDoneLit : t.nDoneSpaced,
    };
    return [...out.slice(0, limit - 1), done];
  }
  return out.slice(0, limit);
}
