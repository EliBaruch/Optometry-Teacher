import type { AvatarSpec } from '@core';
import type { AvatarSex } from './generate';
import { AvatarSvg } from './PatientAvatar';
import type { Expression, External } from './rig';

export interface AvatarBustProps {
  spec: AvatarSpec;
  age: number;
  sex: AvatarSex;
  /** Diameter in px. Default 48. */
  size?: number;
  /** Ring colour (rank / rarity / rival accent). Default candle gold. */
  ring?: string;
  expression?: Expression;
  external?: External;
  /** Static by default — list rows shouldn't all be blinking at you. */
  animated?: boolean;
  reducedMotion?: boolean;
  class?: string;
  label?: string;
}

/** Circular head-and-shoulders crop for list rows, leaderboards and chips. */
export function AvatarBust(props: AvatarBustProps) {
  const { size = 48, animated = false, ...rest } = props;
  return <AvatarSvg {...rest} size={size} animated={animated} variant="bust" ring={props.ring} />;
}
