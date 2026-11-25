/**
 * Lumen design system. Importing anything from '@ui-kit' also installs the
 * global tokens (CSS custom properties) and base styles.
 */
import './styles/tokens.css';
import './styles/base.css';

export * from './context';
export * from './components';
export * from './hooks';
export { Icon, IconOrText, ICON_NAMES, isIconName, type IconName, type IconProps, type TestIconName } from './icons/Icon';
export { cx, type ClassValue } from './lib/cx';
export { ease, clamp, lerp, tweenValue, formatNumber, countDuration, type EaseName } from './lib/motion';
export { buildSchedule, visibleChars, totalDuration } from './lib/typewriter';
export {
  palette, withAlpha, RARITIES, RARITY_COLOR, RARITY_LABEL, GRADE_COLOR, GRADE_WORD, TONE_COLOR,
  type Rarity, type Tone,
} from './lib/palette';
export { VARIANTS as BACKDROP_VARIANTS } from './lib/backdrop-sim';
export { isLiteRendering, setLiteRendering, onLiteRenderingChange, LITE_CLASS } from './lib/quality';
