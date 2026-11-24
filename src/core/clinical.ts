/**
 * The canonical clinical domain model.
 *
 * Content (cases) PRODUCES PatientFindings; mini-games CONSUME the slice they
 * need and render it. This shared vocabulary is what lets either side be swapped
 * independently. Conventions:
 *  - Visual acuity is stored as logMAR (0.0 = 20/20, 1.0 = 20/200). Use va.ts helpers to format.
 *  - Refraction is minus-cylinder form, diopters, axis 1..180.
 *  - Prism diopters: horizontal +eso / -exo; vertical + = right-eye hyper.
 */

export type Eye = 'OD' | 'OS';
export const EYES: readonly Eye[] = ['OD', 'OS'];
export type PerEye<T> = { OD: T; OS: T };

// ───────────────────────── Refraction & acuity
export interface Refraction {
  sphere: number;
  cylinder: number; // <= 0 (minus-cyl)
  axis: number; // 1..180
  add?: number; // near addition for presbyopes
}

export interface VisualAcuity {
  uncorrected: number; // logMAR distance
  bestCorrected: number; // logMAR distance with best refraction
  pinhole?: number; // logMAR; improves for refractive blur, not for pathology
  nearUncorrected?: number; // logMAR at 40cm
}

export type RetinoscopyReflex = 'normal' | 'scissors' | 'dull' | 'absent' | 'irregular';
export type RedReflex = 'normal' | 'dull' | 'absent' | 'leukocoria' | 'asymmetric';

export interface Keratometry {
  k1: number; // flat K, diopters
  k2: number; // steep K, diopters
  axisK1: number; // axis of flat meridian
  mires: 'regular' | 'irregular' | 'distorted';
}

// ───────────────────────── Pupils
export type PupilReactivity = 'brisk' | 'sluggish' | 'fixed' | 'tonic';
export interface PupilFindings {
  sizeLightMm: PerEye<number>;
  sizeDarkMm: PerEye<number>;
  reactivity: PerEye<PupilReactivity>;
  rapd: 'none' | Eye;
  rapdGrade?: 1 | 2 | 3 | 4;
  nearResponse: 'normal' | 'light-near-dissociation';
  shape?: PerEye<'round' | 'irregular' | 'mid-dilated' | 'peaked'>;
}

// ───────────────────────── Binocular vision & motility
export type Gaze = 'up' | 'down' | 'left' | 'right' | 'upLeft' | 'upRight' | 'downLeft' | 'downRight';
export const GAZES: readonly Gaze[] = ['upLeft', 'up', 'upRight', 'left', 'right', 'downLeft', 'down', 'downRight'];

export interface Deviation {
  /** prism diopters: + eso, - exo */
  horizontal: number;
  /** prism diopters: + right hyper, - left hyper */
  vertical: number;
  type: 'ortho' | 'phoria' | 'tropia' | 'intermittent-tropia';
  deviatingEye?: Eye | 'alternating';
}

export interface MotilityFindings {
  distance: Deviation;
  near: Deviation;
  /** Per-gaze action: -4 (severe underaction) .. 0 (full) .. +4 (overaction) */
  versions: Partial<Record<Gaze, PerEye<number>>>;
  npcCm: number; // near point of convergence (break), normal <= ~6-10cm
  painOnMovement?: boolean;
  diplopia?: 'none' | 'horizontal' | 'vertical' | 'oblique';
  nystagmus?: boolean;
  /** Head posture adopted to avoid diplopia */
  headPosture?: 'none' | 'turn-left' | 'turn-right' | 'tilt-left' | 'tilt-right' | 'chin-down' | 'chin-up';
}

// ───────────────────────── Anterior segment (slit lamp)
export type LidSign =
  | 'normal' | 'anterior-blepharitis' | 'meibomian-dysfunction' | 'chalazion' | 'hordeolum'
  | 'ptosis' | 'lid-edema' | 'vesicles' | 'trichiasis' | 'ectropion' | 'entropion';
export type ConjSign =
  | 'normal' | 'diffuse-injection' | 'ciliary-flush' | 'sectoral-injection' | 'papillae' | 'giant-papillae'
  | 'follicles' | 'subconjunctival-hemorrhage' | 'pinguecula' | 'pterygium' | 'chemosis'
  | 'discharge-mucopurulent' | 'discharge-watery' | 'discharge-stringy' | 'preauricular-node';
