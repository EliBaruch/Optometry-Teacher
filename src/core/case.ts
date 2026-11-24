import type { PatientFindings } from './clinical';
import type { TestId } from './tests';

export type DiagnosisId = string;

/**
 * routine   — book a normal appointment (weeks–months)
 * soon      — see within days
 * urgent    — same day / within 24h
 * emergency — immediately, sight- or life-threatening (ER / on-call retina/neuro)
 */
export type Urgency = 'routine' | 'soon' | 'urgent' | 'emergency';
export const URGENCIES: readonly Urgency[] = ['routine', 'soon', 'urgent', 'emergency'];

export type SkinTone = 0 | 1 | 2 | 3 | 4 | 5;
export type HairStyle = 'bald' | 'short' | 'buzz' | 'curly' | 'long' | 'bun' | 'ponytail' | 'afro' | 'bob' | 'swept' | 'braids';

export interface AvatarSpec {
  skin: SkinTone;
  hair: HairStyle;
  hairColor: string; // CSS colour
  irisColor: string; // CSS colour
  glasses?: 'none' | 'round' | 'square' | 'cat-eye' | 'aviator' | 'half-rim';
  facialHair?: 'none' | 'stubble' | 'beard' | 'moustache';
  headwear?: 'none' | 'cap' | 'headscarf' | 'kippah' | 'beanie' | 'hard-hat';
  accessory?: 'none' | 'earrings' | 'hearing-aid' | 'necklace' | 'bandage';
  outfit: string; // CSS colour of clothing
}

export interface PatientProfile {
  name: string;
  age: number;
  sex: 'F' | 'M' | 'X';
  occupation?: string;
  /** One-line flavour shown on the patient card */
  personality?: string;
  avatar: AvatarSpec;
}

export type HistoryCategory = 'onset' | 'symptoms' | 'ocular-history' | 'medical' | 'medications' | 'family' | 'social';
export type Relevance = 'key' | 'helpful' | 'neutral' | 'red-herring';

export interface HistoryQuestion {
  id: string;
  category: HistoryCategory;
  /** What the player asks */
  q: string;
  /** What the patient answers — in their voice */
  a: string;
  relevance: Relevance;
}

export interface ClinicalCase {
  id: string;
  /** 1 (first-year student) .. 5 (attending-level) */
  difficulty: 1 | 2 | 3 | 4 | 5;
  tags: string[];
  patient: PatientProfile;
  /** What the patient says walking in, in their own words */
  chiefComplaint: string;
  /** Optional triage note from the front desk / tech */
  triageNote?: string;
  history: HistoryQuestion[];
  findings: PatientFindings;
  /** Tests without which the diagnosis cannot be reasonably made */
  essentialTests: TestId[];
  /** Tests that add support / rule out differentials */
  helpfulTests: TestId[];
  diagnosis: DiagnosisId;
  /** Plausible distractors shown alongside the answer (3–5) */
  differentials: DiagnosisId[];
  urgency: Urgency;
  management: string;
  teachingPoints: string[];
  redFlags?: string[];
  /** Wrath: emergency cases run against a clock */
  emergency?: { timeLimitSec: number };
  sources?: string[];
}

export type DiagnosisCategory =
  | 'refractive' | 'binocular' | 'anterior' | 'cornea' | 'glaucoma' | 'lens' | 'retina' | 'neuro' | 'systemic' | 'normal';

export interface Diagnosis {
  id: DiagnosisId;
  name: string;
  aka?: string[];
  category: DiagnosisCategory;
  summary: string;
  keyFindings: string[];
  typicalUrgency: Urgency;
  pearls: string[];
  rarity: 'common' | 'uncommon' | 'rare';
  /** Optional reference URL (EyeWiki, StatPearls...) */
  reference?: string;
}
