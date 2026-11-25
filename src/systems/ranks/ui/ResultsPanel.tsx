import type { GameServices } from '@core';
import { CountUp, GlassPanel, Stars, useSignal } from '@ui-kit';
import { starsOf, STAR_LABEL } from '../model/mastery';
import { CAREER_COLOR } from '../engine';
import { Crest } from './Crest';
import { ACTIVE, useRanks } from './hooks';
import { XpProgress } from './XpProgress';

const NEXT_STEP = [
  'Make this diagnosis correctly to chart its first star.',
  'Meet it again in a few days — spaced recall earns the second star.',
  'Keep recalling it over the coming weeks for full mastery.',
  'Mastered. Occasional review keeps it bright.',
];

const MISSED_STEP = 'It will return for a Second Opinion soon. Get it right then to chart its first star.';

/** Results screen panel: XP gained (line by line), bar through any promotions, mastery of this diagnosis. */
export function ResultsPanel({ services }: { services: GameServices }) {
  if (!ACTIVE.has(services)) return null;
  return <ResultsPanelInner services={services} />;
}

function ResultsPanelInner({ services }: { services: GameServices }) {
  const { s, info } = useRanks(services);
  const session = useSignal(services.session.state);
  const caseId = session?.caseId;
  const gain = s.lastGain && (!caseId || s.lastGain.caseId === caseId) ? s.lastGain : null;
  const dxId = session?.submitted?.score.correctDiagnosisId;
  const dx = dxId ? services.registries.diagnoses.get(dxId) : undefined;
  const stars = dxId ? starsOf(services.learning, s.dx[dxId], dxId) : 0;
  const total = gain ? gain.toXp - gain.fromXp : 0;
  const missed = session?.submitted ? !session.submitted.score.diagnosisCorrect : false;
  const starLabel = stars === 0 && missed ? 'Not yet charted' : STAR_LABEL[stars];
  const hint = stars === 0 && missed ? MISSED_STEP : NEXT_STEP[stars];

  return (
    <GlassPanel class="rk-results" accent={CAREER_COLOR} glow eyebrow="Career" title={info.title} actions={<Crest rankIndex={info.rankIndex} tier={info.tier} size={44} animate />}>
      {gain ? (
        <>
          <div class="rk-results__gain">
            <CountUp value={total} prefix="+" suffix=" XP" delay={350} tickSfx="tick" class="rk-results__total" />
          </div>
          <ul class="rk-results__lines">
            {gain.lines.map((l, i) => (
              <li key={i} class="rk-results__line lm-enter" style={{ '--lm-delay': `${500 + i * 110}ms` }}>
                <span>{l.label}</span>
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
            <span class="lm-eyebrow">Mastery</span>
            <span class="rk-results__dx">{dx.name}</span>
          </div>
          <div class="rk-results__mastery-row">
            <Stars value={stars} size={22} delay={1400} />
            <span class="rk-results__star-label">{starLabel}</span>
          </div>
          <p class="rk-results__hint">{hint}</p>
        </div>
      )}
    </GlassPanel>
  );
}
