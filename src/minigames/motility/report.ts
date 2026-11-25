/** Chart lines for the two instruments. Pure. */
import type { Eye, PatientFindings, PatientProfile, RevealedFinding } from '@core';
import { EYES, cellsText, classifyMotility, hofstetter, recoveryFor, breakFor, trueGrid, NPC_RECEDED } from './model';

const POSTURE: Record<string, string> = {
  'turn-left': 'face turn left', 'turn-right': 'face turn right', 'tilt-left': 'head tilt left',
  'tilt-right': 'head tilt right', 'chin-down': 'chin down', 'chin-up': 'chin up',
};
const DIPLOPIA: Record<string, string> = { horizontal: 'horizontal (side by side)', vertical: 'vertical (one above the other)', oblique: 'oblique' };

export function reportMotility(f: PatientFindings, _p?: PatientProfile): RevealedFinding[] {
  const m = f.motility;
  const g = trueGrid(f);
  const pat = classifyMotility(f);
  const out: RevealedFinding[] = [];
  const sick = EYES.filter((e) => cellsText(g[e]));
  if (!sick.length) {
    out.push({ label: 'Versions', value: 'Full, smooth, equal (SAFE)', eye: 'OU', flag: 'normal' });
  } else {
    for (const e of sick) {
      out.push({ label: 'Versions', value: cellsText(g[e]), eye: e, flag: pat.id === 'cn3' ? 'critical' : 'abnormal' });
    }
    if (pat.id !== 'pain') out.push({ label: 'Pattern', value: pat.chart, eye: pat.eye ?? 'OU', flag: pat.id === 'cn3' ? 'critical' : 'abnormal' });
  }
  if (m.diplopia && m.diplopia !== 'none') {
    out.push({ label: 'Diplopia', value: DIPLOPIA[m.diplopia] ?? m.diplopia, eye: 'OU', flag: pat.id === 'cn3' ? 'critical' : 'abnormal' });
  }
  if (m.painOnMovement) out.push({ label: 'Pain on eye movement', value: 'Yes', eye: 'OU', flag: 'abnormal' });
  if (m.nystagmus) out.push({ label: 'Nystagmus', value: 'Present', eye: 'OU', flag: 'abnormal' });
  if (m.headPosture && m.headPosture !== 'none') out.push({ label: 'Head posture', value: POSTURE[m.headPosture] ?? m.headPosture, eye: 'OU', flag: 'abnormal' });
  return out;
}

export function ampFlag(eye: Eye, f: PatientFindings, age: number): RevealedFinding['flag'] {
  const a = f.accommodation.amplitudeD;
  const other = a[eye === 'OD' ? 'OS' : 'OD'];
  if (Math.abs(a.OD - a.OS) >= 2) return a[eye] < other ? 'critical' : 'normal';
  const h = hofstetter(age);
  return a[eye] < h.min - 0.5 ? 'abnormal' : 'normal';
}

const cm = (n: number) => `${Math.round(n * 10) / 10} cm`;
const diopt = (n: number) => `${Math.round(n * 4) / 4} D`;

export function reportConvergence(f: PatientFindings, p?: PatientProfile): RevealedFinding[] {
  const age = p?.age ?? 40;
  const b = breakFor(f);
  const r = recoveryFor(b);
  const flag: RevealedFinding['flag'] = b >= 25 ? 'critical' : b > NPC_RECEDED ? 'abnormal' : 'normal';
  const out: RevealedFinding[] = [
    { label: 'NPC break', value: `${cm(b)}${b > NPC_RECEDED ? ' (receded)' : ''}`, eye: 'OU', flag },
    { label: 'NPC recovery', value: cm(r), eye: 'OU', flag: r > 15 ? 'abnormal' : flag === 'normal' ? 'normal' : flag },
  ];
  const h = hofstetter(age);
  for (const e of EYES) {
    out.push({ label: 'Accommodative amplitude', value: `${diopt(f.accommodation.amplitudeD[e])} (expected ≥ ${diopt(h.min)})`, eye: e, flag: ampFlag(e, f, age) });
  }
  return out;
}
