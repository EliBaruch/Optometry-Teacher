import type { GameServices } from '@core';
import { CountUp, GlassPanel, Stars, useSignal, useStrings, useLocale } from '@ui-kit';
import { starsOf } from '../model/mastery';
import { starLabel } from '../model/locale';
import { S } from '../strings';
import type { XpLine } from '../model/xp';
import { CAREER_COLOR } from '../engine';
import { Crest } from './Crest';
import { ACTIVE, useRanks } from './hooks';
import { XpProgress } from './XpProgress';

/** XP line label in the edition's language (English labels are stored in the save). */
function lineLabel(l: XpLine, he: Record<string, string>, locale: string): string {
  if (locale !== 'he') return l.label;
  if (l.id === 'grade') return `ציון ${l.label.charAt(0)}`;
  if (l.id === 'difficulty') return `${he.difficulty} ${l.label.replace(/^\D+/, '')}`;
  return he[l.id] ?? l.label;
}

/** Results screen panel: XP gained (line by line), bar through any promotions, mastery of this diagnosis. */
export function ResultsPanel({ services }: { services: GameServices }) {
  if (!ACTIVE.has(services)) return null;
  return <ResultsPanelInner services={services} />;
}

function ResultsPanelInner({ services }: { services: GameServices }) {
  const { s, info } = useRanks(services);
  const t = useStrings(S);
  const locale = useLocale();
  const session = useSignal(services.session.state);
  const caseId = session?.caseId;
  const gain = s.lastGain && (!caseId || s.lastGain.caseId === caseId) ? s.lastGain : null;
  const dxId = session?.submitted?.score.correctDiagnosisId;
  const dx = dxId ? services.registries.diagnoses.get(dxId) : undefined;
  const stars = dxId ? starsOf(services.learning, s.dx[dxId], dxId) : 0;
  const total = gain ? gain.toXp - gain.fromXp : 0;
  const missed = session?.submitted ? !session.submitted.score.diagnosisCorrect : false;
  const starText = stars === 0 && missed ? t.notCharted : starLabel(stars, locale);
  const hint = stars === 0 && missed ? t.missedStep : t.nextStep[stars];

  return (
    <GlassPanel class="rk-results" accent={CAREER_COLOR} glow eyebrow={t.career} title={info.title} actions={<Crest rankIndex={info.rankIndex} tier={info.tier} size={44} animate />}>
      {gain ? (
        <>
          <div class="rk-results__gain">
            <CountUp value={total} prefix="+" suffix={` ${t.xp}`} delay={350} tickSfx="tick" class="rk-results__total" />
          </div>
          <ul class="rk-results__lines">
            {gain.lines.map((l, i) => (
              <li key={i} class="rk-results__line lm-enter" style={{ '--lm-delay': `${500 + i * 110}ms` }}>
                <span>{lineLabel(l, t.xpLine, locale)}</span>
                <span class="lm-num">+{l.xp}</span>
              </li>
            ))}
          </ul>
          <XpProgress from={gain.fromXp} to={gain.toXp} delay={700 + gain.lines.length * 110} />
        </>
      ) : (
        <XpProgress from={s.xp} to={s.xp} />
      )}
      {dx && (
        <div class="rk-results__mastery">
          <div class="rk-results__mastery-head">
            <span class="lm-eyebrow">{t.mastery}</span>
            <span class="rk-results__dx">{dx.name}</span>
          </div>
          <div class="rk-results__mastery-row">
            <Stars value={stars} size={22} delay={1400} />
            <span class="rk-results__star-label">{starText}</span>
          </div>
          <p class="rk-results__hint">{hint}</p>
        </div>
      )}
    </GlassPanel>
  );
}
