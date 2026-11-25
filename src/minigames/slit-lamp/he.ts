/**
 * Hebrew content tables for the slit-lamp and fluorescein mini-games (data only).
 * English stays in vocab.ts / teach.ts / report.ts / model.ts; these overlays are keyed the same way,
 * so the clinical logic is single-sourced and only the words differ.
 * Written natively for Israeli optometry: Hebrew for the anatomy and common signs, Latin where
 * clinicians say it that way (MGD, KP, SUN, Van Herick, TBUT, IOL).
 */
import type { StainPattern } from '@core';

/** Menu sign & grade names by full path ("cornea/epithelium/dendrite", "chamber/cells/2"). */
export const LABEL_HE: Record<string, string> = {
  lids: 'עפעפיים',
  'lids/anterior-blepharitis': 'בלפריטיס קדמית',
  'lids/meibomian-dysfunction': 'תפקוד לקוי של בלוטות מייבום (MGD)',
  'lids/chalazion': 'חלזיון',
  'lids/hordeolum': 'שעורה',
  'lids/ptosis': 'פטוזיס',
  'lids/lid-edema': 'בצקת עפעפיים',
  'lids/vesicles': 'שלפוחיות בעפעף',
  'lids/trichiasis': 'טריכיאזיס',
  'lids/ectropion': 'אקטרופיון',
  'lids/entropion': 'אנטרופיון',

  conj: 'לחמית',
  'conj/injection': 'הזרקה',
  'conj/injection/diffuse-injection': 'הזרקה מפושטת',
  'conj/injection/ciliary-flush': 'הזרקה ציליארית',
  'conj/injection/sectoral-injection': 'הזרקה סקטוריאלית',
  'conj/discharge': 'הפרשה',
  'conj/discharge/discharge-mucopurulent': 'ריריתית-מוגלתית',
  'conj/discharge/discharge-watery': 'מימית',
  'conj/discharge/discharge-stringy': 'ריר חוטי',
  'conj/papillae': 'פפילות',
  'conj/giant-papillae': 'פפילות ענק',
  'conj/follicles': 'זקיקים',
  'conj/subconjunctival-hemorrhage': 'דימום תת-לחמיתי',
  'conj/pinguecula': 'פינגווקולה',
  'conj/pterygium': 'פטריגיום',
  'conj/chemosis': 'כמוזיס',

  cornea: 'קרנית',
  'cornea/epithelium': 'אפיתל',
  'cornea/epithelium/punctate-keratitis': 'קרטיטיס נקודתית',
  'cornea/epithelium/abrasion': 'שחיקה',
  'cornea/epithelium/dendrite': 'דנדריט',
  'cornea/epithelium/pseudodendrite': 'פסאודו-דנדריט',
  'cornea/deposits': 'משקעים',
  'cornea/deposits/keratic-precipitates': 'משקעים קרטיים (KP)',
  'cornea/deposits/foreign-body': 'גוף זר',
  'cornea/deposits/rust-ring': 'טבעת חלודה',
  'cornea/deposits/fleischer-ring': 'טבעת Fleischer',
  'cornea/stroma': 'סטרומה',
  'cornea/stroma/ulcer': 'כיב',
  'cornea/stroma/infiltrate': 'תסנין',
  'cornea/stroma/edema': 'בצקת קרנית',
  'cornea/stroma/vogt-striae': 'קווי Vogt',
  'cornea/stroma/cone-thinning': 'חרוט / הידלדלות',
  'cornea/stroma/pannus': 'פאנוס',

  chamber: 'לשכה קדמית',
  'chamber/van-herick': 'Van Herick',
  'chamber/van-herick/1': 'דרגה 1 · < ¼ CT',
  'chamber/van-herick/2': 'דרגה 2 · ¼ CT',
  'chamber/van-herick/3': 'דרגה 3 · ¼–½ CT',
  'chamber/van-herick/4': 'דרגה 4 · ≥ CT',
  'chamber/cells': 'תאים בלשכה',
  'chamber/cells/0.5': '0.5+ (1–5)',
  'chamber/cells/1': '1+ (6–15)',
  'chamber/cells/2': '2+ (16–25)',
  'chamber/cells/3': '3+ (26–50)',
  'chamber/cells/4': '4+ (> 50)',
  'chamber/flare': 'פלייר בלשכה',
  'chamber/flare/1': '1+ קלוש',
  'chamber/flare/2': '2+ בינוני',
  'chamber/flare/3': '3+ בולט',
  'chamber/flare/4': '4+ חזק',
  'chamber/hypopyon': 'היפופיון',
  'chamber/hyphema': 'היפמה',

  iris: 'קשתית',
  'iris/posterior-synechiae': 'סינכיות אחוריות',
  'iris/neovascularization': 'רובאוזיס',
  'iris/transillumination': 'טרנסילומינציה',
  'iris/heterochromia': 'הטרוכרומיה',
  'iris/nevus': 'נבוס בקשתית',

  lens: 'עדשה',
  'lens/nuclear-sclerosis': 'סקלרוזיס גרעיני',
  'lens/nuclear-sclerosis/1': 'דרגה 1',
  'lens/nuclear-sclerosis/2': 'דרגה 2',
  'lens/nuclear-sclerosis/3': 'דרגה 3',
  'lens/nuclear-sclerosis/4': 'דרגה 4',
  'lens/cortical-cataract': 'קטרקט קורטיקלי',
  'lens/cortical-cataract/1': 'דרגה 1',
  'lens/cortical-cataract/2': 'דרגה 2',
  'lens/cortical-cataract/3': 'דרגה 3',
  'lens/cortical-cataract/4': 'דרגה 4',
  'lens/posterior-subcapsular': 'תת-קופסיתי אחורי (PSC)',
  'lens/posterior-subcapsular/1': 'דרגה 1',
  'lens/posterior-subcapsular/2': 'דרגה 2',
  'lens/posterior-subcapsular/3': 'דרגה 3',
  'lens/posterior-subcapsular/4': 'דרגה 4',
  'lens/iol': 'עדשה תוך-עינית (IOL)',
  'lens/phacodonesis': 'פקודונזיס',
};

