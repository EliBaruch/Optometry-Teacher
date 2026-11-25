import { defineStrings, type Confidence, type Grade, type ScorePart, type Urgency } from '@core';

interface Table {
  headline: Record<Grade, string>;
  perfect: string;
  timeoutHeadline: string;
  closedHeadline: string;
  gradeWord: Record<Grade, string>;
  verdictTitle: { correct: string; wrong: string; timeout: string; abandoned: string };
  category: Record<string, string>;
  urgency: Record<Urgency, string>;
  urgencyMeaning: Record<Urgency, string>;
  confidence: Record<Confidence, string>;
  adviceNoChoice: (label: string) => string;
  adviceExact: string;
  adviceUnderFar: string;
  adviceUnder: string;
  adviceOverFar: string;
  adviceOver: string;
  partLabel: Record<ScorePart['id'], string>;
  historyCat: Record<string, string>;
  // results scene
  noCaseScreen: string;
  noCaseTitle: string;
  noCaseBody: string;
  backToClinic: string;
  caseReview: string;
  perfectFloat: string;
  outOfTime: string;
  closed: string;
  sealLabel: string;
  gradeEyebrow: (g: string) => string;
  noScore: string;
  noScoreBody: string;
  lesson: string;
  aroundClinic: string;
  skip: string;
  patientOf: (seen: number, total: number) => string;
  patientEndless: (seen: number) => string;
  livesLeft: (n: number) => string;
  codexEntry: string;
  seeSummary: string;
  nextPatient: string;
  rewards: string;
  // verdict card
  yourDx: string;
  noDx: string;
  clockRanOut: string;
  closedEarly: string;
  diagnosisFallback: string;
  answerWas: string;
  also: string;
  youSaid: string;
  triage: string;
  confidenceTitle: string;
  patientFallback: string;
  // ledger
  caseScore: string;
  par: string;
  keyQuestions: (a: number, b: number) => string;
  toRunSuffix: string;
  // teaching
  confWrongTitle: string;
  confWrongBefore: string;
  confWrongAfter: string;
  luckyTitle: string;
  luckyBody: string;
  luckyBtn: string;
  calibrated: string;
  fromCodex: string;
  keyFindings: string;
  pearls: string;
  furtherReading: string;
  noCodex: string;
  caseOf: (name: string) => string;
  teachesTitle: string;
  redFlags: string;
  management: string;
  triageEyebrow: string;
  correctUrgencyAria: (c: string, chosen?: string) => string;
  tagYou: string;
  tagAnswer: string;
  workup: string;
  nothingMissed: string;
  whatMissed: string;
  cleanWorkup: string;
  missedTests: string;
  unaskedKey: string;
  unnecessary: string;
  reflection: string;
  reflect: string;
  clinched: string;
  fromChart: string;
  thinChart: string;
  essentialTests: string;
  keyQs: string;
  clockStopped: string;
  onTheClock: (clock: string) => string;
  timeRanOut: string;
  essentialsInOrder: string;
  // run summary
  shiftReport: string;
  noPatientsTitle: string;
  noPatientsBody: string;
  tryAgain: string;
  runComplete: string;
  totalScore: string;
  firstRecord: string;
  newBest: string;
  previous: (n: string) => string;
  personalBest: (n: string) => string;
  runStats: string;
  accuracy: string;
  correctOf: (a: number, b: number) => string;
  comboPeak: string;
  comboHigh: string;
  comboSome: string;
  comboNone: string;
  bestCase: string;
  bestGradePrefix: string;
  bestSub: (total: string) => string;
  patients: string;
  rowCorrect: string;
  rowTimeout: string;
  rowMissed: string;
  rowCorrectShort: string;
  rowMissedShort: string;
  studyList: string;
  secondLook: string;
  studyBody: (n: number) => string;
  playAgain: string;
}

