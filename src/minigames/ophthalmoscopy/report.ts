/**
 * Chart lines for ophthalmoscopy — pure. The true findings, written the way a
 * clinician would chart a dilated fundus exam.
 */
import {
  EYES, type Eye, type OpticDisc, type PatientFindings, type PatientProfile, type PosteriorSegment, type RedReflex,
  type RetinalLesion, type RevealedFinding, type Zone,
} from '@core';
import { CRITICAL_TYPES, MACULAR_TYPES, TAGS, isSwollen, kindOf, maculaAbnormal, type TagKind } from './model';

type Flag = RevealedFinding['flag'];

export const REFLEX_TEXT: Record<RedReflex, string> = {
  normal: 'Present, bright and even',
  dull: 'Dull / reduced',
  absent: 'Absent — no fundus glow',
  leukocoria: 'Leukocoria (white reflex)',
  asymmetric: 'Asymmetric (dimmer than fellow eye)',
};

const REFLEX_FLAG: Record<RedReflex, Flag> = { normal: 'normal', dull: 'abnormal', asymmetric: 'abnormal', absent: 'critical', leukocoria: 'critical' };

const ZONE_TEXT: Record<Zone, string> = {
  'disc': 'at the disc', 'macula': 'macular', 'superotemporal': 'superotemporal', 'inferotemporal': 'inferotemporal',
  'superonasal': 'superonasal', 'inferonasal': 'inferonasal', 'periphery': 'peripheral', 'diffuse': 'all quadrants',
};

const PLURAL: Partial<Record<TagKind, string>> = {
  'dot-blot-hemorrhage': 'Dot-blot haemorrhages', 'flame-hemorrhage': 'Flame haemorrhages', 'preretinal-hemorrhage': 'Pre-retinal haemorrhage',
  'subretinal-hemorrhage': 'Sub-retinal haemorrhage', 'disc-hemorrhage': 'Disc haemorrhage', 'microaneurysm': 'Microaneurysms',
  'cotton-wool-spot': 'Cotton-wool spots', 'hard-exudate': 'Hard exudates', 'drusen': 'Drusen', 'pigment-clumping': 'Pigment clumping',
  'laser-scars': 'Laser scars', 'hollenhorst-plaque': 'Retinal embolus', 'retinal-tear': 'Retinal tear', 'lattice': 'Lattice degeneration',
  'irma': 'IRMA', 'neovascularization': 'Neovascularisation', 'venous-beading': 'Venous beading',
};

export const pluralName = (k: TagKind) => PLURAL[k] ?? TAGS[k].label;

/** Artery:vein calibre as the clinician writes it. */
export function avText(r: number): string {
  return r >= 0.6 ? '2:3' : r >= 0.45 ? '1:2' : r >= 0.3 ? '1:3' : '1:4';
}

const cdrFmt = (v: number) => String(+v.toFixed(2));

const COLOR_TEXT: Record<OpticDisc['color'], string> = {
  'pink': 'Healthy pink rim', 'pale': 'Pale (optic atrophy)', 'hyperemic': 'Hyperaemic', 'pale-sectoral': 'Sectoral pallor',
};

