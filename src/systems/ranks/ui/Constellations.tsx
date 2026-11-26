import { useMemo, useState } from 'preact/hooks';
import type { Diagnosis, DiagnosisCategory, GameServices } from '@core';
import { Stars, useSfx, useStrings, useLocale } from '@ui-kit';
import { CATEGORY_ORDER, starsOf } from '../model/mastery';
import { categoryLabel, constellationName, starLabel } from '../model/locale';
import { S } from '../strings';
import type { RanksState } from '../model/state';
import { hash01 } from './hooks';
import { layoutConstellation } from './layout';

const W = 300;
const H = 176;

interface StarView {
  dx: Diagnosis;
  stars: number;
  fading: boolean;
  charted: boolean;
}

function viewOf(services: GameServices, s: RanksState, dx: Diagnosis): StarView {
  const rec = s.dx[dx.id];
  const stars = starsOf(services.learning, rec, dx.id);
  let seen = false;
  try {
    seen = services.learning.seen(dx.id);
  } catch {
    seen = false;
  }
  return { dx, stars, fading: (rec?.bestStars ?? 0) > stars, charted: !!rec || seen };
}

/** The mastery map: one node graph per specialty; nodes turn from grey to yellow, blue and green as diagnoses are mastered. */
export function Constellations({ services, s }: { services: GameServices; s: RanksState }) {
  const t = useStrings(S);
  const groups = useMemo(() => {
    const all = services.registries.diagnoses.all();
    const by = new Map<DiagnosisCategory, StarView[]>();
    for (const d of all) {
      const list = by.get(d.category) ?? [];
      list.push(viewOf(services, s, d));
      by.set(d.category, list);
    }
    return CATEGORY_ORDER.filter((c) => by.has(c)).map((c) => ({ cat: c, stars: by.get(c)!.sort((a, b) => a.dx.id.localeCompare(b.dx.id)) }));
  }, [s, services]);

  if (!groups.length) return <p class="rk-empty">{t.noConditions}</p>;
  return (
    <div class="rk-sky">
      <div class="rk-sky__legend" aria-hidden="true">
        <span><i class="rk-dot rk-dot--0" /> {t.legend.u}</span>
        <span><i class="rk-dot rk-dot--1" /> {t.legend.r}</span>
        <span><i class="rk-dot rk-dot--2" /> {t.legend.c}</span>
        <span><i class="rk-dot rk-dot--3" /> {t.legend.m}</span>
        <span><i class="rk-dot rk-dot--fade" /> {t.legend.d}</span>
      </div>
      <div class="rk-sky__grid">
        {groups.map((g, i) => (
          <ConstellationCard key={g.cat} cat={g.cat} stars={g.stars} index={i} />
        ))}
      </div>
    </div>
  );
}

function ConstellationCard({ cat, stars, index }: { cat: DiagnosisCategory; stars: StarView[]; index: number }) {
  const t = useStrings(S);
  const locale = useLocale();
  const play = useSfx();
  const [sel, setSel] = useState<number | null>(null);
  const { points, edges } = useMemo(() => layoutConstellation(stars.map((v) => v.dx.id), W, H), [stars.length, cat]);
  const lit = stars.filter((v) => v.stars > 0).length;
  const mastered = stars.filter((v) => v.stars >= 3).length;
  const total = stars.reduce((a, v) => a + v.stars, 0);
  const pick = (i: number) => {
    setSel(i === sel ? null : i);
    play('select', { pitch: 0.9 + (stars[i]!.stars || 0) * 0.12 });
  };
  const cur = sel !== null ? stars[sel] : null;

  return (
    <section class="rk-const lm-enter" style={{ '--lm-delay': `${index * 70}ms` }} aria-label={t.constLabel(categoryLabel(cat, locale), lit, stars.length, mastered)}>
      <header class="rk-const__head">
        <div>
          <div class="lm-eyebrow">{categoryLabel(cat, locale)}</div>
          <h3 class="rk-const__name">{constellationName(cat, locale)}</h3>
        </div>
        <div class="rk-const__count lm-num" title={t.starsEarned}>
          <span class="rk-const__star">★</span> {total}
          <span class="rk-const__of">/{stars.length * 3}</span>
        </div>
      </header>
      <svg class="rk-const__sky" viewBox={`0 0 ${W} ${H}`} role="group" aria-label={t.chartLabel(constellationName(cat, locale))}>
        {/* faint dot grid */}
        {Array.from({ length: 26 }, (_, i) => (
          <circle key={i} cx={hash01(cat, i * 3 + 101) * W} cy={hash01(cat, i * 3 + 102) * H} r={0.4 + hash01(cat, i * 3 + 103) * 0.8} class="rk-const__dust" />
        ))}
        {edges.map(([a, b], i) => {
          const on = stars[a]!.stars > 0 && stars[b]!.stars > 0;
          const pa = points[a]!;
          const pb = points[b]!;
          return <line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y} class={`rk-const__edge${on ? ' is-lit' : ''}`} />;
        })}
        {points.map((p, i) => {
          const v = stars[i]!;
          const r = v.stars === 0 ? (v.charted ? 2.4 : 1.9) : 2.6 + v.stars * 1.25;
          const glow = v.stars === 0 ? 0 : 9 + v.stars * 6;
          const label = v.charted ? `${v.dx.name}: ${starLabel(v.stars, locale)}${v.fading ? t.dueComma : ''}` : t.uncharted;
          return (
            <g
              key={v.dx.id}
              class={`rk-star rk-star--${v.stars}${v.fading ? ' is-fading' : ''}${!v.charted ? ' is-uncharted' : ''}${sel === i ? ' is-sel' : ''}`}
              transform={`translate(${p.x} ${p.y})`}
              style={{ '--tw': `${(hash01(v.dx.id, 7) * 4).toFixed(2)}s` }}
              role="button"
              tabIndex={0}
              aria-label={label}
              aria-pressed={sel === i}
              onClick={() => pick(i)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  pick(i);
                }
              }}
            >
              <circle r="14" class="rk-star__hit" />
              {glow > 0 && <circle r={glow * 0.55} class="rk-star__glow" />}
              {v.stars === 0 && <circle r={v.charted ? 5 : 4.4} class="rk-star__halo0" />}
              <circle r={r} class="rk-star__core" />
              {v.fading && <circle r={r + 4} class="rk-star__ring" />}
              {sel === i && <circle r={r + 7} class="rk-star__sel" />}
            </g>
          );
        })}
      </svg>
      <div class="rk-const__detail" aria-live="polite">
        {cur ? (
          cur.charted ? (
            <>
              <div class="rk-const__dx">{cur.dx.name}</div>
              <div class="rk-const__dxrow">
                <Stars value={cur.stars} size={16} animate={false} sfx={false} />
                <span>{starLabel(cur.stars, locale)}</span>
                {cur.fading && <span class="rk-const__due">{t.dueForReview}</span>}
              </div>
            </>
          ) : (
            <div class="rk-const__hint">{t.unchartedHint}</div>
          )
        ) : (
          <div class="rk-const__hint">
            <bdi class="lm-num">{t.summary(lit, stars.length, mastered)}</bdi>
          </div>
        )}
      </div>
    </section>
  );
}
