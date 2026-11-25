/**
 * Chart lines for ophthalmoscopy — pure. The true findings, written the way a
 * clinician would chart a dilated fundus exam.
 */
import {
  EYES, type Eye, type Locale, type OpticDisc, type PatientFindings, type PatientProfile, type PosteriorSegment, type RedReflex,
  type RetinalLesion, type RevealedFinding,
} from '@core';
import { CRITICAL_TYPES, MACULAR_TYPES, isSwollen, kindOf, maculaAbnormal, type TagKind } from './model';
import { strs, type Str } from './strings';

type Strs = Str;

type Flag = RevealedFinding['flag'];

/** English text for each red-reflex state (kept for callers that want the canonical wording). */
export const REFLEX_TEXT: Record<RedReflex, string> = strs('en').reflexText;

const REFLEX_FLAG: Record<RedReflex, Flag> = { normal: 'normal', dull: 'abnormal', asymmetric: 'abnormal', absent: 'critical', leukocoria: 'critical' };

export const pluralName = (k: TagKind, locale: Locale = 'en') => {
  const t = strs(locale);
  return t.plural[k] ?? t.tags[k].label;
};

/** Artery:vein calibre as the clinician writes it. */
export function avText(r: number): string {
  return r >= 0.6 ? '2:3' : r >= 0.45 ? '1:2' : r >= 0.3 ? '1:3' : '1:4';
}

const cdrFmt = (v: number) => String(+v.toFixed(2));

function zonesText(ls: RetinalLesion[], t: Strs): string {
  const zs = [...new Set(ls.map((l) => l.zone))];
  const dens = Math.max(...ls.map((l) => l.density));
  const where = zs.length > 1 || zs.includes('diffuse') ? (zs.includes('diffuse') ? t.zoneText.diffuse : zs.map((z) => t.zoneText[z]).join(t.zonesJoin)) : t.zoneText[zs[0]!];
  return `${t.amount(dens)}${where}`;
}

function isMacular(l: RetinalLesion) {
  return l.zone === 'macula' || MACULAR_TYPES.has(l.type);
}

function lesionFlag(types: Iterable<RetinalLesion['type']>): Flag {
  for (const t of types) if (CRITICAL_TYPES.has(t)) return 'critical';
  return 'abnormal';
}

function groupByKind(ls: RetinalLesion[]): Map<TagKind, RetinalLesion[]> {
  const out = new Map<TagKind, RetinalLesion[]>();
  for (const l of ls) {
    const k = kindOf(l.type);
    out.set(k, [...(out.get(k) ?? []), l]);
  }
  return out;
}

function discFlag(d: OpticDisc): Flag {
  if (isSwollen(d) || d.margins === 'blurred') return d.edema || d.margins === 'elevated' ? 'critical' : 'abnormal';
  return d.color === 'pink' ? 'normal' : 'abnormal';
}

function cupLine(p: PosteriorSegment, eye: Eye, asym: boolean, t: Strs): RevealedFinding {
  const d = p.disc;
  const thin = d.rimThinning && d.rimThinning !== 'none' ? t.rimThin(d.rimThinning) : t.rimIntact;
  if (isSwollen(d)) return { label: t.cLabels.cup, value: t.cupSwollen, eye, flag: 'abnormal' };
  const suspicious = d.cdr >= 0.6 || (d.rimThinning ?? 'none') !== 'none' || asym;
  return {
    label: t.cLabels.cup,
    value: `${cdrFmt(d.cdr)}${thin}${asym ? t.cupAsym : ''}`,
    eye,
    flag: suspicious ? 'abnormal' : 'normal',
  };
}

function vesselsLine(p: PosteriorSegment, eye: Eye, t: Strs): RevealedFinding {
  const v = p.vessels;
  const signs: string[] = [];
  if (v.avNicking) signs.push(t.vsNicking);
  if (v.copperWiring) signs.push(t.vsCopper);
  if (v.venousDilation) signs.push(t.vsDilated);
  if (v.tortuosity === 'increased') signs.push(t.vsTortuous);
  if (v.segmentation) signs.push(t.vsBoxcar);
  const narrow = v.avRatio < 0.6;
  const value = `A:V ${avText(v.avRatio)}${narrow ? t.avNarrowed : ''}${signs.length ? ` · ${signs.join(', ')}` : t.nicksNone}`;
  const flag: Flag = v.segmentation ? 'critical' : narrow || signs.length ? 'abnormal' : 'normal';
  return { label: t.cLabels.vessels, value, eye, flag };
}

