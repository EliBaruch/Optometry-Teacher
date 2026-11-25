import { useMemo } from 'preact/hooks';
import { playSingleCase, type Diagnosis, type GameServices } from '@core';
import { Button, Icon, RingMeter, Stars, cx, useRegistry, useStrings } from '@ui-kit';
import { URGENCY_META, casesFor, confusedWith, masteryTier, referenceLabel, safeUrl } from './logic';
import { S } from './strings';
import { Illumination, RarityGem, UrgencyTag, useNarrow } from './parts';

export interface EntryDetailProps {
  services: GameServices;
  d: Diagnosis;
  cm: (c: string) => { label: string; accent: string; icon: string };
  isUnlocked: (id: string) => boolean;
  onNavigate: (id: string) => void;
}

/** The illuminated page for one diagnosis (rendered inside a Modal). */
export function EntryDetail({ services, d, cm, isUnlocked, onNavigate }: EntryDetailProps) {
  const t = useStrings(S);
  const rtl = services.locale === 'he';
  const cases = useRegistry(services.registries.cases);
  const examReady = useRegistry(services.registries.scenes).some((s) => s.id === 'exam');
  const meta = cm(d.category);
  const seen = services.learning.seen(d.id);
  const mastery = seen ? services.learning.mastery(d.id) : 0;
  const tier = masteryTier(mastery, seen);
  const pool = useMemo(() => casesFor(cases, d.id), [cases, d.id]);
  const confused = useMemo(
    () => confusedWith(cases, d.id).map((id) => services.registries.diagnoses.get(id)).filter((x): x is Diagnosis => !!x),
    [cases, d.id],
  );
  const url = safeUrl(d.reference);
  const urgency = { ...URGENCY_META[d.typicalUrgency], ...t.urgency[d.typicalUrgency] };
  const narrow = useNarrow();
  const stars = mastery >= 0.8 ? 3 : mastery >= 0.55 ? 2 : mastery >= 0.25 ? 1 : 0;

  const canPractise = examReady && pool.length > 0;
  const practise = () => {
    if (!canPractise) return;
    const kase = services.rng.pick(pool);
    services.audio.play('door');
    playSingleCase(services, kase.id);
  };

  return (
    <article class="codex-page" style={{ '--acc': meta.accent }}>
      <header class="codex-page__head">
        <Illumination letter={d.name.charAt(0)} accent={meta.accent} size={92} icon={meta.icon} />
        <div class="codex-page__titles">
          <div class="lm-eyebrow codex-page__cat">{meta.label}</div>
          <h2 class="codex-page__name">{d.name}</h2>
          {d.aka && d.aka.length > 0 && <p class="codex-page__aka">{t.alsoCalled(d.aka.join(' · '))}</p>}
          <div class="codex-page__tags">
            <UrgencyTag urgency={d.typicalUrgency} />
            <RarityGem rarity={d.rarity} />
          </div>
        </div>
        <div class="codex-page__mastery">
          <RingMeter value={mastery} size={narrow ? 56 : 96} thickness={narrow ? 6 : 7} ticks={!narrow} accent={meta.accent} ariaLabel={t.masteryAria(Math.round(mastery * 100))}>
            <span class="codex-page__pct lm-num">{Math.round(mastery * 100)}<small>%</small></span>
          </RingMeter>
          <span class="codex-page__tierbox">
            <span class="codex-page__tier">{t.tier[tier]}</span>
            {seen && <Stars value={stars} size={16} sfx={false} />}
          </span>
        </div>
      </header>

      <p class="codex-page__summary">{d.summary}</p>

      <div class="codex-page__cols">
        <section class="codex-page__section" aria-labelledby={`kf-${d.id}`}>
          <h3 id={`kf-${d.id}`} class="codex-page__h"><Icon name="target" /> {t.keyFindings}</h3>
          <ul class="codex-findings" role="list">
            {d.keyFindings.map((f, i) => <li key={i} style={{ '--i': i }}>{f}</li>)}
          </ul>
        </section>
        <section class="codex-page__section" aria-labelledby={`pp-${d.id}`}>
          <h3 id={`pp-${d.id}`} class="codex-page__h"><Icon name="sparkle" /> {t.pearls}</h3>
          <div class="codex-pearls">
            {d.pearls.map((p, i) => <p key={i} class="codex-pearl" style={{ '--i': i }}>{p}</p>)}
          </div>
        </section>
      </div>

      <section class={cx('codex-triage', `codex-triage--${d.typicalUrgency}`)} style={{ '--u': urgency.color }}>
        <div class="codex-triage__scale" aria-hidden="true">
          {(['routine', 'soon', 'urgent', 'emergency'] as const).map((u) => (
            <span key={u} class={cx(u === d.typicalUrgency && 'is-on')} style={{ '--c': URGENCY_META[u].color }} />
          ))}
        </div>
        <div>
          <div class="codex-triage__label">{t.typicalUrgency}<b>{urgency.label}</b></div>
          <p class="codex-triage__when">{urgency.when} {t.urgencyNote}</p>
        </div>
      </section>

      {confused.length > 0 && (
        <section class="codex-page__section">
          <h3 class="codex-page__h"><Icon name="users" /> {t.confused}</h3>
          <div class="codex-confused">
            {confused.map((c) => {
              const open = isUnlocked(c.id);
              const cmeta = cm(c.category);
              return (
                <button key={c.id} type="button" class={cx('codex-confused__chip', !open && 'is-locked')} style={{ '--acc': cmeta.accent }}
                  onClick={() => onNavigate(c.id)} aria-label={open ? t.openEntry(c.name) : t.sealedEntry(cmeta.label)}>
                  {open ? <Icon name="book" /> : <span class="codex-confused__seal" aria-hidden="true">{cmeta.label.charAt(0)}</span>}
                  {open ? c.name : <span>{t.sealedDot}<span class="codex-confused__cat">{cmeta.label}</span></span>}
                </button>
              );
            })}
          </div>
        </section>
      )}

      <footer class="codex-page__foot">
        {url ? (
          <a class="codex-ref" href={url} target="_blank" rel="noopener noreferrer">
            <Icon name="book" /> {t.readMore}{rtl ? '' : ' '}<bdi>{referenceLabel(url)}</bdi> <Icon name="arrow-right" class="codex-ref__arrow" />
          </a>
        ) : <span />}
        <Button variant="primary" icon={examReady ? 'play' : 'clock'} disabled={!canPractise} onClick={practise} sfx="select"
          title={!examReady ? t.examSoonTitle : pool.length ? t.casesAvail(pool.length) : t.noPatient}>
          {!examReady ? t.examSoon : pool.length ? t.practiseCase : t.noCase}
        </Button>
      </footer>
    </article>
  );
}
