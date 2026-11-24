/**
 * generateAvatar: a deterministic, plausible AvatarSpec for a patient of a given
 * age and sex. Pure — the same rng state always yields the same spec.
 */
import type { AvatarSpec, HairStyle, Rng, SkinTone } from '@core';
import {
  HAIR_DARK, HAIR_GREY, HAIR_LIGHT, HAIR_MID, HAIR_RED, HAIR_WHITE,
  IRIS_BLUE, IRIS_BROWN, IRIS_GREEN, IRIS_GREY, IRIS_HAZEL, OUTFITS,
} from './palette';

export type AvatarSex = 'F' | 'M' | 'X';

export const HAIR_STYLES: readonly HairStyle[] = ['bald', 'short', 'buzz', 'curly', 'long', 'bun', 'ponytail', 'afro', 'bob', 'swept', 'braids'];
export const GLASSES = ['none', 'round', 'square', 'cat-eye', 'aviator', 'half-rim'] as const;
export const FACIAL_HAIR = ['none', 'stubble', 'beard', 'moustache'] as const;
export const HEADWEAR = ['none', 'cap', 'headscarf', 'kippah', 'beanie', 'hard-hat'] as const;
export const ACCESSORIES = ['none', 'earrings', 'hearing-aid', 'necklace', 'bandage'] as const;

type Weighted<T> = readonly (readonly [T, number])[];

function weighted<T>(rng: Rng, table: Weighted<T>): T {
  let total = 0;
  for (const [, w] of table) total += Math.max(0, w);
  let r = rng.next() * total;
  for (const [v, w] of table) {
    r -= Math.max(0, w);
    if (r < 0) return v;
  }
  return table[table.length - 1]![0];
}

function hairStyleFor(rng: Rng, age: number, sex: AvatarSex): HairStyle {
  const child = age < 13;
  const old = age >= 60;
  const balding = sex === 'M' && !child ? Math.max(0, (age - 30) / 50) : 0;
  const F: Weighted<HairStyle> = [
    ['long', child ? 3 : 3], ['bob', old ? 4 : 2.5], ['bun', 2], ['ponytail', child ? 4 : 1.8], ['curly', 2],
    ['braids', 1.6], ['afro', 1.2], ['short', old ? 3.5 : 1.2], ['swept', 0.8], ['buzz', 0.3],
  ];
  const M: Weighted<HairStyle> = [
    ['short', 4], ['buzz', 2], ['swept', 2.5], ['curly', 1.6], ['afro', 1.2], ['braids', 0.6],
    ['bald', balding * 6], ['long', 0.5], ['ponytail', 0.3], ['bun', 0.3],
  ];
  const X: Weighted<HairStyle> = [
    ['short', 2.5], ['bob', 2], ['swept', 2], ['curly', 1.8], ['buzz', 1.4], ['long', 1.5], ['bun', 1.2],
    ['afro', 1], ['braids', 1], ['ponytail', 0.8], ['bald', balding * 2],
  ];
  return weighted(rng, sex === 'F' ? F : sex === 'M' ? M : X);
}

function hairColorFor(rng: Rng, age: number, skin: SkinTone): string {
  // Greying: most people show some grey by 50, majority grey/white past 70.
  const grey = age < 35 ? 0 : Math.min(0.95, (age - 35) / 40);
  if (rng.chance(grey)) {
    return age >= 72 && rng.chance(0.6) ? rng.pick(HAIR_WHITE) : rng.pick(HAIR_GREY);
  }
  if (skin >= 3) return rng.chance(0.85) ? rng.pick(HAIR_DARK) : rng.pick(HAIR_MID);
  const table: Weighted<readonly string[]> =
    skin === 0
      ? [[HAIR_LIGHT, 3], [HAIR_MID, 3], [HAIR_RED, 1.4], [HAIR_DARK, 1.5]]
      : skin === 1
        ? [[HAIR_LIGHT, 2], [HAIR_MID, 4], [HAIR_RED, 0.6], [HAIR_DARK, 2.5]]
        : [[HAIR_MID, 3], [HAIR_DARK, 4], [HAIR_LIGHT, 0.4]];
  // children are blonder on average
  const list = age < 10 && skin <= 1 && rng.chance(0.4) ? HAIR_LIGHT : weighted(rng, table);
  return rng.pick(list);
}