function maculaLine(p: PosteriorSegment, eye: Eye, t: Strs): RevealedFinding {
  if (!maculaAbnormal(p)) return { label: t.cLabels.macula, value: t.macFlat, eye, flag: 'normal' };
  const ls = p.lesions.filter(isMacular);
  const names = [...groupByKind(ls).keys()].map((k) => t.inSentence(t.tags[k].label));
  if (p.detachment?.maculaOff) names.push(t.macDetached);
  const types = ls.map((l) => l.type);
  const flag: Flag = p.detachment?.maculaOff ? 'critical' : lesionFlag(types);
  const value = names.join(', ');
  return { label: t.cLabels.macula, value: value.charAt(0).toUpperCase() + value.slice(1), eye, flag };
}

function eyeLines(f: PatientFindings, eye: Eye, asym: boolean, locale: Locale): RevealedFinding[] {
  const t = strs(locale);
  const p = f.posterior[eye];
  const out: RevealedFinding[] = [];
  out.push({ label: t.cLabels.reflex, value: t.reflexText[f.redReflex[eye]], eye, flag: REFLEX_FLAG[f.redReflex[eye]] });
  out.push(cupLine(p, eye, asym, t));
  const margin = p.disc.margins === 'sharp' && !p.disc.edema ? t.marginSharp : p.disc.edema || p.disc.margins === 'elevated' ? t.marginSwollen : t.marginBlurred;
  out.push({ label: t.cLabels.disc, value: `${t.colorText[p.disc.color]}, ${margin}`, eye, flag: discFlag(p.disc) });
  out.push(vesselsLine(p, eye, t));
  out.push(maculaLine(p, eye, t));
  for (const [kind, ls] of groupByKind(p.lesions.filter((l) => !isMacular(l)))) {
    out.push({ label: pluralName(kind, locale), value: zonesText(ls, t), eye, flag: lesionFlag(ls.map((l) => l.type)) });
  }
  if (p.detachment && p.detachment.zones.length) {
    const kind = p.detachment.kind ?? 'rhegmatogenous';
    const where = p.detachment.zones.map((z) => t.zoneText[z]).join(t.zonesJoin);
    out.push({ label: t.cLabels.detachment, value: `${t.detKind[kind]}, ${where}, ${t.detMacula(!!p.detachment.maculaOff)}`, eye, flag: 'critical' });
  } else if (!p.lesions.some((l) => l.type === 'retinal-tear' || l.type === 'lattice')) {
    out.push({ label: t.cLabels.periphery, value: t.periphOk, eye, flag: 'normal' });
  }
  if (p.vitreous !== 'clear') {
    out.push({ label: t.cLabels.vitreous, value: t.vitText[p.vitreous], eye, flag: p.vitreous === 'hemorrhage' || p.vitreous === 'pigment-shafer' ? 'critical' : 'abnormal' });
  }
  return out;
}

/** Chart lines in the edition's language. */
export function reportFor(findings: PatientFindings, _patient: PatientProfile, locale: Locale = 'en'): RevealedFinding[] {
  const asym = Math.abs(findings.posterior.OD.disc.cdr - findings.posterior.OS.disc.cdr) >= 0.2
    && !isSwollen(findings.posterior.OD.disc) && !isSwollen(findings.posterior.OS.disc);
  return EYES.flatMap((e) => eyeLines(findings, e, asym, locale));
}

/** English chart lines: the canonical form used by tests and auto-run. */
export function report(findings: PatientFindings, patient: PatientProfile): RevealedFinding[] {
  return reportFor(findings, patient, 'en');
}

/** One-line summary of an eye for practice answer keys. */
export function summarise(findings: PatientFindings, eye: Eye, locale: Locale = 'en'): string {
  const lines = eyeLines(findings, eye, false, locale).filter((l) => l.flag !== 'normal');
  return lines.length ? lines.map((l) => `${l.label} ${l.value}`).join('; ') : strs(locale).normalFundus;
}
