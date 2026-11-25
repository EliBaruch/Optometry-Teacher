import { EYES, type Eye, type FieldDefect, type MiniGameContext } from '@core';
import { Icon } from '@ui-kit';
import { describeEye, FAMILY_LABEL, LOCALISATION_LABEL, SIDE_LABEL, anatomicalSide, type Localisation, type Pattern } from './interpret';
import { LOCALISATION_TEACH } from './practice';
import { fieldOf } from './report';
import type { ExamScore, TechniqueScore } from './scoring';

export interface DebriefProps {
  ctx: MiniGameContext;
  picks: Record<Eye, Pattern | null>;
  classify: Record<Eye, number>;
  technique: Record<Eye, TechniqueScore>;
  loc: Localisation | null;
  truthLoc: Localisation;
  score: ExamScore;
}

const patternText = (p: Pattern | null, eye: Eye) =>
  !p ? '—' : p.side ? `${FAMILY_LABEL[p.family]} · ${SIDE_LABEL[p.side].toLowerCase()} (${anatomicalSide(p.side, eye)})` : FAMILY_LABEL[p.family];

const verdict = (v: number) => (v >= 0.999 ? 'ok' : v >= 0.3 ? 'meh' : 'bad');

export function Debrief({ ctx, picks, classify, technique, loc, truthLoc, score }: DebriefProps) {
  const locOk = loc === truthLoc;
  const practice = ctx.mode === 'practice';
  return (
    <div class="vf-debrief">
      <div class={`vf-verdict ${locOk ? 'is-good' : 'is-bad'}`}>
        <strong>{practice ? (locOk ? 'Lesion localised' : 'Not quite') : locOk ? 'Localisation correct' : 'Localisation missed'}</strong>
        <span>{LOCALISATION_LABEL[truthLoc]}{!locOk && loc ? ` — you chose ${LOCALISATION_LABEL[loc].toLowerCase()}` : ''}</span>
        <p>{LOCALISATION_TEACH[truthLoc]}</p>
      </div>
      <ul class="vf-debrief__eyes">
        {EYES.map((e) => {
          const truth: FieldDefect = fieldOf(ctx.findings, e);
          const t = technique[e];
          return (
            <li key={e} class="vf-debrief__eye">
              <span class="vf-debrief__code">{e}</span>
              <span class="vf-debrief__body">
                <span class="vf-debrief__truth">{describeEye(truth, e)}</span>
                <span class="vf-debrief__you">
                  <span class={verdict(classify[e])}>
                    <Icon name={classify[e] >= 0.999 ? 'check' : 'x'} size={12} /> {patternText(picks[e], e)}
                  </span>
                </span>
                <span class="vf-debrief__stats">
                  <span class={t.coverage >= 1 ? 'ok' : t.coverage >= 0.75 ? 'meh' : 'bad'}>coverage {Math.round(t.coverage * 8)}/8 sectors</span>
                  <span class={t.efficiency >= 1 ? 'ok' : 'meh'}>{t.points} points</span>
                  {fieldOf(ctx.findings, e) !== 'full' && <span class={t.hits >= 2 ? 'ok' : 'bad'}>{t.hits} in defect</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div class="vf-debrief__score">
        <span>Technique <b>{Math.round(score.technique * 100)}%</b></span>
        <span>Patterns <b>{Math.round(score.classify * 100)}%</b></span>
        <span>Site <b>{Math.round(score.localisation * 100)}%</b></span>
      </div>
      <p class="vf-debrief__legend"><i /> true defect shown in rose on each plot</p>
    </div>
  );
}
