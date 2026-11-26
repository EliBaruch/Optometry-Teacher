/** The five exam steps shown in the progress list. */
import { isolateLtrRuns, pickStrings, type Locale } from '@core';
import { S } from './strings';
import { goodSwings, NEAR_MIN_S, SWINGS_NEEDED, type Call, type Measures, type Swing } from './scoring';

export interface Task { id: string; label: string; sub: string; done: boolean; prog: string }

export function buildTasks(m: Measures, swings: Swing[], nearSecs: number, call: Call, locale: Locale = 'en'): Task[] {
  const t = pickStrings(S, locale);
  const nl = Object.keys(m.light).length;
  const nd = Object.keys(m.dark).length;
  const gs = Math.min(goodSwings(swings), SWINGS_NEEDED);
  const list: Task[] = [
    { id: 'light', label: t.tSizeLight, sub: t.tSizeLightSub, done: nl >= 2, prog: `${nl}/2` },
    { id: 'dark', label: t.tSizeDark, sub: t.tSizeDarkSub, done: nd >= 2, prog: `${nd}/2` },
    { id: 'swing', label: t.tSwing, sub: t.tSwingSub(SWINGS_NEEDED), done: gs >= SWINGS_NEEDED, prog: `${gs}/${SWINGS_NEEDED}` },
    { id: 'near', label: t.tNear, sub: t.tNearSub, done: nearSecs >= NEAR_MIN_S, prog: `${Math.min(nearSecs, NEAR_MIN_S).toFixed(0)}/${NEAR_MIN_S}${locale === 'he' ? '' : 's'}` },
    { id: 'call', label: t.tCall, sub: t.tCallSub, done: call.side !== null, prog: call.side === null ? '' : call.side === 'none' ? t.callNone : `${call.side}${call.grade ? ` ${call.grade}+` : ''}` },
  ];
  return locale === 'he' ? list.map((x) => ({ ...x, sub: isolateLtrRuns(x.sub) })) : list;
}
