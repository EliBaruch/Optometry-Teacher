import type { Diagnosis, DiagnosisCategory, DiagnosisId, RewardGrant, TestId } from '@core';
import { RANKS, TIERS_PER_RANK } from './ladder';
import { CATEGORY_LABEL } from './mastery';
import type { RanksState } from './state';

/**
 * The trophy wall. Every trophy is earned by clinical behaviour worth
 * repeating (correct calls, lean work-ups, sound triage, spaced review) —
 * none by time spent. Progress is shown for locked trophies so the wall
 * doubles as a map of what to practise next.
 */
export type TrophyGroup = 'milestones' | 'technique' | 'triage' | 'learning' | 'crests' | 'career';
export type Rarity = NonNullable<RewardGrant['rarity']>;

export interface AchievementEnv {
  diagnoses: Diagnosis[];
  /** Diagnoses that appear as the answer of at least one emergency case. */
  emergencyDiagnoses: DiagnosisId[];
  /** Tests the player can actually perform (registered mini-games). */
  availableTests: TestId[];
  stars(id: DiagnosisId): number;
  level: number;
}

export interface AchievementDef {
  id: string;
  title: string;
  description: string;
  /** IconName from @ui-kit (or a glyph). */
  icon: string;
  rarity: Rarity;
  group: TrophyGroup;
  /** Title & description hidden until unlocked. */
  secret?: boolean;
  /** [current, target]; unlocked when current >= target > 0. */
  progress(s: RanksState, env: AchievementEnv): [number, number];
}

export const GROUP_LABEL: Record<TrophyGroup, string> = {
  milestones: 'Milestones',
  technique: 'Technique',
  triage: 'Triage',
  learning: 'Learning',
  crests: 'Specialty Crests',
  career: 'Career',
};

const count = (n: number, target: number): [number, number] => [Math.min(n, target), target];
const flag = (b: boolean): [number, number] => [b ? 1 : 0, 1];
const correctOf = (s: RanksState, id: DiagnosisId) => s.dx[id]?.correct ?? 0;
const triaged = (s: RanksState, id: DiagnosisId) => s.triaged.includes(id);

function coverage(ids: DiagnosisId[], pred: (id: DiagnosisId) => boolean): [number, number] {
  if (!ids.length) return [0, 1];
  return [ids.filter(pred).length, ids.length];
}

function crest(cat: DiagnosisCategory, title: string, icon: string): AchievementDef {
  return {
    id: `crest-${cat}`,
    title,
    description: `Correctly diagnose every condition in ${CATEGORY_LABEL[cat]}.`,
    icon,
    rarity: 'epic',
    group: 'crests',
    progress: (s, env) => coverage(env.diagnoses.filter((d) => d.category === cat).map((d) => d.id), (id) => correctOf(s, id) > 0),
  };
}

const RANK_TROPHY: { title: string; description: string; rarity: Rarity }[] = [
  { title: 'White Coat', description: 'Reach the rank of Intern.', rarity: 'common' },
  { title: 'On the Wards', description: 'Reach the rank of Resident.', rarity: 'rare' },
  { title: 'Name on the Door', description: 'Reach the rank of Associate.', rarity: 'rare' },
  { title: 'Trusted Second Opinion', description: 'Reach the rank of Senior.', rarity: 'epic' },
  { title: 'Keys to the Observatory', description: 'Reach the rank of Clinic Director.', rarity: 'legendary' },
  { title: 'Living Legend', description: 'Reach the very top of the Career ladder.', rarity: 'legendary' },
];

function testPerfect(id: TestId, title: string, description: string): AchievementDef {
  return {
    id: `technique-${id}`,
    title,
    description,
    icon: id,
    rarity: 'rare',
    group: 'technique',
    progress: (s) => flag((s.tests[id]?.perfect ?? 0) > 0),
  };
}

