/** Chart lines for the two instruments. Pure. */
import type { Eye, Locale, PatientFindings, PatientProfile, RevealedFinding } from '@core';
import { HE_DIPLOPIA, HE_POSTURE, fixBidi, patternChart } from './strings';
import { EYES, cellsText, classifyMotility, hofstetter, recoveryFor, breakFor, trueGrid, NPC_RECEDED } from './model';

const POSTURE: Record<string, string> = {
  'turn-left': 'face turn left', 'turn-right': 'face turn right', 'tilt-left': 'head tilt left',
  'tilt-right': 'head tilt right', 'chin-down': 'chin down', 'chin-up': 'chin up',
};
const DIPLOPIA: Record<string, string> = { horizontal: 'horizontal (side by side)', vertical: 'vertical (one above the other)', oblique: 'oblique' };

/** English chart lines (what `report()` returns). */
export function reportMotility(f: PatientFindings, p?: PatientProfile): RevealedFinding[] {
  return reportMotilityFor(f, p, 'en');
}

/** Chart lines in the edition's language; `mount()` uses this with `ctx.locale`. */
export function reportMotilityFor(f: PatientFindings, _p: PatientProfile | undefined, locale: Locale): RevealedFinding[] {
  const he = locale === 'he';
  const m = f.motility;
  const g = trueGrid(f);
  const pat = classifyMotility(f);
  const out: RevealedFinding[] = [];
  const sick = EYES.filter((e) => cellsText(g[e]));
  if (!sick.length) {
    out.push({ label: he ? 'תנועות משותפות' : 'Versions', value: he ? 'מלאות, חלקות ושוות' : 'Full, smooth, equal (SAFE)', eye: 'OU', flag: 'normal' });
  } else {
    for (const e of sick) {
      out.push({ label: he ? 'תנועות משותפות' : 'Versions', value: cellsText(g[e]), eye: e, flag: pat.id === 'cn3' ? 'critical' : 'abnormal' });
    }
    if (pat.id !== 'pain') out.push({ label: he ? 'דפוס הפגם' : 'Pattern', value: fixBidi(patternChart(pat, locale), locale), eye: pat.eye ?? 'OU', flag: pat.id === 'cn3' ? 'critical' : 'abnormal' });
  }
  if (m.diplopia && m.diplopia !== 'none') {
    out.push({ label: he ? 'ראייה כפולה' : 'Diplopia', value: (he ? HE_DIPLOPIA : DIPLOPIA)[m.diplopia] ?? m.diplopia, eye: 'OU', flag: pat.id === 'cn3' ? 'critical' : 'abnormal' });
  }
  if (m.painOnMovement) out.push({ label: he ? 'כאב בתנועת עיניים' : 'Pain on eye movement', value: he ? 'כן' : 'Yes', eye: 'OU', flag: 'abnormal' });
  if (m.nystagmus) out.push({ label: he ? 'ניסטגמוס' : 'Nystagmus', value: he ? 'קיים' : 'Present', eye: 'OU', flag: 'abnormal' });
  if (m.headPosture && m.headPosture !== 'none') out.push({ label: he ? 'תנוחת ראש' : 'Head posture', value: (he ? HE_POSTURE : POSTURE)[m.headPosture] ?? m.headPosture, eye: 'OU', flag: 'abnormal' });
  return out;
}

export function ampFlag(eye: Eye, f: PatientFindings, age: number): RevealedFinding['flag'] {
  const a = f.accommodation.amplitudeD;
  const other = a[eye === 'OD' ? 'OS' : 'OD'];
  if (Math.abs(a.OD - a.OS) >= 2) return a[eye] < other ? 'critical' : 'normal';
  const h = hofstetter(age);
  return a[eye] < h.min - 0.5 ? 'abnormal' : 'normal';
}

const cm = (n: number, he = false) => `${Math.round(n * 10) / 10} ${he ? 'ס״מ' : 'cm'}`;
const diopt = (n: number) => `${Math.round(n * 4) / 4} D`;

/** English chart lines (what `report()` returns). */
export function reportConvergence(f: PatientFindings, p?: PatientProfile): RevealedFinding[] {
  return reportConvergenceFor(f, p, 'en');
}

/** Chart lines in the edition's language; `mount()` uses this with `ctx.locale`. */
export function reportConvergenceFor(f: PatientFindings, p: PatientProfile | undefined, locale: Locale): RevealedFinding[] {
  const he = locale === 'he';
  const age = p?.age ?? 40;
  const b = breakFor(f);
  const r = recoveryFor(b);
  const flag: RevealedFinding['flag'] = b >= 25 ? 'critical' : b > NPC_RECEDED ? 'abnormal' : 'normal';
  const out: RevealedFinding[] = [
    { label: he ? 'NPC, נקודת שבירה' : 'NPC break', value: fixBidi(`${cm(b, he)}${b > NPC_RECEDED ? (he ? ' (רחוק מהרגיל)' : ' (receded)') : ''}`, locale), eye: 'OU', flag },
    { label: he ? 'NPC, התאוששות' : 'NPC recovery', value: fixBidi(cm(r, he), locale), eye: 'OU', flag: r > 15 ? 'abnormal' : flag === 'normal' ? 'normal' : flag },
  ];
  const h = hofstetter(age);
  for (const e of EYES) {
    out.push({ label: he ? 'משרעת אקומודציה' : 'Accommodative amplitude', value: fixBidi(`${diopt(f.accommodation.amplitudeD[e])} (${he ? 'צפוי' : 'expected'} ≥ ${diopt(h.min)})`, locale), eye: e, flag: ampFlag(e, f, age) });
  }
  return out;
}
