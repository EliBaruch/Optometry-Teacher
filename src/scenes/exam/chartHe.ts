import type { Locale, RevealedFinding } from '@core';

/**
 * Hebrew wording for chart rows.
 *
 * Mini-games build their findings in English (MiniGameModule.report has no locale parameter yet), so the
 * exam room re-expresses them for the Hebrew edition. Labels are looked up one by one; values go through an
 * ordered list of phrase rules (longest phrase first). Anything a rule does not know is left as it came, so
 * a new finding degrades to English instead of disappearing, and a mini-game that starts emitting Hebrew
 * itself passes through untouched.
 */

const LABELS: Record<string, string> = {
  'Amsler': 'רשת אמסלר',
  'Colour plates': 'לוחות צבעים',
  'Colour vision': 'ראיית צבעים',
  'Red desaturation': 'דה־סטורציה של אדום',
  'Cover test (distance)': 'בדיקת כיסוי, רחוק',
  'Cover test (near)': 'בדיקת כיסוי, קרוב',
  'Distance vs near': 'רחוק מול קרוב',
  'Head posture': 'תנוחת ראש',
  'K1 / K2': 'K1 / K2',
  'Corneal astigmatism': 'אסטיגמטיזם קרנייתי',
  'Mires': 'מירס',
  'Versions': 'תנועות משותפות',
  'Pattern': 'דפוס הפגם',
  'Diplopia': 'ראייה כפולה',
  'Pain on eye movement': 'כאב בתנועת עיניים',
  'Nystagmus': 'ניסטגמוס',
  'NPC break': 'NPC, נקודת שבירה',
  'NPC recovery': 'NPC, התאוששות',
  'Accommodative amplitude': 'משרעת אקומודציה',
  'Red reflex': 'רפלקס אדום',
  'Cup:disc': 'יחס גביע:דיסקה',
  'Disc': 'דיסקת עצב הראייה',
  'Vessels': 'כלי דם',
  'Macula': 'מקולה',
  'Periphery': 'פריפריה',
  'Vitreous': 'זגוגית',
  'Disc haemorrhage': 'דימום בדיסקה',
  'Flame haemorrhages': 'דימומי להבה',
  'Dot-blot haemorrhages': 'דימומי נקודה וכתם',
  'Cotton-wool spots': 'כתמי צמר גפן',
  'Retinal whitening': 'הלבנת רשתית',
  'Retinal embolus': 'תסחיף ברשתית',
  'Detachment': 'היפרדות רשתית',
  'Microaneurysms': 'מיקרואנוריזמות',
  'Hard exudates': 'אקסודאטים קשים',
  'Drusen': 'דרוזן',
  'Neovascularisation': 'ניאווסקולריזציה',
  'Venous beading': 'התחרזות ורידית',
  'Lattice degeneration': 'ניוון סורגי',
  'Retinal tear': 'קרע ברשתית',
  'Pupil, light': 'אישון באור',
  'Pupil, dark': 'אישון בחושך',
  'Anisocoria': 'אניסוקוריה',
  'Light reaction': 'תגובה לאור',
  'RAPD (swinging light)': 'RAPD (אור מתנדנד)',
  'Near response': 'תגובה לקרוב',
  'Pupil shape': 'צורת האישון',
  'Dilation lag': 'עיכוב בהתרחבות',
  'Lid position': 'מצב העפעף',
  'Ret': 'רטינוסקופיה',
  'Ret reflex': 'רפלקס ברטינוסקופיה',
  'Ret anisometropia': 'אניזומטרופיה ברטינוסקופיה',
  'Lids': 'עפעפיים',
  'Conjunctiva': 'לחמית',
  'Cornea': 'קרנית',
  'AC cells / flare': 'תאים ופלייר בלשכה הקדמית',
  'Van Herick': 'ון הריק',
  'Iris': 'קשתית',
  'Lens': 'עדשה',
  'Fluorescein': 'פלואורסצאין',
  'TBUT': 'TBUT, זמן קרע בדמעה',
  'IOP': 'לחץ תוך־עיני',
  'IOP method': 'שיטת המדידה',
  'IOP asymmetry': 'פער בלחץ בין העיניים',
  'VA sc': 'חדות ראייה בלי תיקון',
  'PH': 'חדות עם פינהול',
  'Visual field': 'שדה ראייה',
  'Field localisation': 'מיקום הפגם',
  'Manifest Rx': 'רפרקציה סובייקטיבית',
  'BCVA': 'חדות מיטבית עם תיקון',
  'Add': 'תוספת לקרוב',
  'Endpoint': 'נקודת הסיום',
  'Anisometropia': 'אניזומטרופיה',
};

