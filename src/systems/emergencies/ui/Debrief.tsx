import type { GameServices, Urgency } from '@core';
import { pickStrings, type Locale } from '@core';
import { Badge, Icon, useReducedMotion, useSignal, useStrings, type IconName } from '@ui-kit';
import { classify, formatMSS, type Outcome } from '../logic';
import { S } from '../strings';
import './widgets.css';

type Tone = 'good' | 'warn' | 'critical' | 'neutral' | 'info';

const OUTCOME_LOOK: Record<Outcome, { icon: IconName; tone: Tone }> = {
  saved: { icon: 'heart', tone: 'good' },
  'over-triaged': { icon: 'target', tone: 'info' },
  'under-triaged': { icon: 'clock', tone: 'warn' },
  referred: { icon: 'eye', tone: 'warn' },
  missed: { icon: 'eye', tone: 'critical' },
  timeout: { icon: 'clock', tone: 'neutral' },
};

/** The one-line lead under the title (exported for tests). */
export function debriefLead(outcome: Outcome, required: Urgency | undefined, spareSec: number, dxName: string, locale: Locale = 'en'): string {
  const t = pickStrings(S, locale);
  switch (outcome) {
    case 'saved':
      return t.leadSaved(formatMSS(spareSec));
    case 'over-triaged':
      return required ? t.leadOver(t.enoughShort[required]) : t.leadOverGeneric;
    case 'under-triaged':
      return required ? t.leadUnder(t.triage[required]) : t.leadUnderGeneric;
    case 'referred':
      return t.leadReferred(dxName);
    case 'timeout':
      return t.leadTimeout;
    case 'missed':
      return t.leadMissed(dxName);
  }
}

/** results-extra: what the clock looked like and the red flags to carry forward. */
export function DebriefWidget({ services }: { services: GameServices }) {
  const tx = useStrings(S);
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
  const c = { ...OUTCOME_LOOK[outcome], ...tx.outcomes[outcome] };
  const lead = debriefLead(outcome, kase?.urgency, limit - used, dx(kase?.diagnosis ?? s.submitted?.score.correctDiagnosisId ?? ''), services.locale);
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
          <span class="cr-debrief__eyebrow">{tx.debriefEyebrow}</span>
          <h3 class="cr-debrief__title" id="cr-debrief-title">{c.title}</h3>
        </div>
        <span class="cr-debrief__badge"><Badge tone={c.tone} size="sm">{c.badge}</Badge></span>
      </header>
      <p class="cr-debrief__lead">{lead}</p>

      {chosen && needed && (
        <dl class="cr-debrief__triage">
          <div class={`cr-debrief__tri${chosen === needed ? ' is-match' : ''}`}>
            <dt>{tx.youTriaged}</dt>
            <dd>{tx.urgencyLabel[chosen]}</dd>
          </div>
          <span class="cr-debrief__arrow" aria-hidden="true"><Icon name={chosen === needed ? 'check' : 'chevron-right'} size={14} /></span>
          <div class="cr-debrief__tri is-needed">
            <dt>{tx.needed}</dt>
            <dd>{tx.urgencyLabel[needed]}</dd>
          </div>
        </dl>
      )}

      <div class="cr-debrief__timeline">
        <div class="cr-debrief__marks lm-num" aria-hidden="true">
          <span class="cr-debrief__decision" style={{ left: `${pct}%`, translate: `${anchor}% 0` }}>
            {outcome === 'timeout' ? tx.noDecision : tx.decisionAt(formatMSS(used))}
          </span>
        </div>
        <div
          class="cr-debrief__track"
          role="img"
          aria-label={tx.trackAria(outcome === 'timeout', formatMSS(used), formatMSS(limit), showPar ? formatMSS(par!) : undefined)}
        >
          <div class="cr-debrief__fill" style={{ '--w': `${pct}%` }} />
          {showPar && <div class="cr-debrief__par" style={{ left: `${(par! / limit) * 100}%` }} />}
        </div>
        <div class="cr-debrief__scale lm-num" aria-hidden="true">
          <span>0:00</span>
          {showPar && <span class="cr-debrief__parcap" style={{ left: `${(par! / limit) * 100}%` }}>{tx.par(formatMSS(par!))}</span>}
          <span>{formatMSS(limit)}</span>
        </div>
      </div>

      {flags.length > 0 && (
        <>
          <h4 class="cr-debrief__sub">{tx.flagsTitle}</h4>
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
