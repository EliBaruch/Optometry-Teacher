/**
 * Every player-visible string of the visual-fields mini-game, in both editions.
 * English is kept verbatim; Hebrew is written natively. Interpolations are functions.
 */
import { defineStrings, isolateLtrRuns, pickStrings, type Locale, type MiniGameText } from '@core';
import type { Family, Localisation, Side } from './interpret';

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

export type AnatKey = 'superior' | 'inferior' | 'temporal' | 'nasal' | 'superotemporal' | 'superonasal' | 'inferotemporal' | 'inferonasal';
export type RetroWhere = 'general' | 'temporal' | 'parietal';
export type RetroWhat = 'hemi' | 'superior' | 'inferior';
export type ChiasmWhat = 'junctional' | 'bitemporal' | 'bitemporal-superior' | 'bitemporal-inferior';

export const S = defineStrings({
  en: {
    // ── field vocabulary
    famLabel: {
      full: 'Full field',
      constricted: 'Constriction',
      central: 'Central scotoma',
      cecocentral: 'Cecocentral scotoma',
      'blind-spot': 'Enlarged blind spot',
      arcuate: 'Arcuate',
      'nasal-step': 'Nasal step',
      altitudinal: 'Altitudinal',
      hemianopia: 'Hemianopia',
      quadrantanopia: 'Quadrantanopia',
      curtain: 'Peripheral curtain',
      island: 'Temporal island',
    } as Record<Family, string>,
    famSub: {
      full: 'Only the physiological blind spot',
      constricted: 'Tunnel — periphery lost all round',
      central: 'Fixation lost',
      cecocentral: 'Fixation to blind spot',
      'blind-spot': 'Grown around the disc',
      arcuate: 'Arc from the blind spot',
      'nasal-step': 'Step at the nasal meridian',
      altitudinal: 'Upper or lower half',
      hemianopia: 'Half — respects vertical',
      quadrantanopia: 'One quarter',
      curtain: 'Edge loss, fixation spared',
      island: 'Almost all lost',
    } as Record<Family, string>,
    sideLabel: {
      superior: 'Upper', inferior: 'Lower', left: 'Left', right: 'Right',
      'superior-left': 'Upper left', 'superior-right': 'Upper right',
      'inferior-left': 'Lower left', 'inferior-right': 'Lower right',
    } as Record<Side, string>,
    anat: {
      superior: 'superior', inferior: 'inferior', temporal: 'temporal', nasal: 'nasal',
      superotemporal: 'superotemporal', superonasal: 'superonasal', inferotemporal: 'inferotemporal', inferonasal: 'inferonasal',
    } as Record<AnatKey, string>,
    locLabel: {
      none: 'No pathway defect',
      prechiasmal: 'Retina / optic nerve (pre-chiasmal)',
      chiasm: 'Optic chiasm',
      'retro-right': 'Right retrochiasmal pathway',
      'retro-left': 'Left retrochiasmal pathway',
    } as Record<Localisation, string>,
    locSub: {
      none: 'Both fields full',
      prechiasmal: 'One eye’s own pattern',
      chiasm: 'Crossing nasal fibres',
      'retro-right': 'Tract · radiation · occipital',
      'retro-left': 'Tract · radiation · occipital',
    } as Record<Localisation, string>,
    locTeach: {
      none: 'Both fields are full: the only hole is the physiological blind spot, 15° temporal and just below the horizontal — where the optic disc has no photoreceptors.',
      prechiasmal:
        'A defect confined to one eye’s own anatomy — an arc from the blind spot, a central hole, an altitudinal half or a curtain — lies in front of the chiasm: retina or optic nerve. Arcuate and altitudinal defects respect the HORIZONTAL meridian because retinal nerve fibres never cross the horizontal raphe.',
      chiasm:
        'Temporal halves lost in both eyes means the crossing nasal fibres are hit where they decussate — the chiasm. From below (pituitary) the superotemporal quadrants go first. Image the sella urgently.',
      'retro-right':
        'The same (left) half missing in both eyes, respecting the VERTICAL meridian, means the lesion is behind the chiasm on the right: optic tract, radiations or occipital cortex. Superior quadrants = temporal lobe (Meyer’s loop); inferior = parietal.',
      'retro-left':
        'The same (right) half missing in both eyes, respecting the VERTICAL meridian, means the lesion is behind the chiasm on the left: optic tract, radiations or occipital cortex. Superior quadrants = temporal lobe (Meyer’s loop); inferior = parietal.',
    } as Record<Localisation, string>,

    // ── chart text
    chartField: 'Visual field',
    chartLoc: 'Field localisation',
    dFull: 'Full — physiological blind spot only',
    dConstricted: 'Constricted — central island of ~12° only',
    dCentral: 'Central scotoma — fixation involved',
    dCecocentral: 'Cecocentral scotoma — fixation to blind spot',
    dBlindSpot: 'Enlarged blind spot',
    dNasalStep: 'Superior nasal step',
    dIsland: 'Near-total loss — small temporal island only',
    dArcuate: (anat: string) => `${cap(anat)} arcuate — respects the horizontal meridian`,
    dAltitudinal: (anat: string) => `${cap(anat)} altitudinal — respects the horizontal meridian`,
    dHemianopia: (side: 'left' | 'right', anat: string) => `${side === 'left' ? 'Left' : 'Right'} (${anat}) hemianopia — respects the vertical meridian`,
    dQuadrant: (sideLabel: string, anat: string) => `${sideLabel} (${anat}) quadrantanopia`,
    dCurtain: (anat: string) => `${cap(anat)} peripheral loss — fixation spared`,
    hints: {
      arcuate: 'nerve fibre layer at the disc (glaucomatous pattern; or a branch vein occlusion)',
      'nasal-step': 'nerve fibre layer at the disc (glaucomatous pattern; or a branch vein occlusion)',
      central: 'macula or optic nerve (e.g. optic neuritis)',
      cecocentral: 'papillomacular bundle (toxic, nutritional or hereditary optic neuropathy)',
      'blind-spot': 'optic disc swelling',
      altitudinal: 'optic nerve head ischaemia (exclude giant cell arteritis) or branch artery occlusion',
      constricted: 'diffuse — retinitis pigmentosa, end-stage glaucoma or non-organic',
      curtain: 'retina — detachment in the opposite part of the fundus',
      island: 'central retinal artery occlusion',
      hemianopia: 'respects the vertical midline',
      quadrantanopia: 'respects the vertical midline',
      full: 'none',
    } as Record<Family, string>,
    lineNone: 'Full fields OU — no pathway defect',
    chiasmWhat: {
      junctional: 'junctional temporal hemianopia',
      bitemporal: 'bitemporal hemianopia',
      'bitemporal-superior': 'bitemporal superior quadrantanopia',
      'bitemporal-inferior': 'bitemporal inferior quadrantanopia',
    } as Record<ChiasmWhat, string>,
    lineChiasm: (what: string) => `Chiasm — ${what}; image the pituitary region`,
    retroWhat: { hemi: 'homonymous hemianopia', superior: 'superior homonymous quadrantanopia', inferior: 'inferior homonymous quadrantanopia' } as Record<RetroWhat, string>,
    retroWhere: { general: 'optic tract, radiation or occipital cortex', temporal: 'temporal lobe (Meyer’s loop)', parietal: 'parietal lobe radiation' } as Record<RetroWhere, string>,
    lineRetro: (brain: 'right' | 'left', field: 'right' | 'left', what: string, where: string) => `${cap(brain)} retrochiasmal — ${field} ${what} (${where})`,
    linePapilloedema: 'Pre-chiasmal OU — bilateral enlarged blind spots: check for disc swelling (papilloedema)',
    linePre: (parts: string) => `Pre-chiasmal — ${parts}`,
    linePrePart: (eye: string, hint: string) => `${eye}: ${hint}`,

    // ── tutorial
    tutSteps: [
      {
        icon: 'visual-fields',
        title: 'Eye on the amber light',
        body: 'One eye patched, chin on the rest, gaze locked on the fixation light. Every point you choose flashes a tiny white stimulus; the patient presses the buzzer when they see it.',
      },
      {
        icon: 'target',
        title: 'Probe like a perimetrist',
        body: 'Threshold runs a 4-2 dB staircase for a true sensitivity; Screen is one quick flash brighter than normal. Spread your probes across all four quadrants and chase the edges. Every eye has a blind spot 15° temporally.',
      },
      {
        icon: 'eye',
        title: 'Read the printout',
        body: 'Dark squares are lost sensitivity. Name each eye’s pattern, then combine both eyes: which meridian does it respect, and where along the pathway is the lesion?',
      },
    ] as { icon: 'visual-fields' | 'target' | 'eye'; title: string; body: string }[],
    tutAria: 'How the visual field test works',
    tutStep: (i: number, n: number) => `Step ${i} of ${n}`,
    begin: 'Begin', next: 'Next', skip: 'Skip',

    // ── game shell
    title: 'Visual Fields',
    eyeName: { OD: 'right eye', OS: 'left eye' },
    eyeAria: 'Eye', eyeRight: 'Right', eyeLeft: 'Left',
    instrTest: (patchedEye: string) => `${cap(patchedEye)} patched, eye on the amber light — click the bowl to flash a stimulus.`,
    instrInterpret: 'Name each eye’s pattern, then decide where along the pathway the lesion sits.',
    instrDebrief: 'Your plots against the true fields.',
    stNamePattern: (eyes: string) => `Name the pattern for ${eyes}`,
    stReady: 'Ready to record',
    stWhere: 'Where is the lesion?',
    stDebrief: 'Debrief',
    stSweep: (n: number) => `Auto sweep — ${n} left`,
    stNeed: (min: number, n: number, eyeName: string) => `Test at least ${min} points (${n}/${min}) in the ${eyeName}`,
    stNext: (eyeName: string) => `Good — now test the ${eyeName}`,
    stBoth: 'Both eyes plotted — refine or interpret',
    viewAria: 'View', tabBowl: 'Bowl',
    tabPlot: (n: number) => `Plot & controls · ${n} pts`,
    plotsNote: 'Plotted as the patient sees: left eye on the left, right eye on the right',
    plotsKey: 'greyscale / dB',
    btnInterpret: 'Interpret fields', btnRecord: 'Record findings', btnFinish: 'Finish', btnAdd: 'Add to chart',
    floatOk: 'Correct', floatNo: 'Not quite',

    // ── panes
    printView: 'Printout view', grey: 'Greyscale', numeric: 'dB values',
    patternOf: (eye: string, eyeName: string) => `${eye} — ${eyeName} pattern`,
    nextEye: (eye: string) => `Next: ${eye}`,
    challenge: 'Challenge — ',
    whereLesion: 'Where is the lesion?',
    pickAria: (eye: string) => `Field pattern, ${eye}`,
    pickSideAria: 'Which part of the field',

    // ── console
    strategy: 'Test strategy', threshold: 'Threshold', screen: 'Screen',
    hintThreshold: '4-2 dB staircase → true sensitivity (≈5 flashes)',
    hintScreen: 'One flash, brighter than age-normal by the dial',
    screenLevel: 'Screen level',
    screenFmt: (v: number) => `normal −${v} dB`,
    stimulus: 'Stimulus',
    stopSweep: 'Stop sweep',
    autoSweep: (n: number) => `Auto 24-2 sweep (${n})`,
    keySweep: 'sweep', keyGreyDb: 'grey/dB',

    // ── bowl & printout
    ptTemporal: 'Temporal', ptNasal: 'Nasal', ptSuperior: 'Superior', ptInferior: 'Inferior',
    bowlRole: 'perimeter bowl',
    bowlAria: (eyeName: string, selected: string | null) => `Perimeter bowl, ${eyeName}. Arrow keys choose a test location; Enter or Space presents it.${selected ? ` Selected: ${selected}.` : ''}`,
    gazeMonitor: (eye: string) => `Gaze monitor · ${eye}`,
    chooseLoc: 'Choose a location',
    patientResp1: 'Patient', patientResp2: 'response',
    printSelect: (eyeName: string) => `Select the ${eyeName} plot`,
    printHead: 'Central 30-2 · GIII white',
    sideN: 'N', sideT: 'T',
    pts: 'Pts', stim: 'Stim', fl: 'FL',
    pathL: 'L', pathR: 'R',

    // ── debrief
    vLocalised: 'Lesion localised', vNotQuite: 'Not quite', vLocCorrect: 'Localisation correct', vLocMissed: 'Localisation missed',
    youChose: (label: string) => ` — you chose ${label.toLowerCase()}`,
    coverage: (n: number) => `coverage ${n}/8 sectors`,
    points: (n: number) => `${n} points`,
    inDefect: (n: number) => `${n} in defect`,
    scTechnique: 'Technique', scPatterns: 'Patterns', scSite: 'Site',
    legend: 'true defect shown in rose on each plot',

    // ── practice answer
    answerWith: (od: string, os: string, loc: string, cause: string) => `OD: ${od} · OS: ${os}. Lesion: ${loc}. Likely cause: ${cause}.`,
  },
  he: {
    famLabel: {
      full: 'שדה תקין',
      constricted: 'היצרות שדה',
      central: 'סקוטומה מרכזית',
      cecocentral: 'סקוטומה צקוצנטרלית',
      'blind-spot': 'כתם עיוור מוגדל',
      arcuate: 'פגם ארקואטי',
      'nasal-step': 'מדרגה נזאלית',
      altitudinal: 'פגם אלטיטודינלי',
      hemianopia: 'המיאנופסיה',
      quadrantanopia: 'קוודרנטנופסיה',
      curtain: 'וילון היקפי',
      island: 'אי טמפורלי',
    },
    famSub: {
      full: 'רק הכתם העיוור הפיזיולוגי',
      constricted: 'מנהרה: ההיקף אבד מכל הכיוונים',
      central: 'הקיבוע אבוד',
      cecocentral: 'מהקיבוע ועד הכתם העיוור',
      'blind-spot': 'גדל סביב הדיסקה',
      arcuate: 'קשת היוצאת מהכתם העיוור',
      'nasal-step': 'מדרגה בקו האמצע הנזאלי',
      altitudinal: 'חצי עליון או תחתון',
      hemianopia: 'חצי שדה, נעצר בקו האנכי',
      quadrantanopia: 'רבע שדה',
      curtain: 'אובדן מהקצה, הקיבוע נשמר',
      island: 'כמעט הכול אבד',
    },
    sideLabel: {
      superior: 'עליון', inferior: 'תחתון', left: 'שמאל', right: 'ימין',
      'superior-left': 'שמאל עליון', 'superior-right': 'ימין עליון',
      'inferior-left': 'שמאל תחתון', 'inferior-right': 'ימין תחתון',
    },
    anat: {
      superior: 'עליון', inferior: 'תחתון', temporal: 'טמפורלי', nasal: 'נזאלי',
      superotemporal: 'סופרו-טמפורלי', superonasal: 'סופרו-נזאלי', inferotemporal: 'אינפרו-טמפורלי', inferonasal: 'אינפרו-נזאלי',
    },
    locLabel: {
      none: 'אין פגם במסלול הראייה',
      prechiasmal: 'רשתית / עצב הראייה (לפני הכיאזמה)',
      chiasm: 'כיאזמת עצבי הראייה',
      'retro-right': 'מסלול אחורי לכיאזמה, צד ימין',
      'retro-left': 'מסלול אחורי לכיאזמה, צד שמאל',
    },
    locSub: {
      none: 'שני השדות תקינים',
      prechiasmal: 'הדפוס של עין אחת',
      chiasm: 'הסיבים הנזאליים החוצים',
      'retro-right': 'טרקט · קרינה · קליפת העורף',
      'retro-left': 'טרקט · קרינה · קליפת העורף',
    },
    locTeach: {
      none: 'שני השדות תקינים: החור היחיד הוא הכתם העיוור הפיזיולוגי, ב-15° טמפורלית ומעט מתחת לקו האופקי, במקום שבו בדיסקה אין פוטורצפטורים.',
      prechiasmal:
        'פגם שנשאר בגבולות האנטומיה של עין אחת (קשת היוצאת מהכתם העיוור, חור מרכזי, חצי עליון או תחתון, או וילון) נמצא לפני הכיאזמה: ברשתית או בעצב הראייה. פגמים ארקואטיים ואלטיטודינליים נעצרים בקו האמצע האופקי, כי סיבי העצב ברשתית לא חוצים את הרפה האופקית.',
      chiasm:
        'אובדן החצאים הטמפורליים בשתי העיניים אומר שהסיבים הנזאליים החוצים נפגעו בנקודת ההצטלבות שלהם: הכיאזמה. כשהלחץ בא מלמטה (בלוטת יותרת המוח), הרבעים הסופרו-טמפורליים נפגעים ראשונים. מבקשים הדמיה של האוכף הטורקי בדחיפות.',
      'retro-right':
        'אותו חצי (השמאלי) חסר בשתי העיניים ונעצר בקו האמצע האנכי: הפגיעה אחורית לכיאזמה, בצד ימין. כלומר בטרקט האופטי, בקרינה האופטית או בקליפת העורף. רבעים עליונים = האונה הטמפורלית (הלולאה של Meyer); תחתונים = האונה הפריאטלית.',
      'retro-left':
        'אותו חצי (הימני) חסר בשתי העיניים ונעצר בקו האמצע האנכי: הפגיעה אחורית לכיאזמה, בצד שמאל. כלומר בטרקט האופטי, בקרינה האופטית או בקליפת העורף. רבעים עליונים = האונה הטמפורלית (הלולאה של Meyer); תחתונים = האונה הפריאטלית.',
    },

    chartField: 'שדה ראייה',
    chartLoc: 'מיקום הפגיעה',
    dFull: 'תקין — רק הכתם העיוור הפיזיולוגי',
    dConstricted: 'היצרות — נשאר רק אי מרכזי של כ-12°',
    dCentral: 'סקוטומה מרכזית — הקיבוע מעורב',
    dCecocentral: 'סקוטומה צקוצנטרלית — מהקיבוע ועד הכתם העיוור',
    dBlindSpot: 'כתם עיוור מוגדל',
    dNasalStep: 'מדרגה נזאלית עליונה',
    dIsland: 'אובדן כמעט מלא — נשאר רק אי טמפורלי קטן',
    dArcuate: (anat: string) => `פגם ארקואטי ${anat} — נעצר בקו האמצע האופקי`,
    dAltitudinal: (anat: string) => `פגם אלטיטודינלי ${anat} — נעצר בקו האמצע האופקי`,
    dHemianopia: (side: 'left' | 'right', anat: string) => `המיאנופסיה ${side === 'left' ? 'שמאלית' : 'ימנית'} (${anat.replace(/י$/, 'ית')}) — נעצרת בקו האמצע האנכי`,
    dQuadrant: (sideLabel: string, anat: string) => `קוודרנטנופסיה ${sideLabel.replace('שמאל', 'שמאלית').replace('ימין', 'ימנית').replace('עליון', 'עליונה').replace('תחתון', 'תחתונה')} (${anat.replace(/י$/, 'ית')})`,
    dCurtain: (anat: string) => `אובדן היקפי ${anat} — הקיבוע נשמר`,
    hints: {
      arcuate: 'שכבת סיבי העצב בדיסקה (דפוס גלאוקומטי, או חסימת ענף ורידי)',
      'nasal-step': 'שכבת סיבי העצב בדיסקה (דפוס גלאוקומטי, או חסימת ענף ורידי)',
      central: 'מקולה או עצב הראייה (למשל דלקת בעצב הראייה)',
      cecocentral: 'האגד הפפילומקולרי (נוירופתיה אופטית טוקסית, תזונתית או תורשתית)',
      'blind-spot': 'בצקת בדיסקה',
      altitudinal: 'איסכמיה בראש עצב הראייה (לשלול דלקת עורקים גיגנטוצלולרית) או חסימת ענף עורקי',
      constricted: 'פגיעה מפושטת — רטיניטיס פיגמנטוזה, גלאוקומה בשלב סופי או לא אורגנית',
      curtain: 'רשתית — היפרדות באזור הנגדי של קרקעית העין',
      island: 'חסימת העורק המרכזי של הרשתית',
      hemianopia: 'נעצר בקו האמצע האנכי',
      quadrantanopia: 'נעצר בקו האמצע האנכי',
      full: 'אין',
    },
    lineNone: 'שדות תקינים בשתי העיניים — אין פגם במסלול',
    chiasmWhat: {
      junctional: 'המיאנופסיה טמפורלית צומתית',
      bitemporal: 'המיאנופסיה ביטמפורלית',
      'bitemporal-superior': 'קוודרנטנופסיה ביטמפורלית עליונה',
      'bitemporal-inferior': 'קוודרנטנופסיה ביטמפורלית תחתונה',
    },
    lineChiasm: (what: string) => `כיאזמה — ${what}; להפנות להדמיה של אזור יותרת המוח`,
    retroWhat: { hemi: 'המיאנופסיה הומונימית', superior: 'קוודרנטנופסיה הומונימית עליונה', inferior: 'קוודרנטנופסיה הומונימית תחתונה' },
    retroWhere: { general: 'טרקט אופטי, קרינה אופטית או קליפת העורף', temporal: 'האונה הטמפורלית, לולאת Meyer', parietal: 'הקרינה האופטית באונה הפריאטלית' },
    lineRetro: (brain: 'right' | 'left', field: 'right' | 'left', what: string, where: string) =>
      `אחורי לכיאזמה, צד ${brain === 'right' ? 'ימין' : 'שמאל'} — ${what} ${field === 'right' ? 'ימנית' : 'שמאלית'} (${where})`,
    linePapilloedema: 'לפני הכיאזמה בשתי העיניים — כתמים עיוורים מוגדלים דו-צדדית: לבדוק בצקת בדיסקה (פפילאדמה)',
    linePre: (parts: string) => `לפני הכיאזמה — ${parts}`,
    linePrePart: (eye: string, hint: string) => `${eye}: ${hint}`,

    tutSteps: [
      {
        icon: 'visual-fields',
        title: 'המבט על האור הענבר',
        body: 'עין אחת מכוסה, הסנטר במשענת, והמבט נעול על אור הקיבוע. כל נקודה שתבחרו מציגה גירוי לבן זעיר, והמטופל לוחץ על הכפתור ברגע שהגירוי נראה לו.',
      },
      {
        icon: 'target',
        title: 'בודקים כמו פרימטריסט',
        body: 'מצב סף מריץ סולם 4-2 dB לרגישות אמיתית; מצב סינון הוא הבהוב אחד, בהיר מהנורמה. פזרו את הנקודות על ארבעת הרבעים, והתקרבו אל הקצוות. בכל עין יש כתם עיוור ב-15° טמפורלית.',
      },
      {
        icon: 'eye',
        title: 'קוראים את התדפיס',
        body: 'ריבועים כהים הם רגישות שאבדה. סווגו את הדפוס של כל עין, ואז חברו את שתיהן: איזה קו אמצע הפגם מכבד, ואיפה לאורך המסלול נמצאת הפגיעה?',
      },
    ],
    tutAria: 'איך עובדת בדיקת שדה הראייה',
    tutStep: (i: number, n: number) => `שלב ${i} מתוך ${n}`,
    begin: 'מתחילים', next: 'הבא', skip: 'דילוג',

    title: 'שדה ראייה',
    eyeName: { OD: 'עין ימין', OS: 'עין שמאל' },
    eyeAria: 'עין', eyeRight: 'ימין', eyeLeft: 'שמאל',
    instrTest: (patchedEye: string) => `${patchedEye} מכוסה, המבט על האור הענבר. לחצו על הקערה כדי להציג גירוי.`,
    instrInterpret: 'סווגו את הדפוס של כל עין, ואז החליטו איפה לאורך המסלול נמצאת הפגיעה.',
    instrDebrief: 'הגרפים שלכם מול השדות האמיתיים.',
    stNamePattern: (eyes: string) => `סווגו את הדפוס: ${eyes}`,
    stReady: 'אפשר לרשום ממצאים',
    stWhere: 'איפה הפגיעה?',
    stDebrief: 'סיכום',
    stSweep: (n: number) => `סריקה אוטומטית — נותרו ${n}`,
    stNeed: (min: number, n: number, eyeName: string) => `בדקו לפחות ${min} נקודות (${n}/${min}) ב${eyeName}`,
    stNext: (eyeName: string) => `יופי, עכשיו בדקו את ${eyeName}`,
    stBoth: 'שתי העיניים ממופות — אפשר לדייק או לעבור לפירוש',
    viewAria: 'תצוגה', tabBowl: 'הקערה',
    tabPlot: (n: number) => `גרף ובקרה · ${n} נק׳`,
    plotsNote: 'מוצג כפי שהמטופל רואה: עין שמאל משמאל, עין ימין מימין',
    plotsKey: 'גווני אפור / dB',
    btnInterpret: 'לפירוש השדות', btnRecord: 'תיעוד ממצאים', btnFinish: 'סיום', btnAdd: 'הוספה לתיק',
    floatOk: 'נכון', floatNo: 'לא בדיוק',

    printView: 'תצוגת התדפיס', grey: 'גווני אפור', numeric: 'ערכי dB',
    patternOf: (eye: string, eyeName: string) => `${eye} — דפוס ב${eyeName}`,
    nextEye: (eye: string) => `הבא: ${eye}`,
    challenge: 'אתגר — ',
    whereLesion: 'איפה הפגיעה?',
    pickAria: (eye: string) => `דפוס שדה, ${eye}`,
    pickSideAria: 'איזה חלק מהשדה',

    strategy: 'אסטרטגיית הבדיקה', threshold: 'סף', screen: 'סינון',
    hintThreshold: 'סולם 4-2 dB לרגישות אמיתית (כ-5 הבהובים)',
    hintScreen: 'הבהוב יחיד, בהיר מנורמת הגיל לפי הכפתור',
    screenLevel: 'רמת סינון',
    screenFmt: (v: number) => `נורמה −${v} dB`,
    stimulus: 'גירוי',
    stopSweep: 'עצירת הסריקה',
    autoSweep: (n: number) => `סריקה אוטומטית 24-2 (${n})`,
    keySweep: 'סריקה', keyGreyDb: 'אפור/dB',

    ptTemporal: 'טמפורלי', ptNasal: 'נזאלי', ptSuperior: 'עליון', ptInferior: 'תחתון',
    bowlRole: 'קערת פרימטר',
    bowlAria: (eyeName: string, selected: string | null) => `קערת הפרימטר, ${eyeName}. מקשי החצים בוחרים נקודת בדיקה; Enter או רווח מציגים אותה.${selected ? ` נבחרה: ${selected}.` : ''}`,
    gazeMonitor: (eye: string) => `מסך מעקב מבט · ${eye}`,
    chooseLoc: 'בחרו נקודה',
    patientResp1: 'תגובת', patientResp2: 'המטופל',
    printSelect: (eyeName: string) => `בחרו את הגרף של ${eyeName}`,
    printHead: 'מרכזי 30-2 · GIII לבן',
    sideN: 'נ׳', sideT: 'ט׳',
    pts: 'נק׳', stim: 'גירויים', fl: 'FL',
    pathL: 'שמ׳', pathR: 'ימ׳',

    vLocalised: 'הפגיעה אותרה', vNotQuite: 'לא בדיוק', vLocCorrect: 'המיקום נכון', vLocMissed: 'המיקום לא נכון',
    youChose: (label: string) => ` — בחרתם: ${label}`,
    coverage: (n: number) => `כיסוי ${n}/8 גזרות`,
    points: (n: number) => `${n} נקודות`,
    inDefect: (n: number) => `${n} בתוך הפגם`,
    scTechnique: 'טכניקה', scPatterns: 'דפוסים', scSite: 'מיקום',
    legend: 'הפגם האמיתי מסומן בוורוד על כל גרף',

    answerWith: (od: string, os: string, loc: string, cause: string) => `OD: ${od} · OS: ${os}. מיקום הפגיעה: ${loc}. הסיבה הסבירה: ${cause}.`,
  },
});

