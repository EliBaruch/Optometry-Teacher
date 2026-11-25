/**
 * Reveal gating: the painter only draws a sign when the current instrument
 * setting can actually resolve it, so the picture and the tag logic agree.
 */
import type { EyeState } from '@render';
import { clarity, RESOLVABLE, type LampSetting, type Site } from './model';

/** Signs present on this eye (sign path → true grade). */
export type PresentSigns = Map<string, string | undefined>;

export const presentOf = (sites: Site[]): PresentSigns => new Map(sites.map((s) => [s.sign, s.grade]));

export function gateState(base: EyeState, s: LampSetting, present: PresentSigns): EyeState {
  const st: EyeState = { ...base, gaze: { x: 0, y: 0 }, stain: 'none', reflex: null };
  const seen = (sign: string) => clarity(sign, s, Number(present.get(sign) ?? 0)) >= RESOLVABLE;
  if (!seen('cornea/deposits/keratic-precipitates')) st.keraticPrecipitates = false;
  if (!seen('cornea/epithelium/punctate-keratitis')) st.punctateKeratitis = false;
  if (!seen('cornea/epithelium/dendrite') && !seen('cornea/epithelium/pseudodendrite')) st.dendrite = false;
  if (!seen('cornea/epithelium/abrasion')) st.abrasion = false;
  if (!seen('cornea/deposits/foreign-body')) { st.foreignBody = false; st.rustRing = false; }
  if (!seen('cornea/stroma/ulcer')) st.ulcer = 'none';
  if (!seen('cornea/stroma/edema')) st.cornealHaze = Math.min(st.cornealHaze, 0.25);
  if (!seen('chamber/cells')) st.acCells = 0;
  if (!seen('chamber/flare')) st.acFlare = 0;
  if (!seen('chamber/hypopyon')) st.hypopyon = 0;
  if (!seen('chamber/hyphema')) st.hyphema = 0;
  if (!seen('conj/papillae')) { st.papillae = false; st.follicles = false; }
  if (!seen('iris/neovascularization')) st.irisNeovascularization = false;
  if (!seen('iris/posterior-synechiae')) st.pupilShape = 'round';
  if (!seen('iris/nevus')) st.irisNevus = false;
  const lensSign = [...present.keys()].find((k) => k.startsWith('lens/'));
  if (!lensSign || !seen(lensSign) || s.retro) {
    st.lensOpacity = 0;
    st.lensType = 'none';
  }
  return st;
}
