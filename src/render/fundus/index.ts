/**
 * render/fundus — procedural fundus photographs + hit-test maps, and the
 * pannable <FundusView> (with an optional ophthalmoscope light circle).
 */
export * from './types';
export { paintFundus, fundusMap } from './paint';
export { fundusToCanvas, canvasToFundus, hitTestFundus, anatomy as fundusAnatomy, zoneOf as fundusZoneOf } from './geometry';
export { computeFundusLayout, type FundusLayout, type LesionInst } from './layout';
export { FundusView, type FundusViewProps } from './FundusView';
