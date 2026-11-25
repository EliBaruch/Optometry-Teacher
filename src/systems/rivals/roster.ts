/**
 * The colleagues on the weekly board. Pure data — no DOM, no services.
 * Every string here is player-facing: keep it warm, witty and clinic-themed.
 */
import type { TestId, Urgency } from '@core';

export type RivalId = 'vex' | 'okafor' | 'mori' | 'reyes' | 'lindqvist';

/** The classic clinical slip each colleague tends to make (each one teaches something). */
export type SlipKind = 'skips-basics' | 'rushes-posterior' | 'over-tests' | 'under-triages' | 'anchors';
/** Every slip a result can carry: a colleague's signature slip, or an ordinary off-day error. */
export type ResultSlipKind = SlipKind | 'misread' | 'forgot-test' | 'mistriaged';

export interface RivalAvatar {
  seed: string;
  age: number;
  sex: 'F' | 'M' | 'X';
  /** Fixed overrides on top of the generated spec, so each portrait is on-brand. */
  look: {
    skin?: 0 | 1 | 2 | 3 | 4 | 5;
    hair?: 'bald' | 'short' | 'buzz' | 'curly' | 'long' | 'bun' | 'ponytail' | 'afro' | 'bob' | 'swept' | 'braids';
    hairColor?: string;
    irisColor?: string;
    glasses?: 'none' | 'round' | 'square' | 'cat-eye' | 'aviator' | 'half-rim';
    facialHair?: 'none' | 'stubble' | 'beard' | 'moustache';
    outfit?: string;
    accessory?: 'none' | 'earrings' | 'hearing-aid' | 'necklace' | 'bandage';
  };
}

export interface RivalQuips {
  /** Rival scored higher than the player on this patient. */
  ahead: string[];
  /** Player scored higher. */
  behind: string[];
  /** Rival made their classic slip on this patient. */
  slipped: string[];
}

export interface Rival {
  id: RivalId;
  name: string;
  short: string;
  title: string;
  tagline: string;
  bio: string;
  color: string;
  avatar: RivalAvatar;
  /** Probability of reaching the right diagnosis on an average (difficulty 3) case without a slip. */
  accuracy: number;
  /** Relative pace (1 = par). Higher is faster. */
  speed: number;
  /** 0..1 chance of asking each key history question. */
  thoroughness: number;
  /** 0..1 average test technique. */
  technique: number;
  /** Case-to-case spread of technique (form varies; nobody is a machine). */
  spread: number;
  /** Fraction of key history questions they usually ask (0..1). */
  history: number;
  /** Chance per case of booking the urgency one notch off (outside their signature slip). */
  triageError: number;
  /** Which way their triage drifts when it does. */
  triageBias: 'over' | 'under' | 'either';
  /** Chance per case of forgetting one essential (non-decisive) test. */
  forgets: number;
  /** Chance per case of ordering a test the patient did not need. */
  strayTest: number;
  /** Tests this colleague is known for — their signature. */
  signature: TestId[];
  signatureLabel: string;
  slip: SlipKind;
  /** Base chance per case of making the slip (scaled by case difficulty). */
  slipRate: number;
  /** Tests they're tempted to skip (only for skip-type slips). */
  skipPrefs: TestId[];
  slipLabel: string;
  /** The teaching point behind their slip, shown on their profile. */
  slipLesson: string;
  /** Weekly league points at scale 1. */
  weeklyTarget: number;
  /** Relative activity Monday..Sunday. */
  weekRhythm: [number, number, number, number, number, number, number];
  quips: RivalQuips;
}