export type VfStrings = typeof S.en;
export const vfT = (locale: Locale): VfStrings => pickStrings(S, locale);

/** Latin runs (numbers, units, abbreviations) keep their order inside Hebrew; English is untouched. */
export const iso = (locale: Locale, s: string): string => (locale === 'he' ? isolateLtrRuns(s) : s);

export const VF_TEXT: MiniGameText = {
  title: 'שדה ראייה',
  instructions: 'עין אחת בכל פעם, והמבט על אור הקיבוע: בודקים נקודות בקערה, בונים את הגרף, ואז מסווגים את הדפוס ומאתרים את הפגיעה.',
  teaches: [
    'פרימטריה אוטומטית: סולם סף (4-2 dB) מול סינון מהיר מעל הסף',
    'הכתם העיוור הפיזיולוגי נמצא ב-15° טמפורלית, מעט מתחת לקו האופקי',
    'פגמים ארקואטיים ואלטיטודינליים נעצרים בקו האמצע האופקי (רשתית / עצב הראייה)',
    'המיאנופסיות נעצרות בקו האמצע האנכי: ביטמפורלית = כיאזמה, הומונימית = אחורי לכיאזמה, בצד הנגדי',
    'קוודרנטנופסיה הומונימית עליונה = האונה הטמפורלית; תחתונה = האונה הפריאטלית',
  ],
};