export type CorneaSign =
  | 'clear' | 'punctate-keratitis' | 'abrasion' | 'dendrite' | 'ulcer' | 'infiltrate' | 'edema'
  | 'cone-thinning' | 'vogt-striae' | 'fleischer-ring' | 'keratic-precipitates' | 'foreign-body'
  | 'pannus' | 'reduced-tbut' | 'rust-ring' | 'pseudodendrite';
export type LensSign =
  | 'clear' | 'nuclear-sclerosis' | 'cortical-cataract' | 'posterior-subcapsular' | 'iol' | 'phacodonesis';
export type IrisSign = 'normal' | 'posterior-synechiae' | 'neovascularization' | 'transillumination' | 'heterochromia' | 'nevus';
export type StainPattern =
  | 'none' | 'inferior-punctate' | 'diffuse-punctate' | 'linear-abrasion' | 'dendritic'
  | 'round-ulcer' | 'vertical-linear-scratches' | 'interpalpebral'
  /** small round stain around an embedded foreign body */
  | 'focal';

export interface AnteriorChamber {
  depth: 'deep' | 'normal' | 'shallow' | 'flat';
  /** Van Herick grade 1 (closure likely) .. 4 (wide open) */
  vanHerick: 1 | 2 | 3 | 4;
  /** SUN scale cell grade */
  cells: 0 | 0.5 | 1 | 2 | 3 | 4;
  flare: 0 | 1 | 2 | 3 | 4;
  hypopyon?: boolean;
  hyphema?: boolean;
}

export interface AnteriorSegment {
  lids: LidSign[];
  conjunctiva: ConjSign[];
  cornea: CorneaSign[];
  anteriorChamber: AnteriorChamber;
  iris: IrisSign[];
  lens: LensSign[];
  /** 0..4 grading of lens opacity when relevant */
  lensGrade?: number;
  fluorescein: StainPattern;
  /** Tear break-up time in seconds (normal >= 10) */
  tbutSec?: number;
  /** Corneal sensation — reduced in HSV/HZO/neurotrophic keratitis */
  cornealSensation?: 'normal' | 'reduced' | 'absent';
}

// ───────────────────────── Posterior segment (fundus)
export type Zone = 'disc' | 'macula' | 'superotemporal' | 'inferotemporal' | 'superonasal' | 'inferonasal' | 'periphery' | 'diffuse';

export type LesionType =
  | 'dot-blot-hemorrhage' | 'flame-hemorrhage' | 'microaneurysm' | 'cotton-wool-spot' | 'hard-exudate'
  | 'drusen-small' | 'drusen-large' | 'geographic-atrophy' | 'subretinal-hemorrhage' | 'neovascularization'
  | 'retinal-tear' | 'lattice' | 'nevus' | 'pigment-clumping' | 'laser-scars' | 'hollenhorst-plaque'
  | 'retinal-whitening' | 'cherry-red-spot' | 'macular-edema' | 'epiretinal-membrane' | 'macular-hole'
  | 'disc-hemorrhage' | 'venous-beading' | 'irma' | 'preretinal-hemorrhage';

export interface RetinalLesion {
  type: LesionType;
  zone: Zone;
  /** rough count / extent 1..5 so the painter can scale density */
  density: number;
}

export interface OpticDisc {
  /** vertical cup-to-disc ratio 0.1..0.95 */
  cdr: number;
  color: 'pink' | 'pale' | 'hyperemic' | 'pale-sectoral';
  margins: 'sharp' | 'blurred' | 'elevated';
  /** ISNT rule violation (rim thinning) */
  rimThinning?: 'none' | 'inferior' | 'superior' | 'diffuse';
  /** Disc swelling with obscured vessels */
  edema?: boolean;
  /** Spontaneous venous pulsation present? */
  svp?: boolean;
}

