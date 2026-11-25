import type { AvatarExpression } from '@render';
import { PatientAvatar } from '@render';
import type { ClinicalCase } from '@core';
import { GlassPanel, SpeechBubble, Icon } from '@ui-kit';

export interface Utterance {
  key: number;
  text: string;
  /** ms before the typewriter starts */
  delay: number;
}

const SEX_WORD = { F: 'Female', M: 'Male', X: '' } as const;

export function PatientPanel(props: { kase: ClinicalCase; expression: AvatarExpression; utterance: Utterance; reduced: boolean }) {
  const { kase, expression, utterance, reduced } = props;
  const p = kase.patient;
  const ext = kase.findings.external;
  const meta = [`${p.age} yrs`, SEX_WORD[p.sex], p.occupation].filter(Boolean).join('  ·  ');
  return (
    <section class="exm-patient" aria-label="Patient">
      <div class="exm-patient__top">
        <div class="exm-portrait">
          <div class="exm-portrait__glow" aria-hidden="true" />
          <div class="exm-portrait__who">
            <PatientAvatar
              spec={p.avatar}
              age={p.age}
              sex={p.sex}
              expression={expression}
              external={ext}
              reducedMotion={reduced}
              label={`${p.name}, ${p.age} years old`}
            />
          </div>
          {!reduced && (
            <div class="exm-door" aria-hidden="true">
              <i /><i /><i /><i />
            </div>
          )}
        </div>
        <div class="exm-card">
          <h2 class="exm-card__name lm-display">{p.name}</h2>
          <p class="exm-card__meta lm-num">{meta}</p>
          {p.personality && <p class="exm-card__quote">{p.personality}</p>}
        </div>
      </div>
      <div class="exm-patient__speech">
        <SpeechBubble
          key={utterance.key}
          text={utterance.text}
          speaker={p.name.split(' ')[0]}
          tail="top"
          delay={utterance.delay}
          speed={utterance.key === 0 ? 40 : 58}
          class="exm-bubble"
        />
      </div>
      {kase.triageNote && (
        <GlassPanel class="exm-triage" padding="sm" accent="#38bdf8" eyebrow="From the front desk" title="Triage note" icon="info" strong>
          <p>{kase.triageNote}</p>
        </GlassPanel>
      )}
      <p class="exm-patient__foot lm-muted">
        <Icon name="eye" size={14} /> Ask, examine, then decide. Every question and test costs clinic time.
      </p>
    </section>
  );
}