/** Hebrew names for the practice patients, [masculine, feminine] where it matters. */
export const PRACTICE_HE = {
  firstF: ['נעמי', 'נור', 'אנה', 'מיכל', 'עדה', 'ליה', 'סמירה', 'תמר', 'אסתר', 'רניה'],
  firstM: ['אילן', 'אידריס', 'מיכאיל', 'רפאל', 'דב', 'סלים', 'טוביה', 'אנדריי', 'אבי', 'גיא'],
  last: ['כהן', 'חדאד', 'פרידמן', 'סעדה', 'קובלסקי', 'נחמיאס', 'ברקת', 'מזרחי', 'זוהר', 'אשכנזי', 'עבדאללה'],
  jobs: [
    ['נהג משאית', 'נהגת משאית'], ['קרטוגרף', 'קרטוגרפית'], ['נגן נבל', 'נגנית נבל'], ['נהג אוטובוס', 'נהגת אוטובוס'],
    ['ספרן', 'ספרנית'], ['חשמלאי', 'חשמלאית'], ['שף', 'שפית'], ['אסטרונום', 'אסטרונומית'],
    ['מודד בפנסיה', 'מודדת בפנסיה'], ['רופא שיניים', 'רופאת שיניים'],
  ] as [string, string][],
  causes: {
    healthy: 'מסלולי ראייה תקינים — רק הכתם העיוור הפיזיולוגי, ב-15° טמפורלית בכל עין',
    poag: 'גלאוקומה עם זווית פתוחה ראשונית — אובדן ארקואטי בצרור סיבי העצב, מול האזור שבו שולי הדיסקה התדלדלו',
    pituitary: 'מקרואדנומה של יותרת המוח הלוחצת על הכיאזמה מלמטה — הסיבים הנזאליים החוצים (השדות הטמפורליים) נפגעים ראשונים, מלמעלה',
    stroke: 'שבץ בעורק המוח האחורי — המיאנופסיה הומונימית בצד הנגדי לפגיעה',
    'optic-neuritis': 'דלקת בעצב הראייה על רקע דה-מיילינציה — סקוטומה מרכזית עם RAPD וחוסר רוויה של אדום באותה עין',
    toxic: 'נוירופתיה אופטית טוקסית / תזונתית דו-צדדית — סקוטומות צקוצנטרליות סימטריות דרך האגד הפפילומקולרי',
    papilloedema: 'בצקת בדיסקה מלחץ תוך-גולגולתי מוגבר — דיסקות נפוחות מגדילות את שני הכתמים העיוורים; החדות בדרך כלל נשמרת',
    aion: 'נוירופתיה אופטית איסכמית קדמית — פגם אלטיטודינלי (בדרך כלל תחתון); מעל גיל 50 חובה לשלול דלקת עורקים גיגנטוצלולרית עוד היום',
    rd: 'היפרדות רשתית רגמטוגנית — אובדן השדה נמצא מול הרשתית שהתנתקה, ונע לעבר הקיבוע',
    crao: 'חסימת העורק המרכזי של הרשתית — אובדן פתאומי כמעט מלא, עם אי טמפורלי; שבץ בעין, מקרה חירום',
    rp: 'רטיניטיס פיגמנטוזה — אובדן המוטות מצמצם את שני השדות למנהרה; עיוורון לילה בא קודם',
  } as Record<string, string>,
};
