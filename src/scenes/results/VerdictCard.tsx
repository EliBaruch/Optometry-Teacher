import { useMemo } from 'preact/hooks';
import { AvatarBust, EyeCanvas, eyeStateFromFindings } from '@render';
import { Badge, Icon, cx } from '@ui-kit';
import { CONFIDENCE_LABEL, URGENCY_LABEL, affectedEye, type ReviewModel } from './model';

const VERDICT_TITLE: Record<ReviewModel['verdict'], string> = {
  correct: 'Correct diagnosis',
  wrong: 'Not this time',
  timeout: 'Out of time',
  abandoned: 'Case closed',
};

const CATEGORY_LABEL: Record<string, string> = {
  refractive: 'Refractive', binocular: 'Binocular vision', anterior: 'Lids & conjunctiva', cornea: 'Cornea',
  glaucoma: 'Uvea & glaucoma', lens: 'Lens', retina: 'Retina', neuro: 'Neuro-ophthalmology', systemic: 'Systemic', normal: 'Healthy eyes',
};

/** Star-chart rosette on the face-down side of the card. */
function Rosette() {
  const rays = Array.from({ length: 24 }, (_, i) => i * 15);
  return (
    <svg class="rs-rosette" viewBox="0 0 200 200" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="0.8">
        <circle cx="100" cy="100" r="92" opacity="0.5" />
        <circle cx="100" cy="100" r="70" opacity="0.7" />
        <circle cx="100" cy="100" r="44" />
        <circle cx="100" cy="100" r="18" />
        {rays.map((a) => (
          <line key={a} x1="100" y1="100" x2="100" y2={a % 45 === 0 ? 6 : 26} transform={`rotate(${a} 100 100)`} opacity={a % 45 === 0 ? 0.9 : 0.4} />
        ))}
        <path d="M100 56 C124 76 124 124 100 144 C76 124 76 76 100 56Z" opacity="0.9" />
      </g>
      <circle cx="100" cy="100" r="7" fill="currentColor" />
    </svg>
  );
}

export interface VerdictCardProps {
  review: ReviewModel;
  flipped: boolean;
  /** Verdict impact has landed (glow / crossed-out reveal). */
  landed: boolean;
  reduced: boolean;
  /** The flip has finished: the card follows the pointer gently. */
  settled?: boolean;
  cardRef?: (el: HTMLDivElement | null) => void;
}

/** The diagnosis card: face-down with the player's call, flips to the verdict. */
export function VerdictCard({ review, flipped, landed, reduced, settled, cardRef }: VerdictCardProps) {
  const { verdict, kase, correctDx, urgency } = review;
  const p = kase.patient;
  const isWrong = verdict === 'wrong';
  const eye = useMemo(() => {
    const e = affectedEye(kase.findings);
    try {
      return { e, state: eyeStateFromFindings(kase.findings, e) };
    } catch {
      return null;
    }
  }, [kase]);
  return (
    <div
      ref={cardRef}
      class={cx('rs-card', `rs-card--${verdict}`, flipped && 'is-flipped', landed && 'is-landed', settled && 'is-settled', reduced && 'is-reduced')}
      aria-live="polite"
    >
      <div class="rs-card__inner">
        {/* Face-down: what the player committed to */}
        <div class="rs-card__face rs-card__face--back" aria-hidden={flipped}>
          <Rosette />
          <div class="rs-card__back-text">
            <span class="lm-eyebrow">{review.chosenName ? 'Your diagnosis' : 'No diagnosis made'}</span>
            <span class="rs-card__back-name">{review.chosenName ?? (verdict === 'timeout' ? 'The clock ran out' : 'Case closed early')}</span>
          </div>
        </div>

        {/* Face-up: the verdict */}
        <div class="rs-card__face rs-card__face--front" aria-hidden={!flipped}>
          <div class="rs-card__ribbon">
            <Icon name={verdict === 'correct' ? 'check' : verdict === 'wrong' ? 'x' : 'clock'} />
            <span>{VERDICT_TITLE[verdict]}</span>
          </div>
          <div class="rs-card__patient">
            <AvatarBust spec={p.avatar} age={p.age} sex={p.sex} size={52} ring={verdict === 'correct' ? '#ffd27a' : '#a99bbd'} reducedMotion={reduced} label={p.name} />
            <div class="rs-card__patient-text">
              <strong>{p.name}</strong>
              <span>
                {p.age}
                {p.occupation ? ` · ${p.occupation}` : ''}
              </span>
            </div>
          </div>

          {eye && (
            <div class="rs-card__eye" aria-hidden="true">
              <EyeCanvas state={eye.state} width={300} height={150} animate={flipped && !reduced} blink={false} reducedMotion={reduced} />
              <span class="rs-card__eye-tag">{eye.e}</span>
            </div>
          )}

          <div class="rs-card__dx">
            <span class="lm-eyebrow">{verdict === 'correct' ? CATEGORY_LABEL[correctDx?.category ?? ''] ?? 'Diagnosis' : 'The answer was'}</span>
            <h2 class="rs-card__name">{review.correctName}</h2>
            {correctDx?.aka?.length ? <p class="rs-card__aka">also: {correctDx.aka.slice(0, 2).join(' · ')}</p> : null}
          </div>

          {isWrong && review.chosenName && (
            <div class="rs-card__chosen">
              <span class="rs-card__chosen-label">You said</span>
              <span class="rs-card__strike">
                <span>{review.chosenName}</span>
                <svg class="rs-card__strike-line" viewBox="0 0 100 10" preserveAspectRatio="none" aria-hidden="true">
                  <path d="M1 6 C 30 3, 70 8, 99 4" />
                </svg>
              </span>
            </div>
          )}

          <div class="rs-card__meta">
            <span class={cx('rs-triage', urgency.chosen && urgency.delta !== 0 && 'is-off')}>
              <Icon name={urgency.chosen && urgency.delta === 0 ? 'check' : 'alert'} />
              Triage{' '}
              {urgency.chosen && urgency.delta !== 0 ? (
                <>
                  <s>{URGENCY_LABEL[urgency.chosen]}</s> → <b>{URGENCY_LABEL[urgency.correct]}</b>
                </>
              ) : (
                <b>{URGENCY_LABEL[urgency.correct]}</b>
              )}
            </span>
            {review.confidence && (
              <Badge tone={review.confidenceNote === 'confidently-wrong' ? 'bad' : review.confidenceNote === 'lucky' ? 'warn' : 'neutral'} variant="outline" size="sm" icon="target" title="How sure you said you were">
                {CONFIDENCE_LABEL[review.confidence]}
              </Badge>
            )}
          </div>
          <span class="rs-card__glare" aria-hidden="true" />
        </div>
      </div>
    </div>
  );
}
