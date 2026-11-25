import type { AvatarExpression } from '@render';
import { PatientAvatar } from '@render';
import type { ClinicalCase } from '@core';
import { GlassPanel, SpeechBubble, Icon, useStrings } from '@ui-kit';
import { S } from './strings';

export interface Utterance {
  key: number;
  text: string;
  /** ms before the typewriter starts */
  delay: number;
}

export function PatientPanel(props: { kase: ClinicalCase; expression: AvatarExpression; utterance: Utterance; reduced: boolean }) {
  const { kase, expression, utterance, reduced } = props;
  const t = useStrings(S);
  const p = kase.patient;
  const ext = kase.findings.external;
  const meta = t.patientMeta(p.age, p.sex, p.occupation ?? '');
  return (
    <section class="exm-patient" aria-label={t.patientAria}>
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
              label={t.avatarLabel(p.name, p.age, p.sex)}
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
          <p class="exm-card__meta lm-num" dir="auto">{meta}</p>
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
        <GlassPanel class="exm-triage" padding="sm" accent="#38bdf8" eyebrow={t.triageEyebrow} title={t.triageTitle} icon="info" strong>
          <p>{kase.triageNote}</p>
        </GlassPanel>
      )}
      <p class="exm-patient__foot lm-muted">
        <Icon name="eye" size={14} /> {t.patientFoot}
      </p>
    </section>
  );
}
