import type { Eye } from '@core';
import { Glyph } from './Glyph';
import {
  anatomicalSide, defectOf, FAMILIES, FAMILY_SIDES,
  type Family, type Pattern, type Side,
} from './interpret';
import { useVf, useVfLocale } from './useVf';

export interface PickerProps {
  eye: Eye;
  value: Pattern | null;
  onChange: (p: Pattern) => void;
  disabled?: boolean;
}

/** Pattern classification: a family, then (where it has one) the side as plotted. */
export function Picker({ eye, value, onChange, disabled }: PickerProps) {
  const t = useVf();
  const locale = useVfLocale();
  const fam = value?.family ?? null;
  const sides = fam ? FAMILY_SIDES[fam] : [];
  const pickFamily = (f: Family) => {
    const s = FAMILY_SIDES[f];
    const keep = value?.side && s.includes(value.side) ? value.side : undefined;
    onChange(s.length ? { family: f, side: keep ?? s[0] } : { family: f });
  };
  return (
    <div class="vf-picker">
      <div class="vf-picker__grid" role="radiogroup" aria-label={t.pickAria(eye)}>
        {FAMILIES.map((f) => {
          const def = defectOf({ family: f, side: FAMILY_SIDES[f][0] }, eye);
          const on = fam === f;
          return (
            <button
              key={f}
              type="button"
              role="radio"
              aria-checked={on}
              disabled={disabled}
              class={`vf-chip${on ? ' is-on' : ''}`}
              onClick={() => pickFamily(f)}
              data-testid={`vf-family-${f}`}
              title={t.famSub[f]}
            >
              <Glyph defect={def} eye={eye} size={30} tone={on ? 'gold' : 'dark'} />
              <span class="vf-chip__text">
                <strong>{t.famLabel[f]}</strong>
                <small>{t.famSub[f]}</small>
              </span>
            </button>
          );
        })}
      </div>
      {fam && sides.length > 0 && (
        <div class="vf-picker__sides" role="radiogroup" aria-label={t.pickSideAria}>
          {sides.map((s: Side) => {
            const on = value?.side === s;
            return (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={on}
                disabled={disabled}
                class={`vf-side${on ? ' is-on' : ''}`}
                onClick={() => onChange({ family: fam, side: s })}
                data-testid={`vf-side-${s}`}
              >
                <Glyph defect={defectOf({ family: fam, side: s }, eye)} eye={eye} size={24} tone={on ? 'gold' : 'dark'} />
                <span>
                  {t.sideLabel[s]}
                  <small>{anatomicalSide(s, eye, locale)}</small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