export const REGION_HE = {
  lids: 'עפעפיים', conj: 'לחמית', cornea: 'קרנית', chamber: 'לשכה קדמית', iris: 'קשתית', lens: 'עדשה',
} as const;

export const TECHNIQUE_HE = { diffuse: 'מפוזרת', broad: 'רחבה', section: 'חתך', conical: 'חרוט', retro: 'רטרו' } as const;

/** Where to look and how to light it, per sign family (mirrors techniqueHint in model.ts). */
export const HINT_HE = {
  vanHerick: 'חתך דק (כ-0.15 מ״מ), הזרוע ב-45–⁠60°, מכוון אל הלימבוס הטמפורלי.',
  cellsFlare: 'אורות החדר כבויים, חרוט של 1 מ״מ, הגדלה 25×, זרוע ב-45–⁠60°, מכוון דרך האישון.',
  hypopyonHyphema: 'קרן רחבה או מפוזרת: בגלל הכבידה המפלס נאסף בחלק התחתון של הלשכה.',
  fleischer: 'המסנן הכחול-קובלט מדגיש את קו הברזל סביב בסיס החרוט.',
  vogtCone: 'חתך אופטי דרך החרוט; קווי Vogt יושבים עמוק בסטרומה.',
  cornea: 'פרללפיפד או חתך אופטי בהגדלה 16× ומעלה, סורקים את הקרנית.',
  transillum: 'רטרו-אילומינציה: מקפיצים אור מקרקעית העין ומחפשים אור שעובר דרך הקשתית.',
  iris: 'קרן רחבה או אור מפוזר, 16×, על פני הקשתית.',
  lens: 'חתך אופטי דרך האישון, או רטרו-אילומינציה מול הרפלקס האדום, 16×+.',
  lidsConj: 'אור מפוזר בהגדלה נמוכה, ואז 16× לפרטים עדינים כמו זקיקים.',
  fallback: 'שנו את הקרן, ההגדלה או המסנן והסתכלו שוב.',
} as const;

