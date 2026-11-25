import { EYES, type Eye } from '@core';
import { Icon } from '@ui-kit';
import type { Challenge } from './practice';
import { type EyeScore, type EyeTruth, type EyeWork } from './model';
import { useLocale, useT } from './locale';
import { fix } from './strings';

const pct = (v: number) => `${Math.round(v * 100)}%`;

function Row({ ok, label, detail }: { ok: boolean | 'part'; label: string; detail: string }) {
  return (
    <li class={`oph-row oph-row--${ok === true ? 'ok' : ok === 'part' ? 'part' : 'bad'}`}>
      <Icon name={ok === true ? 'check' : ok === 'part' ? 'minus' : 'x'} size={14} />
      <span><strong>{label}</strong> {detail}</span>
    </li>
  );
}

export interface DebriefProps {
  scores: Record<Eye, EyeScore>;
  truths: Record<Eye, EyeTruth>;
  work: Record<Eye, EyeWork>;
  accuracy: number;
  perfect: boolean;
  challenge: Challenge | null;
  choice: string | null;
  onJump: (eye: Eye, itemId: string) => void;
}

export function Debrief({ scores, truths, work, accuracy, perfect, challenge, choice, onJump }: DebriefProps) {
  const t = useT();
  const loc = useLocale();
  const f = (x: string) => fix(loc, x);
  const v = t.verdicts;
  const verdict = perfect ? v.perfect : accuracy >= 0.85 ? v.sharp : accuracy >= 0.65 ? v.solid : accuracy >= 0.4 ? v.keep : v.again;
  const chosenOk = challenge?.options.find((o) => o.id === choice)?.correct;
  return (
    <div class="oph-debrief" data-testid="oph-debrief">
      <div class="oph-debrief__score">
        <strong>{pct(accuracy)}</strong>
        <span>{verdict}</span>
      </div>
      {EYES.map((e) => {
        const s = scores[e];
        const tr = truths[e];
        const w = work[e];
        const reflexOk = s.reflex >= 1 ? true : s.reflex > 0 ? 'part' : false;
        return (
          <section class="oph-debrief__eye" key={e}>
            <h4>{t.eyeFull[e]} <em dir="ltr">{pct(s.total)}</em></h4>
            <ul>
              <Row ok={reflexOk} label={t.rowReflex} detail={w.reflex ? t.youTrue(t.reflexWord[w.reflex], t.reflexWord[tr.reflex]) : t.notCalled(t.reflexWord[tr.reflex])} />
              <Row
                ok={!w.disc ? false : s.cdr >= 1 ? true : s.cdr > 0 ? 'part' : false}
                label={t.rowCdr}
                detail={f(w.disc ? t.youTrue(w.disc.cdr.toFixed(2), tr.disc.cdr.toFixed(2)) : t.notAssessed(tr.disc.cdr.toFixed(2)))}
              />
              <Row ok={s.disc >= 0.95 ? true : s.disc > 0.45 ? 'part' : false} label={t.rowDisc} detail={f(t.discDetail(pct(s.disc)))} />
              <Row ok={s.vessels >= 0.95 ? true : s.vessels > 0.45 ? 'part' : false} label={t.rowVessels} detail={w.vessels ? f(pct(s.vessels)) : t.notGraded} />
              <Row
                ok={s.tags.missed.length === 0 && s.tags.falseTags === 0 ? true : s.tags.f1 > 0.5 ? 'part' : false}
                label={t.rowTags}
                detail={f(t.tagsFound(s.tags.found.length, tr.items.length, s.tags.falseTags))}
              />
            </ul>
            {s.tags.missed.length > 0 && (
              <div class="oph-missed">
                <span>{tr.obscured ? t.hiddenBehind : t.missed}</span>
                {s.tags.missed.map((m) => (
                  <button key={m.id} type="button" class="oph-missed__btn" onClick={() => onJump(e, m.id)} title={t.tags[m.kind].hint}>
                    {t.tags[m.kind].label}
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {challenge && (
        <section class={`oph-debrief__quiz${chosenOk ? ' is-ok' : ' is-bad'}`}>
          <h4>{chosenOk ? t.correct : t.notQuite}</h4>
          <p>{challenge.explanation}</p>
        </section>
      )}
    </div>
  );
}

export function Quiz({ challenge, onAnswer }: { challenge: Challenge; onAnswer: (id: string) => void }) {
  const t = useT();
  return (
    <div class="oph-quiz" data-testid="oph-quiz">
      <p class="oph-quiz__eyebrow">{t.quizEyebrow}</p>
      <h3>{challenge.question}</h3>
      <div class="oph-quiz__opts">
        {challenge.options.map((o, i) => (
          <button key={o.id} type="button" class="oph-quiz__opt" onClick={() => onAnswer(o.id)} data-testid={`oph-quiz-${i}`}>
            <kbd>{i + 1}</kbd><span>{o.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
