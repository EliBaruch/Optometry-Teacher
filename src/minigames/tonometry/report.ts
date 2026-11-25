/**
 * Chart lines for tonometry. Pure.
 * Norms: IOP 10-21 mmHg (mean ~15.5). > 21 abnormal; >= 35 critical (acute
 * pressure rise); < 6 hypotony abnormal. Inter-eye difference >= 6 mmHg is
 * abnormal (asymmetry is a glaucoma risk sign); 4-5 is noted as normal.
 */
import { EYES, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { flagFor, type Method } from './optics';

export const METHOD_NAME: Record<Method, string> = { goldmann: 'Goldmann applanation', icare: 'iCare rebound' };
export const ASYMMETRY_NOTE = 4;
export const ASYMMETRY_ABNORMAL = 6;

export function buildReport(findings: PatientFindings, method: Method = 'goldmann'): RevealedFinding[] {
  const out: RevealedFinding[] = [];
  const iop = findings.iop;
  for (const eye of EYES) {
    const v = iop?.[eye];
    if (typeof v !== 'number') continue;
    out.push({ label: 'IOP', value: `${Math.round(v)} mmHg`, eye, flag: flagFor(v) });
  }
  if (out.length === 0) return out;
  out.push({ label: 'IOP method', value: METHOD_NAME[method], eye: 'OU', flag: 'normal' });
  if (typeof iop.OD === 'number' && typeof iop.OS === 'number') {
    const d = Math.abs(Math.round(iop.OD) - Math.round(iop.OS));
    if (d >= ASYMMETRY_NOTE) {
      const higher = iop.OD > iop.OS ? 'OD' : 'OS';
      out.push({ label: 'IOP asymmetry', value: `${d} mmHg (${higher} higher)`, eye: 'OU', flag: d >= ASYMMETRY_ABNORMAL ? 'abnormal' : 'normal' });
    }
  }
  return out;
}

export function report(findings: PatientFindings, _patient?: PatientProfile): RevealedFinding[] {
  return buildReport(findings, 'goldmann');
}
