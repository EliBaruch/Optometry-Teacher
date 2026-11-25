import type { GameServices, Urgency } from '@core';
import { Badge, Icon, useReducedMotion, useSignal, type IconName } from '@ui-kit';
import { URGENCY_LABEL, classify, formatMSS, type Outcome } from '../logic';
import './widgets.css';

const TRIAGE: Record<Urgency, string> = {
  emergency: 'Emergency — refer within the hour',
  urgent: 'Urgent — seen the same day',
  soon: 'Soon — within days',
  routine: 'Routine',
};

const ENOUGH: Record<Urgency, string> = {
  emergency: 'a same-hour referral was right',
  urgent: 'a same-day review was enough',
  soon: 'a review within days was enough',
  routine: 'routine follow-up was enough',
};

type Tone = 'good' | 'warn' | 'critical' | 'neutral' | 'info';

export const DEBRIEF_COPY: Record<Outcome, { title: string; icon: IconName; tone: Tone; badge: string }> = {
  saved: { title: 'Sight saved', icon: 'heart', tone: 'good', badge: 'Right call, right clock' },
  'over-triaged': { title: 'Safe, if over-cautious', icon: 'target', tone: 'info', badge: 'Calibrate the clock' },
  'under-triaged': { title: 'Right diagnosis, wrong clock', icon: 'clock', tone: 'warn', badge: 'Triage to review' },
  referred: { title: 'Sent on in time', icon: 'eye', tone: 'warn', badge: 'Diagnosis to review' },
  missed: { title: 'This emergency slipped past', icon: 'eye', tone: 'critical', badge: 'Red flags to review' },
  timeout: { title: 'The clock ran out', icon: 'clock', tone: 'neutral', badge: 'Decide sooner' },
};

/** The one-line lead under the title (exported for tests). */
export function debriefLead(outcome: Outcome, required: Urgency | undefined, spareSec: number, dxName: string): string {
  switch (outcome) {
    case 'saved':
      return `Called with ${formatMSS(spareSec)} to spare.`;
    case 'over-triaged':
      return required ? `Patient safe — but ${ENOUGH[required]} here. Keep emergency slots for true emergencies.` : 'Patient safe, but faster than needed.';
    case 'under-triaged':
      return required ? `Correct triage: ${TRIAGE[required]}.` : 'The referral was slower than this condition allows.';
    case 'referred':
      return `The referral was fast enough, but this was ${dxName}. These are the features that point to it.`;
    case 'timeout':
      return 'Go straight for the test that confirms the red flag — then commit.';
    case 'missed':
      return `This was ${dxName}. These are the features that make it an emergency.`;
  }
}

/** results-extra: what the clock looked like and the red flags to carry forward. */
export function DebriefWidget({ services }: { services: GameServices }) {
  const s = useSignal(services.session.state);
  const reduced = useReducedMotion();
  if (!s || !s.timeLimitSec) return null;
  const kase = services.registries.cases.get(s.caseId);
  const outcome: Outcome | null = s.submitted
    ? classify(s.submitted.score, s.submitted.urgency, kase?.urgency)
    : s.failed === 'timeout'
      ? 'timeout'
      : null;
  if (!outcome) return null;
  const dx = (id: string) => services.registries.diagnoses.get(id)?.name ?? id.replace(/-/g, ' ');
  const limit = s.timeLimitSec;
  const used = Math.min(limit, s.submitted ? s.submitted.score.elapsedSec : limit);
  const par = s.submitted?.score.parSec;
  const flags = kase?.redFlags?.length ? kase.redFlags : (kase?.teachingPoints ?? []).slice(0, 2);
  const c = DEBRIEF_COPY[outcome];
  const lead = debriefLead(outcome, kase?.urgency, limit - used, dx(kase?.diagnosis ?? s.submitted?.score.correctDiagnosisId ?? ''));
  const pct = (used / limit) * 100;
  // The decision label hangs off the end of the fill, flipping inward near either edge.
  const anchor = pct < 18 ? -8 : pct > 82 ? -92 : -50;
  const showPar = par !== undefined && par < limit;
  const chosen = s.submitted?.urgency;
  const needed = kase?.urgency;

  return (
    <section class={`cr-debrief cr-debrief--${outcome}${reduced ? ' is-still' : ''}`} aria-labelledby="cr-debrief-title">
      <header class="cr-debrief__head">
        <span class="cr-debrief__icon"><Icon name={c.icon} size={20} /></span>
        <div class="cr-debrief__titles">
          <span class="cr-debrief__eyebrow">Code Red debrief</span>
          <h3 class="cr-debrief__title" id="cr-debrief-title">{c.title}</h3>
        </div>
        <span class="cr-debrief__badge"><Badge tone={c.tone} size="sm">{c.badge}</Badge></span>
      </header>
      <p class="cr-debrief__lead">{lead}</p>

      {chosen && needed && (
        <dl class="cr-debrief__triage">
          <div class={`cr-debrief__tri${chosen === needed ? ' is-match' : ''}`}>
            <dt>You triaged</dt>
            <dd>{URGENCY_LABEL[chosen]}</dd>
          </div>
          <span class="cr-debrief__arrow" aria-hidden="true"><Icon name={chosen === needed ? 'check' : 'chevron-right'} size={14} /></span>
          <div class="cr-debrief__tri is-needed">
            <dt>Needed</dt>
            <dd>{URGENCY_LABEL[needed]}</dd>
          </div>
        </dl>
      )}

      <div class="cr-debrief__timeline">
        <div class="cr-debrief__marks lm-num" aria-hidden="true">
          <span class="cr-debrief__decision" style={{ left: `${pct}%`, translate: `${anchor}% 0` }}>
            {outcome === 'timeout' ? 'No decision' : `Decision ${formatMSS(used)}`}
          </span>
        </div>
        <div
          class="cr-debrief__track"
          role="img"
          aria-label={`${outcome === 'timeout' ? 'No decision' : `Decision at ${formatMSS(used)}`} of a ${formatMSS(limit)} clock${showPar ? `, par ${formatMSS(par!)}` : ''}`}
        >
          <div class="cr-debrief__fill" style={{ '--w': `${pct}%` }} />
          {showPar && <div class="cr-debrief__par" style={{ left: `${(par! / limit) * 100}%` }} />}
        </div>
        <div class="cr-debrief__scale lm-num" aria-hidden="true">
          <span>0:00</span>
          {showPar && <span class="cr-debrief__parcap" style={{ left: `${(par! / limit) * 100}%` }}>par {formatMSS(par!)}</span>}
          <span>{formatMSS(limit)}</span>
        </div>
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
