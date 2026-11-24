/**
 * render/eye — clinical eye close-up painter, slit-lamp optical sections and
 * collectible iris artwork. Pure canvas 2D; the only component is <EyeCanvas>.
 */
export * from './types';
export { drawEye, drawSlitSection } from './draw';
export type { SlitBeam } from './slit';
export { acDepthAtMm, centralAcDepthMm, cornealThicknessMm } from './slit';
export { eyeStateFromFindings, type EyeStateOptions } from './findings';
export { eyeGeometry, autoReflexMm, prismToGaze, nasalSign, HIRSCHBERG_PD_PER_MM, type EyeGeometry } from './geometry';
export { paintIris, irisLook, type IrisPaintOptions, type PupilShape } from './iris';
export { paintIrisArt, type IrisArtOptions, type IrisRarity } from './iris-art';
export { vanHerickRatio, sunCellCount, stainGeometry } from './features';
export { EyeCanvas, type EyeCanvasProps } from './EyeCanvas';
