import type { GameServices, Urgency } from '@core';
import { Badge, Icon, useReducedMotion, useSignal, type IconName } from '@ui-kit';
import { classify, formatMSS, type Outcome } from '../logic';
import './widgets.css';

const TRIAGE: Record<Urgency, string> = {
  emergency: 'Emergency — refer within the hour',
  urgent: 'Urgent — seen the same day',
  soon: 'Soon — within days',
  routine: 'Routine',
};

const COPY: Record<Outcome, { title: string; icon: IconName; tone: 'good' | 'warn' | 'critical' | 'neutral'; badge: string }> = {
  saved: { title: 'Sight saved', icon: 'heart', tone: 'good', badge: 'Right call, right clock' },
  'under-triaged': { title: 'Right diagnosis, wrong clock', icon: 'clock', tone: 'warn', badge: 'Triage to review' },
  missed: { title: 'This emergency slipped past', icon: 'eye', tone: 'critical', badge: 'Red flags to review' },
  timeout: { title: 'The clock ran out', icon: 'clock', tone: 'neutral', badge: 'Decide sooner' },
};

/** results-extra: what the clock looked like and the red flags to carry forward. */
export function DebriefWidget({ services }: { services: GameServices }) {
  const s = useSignal(services.session.state);
  const reduced = useReducedMotion();
  if (!s || !s.timeLimitSec) return null;
  const outcome: Outcome | null = s.submitted ? classify(s.submitted.score) : s.failed === 'timeout' ? 'timeout' : null;
  if (!outcome) return null;
  const kase = services.registries.cases.get(s.caseId);
  const limit = s.timeLimitSec;
  const used = Math.min(limit, s.submitted ? s.submitted.score.elapsedSec : limit);
  const par = s.submitted?.score.parSec;
  const flags = kase?.redFlags?.length ? kase.redFlags : (kase?.teachingPoints ?? []).slice(0, 2);
  const c = COPY[outcome];
  const lead =
    outcome === 'saved'
      ? `Called with ${formatMSS(limit - used)} to spare.`
      : outcome === 'under-triaged' && kase
        ? `Correct triage: ${TRIAGE[kase.urgency]}.`
        : outcome === 'timeout'
          ? 'Go straight for the test that confirms the red flag — then commit.'
          : 'These are the features that make it an emergency.';

  return (
    <section class={`cr-debrief cr-debrief--${outcome}${reduced ? ' is-still' : ''}`} aria-labelledby="cr-debrief-title">
      <header class="cr-debrief__head">
        <span class="cr-debrief__icon"><Icon name={c.icon} size={20} /></span>
        <div class="cr-debrief__titles">
          <span class="cr-debrief__eyebrow">Code Red debrief</span>
          <h3 class="cr-debrief__title" id="cr-debrief-title">{c.title}</h3>
        </div>
        <Badge tone={c.tone} size="sm">{c.badge}</Badge>
      </header>
      <p class="cr-debrief__lead">{lead}</p>
      <div class="cr-debrief__track" role="img" aria-label={`Decision at ${formatMSS(used)} of a ${formatMSS(limit)} clock`}>
        <div class="cr-debrief__fill" style={{ '--w': `${(used / limit) * 100}%` }} />
        {par !== undefined && par < limit && <div class="cr-debrief__par" style={{ left: `${(par / limit) * 100}%` }} title="Par" />}
      </div>
      <div class="cr-debrief__scale lm-num">
        <span>0:00</span>
        <span>{outcome === 'timeout' ? 'No decision' : `Decision ${formatMSS(used)}`}</span>
        <span>{formatMSS(limit)}</span>
      </div>
      {flags.length > 0 && (
        <>
          <h4 class="cr-debrief__sub">Red flags to carry forward</h4>
          <ul class="cr-debrief__flags">
            {flags.map((f, i) => (
              <li key={i} style={{ '--i': i }}>{f}</li>
            ))}
          </ul>
        </>
      )}
    </section>
  );
}