export const S = defineStrings<Table>({
  en: {
    headline: {
      S: 'Textbook. Frame it.',
      A: 'Sharp work, doctor.',
      B: 'A solid call.',
      C: 'Right answer, rough road.',
      D: 'Close, but not this time.',
      F: 'One for the review pile.',
    },
    perfect: 'A perfect case.',
    timeoutHeadline: 'The clock won this round.',
    closedHeadline: 'Case closed early.',
    gradeWord: { S: 'Exemplary', A: 'Excellent', B: 'Solid', C: 'Adequate', D: 'Needs review', F: 'Missed' },
    verdictTitle: { correct: 'Correct diagnosis', wrong: 'Not this time', timeout: 'Out of time', abandoned: 'Case closed' },
    category: {
      refractive: 'Refractive', binocular: 'Binocular vision', anterior: 'Lids & conjunctiva', cornea: 'Cornea',
      glaucoma: 'Uvea & glaucoma', lens: 'Lens', retina: 'Retina', neuro: 'Neuro-ophthalmology', systemic: 'Systemic', normal: 'Healthy eyes',
    },
    urgency: { routine: 'Routine', soon: 'Soon', urgent: 'Urgent', emergency: 'Emergency' },
    urgencyMeaning: {
      routine: 'Book a normal appointment, weeks to months away.',
      soon: 'See within a few days.',
      urgent: 'Same day, within 24 hours.',
      emergency: 'Immediately: sight- or life-threatening. Emergency department or on-call specialist now.',
    },
    confidence: { guessing: 'Guessing', 'fairly-sure': 'Fairly sure', certain: 'Certain' },
    adviceNoChoice: (label) => `This patient needed ${label.toLowerCase()} care.`,
    adviceExact: 'Spot on: the right patient, seen at the right time.',
    adviceUnderFar: 'Under-triaged by a long way. This is the dangerous direction: when in doubt, escalate.',
    adviceUnder: 'One step too relaxed. Under-triage is the dangerous direction: when in doubt, escalate.',
    adviceOverFar: 'Over-triaged by a long way. Safe for this patient, but it costs an emergency slot someone else may need.',
    adviceOver: 'One step too cautious. Safer than the reverse, but over-referral clogs urgent services.',
    partLabel: {
      diagnosis: 'Diagnosis', urgency: 'Triage urgency', workup: 'Essential work-up', efficiency: 'Efficiency',
      history: 'History taking', skill: 'Test technique', speed: 'Speed',
    },
    historyCat: {
      onset: 'Onset', symptoms: 'Symptoms', 'ocular-history': 'Eye history', medical: 'Medical', medications: 'Medications', family: 'Family', social: 'Lifestyle',
    },
    noCaseScreen: 'Case review',
    noCaseTitle: 'No case to review',
    noCaseBody: "There's no finished patient on the chart right now.",
    backToClinic: 'Back to clinic',
    caseReview: 'Case review',
    perfectFloat: 'Perfect case',
    outOfTime: 'Out of time',
    closed: 'Closed',
    sealLabel: 'Out of time',
    gradeEyebrow: (g) => `Grade ${g}`,
    noScore: 'No score',
    noScoreBody: 'The correct answer and the full teaching are below. This diagnosis will come back for review.',
    lesson: 'The lesson',
    aroundClinic: 'Around the clinic',
    skip: 'Skip',
    patientOf: (s, n) => `Patient ${s} of ${n}`,
    patientEndless: (s) => `Patient ${s}`,
    livesLeft: (n) => `${n} lives left`,
    codexEntry: 'Codex entry',
    seeSummary: 'See run summary',
    nextPatient: 'Next patient',
    rewards: 'Rewards',
    yourDx: 'Your diagnosis',
    noDx: 'No diagnosis made',
    clockRanOut: 'The clock ran out',
    closedEarly: 'Case closed early',
    diagnosisFallback: 'Diagnosis',
    answerWas: 'The answer was',
    also: 'also:',
    youSaid: 'You said',
    triage: 'Triage',
    confidenceTitle: 'How sure you said you were',
    patientFallback: 'Patient',
    caseScore: 'Case score',
    par: 'par',
    keyQuestions: (a, b) => `${a}/${b} key questions`,
    toRunSuffix: 'to the run',
    confWrongTitle: 'Confidently wrong: this one will come back for review.',
    confWrongBefore: "That's the best kind of mistake to make here. Errors you felt sure about are the ones the brain corrects most durably. Read why it was ",
    confWrongAfter: " below; you'll meet it again soon.",
    luckyTitle: 'Lucky? Lock it in.',
    luckyBody: 'You got it while guessing. Thirty seconds with the key findings turns luck into knowledge.',
    luckyBtn: 'Key findings',
    calibrated: 'Sure and right: well calibrated.',
    fromCodex: 'From the codex',
    keyFindings: 'Key findings',
    pearls: 'Clinical pearls',
    furtherReading: 'Further reading',
    noCodex: "The codex entry for this diagnosis isn't available yet.",
    caseOf: (n) => `${n}'s case`,
    teachesTitle: 'What this patient teaches',
    redFlags: 'Red flags',
    management: 'Management',
    triageEyebrow: 'Triage',
    correctUrgencyAria: (c, chosen) => `Correct urgency ${c}${chosen ? `, you chose ${chosen}` : ''}`,
    tagYou: 'you',
    tagAnswer: 'answer',
    workup: 'Your work-up',
    nothingMissed: 'Nothing missed',
    whatMissed: 'What you missed',
    cleanWorkup: 'Every essential test, every key question, nothing wasted. That is a textbook work-up.',
    missedTests: 'Essential tests skipped',
    unaskedKey: "Key questions you didn't ask",
    unnecessary: "Tests that didn't help here",
    reflection: 'Reflection',
    reflect: 'Reflect',
    clinched: 'What clinched it?',
    fromChart: 'The two most telling lines from your chart.',
    thinChart: 'Your chart was thin; these are the findings to look for.',
    essentialTests: 'Essential tests',
    keyQs: 'Key questions',
    clockStopped: 'Where the clock stopped',
    onTheClock: (c) => `${c} on the clock`,
    timeRanOut: 'Time ran out',
    essentialsInOrder: 'The essentials, in exam order',
    shiftReport: 'Shift report',
    noPatientsTitle: 'No patients seen',
    noPatientsBody: 'This run ended before any patient was reviewed.',
    tryAgain: 'Try again',
    runComplete: 'Run complete',
    totalScore: 'total score',
    firstRecord: 'First record set',
    newBest: 'New personal best',
    previous: (n) => `previous ${n}`,
    personalBest: (n) => `Personal best ${n}`,
    runStats: 'Run statistics',
    accuracy: 'Accuracy',
    correctOf: (a, b) => `${a} of ${b} correct`,
    comboPeak: 'Combo peak',
    comboHigh: 'On fire',
    comboSome: 'In a row',
    comboNone: 'Keep at it',
    bestCase: 'Best case',
    bestGradePrefix: 'Grade ',
    bestSub: (t) => ` · case score ${t}`,
    patients: 'Patients',
    rowCorrect: 'Correct diagnosis',
    rowTimeout: 'Out of time',
    rowMissed: 'Missed diagnosis',
    rowCorrectShort: 'Correct',
    rowMissedShort: 'Missed',
    studyList: 'Study list',
    secondLook: 'Worth a second look',
    studyBody: (n) => `${n === 1 ? 'This diagnosis' : 'These diagnoses'} will come back for review. Five minutes in the codex now makes the next one stick.`,
    playAgain: 'Play again',
  },
  he: {
    headline: {
      S: 'כמו בספר. כדאי למסגר.',
      A: 'עבודה מדויקת.',
      B: 'קריאה טובה.',
      C: 'התשובה נכונה, הדרך פחות.',
      D: 'כמעט. לא הפעם.',
      F: 'זה הולך לערימת החזרה.',
    },
    perfect: 'מקרה מושלם.',
    timeoutHeadline: 'השעון ניצח הפעם.',
    closedHeadline: 'התיק נסגר באמצע.',
    gradeWord: { S: 'למופת', A: 'מצוין', B: 'טוב', C: 'סביר', D: 'דורש חזרה', F: 'פספוס' },
    verdictTitle: { correct: 'אבחנה נכונה', wrong: 'לא הפעם', timeout: 'נגמר הזמן', abandoned: 'התיק נסגר' },
    category: {
      refractive: 'שגיאות שבירה', binocular: 'ראייה דו-עינית', anterior: 'עפעפיים ולחמית', cornea: 'קרנית',
      glaucoma: 'אובאה וגלאוקומה', lens: 'עדשה', retina: 'רשתית', neuro: 'נוירו-אופתלמולוגיה', systemic: 'מחלות מערכתיות', normal: 'עיניים בריאות',
    },
    urgency: { routine: 'שגרתי', soon: 'בקרוב', urgent: 'דחוף', emergency: 'חירום' },
    urgencyMeaning: {
      routine: 'תור רגיל, בעוד שבועות עד חודשים.',
      soon: 'לראות תוך כמה ימים.',
      urgent: 'היום, תוך 24 שעות.',
      emergency: 'מיידי: סכנה לראייה או לחיים. חדר מיון או רופא תורן, עכשיו.',
    },
    confidence: { guessing: 'ניחוש', 'fairly-sure': 'די בטוחים', certain: 'בטוחים לגמרי' },
    adviceNoChoice: (label) => `רמת הדחיפות הנכונה כאן: ${label}.`,
    adviceExact: 'בול: המטופל הנכון, בזמן הנכון.',
    adviceUnderFar: 'הערכתם את הדחיפות נמוך בהרבה מדי. זה הכיוון המסוכן: כשיש ספק, מעלים דרגה.',
    adviceUnder: 'דרגה אחת נמוך מדי. טעות לכיוון הזה היא המסוכנת: כשיש ספק, מעלים דרגה.',
    adviceOverFar: 'הערכתם את הדחיפות גבוה בהרבה מדי. למטופל זה לא מזיק, אבל זה תופס תור חירום שמישהו אחר אולי צריך.',
    adviceOver: 'זהירות יתר של דרגה אחת. עדיף על ההפך, אבל הפניות מיותרות סותמות את השירותים הדחופים.',
    partLabel: {
      diagnosis: 'אבחנה', urgency: 'דחיפות הטריאז׳', workup: 'בירור חיוני', efficiency: 'יעילות',
      history: 'לקיחת אנמנזה', skill: 'טכניקת בדיקה', speed: 'מהירות',
    },
    historyCat: {
      onset: 'התחלת הבעיה', symptoms: 'תסמינים', 'ocular-history': 'היסטוריה עינית', medical: 'רקע רפואי', medications: 'תרופות', family: 'היסטוריה משפחתית', social: 'אורח חיים',
    },
    noCaseScreen: 'סקירת מקרה',
    noCaseTitle: 'אין מקרה לסקירה',
    noCaseBody: 'אין כרגע מטופל שסיימתם לבדוק.',
    backToClinic: 'חזרה למרפאה',
    caseReview: 'סקירת מקרה',
    perfectFloat: 'מקרה מושלם',
    outOfTime: 'נגמר הזמן',
    closed: 'נסגר',
    sealLabel: 'נגמר הזמן',
    gradeEyebrow: (g) => `ציון ${g}`,
    noScore: 'בלי ניקוד',
    noScoreBody: 'התשובה הנכונה וההסבר המלא מחכים למטה. האבחנה הזו תחזור אליכם לתרגול חוזר.',
    lesson: 'הלקח',
    aroundClinic: 'מסביב למרפאה',
    skip: 'דלגו',
    patientOf: (s, n) => `מטופל ${s} מתוך ${n}`,
    patientEndless: (s) => `מטופל ${s}`,
    livesLeft: (n) => (n === 1 ? 'נשאר חיים אחד' : `נשארו ${n} חיים`),
    codexEntry: 'הערך בקודקס',
    seeSummary: 'לסיכום המשמרת',
    nextPatient: 'המטופל הבא',
    rewards: 'פרסים',
    yourDx: 'האבחנה שלכם',
    noDx: 'לא נקבעה אבחנה',
    clockRanOut: 'הזמן נגמר',
    closedEarly: 'התיק נסגר באמצע',
    diagnosisFallback: 'אבחנה',
    answerWas: 'התשובה הייתה',
    also: 'כינויים נוספים:',
    youSaid: 'אמרתם',
    triage: 'טריאז׳',
    confidenceTitle: 'עד כמה הייתם בטוחים',
    patientFallback: 'מטופל',
    caseScore: 'ניקוד המקרה',
    par: 'יעד',
    keyQuestions: (a, b) => `${a}/${b} שאלות מפתח`,
    toRunSuffix: 'למשמרת',
    confWrongTitle: 'בטוחים וטועים: המקרה הזה יחזור אליכם.',
    confWrongBefore: 'זו הטעות הכי מועילה שאפשר לעשות כאן. דווקא טעויות שהייתם בטוחים בהן המוח מתקן הכי עמוק. קראו למטה למה זו הייתה ',
    confWrongAfter: ', ובקרוב תפגשו אותה שוב.',
    luckyTitle: 'ניחשתם נכון? עכשיו קבעו את זה בראש.',
    luckyBody: 'צדקתם בלי להיות בטוחים. חצי דקה עם ממצאי המפתח הופכת מזל לידע.',
    luckyBtn: 'הממצאים המרכזיים',
    calibrated: 'בטוחים וצדקתם: כיול מדויק.',
    fromCodex: 'מהקודקס',
    keyFindings: 'הממצאים המרכזיים',
    pearls: 'פנינים קליניות',
    furtherReading: 'להמשך קריאה',
    noCodex: 'הערך בקודקס לאבחנה הזו עדיין לא מוכן.',
    caseOf: (n) => `המקרה של ${n}`,
    teachesTitle: 'מה המקרה הזה מלמד',
    redFlags: 'דגלים אדומים',
    management: 'ניהול הטיפול',
    triageEyebrow: 'טריאז׳',
    correctUrgencyAria: (c, chosen) => `הדחיפות הנכונה: ${c}${chosen ? `, בחרתם: ${chosen}` : ''}`,
    tagYou: 'אתם',
    tagAnswer: 'התשובה',
    workup: 'הבירור שלכם',
    nothingMissed: 'לא פספסתם כלום',
    whatMissed: 'מה פספסתם',
    cleanWorkup: 'כל בדיקה חיונית, כל שאלת מפתח, ושום דבר מיותר. בירור לפי הספר.',
    missedTests: 'בדיקות חיוניות שדילגתם עליהן',
    unaskedKey: 'שאלות מפתח שלא שאלתם',
    unnecessary: 'בדיקות שלא תרמו כאן',
    reflection: 'עצירה למחשבה',
    reflect: 'עצירה למחשבה',
    clinched: 'מה הכריע?',
    fromChart: 'שתי השורות הכי מדברות מהתיק שלכם.',
    thinChart: 'בתיק שלכם היה מעט מדי מידע. אלה הממצאים שכדאי לחפש.',
    essentialTests: 'בדיקות חיוניות',
    keyQs: 'שאלות מפתח',
    clockStopped: 'איפה השעון נעצר',
    onTheClock: (c) => `מגבלת הזמן: ${c}`,
    timeRanOut: 'הזמן נגמר',
    essentialsInOrder: 'החיוניות, לפי סדר הבדיקה',
    shiftReport: 'דוח משמרת',
    noPatientsTitle: 'לא נבדק אף מטופל',
    noPatientsBody: 'המשמרת הסתיימה לפני שנסקר מטופל כלשהו.',
    tryAgain: 'עוד ניסיון',
    runComplete: 'המשמרת הסתיימה',
    totalScore: 'ניקוד כולל',
    firstRecord: 'השיא הראשון נקבע',
    newBest: 'שיא אישי חדש',
    previous: (n) => `הקודם: ${n}`,
    personalBest: (n) => `השיא האישי: ${n}`,
    runStats: 'נתוני המשמרת',
    accuracy: 'דיוק',
    correctOf: (a, b) => `${a} מתוך ${b} נכונות`,
    comboPeak: 'שיא הרצף',
    comboHigh: 'על אש',
    comboSome: 'ברצף נכון',
    comboNone: 'ממשיכים',
    bestCase: 'המקרה הכי טוב',
    bestGradePrefix: 'ציון ',
    bestSub: (t) => ` · ניקוד המקרה ${t}`,
    patients: 'מטופלים',
    rowCorrect: 'אבחנה נכונה',
    rowTimeout: 'נגמר הזמן',
    rowMissed: 'אבחנה שפוספסה',
    rowCorrectShort: 'נכון',
    rowMissedShort: 'פספוס',
    studyList: 'רשימת לימוד',
    secondLook: 'שווה מבט נוסף',
    studyBody: (n) => `${n === 1 ? 'האבחנה הזו תחזור' : 'האבחנות האלה יחזרו'} אליכם לתרגול חוזר. חמש דקות בקודקס עכשיו, והפעם הבאה תיקלט.`,
    playAgain: 'משמרת נוספת',
  },
});
