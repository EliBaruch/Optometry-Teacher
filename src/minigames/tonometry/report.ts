/**
 * Chart lines for tonometry. Pure.
 * Norms: IOP 10-21 mmHg (mean ~15.5). > 21 abnormal; >= 35 critical (acute
 * pressure rise); < 6 hypotony abnormal. Inter-eye difference >= 6 mmHg is
 * abnormal (asymmetry is a glaucoma risk sign); 4-5 is noted as normal.
 */
import { EYES, type PatientFindings, type PatientProfile, type RevealedFinding } from '@core';
import { flagFor, METHOD_LABEL as METHOD_NAME, type Method } from './optics';
export const ASYMMETRY_NOTE = 4;
export const ASYMMETRY_ABNORMAL = 6;

export interface ReportOpts { method?: Method; /** clock time of the measurement, e.g. '10:42' */ time?: string }

export function buildReport(findings: PatientFindings, method: Method = 'goldmann', time?: string): RevealedFinding[] {
  const out: RevealedFinding[] = [];
  const iop = findings.iop;
  for (const eye of EYES) {
    const v = iop?.[eye];
    if (typeof v !== 'number') continue;
    out.push({ label: 'IOP', value: `${Math.round(v)} mmHg`, eye, flag: flagFor(v) });
  }
  if (out.length === 0) return out;
  out.push({ label: 'IOP method', value: METHOD_NAME[method], eye: 'OU', flag: 'normal' });
  if (time) out.push({ label: 'IOP time', value: time, eye: 'OU', flag: 'normal' });
  if (typeof iop.OD === 'number' && typeof iop.OS === 'number') {
    const d = Math.abs(Math.round(iop.OD) - Math.round(iop.OS));
    if (d >= ASYMMETRY_NOTE) {
      const higher = iop.OD > iop.OS ? 'OD' : 'OS';
      out.push({ label: 'IOP asymmetry', value: `${d} mmHg (${higher} higher)`, eye: 'OU', flag: d >= ASYMMETRY_ABNORMAL ? 'abnormal' : 'normal' });
    }
  }
  return out;
}

export function report(findings: PatientFindings, _patient?: PatientProfile, opts: ReportOpts = {}): RevealedFinding[] {
  return buildReport(findings, opts.method ?? 'goldmann', opts.time);
}

/** Local clock time as HH:MM (diurnal IOP varies, so the chart records when). */
export function clockTime(d: Date = new Date()): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}
