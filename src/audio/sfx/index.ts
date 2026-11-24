import type { SfxId } from '@core';
import { alertSfx } from './alerts';
import { clinicalSfx } from './clinical';
import { interfaceSfx } from './interface';
import { rewardSfx } from './rewards';
import type { SfxDef } from './types';

export type { SfxDef, SfxVoice } from './types';

/** The complete library. `Record<SfxId, …>` makes a missing sound a type error. */
export const SFX: Record<SfxId, SfxDef> = {
  ...interfaceSfx,
  ...rewardSfx,
  ...clinicalSfx,
  ...alertSfx,
};
