import { EYES, type Eye, type PatientFindings, type PatientProfile } from '@core';
import { Button, Icon } from '@ui-kit';
import { REFLEX_CHOICES, reflexTruth, type ReflexChoice } from './model';
import { useLocale, useT } from './locale';
import { fix } from './strings';

const GLOW: Record<ReflexChoice, { a: string; b: string; c: string; op: number }> = {
  normal: { a: '#ffb067', b: '#e2502a', c: '#8e1810', op: 1 },
  dull: { a: '#9b5a3a', b: '#5a2418', c: '#28100c', op: 0.9 },
  absent: { a: '#150a0c', b: '#0a0507', c: '#050304', op: 1 },
  leukocoria: { a: '#fffaf0', b: '#f1ddc0', c: '#b59d7e', op: 1 },
};

function Pupil({ eye, truth, iris, reduced, lit }: { eye: Eye; truth: ReflexChoice; iris: string; reduced: boolean; lit: boolean }) {
  const t = useT();
  const g = GLOW[lit ? truth : 'absent'];
  const id = `oph-rr-${eye}`;
  return (
    <svg viewBox="-100 -100 200 200" class="oph-pupil" role="img" aria-label={t.pupilAria(t.eyeSide[eye])}>
      <defs>
        <radialGradient id={`${id}-iris`} r="1">
          <stop offset="0.3" stop-color="#05030a" />
          <stop offset="0.38" stop-color={iris} stop-opacity="0.95" />
          <stop offset="0.8" stop-color={iris} stop-opacity="0.65" />
          <stop offset="1" stop-color="#0a0612" />
        </radialGradient>
        <radialGradient id={`${id}-glow`} cx="46%" cy="44%" r="0.62">
          <stop offset="0" stop-color={g.a} />
          <stop offset="0.55" stop-color={g.b} />
          <stop offset="1" stop-color={g.c} />
        </radialGradient>
        <radialGradient id={`${id}-halo`} r="0.5">
          <stop offset="0" stop-color={g.b} stop-opacity={lit && truth !== 'absent' ? 0.55 : 0} />
          <stop offset="1" stop-color={g.b} stop-opacity="0" />
        </radialGradient>
        <clipPath id={`${id}-clip`}><circle r="34" /></clipPath>
      </defs>
      <circle r="98" fill="#1a0f2e" opacity="0.5" />
      <circle r="92" fill={`url(#${id}-halo)`} />
      <circle r="78" fill={`url(#${id}-iris)`} />
      <g opacity="0.35" stroke="#000" stroke-width="0.8">
        {Array.from({ length: 48 }, (_, i) => <line key={i} x1="0" y1="-30" x2="0" y2="-76" transform={`rotate(${i * 7.5})`} />)}
      </g>
      <circle r="34" fill={`url(#${id}-glow)`} class={lit && !reduced && truth !== 'absent' ? 'oph-pupil__pulse' : ''} opacity={g.op} />
      <g clip-path={`url(#${id}-clip)`}>
        <circle r="34" fill="none" stroke="rgba(0,0,0,.65)" stroke-width="5" />
      </g>
      <ellipse cx="-12" cy="-14" rx="7" ry="5" fill="#fff" opacity="0.78" />
      <circle cx="14" cy="10" r="2" fill="#fff" opacity="0.4" />
    </svg>
  );
}

export interface ReflexStepProps {
  findings: PatientFindings;
  patient: PatientProfile;
  calls: Record<Eye, ReflexChoice | null>;
  onCall: (eye: Eye, c: ReflexChoice) => void;
  onContinue: () => void;
  reducedMotion: boolean;
  lit: boolean;
  onLight: () => void;
}

/** Step one: compare the two red reflexes from arm's length. */
export function ReflexStep({ findings, patient, calls, onCall, onContinue, reducedMotion, lit, onLight }: ReflexStepProps) {
  const t = useT();
  const loc = useLocale();
  const ready = EYES.every((e) => calls[e]);
  return (
    <div class="oph-reflex">
      <div class="oph-reflex__scope">
        <div class="oph-reflex__eyes" dir="ltr">
          {EYES.map((e) => (
            <figure key={e} class="oph-reflex__eye">
              <Pupil eye={e} truth={reflexTruth(findings.redReflex[e])} iris={patient.avatar.irisColor} reduced={reducedMotion} lit={lit} />
              <figcaption><b>{e}</b> {t.pupilCaption[e]}</figcaption>
            </figure>
          ))}
        </div>
        {!lit && (
          <div class="oph-reflex__lightbtn">
            <Button variant="primary" size="lg" icon="ophthalmoscopy" sfx={false} onClick={onLight} data-testid="oph-light">{t.shineLight}</Button>
            <span>{fix(loc, t.shineHint)}</span>
          </div>
        )}
      </div>
      <div class={`oph-reflex__panel${lit ? ' is-on' : ''}`}>
        <h3>{t.reflexQ}</h3>
        <p>{t.reflexBody}</p>
        {EYES.map((e) => (
          <div class="oph-reflex__row" key={e} role="radiogroup" aria-label={t.reflexRowAria(e)}>
            <span class="oph-reflex__eyecode">{e}</span>
            {REFLEX_CHOICES.map((c) => (
              <button
                key={c}
                type="button"
                role="radio"
                aria-checked={calls[e] === c}
                disabled={!lit}
                class={`oph-chip${calls[e] === c ? ' is-on' : ''}`}
                onClick={() => onCall(e, c)}
                data-testid={`oph-reflex-${e}-${c}`}
              >
                <strong>{t.reflexChoice[c].title}</strong>
                <small>{t.reflexChoice[c].sub}</small>
              </button>
            ))}
          </div>
        ))}
        <div class="oph-reflex__go">
          <Button variant="primary" size="lg" trailingIcon="arrow-right" disabled={!ready} sfx={false} onClick={onContinue} data-testid="oph-reflex-continue">{t.lookFundus}</Button>
          {!ready && lit && <span><Icon name="info" size={13} /> {t.pickReflex}</span>}
        </div>
      </div>
    </div>
  );
}
