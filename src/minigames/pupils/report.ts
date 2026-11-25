/**
 * Chart lines for the pupil exam. Pure.
 * Norms (adult): light 2-4.5 mm (older eyes smaller), dark 3.5-8 mm. Anisocoria
 * up to ~1 mm that is the same in light and dark is physiologic. A relative
 * afferent pupillary defect is always significant (critical); a fixed dilated
 * pupil beside a brisk fellow is an emergency pattern until proven otherwise.
 */
import { EYES, pickStrings, type Eye, type Locale, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { anisocoria, lagEye, ptosisEyes } from './model';
import { S } from './strings';

export const LIGHT_RANGE: [number, number] = [2, 4.5];
export const DARK_RANGE: [number, number] = [3.5, 8];

const fmt = (v: number) => `${v.toFixed(1)} mm`;
/** Chart lines in the edition's language. `report()` is the English form used by tests and auto-run. */
export function reportFor(f: PatientFindings, locale: Locale): RevealedFinding[] {
  const t = pickStrings(S, locale);
  const p = f.pupils;
  const out: RevealedFinding[] = [];
  const an = anisocoria(f);
  for (const eye of EYES) {
    const v = p.sizeLightMm[eye];
    out.push({ label: t.pupilLight, value: fmt(v), eye, flag: v < LIGHT_RANGE[0] || v > LIGHT_RANGE[1] ? 'abnormal' : 'normal' });
  }
  for (const eye of EYES) {
    const v = p.sizeDarkMm[eye];
    out.push({ label: t.pupilDark, value: fmt(v), eye, flag: v < DARK_RANGE[0] || v > DARK_RANGE[1] ? 'abnormal' : 'normal' });
  }
  if (an.pattern !== 'none') {
    const where = t.anisoWhere[an.pattern];
    const big = Math.max(an.light, an.dark);
    out.push({
      label: t.anisocoria,
      value: t.anisoValue(big.toFixed(1), where, an.pattern === 'physiologic' ? '' : t.anisoExtra(an.pattern === 'greater-dark' ? t.smaller : t.larger, (an.pattern === 'greater-dark' ? an.smaller : an.larger) ?? '')),
      eye: 'OU',
      flag: an.pattern === 'physiologic' ? 'normal' : 'abnormal',
    });
  } else {
    out.push({ label: t.anisocoria, value: t.anisoNone, eye: 'OU', flag: 'normal' });
  }
  const others = EYES.filter((e) => p.reactivity[e] === 'brisk').length;
  for (const eye of EYES) {
    const r = p.reactivity[eye];
    const emergencyShape = r === 'fixed' && others === 1 && p.sizeLightMm[eye] >= 5;
    out.push({ label: t.lightReaction, value: t.react[r] ?? r, eye, flag: r === 'brisk' ? 'normal' : emergencyShape ? 'critical' : 'abnormal' });
  }
  out.push(
    p.rapd === 'none'
      ? { label: t.rapdLabel, value: t.rapdAbsent, eye: 'OU', flag: 'normal' }
      : { label: t.rapdLabel, value: t.rapdPresent(`${p.rapdGrade ?? 2}+${(p.rapdGrade ?? 2) === 4 ? t.amaurotic : ''}`), eye: p.rapd, flag: 'critical' },
  );
  out.push(
    p.nearResponse === 'normal'
      ? { label: t.nearResponse, value: t.nearNormal, eye: 'OU', flag: 'normal' }
      : { label: t.nearResponse, value: t.nearLnd, eye: 'OU', flag: 'abnormal' },
  );
  const lag = lagEye(f);
  if (lag) out.push({ label: t.dilationLag, value: t.lagValue, eye: lag, flag: 'abnormal' });
  for (const eye of ptosisEyes(f)) out.push({ label: t.lidPosition, value: t.ptosis, eye, flag: 'abnormal' });
  for (const eye of EYES) {
    const s = p.shape?.[eye];
    if (s && s !== 'round') out.push({ label: t.pupilShape, value: t.shape[s] ?? t.shape.irregular!, eye: eye as Eye, flag: 'abnormal' });
  }
  return out;
}

export const report = (f: PatientFindings, _patient?: PatientProfile): RevealedFinding[] => reportFor(f, 'en');