export const ROSTER: readonly Rival[] = [
  {
    id: 'vex',
    name: 'Dr. Cassius Vex',
    short: 'Dr. Vex',
    title: 'Neuro-ophthalmology fellow',
    tagline: 'Brilliant. Knows it. Mentions it.',
    bio: 'Reads a visual field like a love letter and a pupil like a confession. Thinks pressure checks are beneath him — which is exactly where angle closure hides.',
    color: '#34d399',
    avatar: {
      seed: 'rival:vex', age: 34, sex: 'M',
      look: { skin: 1, hair: 'swept', hairColor: '#1c1410', irisColor: '#3f7a5a', glasses: 'none', facialHair: 'stubble', outfit: '#1f3b33' },
    },
    accuracy: 0.9,
    speed: 1.3,
    thoroughness: 0.6,
    technique: 0.82,
    spread: 0.08,
    history: 0.55,
    triageError: 0.1,
    triageBias: 'under',
    forgets: 0,
    strayTest: 0.15,
    signature: ['pupils', 'visual-fields', 'color-vision'],
    signatureLabel: 'Neuro sleuth',
    slip: 'skips-basics',
    slipRate: 0.3,
    skipPrefs: ['tonometry', 'visual-acuity', 'pinhole', 'amsler'],
    slipLabel: 'Skips the “boring” basics',
    slipLesson: 'Acuity and pressure take two minutes each and catch the diagnoses that brilliance walks straight past.',
    weeklyTarget: 2600,
    weekRhythm: [1.2, 1, 1.1, 1, 1.3, 0.6, 0.3],
    quips: {
      ahead: ['Close. Closer than most. Still mine.', 'I had it at “hello”. You had it at the chart. Both valid.', 'Elegant work-up. Mine was faster.'],
      behind: ['Hm. Lucky patient. …Well played.', 'Fine. I was distracted by the lighting in room 3.', 'Noted. Do not let it go to your head.'],
      slipped: ['Two minutes of routine would have saved me. Noted.', 'I was so sure. That is the problem, isn’t it.', 'The basics. Again. Do not say it.'],
    },
  },
  {
    id: 'okafor',
    name: 'Dr. Amara Okafor',
    short: 'Dr. Okafor',
    title: 'Glaucoma & retina specialist',
    tagline: 'Meticulous. Never misses a step.',
    bio: 'Twenty years of dilated fundus exams and not one skipped. Her charts read like textbooks — and take nearly as long to write.',
    color: '#60a5fa',
    avatar: {
      seed: 'rival:okafor', age: 52, sex: 'F',
      look: { skin: 5, hair: 'braids', hairColor: '#17110d', irisColor: '#4a2f1d', glasses: 'cat-eye', outfit: '#23365e', accessory: 'earrings', facialHair: 'none' },
    },
    accuracy: 0.95,
    speed: 0.5,
    thoroughness: 0.98,
    technique: 0.68,
    spread: 0.1,
    history: 0.95,
    triageError: 0.35,
    triageBias: 'over',
    forgets: 0,
    strayTest: 0.15,
    signature: ['tonometry', 'ophthalmoscopy', 'visual-fields'],
    signatureLabel: 'Pressure & fundus',
    slip: 'over-tests',
    slipRate: 0.55,
    skipPrefs: [],
    slipLabel: 'Orders one test too many',
    slipLesson: 'A focused work-up is a skill: every test should answer a question you are actually asking.',
    weeklyTarget: 2250,
    weekRhythm: [1, 1.1, 1, 1.1, 1, 0.5, 0.1],
    quips: {
      ahead: ['Slow is smooth, smooth is right.', 'Every box ticked. The patient deserved it.', 'Lovely effort. Check the fundus every time and you will catch me.'],
      behind: ['Beautifully done. I am writing that one down.', 'You were sharper and quicker today. Good.', 'Excellent. Now teach me your shortcut.'],
      slipped: ['I ran everything twice. The clock was not impressed.', 'Thorough is not the same as focused. Note to self.', 'Correct, eventually. Eventually is a long word.'],
    },
  },
  {
    id: 'mori',
    name: 'Dr. Kenji Mori',
    short: 'Dr. Mori',
    title: 'Refraction & binocular vision',
    tagline: 'Fastest hands in the building.',
    bio: 'Neutralises a retinoscopy reflex before you have found the switch. Occasionally so quick he forgets to look at the back of the eye.',
    color: '#facc15',
    avatar: {
      seed: 'rival:mori', age: 29, sex: 'M',
      look: { skin: 1, hair: 'short', hairColor: '#0f0d0c', irisColor: '#2b1d14', glasses: 'round', outfit: '#4a3a12', facialHair: 'none' },
    },
    accuracy: 0.86,
    speed: 1.6,
    thoroughness: 0.5,
    technique: 0.5,
    spread: 0.18,
    history: 0.25,
    triageError: 0.3,
    triageBias: 'either',
    forgets: 0.35,
    strayTest: 0.25,
    signature: ['retinoscopy', 'phoropter', 'cover-test'],
    signatureLabel: 'Lightning refraction',
    slip: 'rushes-posterior',
    slipRate: 0.32,
    skipPrefs: ['ophthalmoscopy', 'visual-fields', 'pupils'],
    slipLabel: 'Rushes the slow, careful exams',
    slipLesson: 'A quick refraction never explains acuity that lenses and pinhole cannot fix — check the pupils, the fields and the fundus.',
    weeklyTarget: 1950,
    weekRhythm: [1.3, 1.2, 1.2, 1.2, 1.1, 0.9, 0.8],
    quips: {
      ahead: ['Done before the kettle boiled.', 'Speed is a skill too. Catch me if you can.', 'Next! …Oh, you are still charting.'],
      behind: ['Okay, okay — that was clean. Rematch?', 'Fast AND right. Unfair.', 'I blinked and you overtook me.'],
      slipped: ['Slow exams exist for a reason. Noted.', 'Fastest incomplete chart in the clinic. Not my best record.', 'Two minutes saved, one step missed. Bad trade.'],
    },
  },
  {
    id: 'reyes',
    name: 'Dr. Lucía Reyes',
    short: 'Dr. Reyes',
    title: 'Anterior segment & paediatrics',
    tagline: 'Kind mentor. Best pearls on the ward.',
    bio: 'Calms frightened toddlers and anxious executives alike. Her soft spot: she hates scaring patients, so she sometimes books urgent cases a little too gently.',
    color: '#f472b6',
    avatar: {
      seed: 'rival:reyes', age: 46, sex: 'F',
      look: { skin: 2, hair: 'long', hairColor: '#3a2418', irisColor: '#5a3a22', glasses: 'half-rim', outfit: '#5b2343', accessory: 'earrings', facialHair: 'none' },
    },
    accuracy: 0.92,
    speed: 0.7,
    thoroughness: 0.88,
    technique: 0.48,
    spread: 0.14,
    history: 0.85,
    triageError: 0.12,
    triageBias: 'under',
    forgets: 0.1,
    strayTest: 0.3,
    signature: ['slit-lamp', 'fluorescein', 'visual-acuity'],
    signatureLabel: 'Slit-lamp artist',
    slip: 'under-triages',
    slipRate: 0.65,
    skipPrefs: [],
    slipLabel: 'Triages a notch too gently',
    slipLesson: 'Reassurance is kindness only when the timing is right: urgency is part of the diagnosis.',
    weeklyTarget: 1600,
    weekRhythm: [1, 1, 0.9, 1, 1, 0.8, 0.6],
    quips: {
      ahead: ['Pearl: ask about contact lenses in every red eye.', 'You are close — keep asking one more history question.', 'Good instincts. Trust your slit lamp a little more.'],
      behind: ['That was textbook. I am proud of you.', 'You saw it before I did. Wonderful.', 'Lovely work-up. The patient was lucky to have you.'],
      slipped: ['I booked it too gently. Urgency is part of the diagnosis.', 'Right answer, wrong clock. Learn from my mistake.', 'I did not want to frighten them. I should have.'],
    },
  },
  {
    id: 'lindqvist',
    name: 'Dr. Theo Lindqvist',
    short: 'Dr. Lindqvist',
    title: 'First-year resident',
    tagline: 'Eager, earnest, decides a little early.',
    bio: 'Arrived last month with a new ophthalmoscope and a notebook of mnemonics. Tends to fall in love with the first diagnosis the history suggests.',
    color: '#67e8f9',
    avatar: {
      seed: 'rival:lindqvist', age: 26, sex: 'M',
      look: { skin: 0, hair: 'curly', hairColor: '#b98a52', irisColor: '#4f7da6', glasses: 'square', outfit: '#1d4a57', facialHair: 'none' },
    },
    accuracy: 0.84,
    speed: 0.45,
    thoroughness: 0.8,
    technique: 0.32,
    spread: 0.12,
    history: 0.3,
    triageError: 0.45,
    triageBias: 'either',
    forgets: 0.55,
    strayTest: 0.65,
    signature: ['visual-acuity', 'amsler', 'motility'],
    signatureLabel: 'Textbook basics',
    slip: 'anchors',
    slipRate: 0.17,
    skipPrefs: [],
    slipLabel: 'Anchors on the first impression',
    slipLesson: 'Form a differential early, but let the findings overrule it — anchoring is the commonest diagnostic error.',
    weeklyTarget: 950,
    weekRhythm: [1, 1, 1, 1, 1, 0.7, 0.7],
    quips: {
      ahead: ['I got one! I actually got one!', 'Mnemonics for the win.', 'Phew. I checked my notes twice.'],
      behind: ['How did you spot that so fast? Teach me?', 'Wow. Writing that one in my notebook.', 'Next time I am asking you first.'],
      slipped: ['I decided in the waiting room. Big mistake.', 'The findings were telling me. I was not listening.', 'Anchored. Again. Note to self: keep the differential open.'],
    },
  },
];

export const RIVAL_BY_ID: Record<RivalId, Rival> = Object.fromEntries(ROSTER.map((r) => [r.id, r])) as Record<RivalId, Rival>;

/** How a booking sounds ("booked it as …"). */
export const URGENCY_BOOKED: Record<Urgency, string> = {
  routine: 'a routine appointment',
  soon: 'a visit within a few days',
  urgent: 'a same-day urgent visit',
  emergency: 'an emergency referral',
};
/** What the patient actually needed ("this patient needed …"). */
export const URGENCY_NEEDED: Record<Urgency, string> = {
  routine: 'a routine appointment',
  soon: 'to be seen within days',
  urgent: 'to be seen the same day',
  emergency: 'immediate emergency care',
};