export const PEARL_HE: Record<string, string> = {
  'lids/anterior-blepharitis': 'צווארונים (שרוולי פסולת) בבסיס הריסים. מקרצפים, קומפרסים חמים, ואם זה נמשך מטפלים בדמודקס.',
  'lids/meibomian-dysfunction': 'פתחי מייבום סתומים ומכוסים וסרט דמעות מקציף ולא יציב: הסיבה השכיחה ביותר לעין יבשה אידוית.',
  'lids/chalazion': 'גוש קשה וללא כאב בעפעף, מבלוטת מייבום חסומה. קומפרסים חמים; ניקוז או חיתוך אם הוא נשאר.',
  'lids/hordeolum': 'מורסה חריפה וכואבת בזקיק ריס או בבלוטה. קומפרסים חמים; אנטיביוטיקה רק בצלוליטיס מתפשטת.',
  'lids/ptosis': 'מודדים MRD1 ותפקוד של המרים; פטוזיס חדש עם אישון קטן מצביע על תסמונת הורנר.',
  'lids/vesicles': 'שלפוחיות דרמטומליות שנעצרות בקו האמצע: הרפס זוסטר. מעורבות של הענף הנאזוציליארי (סימן Hutchinson) מסכנת את העין.',
  'conj/injection/diffuse-injection': 'אדמומיות מפושטת עם כלי דם שטחיים וזזים: דלקת לחמית ולא דלקת עמוקה.',
  'conj/injection/ciliary-flush': 'טבעת סגלגלה בלימבוס שאינה מחווירה עם פנילפרין: דלקת עמוקה (בקרנית, ביובאה או בגלאוקומה).',
  'conj/injection/sectoral-injection': 'טריז של אדמומיות: חשבו על אפיסקלריטיס (מחוויר עם פנילפרין) או סקלריטיס (עמוק, כואב, לא מחוויר).',
  'conj/discharge/discharge-mucopurulent': 'הפרשה סמיכה, דביקה, צהובה-ירקרקה: דלקת לחמית חיידקית; העפעפיים דבוקים בבוקר.',
  'conj/discharge/discharge-watery': 'הפרשה מימית: ויראלית או אלרגית. חפשו זקיקים וקשר לימפה רגיש מול האוזן.',
  'conj/papillae': 'לפפילות יש קווצת כלי דם מרכזית: דלקת לחמית אלרגית או חיידקית, או עדשות מגע.',
  'conj/follicles': 'זקיקים הם בליטות לימפואידיות חיוורות ללא כלי דם, עם כלי דם בשוליים: ויראלי, כלמידיאלי או מתרופה.',
  'conj/subconjunctival-hemorrhage': 'כתם דם שטוח עם גבול חד: שפיר. אם חוזר, בודקים לחץ דם וקרישה.',
  'conj/pinguecula': 'משקע צהוב-לבן בלחמית הנזאלית או הטמפורלית שאינו חודר לקרנית.',
  'conj/pterygium': 'כנף פיברווסקולרית החוצה את הלימבוס אל הקרנית: מודדים עד איזה מרחק היא מגיעה לכיוון האישון.',
  'cornea/epithelium/punctate-keratitis': 'שחיקות אפיתל עדינות כמו נקודות: עין יבשה, טוקסיות, ויראלי. הפלואורסצאין חושף את הדפוס.',
  'cornea/epithelium/abrasion': 'פגם חד-שפה שנצבע בפלואורסצאין; תמיד הופכים את העפעף העליון ומחפשים גוף זר.',
  'cornea/epithelium/dendrite': 'כיב מסתעף עם בליטות קצה: הרפס סימפלקס. בודקים תחושת קרנית.',
  'cornea/deposits/keratic-precipitates': 'KP הם צברי תאים לבנים על האנדותל (משולש Arlt: הקודקוד כלפי מעלה). הגרנולומטיים נראים שומניים, "שומן כבש".',
  'cornea/deposits/foreign-body': 'חפשו טבעת חלודה סביב מתכת; מוציאים, ואז צובעים לפגם שנשאר.',
  'cornea/stroma/ulcer': 'תסנין סטרומלי לבן עם פגם אפיתל שנצבע: עד שיוכח אחרת, קרטיטיס מיקרוביאלית.',
  'cornea/stroma/edema': 'קרנית מעורפלת כמו אדים: לחץ גבוה (סגירת זווית), כשל אנדותל או דלקת.',
  'cornea/stroma/cone-thinning': 'הידלדלות ותלילות בקודקוד עם טבעת Fleischer וקווי Vogt: קרטוקונוס; מפנים לטופוגרפיה.',
  'chamber/van-herick': 'משווים את הרווח הכהה לעובי הקרנית (CT): ≥ 1 CT פתוח; ¼ CT צר; < ¼ CT אפשרות לסגירה. מאשרים בגוניוסקופיה.',
  'chamber/cells': 'סופרים תאים לבנים בקרן של 1 × 1 מ״מ: 0.5+ = 1–⁠5, 1+ = 6–⁠15, 2+ = 16–⁠25, 3+ = 26–⁠50, 4+ = > 50 (SUN).',
  'chamber/flare': 'פלייר הוא פיזור מחלבון (אפקט טינדל): קרן מעורפלת בלשכה חשוכה. הוא מסמן הפרעה במחסום הדם-מימת.',
  'chamber/hypopyon': 'מפלס של תאים לבנים: יובאיטיס קדמית חמורה או קרטיטיס זיהומית. סטרילי ביובאיטיס, מזוהם בכיבים.',
  'chamber/hyphema': 'דם בשכבות בלשכה אחרי חבלה: מגנים על העין, בודקים IOP ושוללים פגיעה פתוחה בגלגל העין.',
  'iris/posterior-synechiae': 'קשתית דבוקה לעדשה: אישון לא סדיר מדלקת בעבר. מרחיבים כדי לשחרר סינכיות טריות.',
  'iris/neovascularization': 'כלי דם חדשים ועדינים בקשתית (רובאוזיס) אחרי איסכמיה ברשתית: בודקים את הזווית, גלאוקומה ניאווסקולרית מתקרבת.',
  'lens/nuclear-sclerosis': 'עכירות צהובה-חומה במרכז עם סטייה לקוצר ראייה; בחתך הגרעין בולט כרצועה בהירה.',
  'lens/cortical-cataract': 'חישורים לבנים מההיקף שמטילים טריזים כהים ברטרו-אילומינציה.',
  'lens/posterior-subcapsular': 'פלאק גרגירי בגב העדשה: סנוור באור חזק; סטרואידים וסוכרת הם הגורמים הקלאסיים.',
};

