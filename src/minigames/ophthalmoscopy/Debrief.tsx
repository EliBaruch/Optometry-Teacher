import { EYES, type Eye } from '@core';
import { Icon } from '@ui-kit';
import type { Challenge } from './practice';
import { TAGS, type EyeScore, type EyeTruth, type EyeWork, type ReflexChoice, type TagKind } from './model';

const REFLEX_WORD: Record<ReflexChoice, string> = { normal: 'bright', dull: 'dull', absent: 'absent', leukocoria: 'white' };
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
  const verdict = perfect ? 'Flawless sweep' : accuracy >= 0.85 ? 'Sharp eye' : accuracy >= 0.65 ? 'Solid exam' : accuracy >= 0.4 ? 'Keep practising' : 'Look again, slower';
  const chosenOk = challenge?.options.find((o) => o.id === choice)?.correct;
  return (
    <div class="oph-debrief" data-testid="oph-debrief">
      <div class="oph-debrief__score">
        <strong>{pct(accuracy)}</strong>
        <span>{verdict}</span>
      </div>
      {EYES.map((e) => {
        const s = scores[e];
        const t = truths[e];
        const w = work[e];
        const reflexOk = s.reflex >= 1 ? true : s.reflex > 0 ? 'part' : false;
        return (
          <section class="oph-debrief__eye" key={e}>
            <h4>{e === 'OD' ? 'Right eye (OD)' : 'Left eye (OS)'} <em>{pct(s.total)}</em></h4>
            <ul>
              <Row ok={reflexOk} label="Red reflex" detail={w.reflex ? `you: ${REFLEX_WORD[w.reflex]} · true: ${REFLEX_WORD[t.reflex]}` : `not called · true: ${REFLEX_WORD[t.reflex]}`} />
              <Row
                ok={!w.disc ? false : s.cdr >= 1 ? true : s.cdr > 0 ? 'part' : false}
                label="Cup-to-disc"
                detail={w.disc ? `you: ${w.disc.cdr.toFixed(2)} · true: ${t.disc.cdr.toFixed(2)}` : `not assessed · true: ${t.disc.cdr.toFixed(2)}`}
              />
              <Row ok={s.disc >= 0.95 ? true : s.disc > 0.45 ? 'part' : false} label="Disc detail" detail={`colour, margins, rim ${pct(s.disc)}`} />
              <Row ok={s.vessels >= 0.95 ? true : s.vessels > 0.45 ? 'part' : false} label="Vessels" detail={w.vessels ? pct(s.vessels) : 'not graded'} />
              <Row
                ok={s.tags.missed.length === 0 && s.tags.falseTags === 0 ? true : s.tags.f1 > 0.5 ? 'part' : false}
                label="Tags"
                detail={`${s.tags.found.length} of ${t.items.length} found${s.tags.falseTags ? ` · ${s.tags.falseTags} false` : ''}`}
              />
            </ul>
            {s.tags.missed.length > 0 && (
              <div class="oph-missed">
                <span>{t.obscured ? 'Hidden behind the opacity' : 'Missed'}</span>
                {s.tags.missed.map((m) => (
                  <button key={m.id} type="button" class="oph-missed__btn" onClick={() => onJump(e, m.id)} title={TAGS[m.kind as TagKind].hint}>
                    {m.label}
                  </button>
                ))}
              </div>
            )}
          </section>
        );
      })}
      {challenge && (
        <section class={`oph-debrief__quiz${chosenOk ? ' is-ok' : ' is-bad'}`}>
          <h4>{chosenOk ? 'Correct' : 'Not quite'}</h4>
          <p>{challenge.explanation}</p>
        </section>
      )}
    </div>
  );
}

export function Quiz({ challenge, onAnswer }: { challenge: Challenge; onAnswer: (id: string) => void }) {
  return (
    <div class="oph-quiz" data-testid="oph-quiz">
      <p class="oph-quiz__eyebrow">Recognition check</p>
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