function irisFor(rng: Rng, skin: SkinTone): string {
  const table: Weighted<readonly string[]> =
    skin <= 0
      ? [[IRIS_BLUE, 4], [IRIS_GREEN, 1.6], [IRIS_HAZEL, 1.6], [IRIS_GREY, 1], [IRIS_BROWN, 2]]
      : skin === 1
        ? [[IRIS_BLUE, 2.2], [IRIS_GREEN, 1.2], [IRIS_HAZEL, 2], [IRIS_GREY, 0.5], [IRIS_BROWN, 4]]
        : skin === 2
          ? [[IRIS_HAZEL, 1.5], [IRIS_GREEN, 0.4], [IRIS_BLUE, 0.3], [IRIS_BROWN, 8]]
          : [[IRIS_BROWN, 12], [IRIS_HAZEL, 0.6]];
  return rng.pick(weighted(rng, table));
}

function glassesFor(rng: Rng, age: number): NonNullable<AvatarSpec['glasses']> {
  // Presbyopia makes specs near-universal after ~45 (shown ~60% of the time).
  const p = age < 8 ? 0.12 : age < 18 ? 0.25 : age < 45 ? 0.3 : 0.6;
  if (!rng.chance(p)) return 'none';
  return weighted(rng, [
    ['round', 2], ['square', 2.4], ['cat-eye', age > 12 ? 1.2 : 0.2], ['aviator', age > 16 ? 0.9 : 0], ['half-rim', age >= 45 ? 2.4 : 0.3],
  ] as const);
}

function facialHairFor(rng: Rng, age: number, sex: AvatarSex): NonNullable<AvatarSpec['facialHair']> {
  if (age < 18 || sex === 'F') return 'none';
  const p = sex === 'M' ? 0.5 : 0.12;
  if (!rng.chance(p)) return 'none';
  return weighted(rng, [['stubble', 2], ['beard', 2], ['moustache', age > 40 ? 1.2 : 0.6]] as const);
}

function headwearFor(rng: Rng, age: number, sex: AvatarSex): NonNullable<AvatarSpec['headwear']> {
  if (!rng.chance(age < 13 ? 0.08 : 0.16)) return 'none';
  return weighted(rng, [
    ['cap', age < 60 ? 2 : 1],
    ['beanie', 1.6],
    ['headscarf', sex === 'M' || age < 10 ? 0 : 2],
    ['kippah', sex === 'F' ? 0 : 1.4],
    ['hard-hat', age >= 20 && age <= 65 ? 0.8 : 0],
  ] as const);
}

function accessoryFor(rng: Rng, age: number, sex: AvatarSex): NonNullable<AvatarSpec['accessory']> {
  if (!rng.chance(0.38)) return 'none';
  return weighted(rng, [
    ['earrings', sex === 'F' ? 3 : sex === 'X' ? 1.6 : 0.6],
    ['hearing-aid', age >= 70 ? 3 : age >= 55 ? 0.8 : 0],
    ['necklace', sex === 'M' ? 0.6 : 2],
    ['bandage', age < 14 ? 1 : 0.25],
  ] as const);
}

export function generateAvatar(rng: Rng, opts: { age: number; sex: AvatarSex }): AvatarSpec {
  const age = Math.max(0, Math.min(110, Number.isFinite(opts.age) ? opts.age : 40));
  const sex = opts.sex;
  const skin = rng.int(0, 5) as SkinTone;
  const hair = hairStyleFor(rng, age, sex);
  const hairColor = hairColorFor(rng, age, skin);
  const irisColor = irisFor(rng, skin);
  const glasses = glassesFor(rng, age);
  const facialHair = facialHairFor(rng, age, sex);
  const headwear = headwearFor(rng, age, sex);
  const accessory = accessoryFor(rng, age, sex);
  const outfit = rng.pick(OUTFITS);
  return { skin, hair, hairColor, irisColor, glasses, facialHair, headwear, accessory, outfit };
}