export interface KindInfoHe { label: string; why: string }

/** Keys mirror teach.ts's Kind. */
export const KIND_HE: Record<string, KindInfoHe> = {
  normal: { label: 'קטע קדמי תקין', why: 'עפעפיים ולחמית לבנים ורגועים, קרנית צלולה, לשכה עמוקה ורגועה (Van Herick 4) ועדשה צלולה.' },
  uveitis: { label: 'יובאיטיס קדמית', why: 'תאים ופלייר בלשכה עם הזרקה ציליארית, לעיתים KP או סינכיות: דלקת תוך-עינית. מטפלים בסטרואיד ובמרחיב-אישון משתק, ומחפשים את הסיבה.' },
  'angle-closure': { label: 'סגירת זווית חריפה', why: 'Van Herick דרגה 1, קרנית מעורפלת, הזרקה ציליארית ואישון באמצע הרחבה: הזווית נסגרה. חירום, מורידים את הלחץ עכשיו.' },
  'narrow-angle': { label: 'זווית צרה עם סיכון לסגירה', why: 'Van Herick דרגה 2 ומטה מזהיר שהזווית עלולה להיסגר. מאשרים בגוניוסקופיה ושוקלים אירידוטומיה בלייזר; נמנעים מהרחבה עד להערכה.' },
  cataract: { label: 'קטרקט', why: 'עכירויות בעדשה שנראות בחתך האופטי או מול הרפלקס האדום. מדרגים את הסוג (גרעיני, קורטיקלי, תת-קופסיתי אחורי) ושוקלים את הצורך הראייתי.' },
  bacterial: { label: 'דלקת לחמית חיידקית', why: 'הפרשה ריריתית-מוגלתית, הזרקה מפושטת ופפילות. בדרך כלל חולפת מעצמה; מטפלים בטיפות אם זה קשה או במרכיבי עדשות מגע.' },
  viral: { label: 'דלקת לחמית ויראלית (אדנו-ויראלית)', why: 'הפרשה מימית, זקיקים וקשר לימפה רגיש מול האוזן, לרוב עם קרטיטיס נקודתית עדינה. מדבקת מאוד: מדריכים על היגיינה.' },
  allergic: { label: 'דלקת לחמית אלרגית', why: 'גרד, פפילות וכמוזיס עם ריר חוטי, בלי מוגלה. קומפרסים קרים וטיפות אנטיהיסטמין או מייצבות תאי פיטום.' },
  blepharitis: { label: 'בלפריטיס / תפקוד לקוי של בלוטות מייבום (MGD)', why: 'צווארונים או בלוטות מכוסות על שולי עפעף אדומים, עם סרט דמעות לא יציב. היגיינת עפעפיים היא בסיס הטיפול.' },
  'lid-lump': { label: 'חלזיון / שעורה', why: 'גוש מקומי בעפעף: חלזיון קשה וללא כאב, או שעורה כואבת בצורה חריפה. מתחילים בקומפרסים חמים.' },
  keratitis: { label: 'קרטיטיס מיקרוביאלית (כיב בקרנית)', why: 'תסנין סטרומלי לבן עם פגם אפיתל, הזרקה ציליארית ולעיתים היפופיון. מסכן ראייה: גירוד לתרבית וטיפול אינטנסיבי באותו היום.' },
  dendrite: { label: 'קרטיטיס הרפטית (דנדריט)', why: 'כיב אפיתל מסתעף עם בליטות קצה ותחושת קרנית מופחתת. אנטי-ויראלי בטיפות או בכדורים; לא נותנים סטרואיד לבדו.' },
  trauma: { label: 'שחיקת קרנית או גוף זר', why: 'פגם אפיתל מקומי או פירור נעוץ עם טבעת חלודה. מוציאים, צובעים, מטפלים; תמיד הופכים את העפעף העליון.' },
  degeneration: { label: 'פטריגיום / פינגווקולה', why: 'רקמה פיברווסקולרית בלחמית הנזאלית: פטריגיום חוצה את הלימבוס, פינגווקולה לא. הגנה מקרינת UV ומעקב אחר ההתקדמות.' },
  sch: { label: 'דימום תת-לחמיתי', why: 'כתם דם שטוח עם גבול חד מתחת לעין רגועה אחרת. שפיר; מחפשים גורם כמו ולסלבה או הפרעת דימום.' },
  keratoconus: { label: 'קרטוקונוס', why: 'הידלדלות חרוטית עם טבעת Fleischer וקווי Vogt. מפנים לטופוגרפיה של הקרנית ושוקלים קרוס-לינקינג.' },
  hyphema: { label: 'היפמה טראומטית', why: 'דם בשכבות בלשכה אחרי מכה. מגנים על העין, מושיבים את המטופל, בודקים IOP וזווית.' },
};

