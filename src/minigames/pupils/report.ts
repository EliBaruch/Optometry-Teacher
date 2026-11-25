/**
 * Chart lines for the pupil exam. Pure.
 * Norms (adult): light 2-4.5 mm (older eyes smaller), dark 3.5-8 mm. Anisocoria
 * up to ~1 mm that is the same in light and dark is physiologic. A relative
 * afferent pupillary defect is always significant (critical); a fixed dilated
 * pupil beside a brisk fellow is an emergency pattern until proven otherwise.
 */
import { EYES, type Eye, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { anisocoria, lagEye, ptosisEyes, rapdText } from './model';

export const LIGHT_RANGE: [number, number] = [2, 4.5];
export const DARK_RANGE: [number, number] = [3.5, 8];

const fmt = (v: number) => `${v.toFixed(1)} mm`;
const REACT: Record<string, string> = { brisk: 'Brisk', sluggish: 'Sluggish', fixed: 'Fixed (no reaction)', tonic: 'Tonic (slow, segmental)' };

export function report(f: PatientFindings, _patient?: PatientProfile): RevealedFinding[] {
  const p = f.pupils;
  const out: RevealedFinding[] = [];
  const an = anisocoria(f);
  for (const eye of EYES) {
    const v = p.sizeLightMm[eye];
    out.push({ label: 'Pupil, light', value: fmt(v), eye, flag: v < LIGHT_RANGE[0] || v > LIGHT_RANGE[1] ? 'abnormal' : 'normal' });
  }
  for (const eye of EYES) {
    const v = p.sizeDarkMm[eye];
    out.push({ label: 'Pupil, dark', value: fmt(v), eye, flag: v < DARK_RANGE[0] || v > DARK_RANGE[1] ? 'abnormal' : 'normal' });
  }
  if (an.pattern !== 'none') {
    const where = an.pattern === 'greater-dark' ? 'greater in the dark' : an.pattern === 'greater-light' ? 'greater in the light' : 'same in light and dark';
    const big = Math.max(an.light, an.dark);
    out.push({
      label: 'Anisocoria',
      value: `${big.toFixed(1)} mm, ${where}${an.pattern === 'physiologic' ? '' : ` (${an.pattern === 'greater-dark' ? 'smaller' : 'larger'} pupil ${an.pattern === 'greater-dark' ? an.smaller : an.larger})`}`,
      eye: 'OU',
      flag: an.pattern === 'physiologic' ? 'normal' : 'abnormal',
    });
  } else {
    out.push({ label: 'Anisocoria', value: 'None (<0.4 mm)', eye: 'OU', flag: 'normal' });
  }
  const others = EYES.filter((e) => p.reactivity[e] === 'brisk').length;
  for (const eye of EYES) {
    const r = p.reactivity[eye];
    const emergencyShape = r === 'fixed' && others === 1 && p.sizeLightMm[eye] >= 5;
    out.push({ label: 'Light reaction', value: REACT[r] ?? r, eye, flag: r === 'brisk' ? 'normal' : emergencyShape ? 'critical' : 'abnormal' });
  }
  out.push(
    p.rapd === 'none'
      ? { label: 'RAPD (swinging light)', value: 'Absent', eye: 'OU', flag: 'normal' }
      : { label: 'RAPD (swinging light)', value: `Present, ${rapdText(f).split(' ').slice(1).join(' ')}`, eye: p.rapd, flag: 'critical' },
  );
  out.push(
    p.nearResponse === 'normal'
      ? { label: 'Near response', value: 'Constricts to near target', eye: 'OU', flag: 'normal' }
      : { label: 'Near response', value: 'Light-near dissociation (poor to light, constricts to near)', eye: 'OU', flag: 'abnormal' },
  );
  const lag = lagEye(f);
  if (lag) out.push({ label: 'Dilation lag', value: 'Slow to dilate in the dark (5 s > 15 s)', eye: lag, flag: 'abnormal' });
  for (const eye of ptosisEyes(f)) out.push({ label: 'Lid position', value: 'Ptosis', eye, flag: 'abnormal' });
  for (const eye of EYES) {
    const s = p.shape?.[eye];
    if (s && s !== 'round') out.push({ label: 'Pupil shape', value: s === 'mid-dilated' ? 'Mid-dilated, oval' : s === 'peaked' ? 'Peaked' : 'Irregular', eye: eye as Eye, flag: 'abnormal' });
  }
  return out;
}
