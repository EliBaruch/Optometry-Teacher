import { ALL_TESTS, URGENCIES } from '@core';
import { Button, GlassPanel, Icon, IconOrText, cx, palette, useLocale, useStrings } from '@ui-kit';
import { testRef, type ReviewModel } from './model';
import { S } from './strings';

/** Metacognition nudges based on the confidence the player declared. */
export function ConfidenceCallout({ review, onReadFindings }: { review: ReviewModel; onReadFindings: () => void }) {
  const t = useStrings(S);
  const note = review.confidenceNote;
  if (note === 'confidently-wrong') {
    return (
      <div class="rs-callout rs-callout--review" role="note">
        <span class="rs-callout__icon">
          <Icon name="refresh" />
        </span>
        <div>
          <strong>{t.confWrongTitle}</strong>
          <p>
            {t.confWrongBefore}<em>{review.correctName}</em>{t.confWrongAfter}
          </p>
        </div>
      </div>
    );
  }
  if (note === 'lucky') {
    return (
      <div class="rs-callout rs-callout--lucky" role="note">
        <span class="rs-callout__icon">
          <Icon name="sparkle" />
        </span>
        <div>
          <strong>{t.luckyTitle}</strong>
          <p>{t.luckyBody}</p>
        </div>
        <Button size="sm" variant="ghost" trailingIcon="arrow-right" onClick={onReadFindings}>
          {t.luckyBtn}
        </Button>
      </div>
    );
  }
  if (note === 'calibrated') {
    return (
      <div class="rs-callout rs-callout--calibrated" role="note">
        <span class="rs-callout__icon">
          <Icon name="target" />
        </span>
        <div>
          <strong>{t.calibrated}</strong>
        </div>
      </div>
    );
  }
  return null;
}