export interface StainHe { label: string; short: string; card: string; meaning: string; dx: string }

export const STAIN_HE: Record<StainPattern, StainHe> = {
  none: {
    label: 'ללא צביעה', short: 'אין', card: 'אין', dx: 'אפיתל תקין ושלם',
    meaning: 'אפיתל שלם לא סופג צבע: פני השטח בריאים.',
  },
  'inferior-punctate': {
    label: 'צביעה נקודתית תחתונה', short: 'נקודתית תחתונה', card: 'תחתונה', dx: 'עין יבשה / קרטופתיה מחשיפה',
    meaning: 'נקודות עדינות בשליש התחתון: עין יבשה, חשיפה (לגופתלמוס), בלפריטיס או טוקסיות של טיפות.',
  },
  'diffuse-punctate': {
    label: 'צביעה נקודתית מפושטת', short: 'נקודתית מפושטת', card: 'מפושטת', dx: 'קרטוקונג׳קטיביטיס ויראלית או קרטופתיה טוקסית',
    meaning: 'נקודות פזורות על כל הקרנית: קרטוקונג׳קטיביטיס ויראלית (אדנו-ויראלית), קרטופתיה טוקסית.',
  },
  'linear-abrasion': {
    label: 'פגם באפיתל (שחיקה)', short: 'שחיקה', card: 'שחיקה', dx: 'שחיקת קרנית',
    meaning: 'כתם חד-שפה של אפיתל חשוף: שחיקת קרנית. שואלים על חבלה, ואז בודקים מתחת לעפעף.',
  },
  dendritic: {
    label: 'כיב דנדריטי עם בליטות קצה', short: 'דנדריט', card: 'דנדריט', dx: 'קרטיטיס הרפטית (הרפס סימפלקס)',
    meaning: 'כיב מסתעף עם בליטות קצה: קרטיטיס הרפס סימפלקס. מטפלים באנטי-ויראלי; לעולם לא בסטרואיד לבדו.',
  },
  'round-ulcer': {
    label: 'כיב עגול, צביעה צפופה', short: 'כיב עגול', card: 'כיב', dx: 'קרטיטיס מיקרוביאלית (כיב בקרנית)',
    meaning: 'כיב סטרומלי עגול וצפוף שנצבע: קרטיטיס מיקרוביאלית. גירוד לתרבית, טיפות אינטנסיביות, טיפול באותו היום.',
  },
  'vertical-linear-scratches': {
    label: 'שריטות קוויות אנכיות', short: 'שריטות אנכיות', card: 'שריטות', dx: 'גוף זר מתחת לעפעף העליון',
    meaning: 'קווים אנכיים מקבילים בקרנית העליונה: גוף זר שנתקע מתחת לעפעף העליון. הופכים את העפעף.',
  },
  interpalpebral: {
    label: 'צביעה בין-עפעפית', short: 'בין-עפעפית', card: 'רצועה', dx: 'עין יבשה מחשיפה או מעדשות מגע',
    meaning: 'רצועה על פני הקרנית החשופה: עין יבשה, חשיפה, עדשות מגע.',
  },
  focal: {
    label: 'צביעה מקומית סביב גוף זר', short: 'מקומית (גוף זר)', card: 'מקומית', dx: 'גוף זר נעוץ בקרנית',
    meaning: 'כתם עגול קטן סביב פירור: גוף זר נעוץ (חפשו טבעת חלודה).',
  },
};