export const ACHIEVEMENTS: readonly AchievementDef[] = [
  // ── Milestones ───────────────────────────────────────────────────────────
  { id: 'first-light', title: 'First Light', description: 'Make your first correct diagnosis.', icon: 'sparkle', rarity: 'common', group: 'milestones', progress: (s) => count(s.correct, 1) },
  { id: 'ten-clear-calls', title: 'Ten Clear Calls', description: 'Make 10 correct diagnoses.', icon: 'check', rarity: 'common', group: 'milestones', progress: (s) => count(s.correct, 10) },
  { id: 'fifty-charts', title: 'Fifty Charts Closed', description: 'Make 50 correct diagnoses.', icon: 'chart', rarity: 'rare', group: 'milestones', progress: (s) => count(s.correct, 50) },
  { id: 'century-of-sight', title: 'Century of Sight', description: 'Make 100 correct diagnoses.', icon: 'eye', rarity: 'epic', group: 'milestones', progress: (s) => count(s.correct, 100) },
  { id: 'gold-standard', title: 'Gold Standard', description: 'Earn your first S grade.', icon: 'star', rarity: 'common', group: 'milestones', progress: (s) => count(s.sGrades, 1) },
  { id: 'textbook-ten', title: 'Textbook Ten', description: 'Earn 10 S grades.', icon: 'book', rarity: 'rare', group: 'milestones', progress: (s) => count(s.sGrades, 10) },
  { id: 'flawless', title: 'Flawless Work-up', description: 'Complete a perfect case: right diagnosis, right urgency, every essential test and nothing wasted.', icon: 'gem', rarity: 'rare', group: 'milestones', progress: (s) => count(s.perfect, 1) },
  { id: 'five-perfect', title: 'Five Perfect Charts', description: 'Complete 5 perfect cases.', icon: 'gem', rarity: 'epic', group: 'milestones', progress: (s) => count(s.perfect, 5) },
  { id: 'hat-trick', title: 'Hat-trick of Clarity', description: 'Complete 3 perfect cases in a row.', icon: 'crown', rarity: 'epic', group: 'milestones', progress: (s) => count(s.bestPerfectStreak, 3) },
  { id: 'unbroken', title: 'Unbroken Chain', description: 'Make 10 correct diagnoses in a row.', icon: 'flame', rarity: 'epic', group: 'milestones', progress: (s) => count(s.bestCorrectStreak, 10) },

  // ── Technique ────────────────────────────────────────────────────────────
  {
    id: 'full-tray', title: 'Full Instrument Tray', description: 'Perform every clinical test in the clinic yourself at least once.', icon: 'slit-lamp', rarity: 'rare', group: 'technique',
    progress: (s, env) => (env.availableTests.length ? [env.availableTests.filter((t) => (s.tests[t]?.done ?? 0) > 0).length, env.availableTests.length] : [0, 1]),
  },
  { id: 'eagle-eye', title: 'Eagle Eye', description: 'Spot every lesion in a diseased fundus with a flawless ophthalmoscopy.', icon: 'ophthalmoscopy', rarity: 'epic', group: 'technique', progress: (s) => count(s.eagleEye, 1) },
  { id: 'swinging-flashlight', title: 'Swinging Flashlight', description: 'Catch a relative afferent pupillary defect with a clean pupil exam.', icon: 'pupils', rarity: 'epic', group: 'technique', progress: (s) => count(s.rapdCaught, 1) },
  testPerfect('tonometry', 'Perfect Mires', 'A flawless applanation reading: semicircles kissing on their inner edges.'),
  testPerfect('retinoscopy', 'Neutral Point', 'Neutralise a retinoscopy reflex perfectly.'),
  testPerfect('fluorescein', 'Cobalt Blue', 'A flawless fluorescein exam under the cobalt blue filter.'),
  testPerfect('visual-fields', 'Island of Vision', 'Map a visual field flawlessly.'),
  { id: 'practice-precise', title: 'Practice Makes Precise', description: 'Finish 10 practice sessions in the Arcade.', icon: 'target', rarity: 'common', group: 'technique', progress: (s) => count(s.practice, 10) },

  // ── History & efficiency (learning) ──────────────────────────────────────
  { id: 'right-questions', title: 'The Right Questions', description: 'Ask every key history question in a case.', icon: 'users', rarity: 'common', group: 'learning', progress: (s) => count(s.fullHistory, 1) },
  { id: 'art-of-listening', title: 'The Art of Listening', description: 'Ask every key history question in 10 cases.', icon: 'heart', rarity: 'rare', group: 'learning', progress: (s) => count(s.fullHistory, 10) },
  { id: 'diagnostic-steward', title: 'Diagnostic Steward', description: '10 correct cases with every essential test and no unnecessary ones.', icon: 'target', rarity: 'rare', group: 'learning', progress: (s) => count(s.lean, 10) },
  { id: 'swift-and-sure', title: 'Swift and Sure', description: 'Earn 3 S grades inside par time.', icon: 'clock', rarity: 'rare', group: 'learning', progress: (s) => count(s.swift, 3) },
  { id: 'second-opinion', title: 'Second Opinion', description: 'Correctly diagnose a case in Second Opinion review.', icon: 'refresh', rarity: 'common', group: 'learning', progress: (s) => count(s.reviewCorrect, 1) },
  { id: 'comeback', title: 'Lesson Learned', description: 'Correctly diagnose a condition you once missed.', icon: 'refresh', rarity: 'rare', group: 'learning', progress: (s) => count(s.comebacks, 1) },
  { id: 'well-calibrated', title: 'Well Calibrated', description: 'Be certain — and right — 10 times.', icon: 'stats', rarity: 'rare', group: 'learning', progress: (s) => count(s.certainCorrect, 10) },
  {
    id: 'committed-to-memory', title: 'Committed to Memory', description: 'Earn three mastery stars on any diagnosis.', icon: 'star', rarity: 'epic', group: 'learning',
    progress: (s) => flag(Object.values(s.dx).some((d) => d.bestStars >= 3)),
  },
  { id: 'zebra-spotter', title: 'Zebra Spotter', description: 'Correctly diagnose a rare condition.', icon: 'sparkle', rarity: 'rare', group: 'learning', progress: (s) => count(s.rareCorrect, 1) },
  { id: 'reassurance', title: 'Clean Bill of Health', description: 'Correctly reassure a patient whose eyes are healthy — not every visit is a diagnosis.', icon: 'heart', rarity: 'common', group: 'learning', progress: (s) => flag(correctOf(s, 'healthy-eyes') > 0) },

  // ── Triage ───────────────────────────────────────────────────────────────
  {
    id: 'sight-saver', title: 'Sight Saver', description: 'Diagnose and triage an emergency correctly.', icon: 'lightning', rarity: 'rare', group: 'triage',
    progress: (s, env) => flag(env.emergencyDiagnoses.some((id) => triaged(s, id))),
  },
  {
    id: 'on-call-ready', title: 'On-Call Ready', description: 'Correctly triage every emergency diagnosis the clinic sees.', icon: 'alert', rarity: 'legendary', group: 'triage',
    progress: (s, env) => coverage(env.emergencyDiagnoses, (id) => triaged(s, id)),
  },
  { id: 'red-flag-radar', title: 'Red Flag Radar', description: 'Set the correct urgency in 25 cases.', icon: 'warning', rarity: 'rare', group: 'triage', progress: (s) => count(s.urgencyCorrect, 25) },
  { id: 'pressure-point', title: 'Pressure Point', description: 'Catch acute angle closure and send it straight to emergency care.', icon: 'tonometry', rarity: 'epic', group: 'triage', progress: (s) => flag(triaged(s, 'acute-angle-closure')) },
  { id: 'curtain-call', title: 'Curtain Call', description: 'Recognise a retinal detachment and triage it as an emergency.', icon: 'eye', rarity: 'epic', group: 'triage', progress: (s) => flag(triaged(s, 'retinal-detachment')) },
  { id: 'temporal-clue', title: 'The Temporal Clue', description: 'Suspect giant cell arteritis and triage it as an emergency.', icon: 'clock', rarity: 'epic', group: 'triage', progress: (s) => flag(triaged(s, 'giant-cell-arteritis')) },
  { id: 'crao-triage', title: 'Against the Clock', description: 'Diagnose and triage a central retinal artery occlusion correctly.', icon: 'lightning', rarity: 'epic', group: 'triage', progress: (s) => flag(triaged(s, 'crao')) },

  // ── Specialty crests ─────────────────────────────────────────────────────
  crest('refractive', 'Crest of Refraction', 'phoropter'),
  crest('binocular', 'Crest of Binocular Vision', 'cover-test'),
  crest('anterior', 'Crest of the Anterior Segment', 'slit-lamp'),
  crest('cornea', 'Crest of the Cornea', 'fluorescein'),
  crest('glaucoma', 'Crest of Glaucoma', 'tonometry'),
  crest('retina', 'Crest of the Retina', 'ophthalmoscopy'),
  crest('neuro', 'Crest of Neuro-ophthalmology', 'visual-fields'),
  {
    id: 'living-atlas', title: 'Living Atlas', description: 'Correctly diagnose every condition in the clinic.', icon: 'book', rarity: 'legendary', group: 'crests',
    progress: (s, env) => coverage(env.diagnoses.map((d) => d.id), (id) => correctOf(s, id) > 0),
  },
  {
    id: 'grand-master', title: 'Grand Master', description: 'Three mastery stars on every diagnosis.', icon: 'crown', rarity: 'legendary', group: 'crests', secret: true,
    progress: (_s, env) => coverage(env.diagnoses.map((d) => d.id), (id) => env.stars(id) >= 3),
  },

  // ── Career & modes ───────────────────────────────────────────────────────
  { id: 'full-shift', title: 'End of Shift', description: 'See a Clinic Shift through to closing time.', icon: 'home', rarity: 'common', group: 'career', progress: (s) => count(s.runs['shift'] ?? 0, 1) },
  { id: 'daily-rounds', title: 'Morning Rounds', description: 'Complete a set of Daily Rounds.', icon: 'clock', rarity: 'common', group: 'career', progress: (s) => count(s.runs['daily'] ?? 0, 1) },
  { id: 'code-red-veteran', title: 'Steady Under Pressure', description: 'Finish a Code Red run.', icon: 'heart', rarity: 'rare', group: 'career', progress: (s) => count(s.runs['code-red'] ?? 0, 1) },
  ...RANK_TROPHY.map<AchievementDef>((t, i) => ({
    id: `rank-${RANKS[i + 1]!.id}`,
    title: t.title,
    description: t.description,
    icon: i >= 4 ? 'crown' : 'trophy',
    rarity: t.rarity,
    group: 'career',
    secret: i === RANK_TROPHY.length - 1,
    progress: (_s, env) => flag(env.level >= (i + 1) * TIERS_PER_RANK),
  })),
];

export const ACHIEVEMENT_BY_ID: ReadonlyMap<string, AchievementDef> = new Map(ACHIEVEMENTS.map((a) => [a.id, a]));

export function isUnlockable(def: AchievementDef, s: RanksState, env: AchievementEnv): boolean {
  const [cur, max] = def.progress(s, env);
  return max > 0 && cur >= max;
}

/** Achievements newly earned in `s` (not yet recorded as unlocked). */
export function newlyUnlocked(s: RanksState, env: AchievementEnv): AchievementDef[] {
  return ACHIEVEMENTS.filter((a) => !s.achievements[a.id] && isUnlockable(a, s, env));
}

export const RARITY_ORDER: Rarity[] = ['common', 'rare', 'epic', 'legendary'];