export interface Vessels {
  /** artery:vein calibre ratio; normal ~0.67 */
  avRatio: number;
  avNicking: boolean;
  copperWiring: boolean;
  tortuosity: 'normal' | 'increased';
  /** dilated/tortuous veins as in CRVO */
  venousDilation: boolean;
  /** "box-carring" / segmentation as in CRAO */
  segmentation?: boolean;
}

export interface PosteriorSegment {
  vitreous: 'clear' | 'floaters' | 'weiss-ring' | 'hemorrhage' | 'pigment-shafer' | 'cells';
  disc: OpticDisc;
  vessels: Vessels;
  lesions: RetinalLesion[];
  detachment?: {
    zones: Zone[];
    maculaOff: boolean;
    /** default 'rhegmatogenous'; 'serous' = smooth dome without breaks (e.g. central serous) */
    kind?: 'rhegmatogenous' | 'serous' | 'tractional';
  };
  /** background colour hint: fair skin -> orange-red, darker -> deeper; 'tigroid' for myopes */
  fundusTone?: 'light' | 'medium' | 'dark' | 'tigroid';
}

// ───────────────────────── Functional tests
export type ColorVisionType = 'normal' | 'protan' | 'deutan' | 'tritan' | 'acquired-red-green' | 'acquired-blue-yellow';
export interface ColorVision {
  type: ColorVisionType;
  severity: 'none' | 'mild' | 'moderate' | 'severe';
  /** Red desaturation compared to fellow eye (optic neuropathy sign) */
  redDesaturation?: boolean;
}

export type FieldDefect =
  | 'full' | 'constricted' | 'central-scotoma' | 'cecocentral-scotoma' | 'enlarged-blind-spot'
  | 'superior-arcuate' | 'inferior-arcuate' | 'nasal-step'
  | 'superior-altitudinal' | 'inferior-altitudinal'
  | 'temporal-hemianopia' | 'nasal-hemianopia'
  | 'left-hemianopia' | 'right-hemianopia'
  | 'left-superior-quadrantanopia' | 'right-superior-quadrantanopia'
  | 'left-inferior-quadrantanopia' | 'right-inferior-quadrantanopia'
  | 'curtain-superior' | 'curtain-inferior' | 'curtain-temporal' | 'curtain-nasal'
  /** near-total loss with only a small temporal island (e.g. CRAO without cilioretinal sparing) */
  | 'temporal-island';

export interface AmslerFinding {
  result: 'normal' | 'metamorphopsia' | 'central-scotoma' | 'paracentral-scotoma';
  /** position of the defect in the 20x20 grid, centre = (0,0), range -10..10;
   *  x positive = patient's right as viewed on the card, y positive = UP (superior) */
  center?: { x: number; y: number };
  radius?: number;
}

export interface Accommodation {
  amplitudeD: PerEye<number>;
  /** Accommodative facility, cycles per minute (binocular), normal ~>= 8-11 */
  facilityCpm?: number;
}

// ───────────────────────── The full exam
export interface PatientFindings {
  va: PerEye<VisualAcuity>;
  refraction: PerEye<Refraction>;
  retinoscopyReflex: PerEye<RetinoscopyReflex>;
  redReflex: PerEye<RedReflex>;
  keratometry: PerEye<Keratometry>;
  pupils: PupilFindings;
  motility: MotilityFindings;
  anterior: PerEye<AnteriorSegment>;
  posterior: PerEye<PosteriorSegment>;
  /** Goldmann IOP, mmHg (normal ~10-21) */
  iop: PerEye<number>;
  colorVision: PerEye<ColorVision>;
  fields: PerEye<FieldDefect>;
  amsler: PerEye<AmslerFinding>;
  accommodation: Accommodation;
  /** External / systemic observations visible on the patient avatar */
  external?: {
    redEye?: Eye[];
    tearing?: Eye[];
    ptosis?: Eye[];
    proptosis?: Eye[];
    squinting?: boolean;
    photophobia?: boolean;
    eyePatch?: Eye;
    templeTenderness?: boolean;
    rash?: 'none' | 'forehead-dermatomal';
  };
}

/** Deep partial helper so cases only specify what differs from normal. */
export type DeepPartial<T> = T extends readonly (infer U)[]
  ? U[]
  : T extends object
    ? { [K in keyof T]?: DeepPartial<T[K]> }
    : T;