/** Practice patients: Israeli names, jobs and a line of behaviour, written for the patient's gender. */
export const PEOPLE_HE = {
  namesF: ['נעמי אבוטבול', 'לנה פישר', 'פריה רמן', 'סופיה מרקוביץ׳', 'חנה סגל', 'נור חדאד', 'שלי מרטין', 'אינס דוארטה', 'מיי לין ז׳או', 'רות אברה'],
  namesM: ['תומר לוי', 'קוואמה מנסה', 'ארג׳ון מהטה', 'מתן רוסו', 'יוסוף דמיר', 'אורי גלעד', 'דניאל מורי', 'סמיר עזיז', 'לוקה ביאנקי', 'תומאש נובאק'],
  /** [masculine, feminine] */
  jobs: [
    ['מרכיב עדשות מגע', 'מרכיבת עדשות מגע'], ['מעצב גרפי', 'מעצבת גרפית'], ['נהג אוטובוס', 'נהגת אוטובוס'], ['כנר', 'כנרית'],
    ['בריסטה', 'בריסטה'], ['סטודנט', 'סטודנטית'], ['רתך', 'רתכת'], ['ספרן', 'ספרנית'], ['שף', 'שפית'], ['אח', 'אחות'],
    ['מורה בגמלאות', 'מורה בגמלאות'], ['נגר', 'נגרית'],
  ] as [string, string][],
  traits: [
    ['הסנטר יציב על התומך, משתף פעולה מצוין.', 'הסנטר יציב על התומך, משתפת פעולה מצוין.'],
    ['ממצמץ הרבה מתחת לקרן הבהירה.', 'ממצמצת הרבה מתחת לקרן הבהירה.'],
    ['סקרן לגבי הסדק הזוהר.', 'סקרנית לגבי הסדק הזוהר.'],
    ['קצת לחוץ, כל הזמן זז מהתומך.', 'קצת לחוצה, כל הזמן זזה מהתומך.'],
  ] as [string, string][],
};

