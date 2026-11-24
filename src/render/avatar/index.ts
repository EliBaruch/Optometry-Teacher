/**
 * render/avatar — procedural patient portraits.
 *   <PatientAvatar spec age sex expression? external? strabismus? lookAt? pupils? size? animated? />
 *   <AvatarBust spec age sex size? ring? />
 *   generateAvatar(rng, { age, sex }) -> AvatarSpec
 */
export { PatientAvatar, type PatientAvatarProps } from './PatientAvatar';
export { AvatarBust, type AvatarBustProps } from './AvatarBust';
export { generateAvatar, HAIR_STYLES, GLASSES as AVATAR_GLASSES, FACIAL_HAIR as AVATAR_FACIAL_HAIR, HEADWEAR as AVATAR_HEADWEAR, ACCESSORIES as AVATAR_ACCESSORIES, type AvatarSex } from './generate';
export { EXPRESSIONS as AVATAR_EXPRESSIONS, type Expression as AvatarExpression, type External as AvatarExternal, type Strabismus as AvatarStrabismus, type Gaze as AvatarGaze } from './rig';
