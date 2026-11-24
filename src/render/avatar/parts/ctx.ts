import type { AvatarSpec } from '@core';
import type { AvatarSex } from '../generate';
import type { Geo, Side, Traits } from '../geometry';
import type { SkinPalette } from '../palette';
import type { External, Strabismus } from '../rig';

/** Everything a part painter needs. `id(name)` makes a per-instance defs id. */
export interface PaintCtx {
  g: Geo;
  t: Traits;
  spec: AvatarSpec;
  skin: SkinPalette;
  age: number;
  sex: AvatarSex;
  hair: string;
  ext: External;
  strabismus?: Strabismus;
  pupils: { L: number; R: number };
  /** side of a unilateral skin sign (rash / temporal artery) */
  signSide: Side;
  id: (name: string) => string;
  url: (name: string) => string;
  /** hide hair crown under hats / scarves */
  crownHidden: boolean;
  scarf: boolean;
  animated: boolean;
}