export const SLIT_TEXT_HE = {
  title: 'מנורת סדק',
  instructions: 'מאירים את העין בקרן המתאימה, עוברים מהעפעפיים ועד העדשה, ולוחצים על כל סימן כדי לתת לו שם ודרגה.',
  teaches: [
    'מתאימים את התאורה למטרה: מפוזרת ורחבה לעפעפיים ולחמית, חתך אופטי לעומק, רטרו-אילומינציה לעכירויות בעדשה',
    'Van Herick: קרן דקה ב-45–⁠60° על הלימבוס הטמפורלי; הרווח הכהה מול עובי הקרנית מדרג את הזווית (דרגה 1–⁠2 = צרה, מפנים לגוניוסקופיה)',
    'תאים ופלייר בלשכה דורשים חדר חשוך, חרוט של 1 × 1 מ״מ והגדלה גבוהה; מדרגים תאים לפי סולם SUN (0.5+ עד 4+)',
    'משקעים קרטיים (KP) יושבים על האנדותל ונראים בפרללפיפד או בחתך בהגדלה 16× ומעלה',
    'אור כחול-קובלט מאיר פלואורסצאין וטבעות ברזל; אור חסר-אדום מכהה כלי דם',
  ],
};

export const FLUO_TEXT_HE = {
  title: 'פלואורסצאין',
  instructions: 'מטפטפים טיפה, ממצמצים כדי להפיץ אותה, מאירים באור כחול-קובלט עם המסנן הצהוב: נותנים שם לצביעה ומודדים את זמן קריסת סרט הדמעות.',
  teaches: [
    'טיפה קטנה אחת של פלואורסצאין, ואז מצמוץ כדי לפזר אותה; יותר מדי צבע מציף ומטשטש את הניגודיות',
    'האור הכחול-קובלט מעורר את הצבע והמסנן הצהוב חוסם את הסנוור, ולכן הצביעה זוהרת בירוק',
    'דפוסי הצביעה מצביעים על הגורם: דנדריט = הרפס סימפלקס, נקודתית תחתונה = עין יבשה, קווית = שחיקה או גוף זר מתחת לעפעף',
    'TBUT, זמן קריסת סרט הדמעות: השניות מהמצמוץ ועד הכתם הכהה הראשון. מתחת ל-10 שניות זה מופחת',
    'לוקחים ממוצע של שלוש מדידות ולא נוגעים בעין או בעפעפיים',
  ],
};
