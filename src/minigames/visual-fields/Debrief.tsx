import { EYES, type Eye, type FieldDefect, type Locale, type MiniGameContext } from '@core';
import { Icon } from '@ui-kit';
import { describeEye, anatomicalSide, type Localisation, type Pattern } from './interpret';
import { fieldOf } from './report';
import type { ExamScore, TechniqueScore } from './scoring';
import { iso, vfT } from './strings';
import { useVf, useVfLocale } from './useVf';

export interface DebriefProps {
  ctx: MiniGameContext;
  picks: Record<Eye, Pattern | null>;
  classify: Record<Eye, number>;
  technique: Record<Eye, TechniqueScore>;
  loc: Localisation | null;
  truthLoc: Localisation;
  score: ExamScore;
}

const patternText = (p: Pattern | null, eye: Eye, locale: Locale) => {
  const t = vfT(locale);
  return !p ? '—' : p.side ? `${t.famLabel[p.family]} · ${t.sideLabel[p.side].toLowerCase()} (${anatomicalSide(p.side, eye, locale)})` : t.famLabel[p.family];
};

const verdict = (v: number) => (v >= 0.999 ? 'ok' : v >= 0.3 ? 'meh' : 'bad');

export function Debrief({ ctx, picks, classify, technique, loc, truthLoc, score }: DebriefProps) {
  const t = useVf();
  const locale = useVfLocale();
  const locOk = loc === truthLoc;
  const practice = ctx.mode === 'practice';
  return (
    <div class="vf-debrief">
      <div class={`vf-verdict ${locOk ? 'is-good' : 'is-bad'}`}>
        <strong>{practice ? (locOk ? t.vLocalised : t.vNotQuite) : locOk ? t.vLocCorrect : t.vLocMissed}</strong>
        <span>{t.locLabel[truthLoc]}{!locOk && loc ? t.youChose(t.locLabel[loc]) : ''}</span>
        <p>{iso(locale, t.locTeach[truthLoc])}</p>
      </div>
      <ul class="vf-debrief__eyes">
        {EYES.map((e) => {
          const truth: FieldDefect = fieldOf(ctx.findings, e);
          const tq = technique[e];
          return (
            <li key={e} class="vf-debrief__eye">
              <bdi class="vf-debrief__code">{e}</bdi>
              <span class="vf-debrief__body">
                <span class="vf-debrief__truth">{describeEye(truth, e, locale)}</span>
                <span class="vf-debrief__you">
                  <span class={verdict(classify[e])}>
                    <Icon name={classify[e] >= 0.999 ? 'check' : 'x'} size={12} /> {patternText(picks[e], e, locale)}
                  </span>
                </span>
                <span class="vf-debrief__stats">
                  <span class={tq.coverage >= 1 ? 'ok' : tq.coverage >= 0.75 ? 'meh' : 'bad'}>{t.coverage(Math.round(tq.coverage * 8))}</span>
                  <span class={tq.efficiency >= 1 ? 'ok' : 'meh'}>{t.points(tq.points)}</span>
                  {fieldOf(ctx.findings, e) !== 'full' && <span class={tq.hits >= 2 ? 'ok' : 'bad'}>{t.inDefect(tq.hits)}</span>}
                </span>
              </span>
            </li>
          );
        })}
      </ul>
      <div class="vf-debrief__score">
        <span>{t.scTechnique} <b>{Math.round(score.technique * 100)}%</b></span>
        <span>{t.scPatterns} <b>{Math.round(score.classify * 100)}%</b></span>
        <span>{t.scSite} <b>{Math.round(score.localisation * 100)}%</b></span>
      </div>
      <p class="vf-debrief__legend"><i /> {t.legend}</p>
    </div>
  );
}