type Rule = [RegExp, string | ((...m: string[]) => string)];

const TROPIA: Record<string, string> = { eso: 'אזו', exo: 'אקסו', hyper: 'היפר', hypo: 'היפו' };
const SIDE: Record<string, string> = { R: 'בעין ימין', L: 'בעין שמאל', alternating: 'מתחלפת' };

const RULES: Rule[] = [
  // ---- cover test
  [/Orthophoria \(no deviation\)/g, 'אורתופוריה (אין סטייה)'],
  [/ with (\d+Δ) ([RL]) hyper\b/g, (_m, d, s) => ` עם ${d} היפר ${s === 'R' ? 'ימין' : 'שמאל'}`],
  [/(constant|intermittent) (alternating|[RL]) (eso|exo|hyper|hypo)tropia/g, (_m, k, s, t) =>
    `${TROPIA[t]}טרופיה ${k === 'constant' ? 'קבועה' : 'לסירוגין'} ${SIDE[s]}`],
  [/(constant|intermittent) (eso|exo|hyper|hypo)tropia/g, (_m, k, t) => `${TROPIA[t]}טרופיה ${k === 'constant' ? 'קבועה' : 'לסירוגין'}`],
  [/(eso|exo|hyper|hypo)phoria/g, (_m, t) => `${TROPIA[t]}פוריה`],
  [/Distance > near: divergence insufficiency pattern/g, 'רחוק גדול מקרוב: דפוס של אי־ספיקת התבדרות'],
  [/head tilt left/g, 'הטיית ראש שמאלה'],
  [/head tilt right/g, 'הטיית ראש ימינה'],
  [/face turn left/g, 'סיבוב פנים שמאלה'],
  [/face turn right/g, 'סיבוב פנים ימינה'],
  // ---- motility
  [/Full, smooth, equal \(SAFE\)/g, 'מלאות, חלקות ושוות (SAFE)'],
  [/Multiple recti underacting (OD|OS): adduction, elevation and depression limited/g, (_m, e) => `כמה שרירים ישרים חלשים ב־${e}: הגבלה בהקרבה, בהגבהה ובהנמכה`],
  [/Depression in adduction deficit (OD|OS) with inferior oblique overaction/g, (_m, e) => `ליקוי בהנמכה בהקרבה ב־${e}, עם פעילות יתר של האלכסוני התחתון`],
  [/Abduction deficit (OD|OS)/g, (_m, e) => `ליקוי בהרחקה ב־${e}`],
  [/Elevation limited (OD|OS) \(all upgaze positions\)/g, (_m, e) => `הגבלה בהגבהה ב־${e} (בכל מבטי המעלה)`],
  [/Full ductions; pain on eye movement/g, 'תנועות מלאות; כאב בתנועת עיניים'],
  [/vertical \(one above the other\)/g, 'אנכית (אחת מעל השנייה)'],
  [/horizontal \(side by side\)/g, 'אופקית (זו לצד זו)'],
  [/^oblique$/g, 'אלכסונית'],
  [/^Yes$/g, 'כן'],
  [/^Present$/g, 'קיים'],
  // ---- amsler / colour
  [/Normal — lines straight, no missing areas/g, 'תקין: הקווים ישרים ואין אזורים חסרים'],
  [/Metamorphopsia — central, (\d+)° across/g, (_m, n) => `מטמורפופסיה מרכזית, ברוחב ${n}°`],
  [/Central scotoma — fills the grid/g, 'סקוטומה מרכזית: ממלאת את כל הרשת'],
  [/Central scotoma — (\d+)° across/g, (_m, n) => `סקוטומה מרכזית, ברוחב ${n}°`],
  [/Paracentral scotoma — temporal, (\d+)° across/g, (_m, n) => `סקוטומה פרה־מרכזית בצד הרקה, ברוחב ${n}°`],
  [/Unable — demo plate not seen/g, 'לא הצליח: לוח ההדגמה לא נראה'],
  [/R-G/g, 'אדום־ירוק'],
  [/B-Y/g, 'כחול־צהוב'],
  [/Normal colour vision/g, 'ראיית צבעים תקינה'],
  [/Acquired red-green defect, (severe|moderate|mild)/g, (_m, s) => `ליקוי נרכש באדום־ירוק, ${({ severe: 'חמור', moderate: 'בינוני', mild: 'קל' } as Record<string, string>)[s]}`],
  [/Deutan defect, moderate \(congenital red-green\), both eyes/g, 'ליקוי דאוטן בינוני (מולד, אדום־ירוק), בשתי העיניים'],
  [/Red cap ≈ (\d+)% of (OD|OS|OU) saturation/g, (_m, n, e) => `המכסה האדום ≈ ${n}% מהרוויה ב־${e}`],
  // ---- keratometry
  [/(\d+\.\d+) D WTR/g, '$1 D עם הכלל'],
  [/(\d+\.\d+) D ATR/g, '$1 D נגד הכלל'],
  [/(\d+\.\d+) D oblique/g, '$1 D אלכסוני'],
  [/Regular — clear, round/g, 'סדיר: ברור ועגול'],
  [/Irregular — wavy, will not superimpose/g, 'לא סדיר: גלי, לא מתלכד'],
  [/Distorted — broken, egg-shaped/g, 'מעוות: שבור ובצורת ביצה'],
  // ---- convergence / accommodation
  [/\(receded\)/g, '(רחוק מהרגיל)'],
  [/\(expected ≥ ([\d.]+ D)\)/g, '(צפוי ≥ $1)'],
  [/(\d+(?:\.\d+)?) cm\b/g, '$1 ס״מ'],
  // ---- ophthalmoscopy
  [/Present, bright and even/g, 'קיים, בהיר ואחיד'],
  [/Dull \/ reduced/g, 'עמום או מופחת'],
  [/ISNT rim intact/g, 'טבעת העצב שומרת על כלל ISNT'],
  [/inferior rim thinning/g, 'דילול בקצה התחתון של הטבעת'],
  [/\(asymmetric vs fellow eye\)/g, '(לא סימטרי מול העין השנייה)'],
  [/Cup filled in by swelling/g, 'הגביע התמלא מהנפיחות'],
  [/Healthy pink rim, sharp margins/g, 'טבעת ורודה ובריאה, גבולות חדים'],
  [/Hyperaemic, swollen, elevated blurred margins/g, 'אדומה ונפוחה, גבולות מטושטשים ומורמים'],
  [/Pale \(optic atrophy\), swollen, elevated blurred margins/g, 'חיוורת (ניוון עצב הראייה), נפוחה, גבולות מטושטשים ומורמים'],
  [/Sectoral pallor, sharp margins/g, 'חיוורון מקטעי, גבולות חדים'],
  [/ · no nicking/g, ' · בלי חריצה'],
  [/\(narrowed\)/g, '(מוצרים)'],
  [/AV nicking/g, 'חריצה עורקית־ורידית'],
  [/arteriolar boxcarring/g, 'חלוקה לקטעים בעורקיקים'],
  [/dilated veins/g, 'ורידים מורחבים'],
  [/tortuous/g, 'מפותלים'],
  [/copper wiring/g, 'חוטי נחושת'],
  [/Flat, foveal reflex present/g, 'שטוחה, רפלקס הפובאה קיים'],
  [/Pigment clumping, detached \(macula-off\)/g, 'גושי פיגמנט, מנותקת (מקולה מנותקת)'],
  [/Macular oedema/gi, 'בצקת מקולרית'],
  [/Cherry-red spot/g, 'כתם דובדבן אדום'],
  [/Geographic atrophy/g, 'ניוון גאוגרפי'],
  [/Sub-retinal haemorrhage/g, 'דימום תת־רשתי'],
  [/Pigment clumping/gi, 'גושי פיגמנט'],
  [/hard exudate/gi, 'אקסודאט קשה'],
  [/microaneurysm/g, 'מיקרואנוריזמה'],
  [/drusen/gi, 'דרוזן'],
  [/Attached, no tears or lattice/g, 'צמודה, בלי קרעים או ניוון סורגי'],
  [/Serous, macular, macula-off/g, 'סרוזית, מקולרית, המקולה מנותקת'],
  [/Rhegmatogenous, ([a-z +]+), macula-on/g, (_m, q) => `רגמטוגנית, ${q}, המקולה צמודה`],
  [/Haemorrhage — fundus detail obscured/g, 'דימום: פרטי קרקעית העין מוסתרים'],
  [/Weiss ring \(posterior vitreous detachment\)/g, 'טבעת וייס (היפרדות זגוגית אחורית)'],
  [/Pigment dust \(Shafer's sign — look for a retinal break\)/g, 'אבק פיגמנט (סימן שייפר: חפשו קרע ברשתית)'],
  [/numerous/g, 'רבים'],
  [/several/g, 'כמה'],
  [/all quadrants/g, 'בכל הרביעים'],
  [/(?<!layer )at the disc/g, 'בדיסקה'],
  [/^peripheral$/g, 'בפריפריה'],
  [/superotemporal/g, 'טמפורלי עליון'],
  [/inferotemporal/g, 'טמפורלי תחתון'],
  [/superonasal/g, 'נזאלי עליון'],
  [/inferonasal/g, 'נזאלי תחתון'],
  // ---- pupils
  [/Fixed \(no reaction\)/g, 'קבוע (בלי תגובה)'],
  [/Brisk/g, 'מהירה'],
  [/Sluggish/g, 'איטית'],
  [/Absent/g, 'לא קיים'],
  [/Present, (\d)\+/g, 'קיים, $1+'],
  [/Constricts to near target/g, 'מצטמצם למטרה קרובה'],
  [/Mid-dilated, oval/g, 'מורחב בינוני, סגלגל'],
  [/^Irregular$/g, 'לא סדיר'],
  [/None \(<0\.4 mm\)/g, 'אין (<0.4 מ״מ)'],
  [/greater in the light/g, 'גדולה יותר באור'],
  [/greater in the dark/g, 'גדולה יותר בחושך'],
  [/\(larger pupil (OD|OS)\)/g, '(האישון הגדול: $1)'],
  [/\(smaller pupil (OD|OS)\)/g, '(האישון הקטן: $1)'],
  [/Slow to dilate in the dark \((\d+) s > (\d+) s\)/g, 'מתרחב לאט בחושך ($1 שנ׳ לעומת $2 שנ׳)'],
  [/^Ptosis$/g, 'צניחת עפעף'],
  [/(\d+(?:\.\d+)?) mm\b/g, '$1 מ״מ'],
  // ---- retinoscopy
  [/\bPlano\b/g, 'פלנו'],
  [/\(counts fingers\)/g, '(ספירת אצבעות)'],
  [/\(hand motion\)/g, '(תנועת יד)'],
  [/\(light perception\)/g, '(קליטת אור)'],
  [/Normal — crisp, even reflex/g, 'תקין: רפלקס חד ואחיד'],
  [/Dull — media opacity \(e\.g\. cataract\)/g, 'עמום: עכירות במדיה (למשל קטרקט)'],
  [/Irregular — distorted, broken reflex/g, 'לא סדיר: רפלקס מעוות ושבור'],
  [/Scissoring — irregular cornea \(keratoconus pattern\)/g, 'מספרי: קרנית לא סדירה (דפוס של קרטוקונוס)'],
  [/Poorly defined — irregular astigmatism/g, 'לא מוגדרת היטב: אסטיגמטיזם לא סדיר'],
  [/(\d+\.\d+) D difference \(SE\)/g, 'הפרש של $1 D (SE)'],
  // ---- slit lamp
  [/^Normal$/g, 'תקין'],
  [/^Clear$/g, 'שקופה'],
  [/Lid oedema/g, 'בצקת בעפעף'],
  [/Meibomian dysfunction/g, 'תפקוד לקוי של בלוטות מייבום'],
  [/Lid vesicles/g, 'שלפוחיות בעפעף'],
  [/White and quiet/g, 'לבנה ושקטה'],
  [/Diffuse injection/g, 'אדמומיות מפושטת'],
  [/Sectoral injection/g, 'אדמומיות מקטעית'],
  [/Ciliary flush/g, 'אדמומיות ציליארית'],
  [/Papillae/g, 'פפילות'],
  [/Follicles/g, 'זקיקים'],
  [/Chemosis/g, 'כמוזיס'],
  [/Stringy mucus/g, 'ריר חוטי'],
  [/Mucopurulent/g, 'הפרשה מוגלתית־רירית'],
  [/Watery/g, 'הפרשה מימית'],
  [/Pterygium/g, 'פטריגיום'],
  [/Pinguecula/g, 'פינגווקולה'],
  [/Subconj\. haemorrhage/g, 'דימום תת־לחמיתי'],
  [/Corneal oedema/g, 'בצקת קרנית'],
  [/Keratic precipitates/g, 'משקעים קרטיים'],
  [/^Abrasion$/g, 'שחיקה'],
  [/Foreign body/g, 'גוף זר'],
  [/Rust ring/g, 'טבעת חלודה'],
  [/Punctate keratitis/g, 'קרטיטיס נקודתית'],
  [/^Dendrite$/g, 'דנדריט'],
  [/Cone \/ thinning/g, 'חרוט ודילול'],
  [/Vogt striae/g, 'קווי פוגט'],
  [/Fleischer ring/g, 'טבעת פליישר'],
  [/Ulcer/g, 'כיב'],
  [/Infiltrate/g, 'חדירה'],
  [/Cells ([\d.]+\+), flare (\d\+)/g, 'תאים $1, פלייר $2'],
  [/Deep and quiet/g, 'עמוקה ושקטה'],
  [/Grade 1 \(closure possible\), shallow chamber/g, 'דרגה 1 (סגירה אפשרית), לשכה רדודה'],
  [/Grade 4 \(wide open\)/g, 'דרגה 4 (פתוחה לרווחה)'],
  [/Normal, flat/g, 'תקינה, שטוחה'],
  [/Posterior synechiae/g, 'הדבקות אחוריות'],
  [/Nuclear sclerosis gr (\d)/g, 'סקלרוזיס גרעיני דרגה $1'],
  [/Cortical cataract gr (\d)/g, 'קטרקט קורטיקלי דרגה $1'],
  [/Pseudophakia \(IOL\)/g, 'פסאודופקיה (עדשה תוך־עינית)'],
  // ---- fluorescein
  [/No staining/g, 'אין צביעה'],
  [/Epithelial defect \(abrasion\)/g, 'פגם באפיתל (שחיקה)'],
  [/Focal stain around a foreign body/g, 'צביעה ממוקדת סביב גוף זר'],
  [/Interpalpebral staining/g, 'צביעה בין העפעפיים'],
  [/Inferior punctate staining/g, 'צביעה נקודתית בחלק התחתון'],
  [/Diffuse punctate staining/g, 'צביעה נקודתית מפושטת'],
  [/Dendritic ulcer with end bulbs/g, 'כיב דנדריטי עם בלוטי קצה'],
  [/Round ulcer, dense stain/g, 'כיב עגול, צביעה צפופה'],
  [/\(reduced\)/g, '(מופחת)'],
  [/(\d+) s\b/g, '$1 שנ׳'],
  // ---- tonometry
  [/Goldmann applanation/g, 'שיטוח גולדמן'],
  [/\((OD|OS) higher\)/g, '($1 גבוה יותר)'],
  // ---- acuity / pinhole
  [/^NI · /g, 'ללא שיפור · '],
  [/improves from/g, 'משתפרת מ־'],
  [/not needed \(sc ([\d/]+)\)/g, 'לא נדרש (בלי תיקון $1)'],
  // ---- visual fields
  [/Full fields OU — no pathway defect/g, 'שדות מלאים בשתי העיניים: אין פגם במסלול הראייה'],
  [/Full — physiological blind spot only/g, 'מלא: רק הנקודה העיוורת הפיזיולוגית'],
  [/(Superior|Inferior) arcuate — respects the horizontal meridian/g, (_m, s) => `קשתי ${s === 'Superior' ? 'עליון' : 'תחתון'}: נעצר בקו האמצע האופקי`],
  [/Near-total loss — small temporal island only/g, 'אובדן כמעט מלא: נשאר רק אי קטן בצד הרקה'],
  [/Enlarged blind spot/g, 'נקודה עיוורת מוגדלת'],
  [/Inferior peripheral loss — fixation spared/g, 'אובדן היקפי תחתון: הקיבוע נשמר'],
  [/Inferior altitudinal — respects the horizontal meridian/g, 'אובדן גובה תחתון: נעצר בקו האמצע האופקי'],
  [/(Left|Right) \((nasal|temporal)\) hemianopia — respects the vertical meridian/g, (_m, s, t) =>
    `המיאנופסיה ${s === 'Left' ? 'שמאלית' : 'ימנית'} (${t === 'nasal' ? 'נזאלית' : 'טמפורלית'}): נעצרת בקו האמצע האנכי`],
  [/Central scotoma — fixation involved/g, 'סקוטומה מרכזית: הקיבוע נפגע'],
  [/Pre-chiasmal OU — bilateral enlarged blind spots: check for disc swelling \(papilloedema\)/g, 'לפני הכיאזמה בשתי העיניים: נקודות עיוורות מוגדלות משני הצדדים, בדקו בצקת בדיסקה (פפילאדמה)'],
  [/Pre-chiasmal — (OD|OS): /g, 'לפני הכיאזמה, $1: '],
  [/nerve fibre layer at the disc \(glaucomatous pattern; or a branch vein occlusion\)/g, 'שכבת סיבי העצב ליד הדיסקה (דפוס גלאוקומטי, או חסימת ענף ורידי)'],
  [/central retinal artery occlusion/g, 'חסימת עורק מרכזי ברשתית'],
  [/retina — detachment in the opposite part of the fundus/g, 'הרשתית: היפרדות בחלק הנגדי של קרקעית העין'],
  [/optic nerve head ischaemia \(exclude giant cell arteritis\) or branch artery occlusion/g, 'איסכמיה בראש עצב הראייה (לשלול דלקת עורקים של תאי ענק) או חסימת ענף עורקי'],
  [/macula or optic nerve \(e\.g\. optic neuritis\)/g, 'המקולה או עצב הראייה (למשל דלקת בעצב הראייה)'],
  [/Right retrochiasmal — left homonymous hemianopia \(optic tract, radiation or occipital cortex\)/g, 'אחרי הכיאזמה, בצד ימין: המיאנופסיה הומונימית שמאלית (בדרכי הראייה, בקרניים האופטיות או בקליפת העורף)'],
  [/Chiasm — bitemporal hemianopia; image the pituitary region/g, 'כיאזמה: המיאנופסיה דו־טמפורלית; יש לצלם את אזור יותרת המוח'],
  [/ΔSE ([\d.]+ D)/g, 'הפרש SE של $1'],
  [/Δcyl ([\d.]+ D)/g, 'הפרש צילינדר של $1'],
  [/logMAR/g, 'logMAR'],
];

function he(value: string, rules: readonly Rule[]): string {
  let out = value;
  for (const [re, to] of rules) out = out.replace(re, to as string);
  return out;
}

export function chartLabelHe(label: string): string {
  return LABELS[label] ?? label;
}

export function chartValueHe(value: string): string {
  return he(value, RULES);
}

/**
 * Numbers, optotypes and Latin abbreviations inside a Hebrew sentence are wrapped in left-to-right isolates,
 * so "20/32 (6/9.5)" or "+2.75 −0.50 × 090" keep their order instead of being reshuffled by the bidi algorithm.
 */
const LTR_TOKEN = String.raw`(?:[+−]?\d[\d.,/:@×Δ°%]*|[A-Za-z][A-Za-z0-9:/\-]*)`;
const LTR_RUN = new RegExp(`${LTR_TOKEN}(?:[ ]?(?:\\([\\d/.]+\\)|[+−×@/]|${LTR_TOKEN}))*`, 'g');
export function isolateLtr(text: string): string {
  return /[\u0590-\u05FF]/.test(text) ? text.replace(LTR_RUN, '\u2066$&\u2069') : text;
}

/** Row text in the player's language. English passes through untouched. */
export function localizeFinding(f: Pick<RevealedFinding, 'label' | 'value'>, locale: Locale): { label: string; value: string } {
  if (locale !== 'he') return { label: f.label, value: f.value };
  return { label: chartLabelHe(f.label), value: isolateLtr(chartValueHe(f.value)) };
}