export function DiagnosisPanel({ review, panelRef }: { review: ReviewModel; panelRef?: (el: HTMLElement | null) => void }) {
  const t = useStrings(S);
  const dx = review.correctDx;
  return (
    <section ref={panelRef} class="rs-teach rs-teach--dx" style={{ '--n': 0 }} tabIndex={-1} aria-labelledby="rs-dx-title">
      <GlassPanel strong eyebrow={t.fromCodex} title={<span id="rs-dx-title">{review.correctName}</span>} icon="book" accent={palette.gold}>
        {dx ? (
          <>
            <p class="rs-teach__summary">{dx.summary}</p>
            <h4 class="rs-teach__h">{t.keyFindings}</h4>
            <ul class="rs-list rs-list--findings" role="list">
              {dx.keyFindings.map((k) => (
                <li key={k}>
                  <Icon name="check" />
                  <span>{k}</span>
                </li>
              ))}
            </ul>
            {dx.pearls.length > 0 && (
              <>
                <h4 class="rs-teach__h">{t.pearls}</h4>
                <ul class="rs-list rs-list--pearls" role="list">
                  {dx.pearls.map((k) => (
                    <li key={k}>
                      <IconOrText icon="✦" />
                      <span>{k}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            {dx.reference && (
              <a class="rs-teach__ref" href={dx.reference} target="_blank" rel="noopener noreferrer">
                {t.furtherReading} <Icon name="arrow-right" />
              </a>
            )}
          </>
        ) : (
          <p class="lm-muted">{t.noCodex}</p>
        )}
      </GlassPanel>
    </section>
  );
}

export function CasePanel({ review }: { review: ReviewModel }) {
  const t = useStrings(S);
  const k = review.kase;
  return (
    <section class="rs-teach rs-teach--case" style={{ '--n': 1 }}>
      <GlassPanel strong eyebrow={t.caseOf(k.patient.name)} title={t.teachesTitle} icon="user">
        <ul class="rs-list rs-list--points" role="list">
          {k.teachingPoints.map((pt) => (
            <li key={pt}>
              <Icon name="chevron-right" />
              <span>{pt}</span>
            </li>
          ))}
        </ul>
        {k.redFlags && k.redFlags.length > 0 && (
          <div class="rs-redflags">
            <h4 class="rs-teach__h">
              <Icon name="warning" /> {t.redFlags}
            </h4>
            <ul class="rs-list" role="list">
              {k.redFlags.map((rf) => (
                <li key={rf}>
                  <Icon name="alert" />
                  <span>{rf}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        <h4 class="rs-teach__h">{t.management}</h4>
        <p class="rs-teach__mgmt">{k.management}</p>
      </GlassPanel>
    </section>
  );
}

export function TriagePanel({ review }: { review: ReviewModel }) {
  const t = useStrings(S);
  const u = review.urgency;
  const ok = !u.chosen || u.delta === 0;
  return (
    <section class="rs-teach rs-teach--triage" style={{ '--n': 2 }}>
      <GlassPanel strong eyebrow={t.triageEyebrow} title={`${t.urgency[u.correct]}: ${u.meaning}`} icon="alert" accent={u.correct === 'emergency' ? palette.critical : u.correct === 'urgent' ? palette.streaks : undefined}>
        <div class="rs-scale" role="img" aria-label={t.correctUrgencyAria(t.urgency[u.correct], u.chosen ? t.urgency[u.chosen] : undefined)}>
          {URGENCIES.map((lvl) => (
            <div key={lvl} class={cx('rs-scale__step', `rs-scale__step--${lvl}`, lvl === u.correct && 'is-correct', lvl === u.chosen && lvl !== u.correct && 'is-chosen')}>
              <span class="rs-scale__pip" />
              <span class="rs-scale__label">{t.urgency[lvl]}</span>
              {lvl === u.chosen && lvl !== u.correct && <span class="rs-scale__tag">{t.tagYou}</span>}
              {lvl === u.correct && <span class="rs-scale__tag rs-scale__tag--ok">{t.tagAnswer}</span>}
            </div>
          ))}
        </div>
        <p class={cx('rs-teach__advice', !ok && (u.delta < 0 ? 'is-under' : 'is-over'))}>{u.advice}</p>
      </GlassPanel>
    </section>
  );
}

export function MissedPanel({ review }: { review: ReviewModel }) {
  const t = useStrings(S);
  const { missedTests, unaskedKey, unnecessaryTests } = review;
  return (
    <section class="rs-teach rs-teach--missed" style={{ '--n': 3 }}>
      <GlassPanel strong eyebrow={t.workup} title={review.cleanWorkup ? t.nothingMissed : t.whatMissed} icon="target" accent={review.cleanWorkup ? palette.normal : palette.abnormal}>
        {review.cleanWorkup && <p class="rs-teach__clean">{t.cleanWorkup}</p>}
        {missedTests.length > 0 && (
          <>
            <h4 class="rs-teach__h">{t.missedTests}</h4>
            <ul class="rs-tests" role="list">
              {missedTests.map((t) => (
                <li key={t.id} class="rs-test rs-test--missed">
                  <span class="rs-test__icon">
                    <IconOrText icon={t.id} />
                  </span>
                  <span>
                    <strong>{t.name}</strong>
                    <small>{t.blurb}</small>
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
        {unaskedKey.length > 0 && (
          <>
            <h4 class="rs-teach__h">{t.unaskedKey}</h4>
            <ul class="rs-qa" role="list">
              {unaskedKey.map((q) => (
                <li key={q.id}>
                  <span class="rs-qa__cat">{t.historyCat[q.category] ?? q.category}</span>
                  <p class="rs-qa__q">{q.q}</p>
                  <p class="rs-qa__a">“{q.a}”</p>
                </li>
              ))}
            </ul>
          </>
        )}
        {unnecessaryTests.length > 0 && (
          <>
            <h4 class="rs-teach__h">{t.unnecessary}</h4>
            <ul class="rs-tests rs-tests--inline" role="list">
              {unnecessaryTests.map((t) => (
                <li key={t.id} class="rs-test rs-test--extra">
                  <span class="rs-test__icon">
                    <IconOrText icon={t.id} />
                  </span>
                  <strong>{t.name}</strong>
                </li>
              ))}
            </ul>
          </>
        )}
      </GlassPanel>
    </section>
  );
}

/** One-line reflection prompt: the two findings that clinched it. */
export function ReflectionCard({ review }: { review: ReviewModel }) {
  const t = useStrings(S);
  if (!review.clinchers.length) return null;
  const fromChart = review.clinchers.some((c) => c.source === 'chart');
  return (
    <section class="rs-teach rs-reflect" style={{ '--n': 4 }} aria-label={t.reflection}>
      <div class="rs-reflect__q">
        <span class="lm-eyebrow">{t.reflect}</span>
        <h3>{t.clinched}</h3>
        <p class="lm-muted">{fromChart ? t.fromChart : t.thinChart}</p>
      </div>
      <ol class="rs-reflect__list" role="list">
        {review.clinchers.map((c, i) => (
          <li key={i} class={cx('rs-clue', `rs-clue--${c.flag}`, c.source === 'textbook' && 'is-textbook')}>
            <span class="rs-clue__n">{i + 1}</span>
            <span class="rs-clue__body">
              <span class="rs-clue__label">
                {c.label}
                {c.eye ? <em> {c.eye}</em> : null}
              </span>
              {c.value && <span class="rs-clue__value lm-num">{c.value}</span>}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Timeout: where the work-up had got to when the clock ran out, and the order that would have beaten it. */
export function ClockPanel({ review, limitSec }: { review: ReviewModel; limitSec?: number }) {
  const t = useStrings(S);
  const locale = useLocale();
  const testName = (id: Parameters<typeof testRef>[0]) => testRef(id, locale).name;
  const k = review.kase;
  const essentials = k.essentialTests.length;
  const keyQs = k.history.filter((h) => h.relevance === 'key').length;
  const stats = [
    { label: t.essentialTests, done: essentials - review.missedTests.length, of: essentials },
    { label: t.keyQs, done: keyQs - review.unaskedKey.length, of: keyQs },
  ];
  return (
    <GlassPanel class="rs-clock" strong padding="md" eyebrow={t.clockStopped} title={limitSec ? t.onTheClock(`${Math.floor(limitSec / 60)}:${String(limitSec % 60).padStart(2, '0')}`) : t.timeRanOut} icon="clock">
      <div class="rs-clock__stats">
        {stats.map((s) => (
          <div key={s.label} class="rs-clock__stat">
            <span class="rs-clock__num lm-num">
              {s.done}
              <small>/{s.of}</small>
            </span>
            <span class="rs-clock__label">{s.label}</span>
            <span class="rs-clock__bar" aria-hidden="true">
              <span style={{ width: `${s.of ? (100 * s.done) / s.of : 100}%` }} />
            </span>
          </div>
        ))}
      </div>
      {essentials > 0 && (
        <>
          <h4 class="rs-teach__h">{t.essentialsInOrder}</h4>
          <ol class="rs-clock__route" role="list">
            {[...k.essentialTests].sort((a, b) => ALL_TESTS.indexOf(a) - ALL_TESTS.indexOf(b)).map((t) => (
              <li key={t} class={cx(review.missedTests.some((m) => m.id === t) && 'is-missed')}>
                <IconOrText icon={t} />
                <span>{testName(t)}</span>
              </li>
            ))}
          </ol>
        </>
      )}
    </GlassPanel>
  );
}
