import type { CvClass } from './clinical';
import { S } from './strings';

/** English wording (the Hebrew edition reads the same tables through `strings.ts`). */
export const CLASS_LABEL: Record<CvClass, string> = S.en.classLabel;
export const CLASS_HINT: Record<CvClass, string> = S.en.classHint;
/** Short elaborated feedback shown after the player commits. */
export const TEACHING: Record<CvClass, string> = S.en.teaching;
export const DISCLAIMER = S.en.disclaimer;