function zonesText(ls: RetinalLesion[]): string {
  const zs = [...new Set(ls.map((l) => l.zone))];
  const dens = Math.max(...ls.map((l) => l.density));
  const where = zs.length > 1 || zs.includes('diffuse') ? (zs.includes('diffuse') ? 'all quadrants' : zs.map((z) => ZONE_TEXT[z]).join(' + ')) : ZONE_TEXT[zs[0]!];
  const amount = dens >= 4 ? 'numerous, ' : dens >= 3 ? 'several, ' : '';
  return `${amount}${where}`;
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

function cupLine(p: PosteriorSegment, eye: Eye, asym: boolean): RevealedFinding {
  const d = p.disc;
  const thin = d.rimThinning && d.rimThinning !== 'none' ? `, ${d.rimThinning} rim thinning` : ', ISNT rim intact';
  if (isSwollen(d)) return { label: 'Cup:disc', value: 'Cup filled in by swelling', eye, flag: 'abnormal' };
  const suspicious = d.cdr >= 0.6 || (d.rimThinning ?? 'none') !== 'none' || asym;
  return {
    label: 'Cup:disc',
    value: `${cdrFmt(d.cdr)}${thin}${asym ? ' (asymmetric vs fellow eye)' : ''}`,
    eye,
    flag: suspicious ? 'abnormal' : 'normal',
  };
}

function vesselsLine(p: PosteriorSegment, eye: Eye): RevealedFinding {
  const v = p.vessels;
  const signs: string[] = [];
  if (v.avNicking) signs.push('AV nicking');
  if (v.copperWiring) signs.push('copper wiring');
  if (v.venousDilation) signs.push('dilated veins');
  if (v.tortuosity === 'increased') signs.push('tortuous');
  if (v.segmentation) signs.push('arteriolar boxcarring');
  const narrow = v.avRatio < 0.6;
  const value = `A:V ${avText(v.avRatio)}${narrow ? ' (narrowed)' : ''}${signs.length ? ` · ${signs.join(', ')}` : ' · no nicking'}`;
  const flag: Flag = v.segmentation ? 'critical' : narrow || signs.length ? 'abnormal' : 'normal';
  return { label: 'Vessels', value, eye, flag };
}

function maculaLine(p: PosteriorSegment, eye: Eye): RevealedFinding {
  if (!maculaAbnormal(p)) return { label: 'Macula', value: 'Flat, foveal reflex present', eye, flag: 'normal' };
  const ls = p.lesions.filter(isMacular);
  const names = [...groupByKind(ls).keys()].map((k) => TAGS[k].label.toLowerCase());
  if (p.detachment?.maculaOff) names.push('detached (macula-off)');
  const types = ls.map((l) => l.type);
  const flag: Flag = p.detachment?.maculaOff ? 'critical' : lesionFlag(types);
  const value = names.join(', ');
  return { label: 'Macula', value: value.charAt(0).toUpperCase() + value.slice(1), eye, flag };
}

function eyeLines(f: PatientFindings, eye: Eye, asym: boolean): RevealedFinding[] {
  const p = f.posterior[eye];
  const out: RevealedFinding[] = [];
  out.push({ label: 'Red reflex', value: REFLEX_TEXT[f.redReflex[eye]], eye, flag: REFLEX_FLAG[f.redReflex[eye]] });
  out.push(cupLine(p, eye, asym));
  const margin = p.disc.margins === 'sharp' && !p.disc.edema ? 'sharp margins' : p.disc.edema || p.disc.margins === 'elevated' ? 'swollen, elevated blurred margins' : 'blurred margins';
  out.push({ label: 'Disc', value: `${COLOR_TEXT[p.disc.color]}, ${margin}`, eye, flag: discFlag(p.disc) });
  out.push(vesselsLine(p, eye));
  out.push(maculaLine(p, eye));
  for (const [kind, ls] of groupByKind(p.lesions.filter((l) => !isMacular(l)))) {
    out.push({ label: pluralName(kind), value: zonesText(ls), eye, flag: lesionFlag(ls.map((l) => l.type)) });
  }
  if (p.detachment && p.detachment.zones.length) {
    const kind = p.detachment.kind ?? 'rhegmatogenous';
    const where = p.detachment.zones.map((z) => ZONE_TEXT[z]).join(' + ');
    out.push({ label: 'Detachment', value: `${kind.charAt(0).toUpperCase() + kind.slice(1)}, ${where}, macula-${p.detachment.maculaOff ? 'off' : 'on'}`, eye, flag: 'critical' });
  } else if (!p.lesions.some((l) => l.type === 'retinal-tear' || l.type === 'lattice')) {
    out.push({ label: 'Periphery', value: 'Attached, no tears or lattice', eye, flag: 'normal' });
  }
  if (p.vitreous !== 'clear') {
    const text: Record<Exclude<PosteriorSegment['vitreous'], 'clear'>, string> = {
      'floaters': 'Floaters', 'weiss-ring': 'Weiss ring (posterior vitreous detachment)', 'hemorrhage': 'Haemorrhage — fundus detail obscured',
      'pigment-shafer': "Pigment dust (Shafer's sign — look for a retinal break)", 'cells': 'Cells / inflammatory haze',
    };
    out.push({ label: 'Vitreous', value: text[p.vitreous], eye, flag: p.vitreous === 'hemorrhage' || p.vitreous === 'pigment-shafer' ? 'critical' : 'abnormal' });
  }
  return out;
}

export function report(findings: PatientFindings, _patient: PatientProfile): RevealedFinding[] {
  const asym = Math.abs(findings.posterior.OD.disc.cdr - findings.posterior.OS.disc.cdr) >= 0.2
    && !isSwollen(findings.posterior.OD.disc) && !isSwollen(findings.posterior.OS.disc);
  return EYES.flatMap((e) => eyeLines(findings, e, asym));
}

/** One-line summary of an eye for practice answer keys. */
export function summarise(findings: PatientFindings, eye: Eye): string {
  const lines = eyeLines(findings, eye, false).filter((l) => l.flag !== 'normal');
  return lines.length ? lines.map((l) => `${l.label} ${l.value}`).join('; ') : 'normal fundus';
}
