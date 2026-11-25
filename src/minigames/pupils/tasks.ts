/** The five exam steps shown in the progress list. */
import { goodSwings, NEAR_MIN_S, SWINGS_NEEDED, type Call, type Measures, type Swing } from './scoring';

export interface Task { id: string; label: string; sub: string; done: boolean; prog: string }

export function buildTasks(m: Measures, swings: Swing[], nearSecs: number, call: Call): Task[] {
  const nl = Object.keys(m.light).length;
  const nd = Object.keys(m.dark).length;
  const gs = Math.min(goodSwings(swings), SWINGS_NEEDED);
  return [
    { id: 'light', label: 'Size in light', sub: 'OD + OS, room lights on', done: nl >= 2, prog: `${nl}/2` },
    { id: 'dark', label: 'Size in the dark', sub: 'OD + OS, light held away', done: nd >= 2, prog: `${nd}/2` },
    { id: 'swing', label: 'Swinging light', sub: `${SWINGS_NEEDED} swings, ~3 s on each eye`, done: gs >= SWINGS_NEEDED, prog: `${gs}/${SWINGS_NEEDED}` },
    { id: 'near', label: 'Near response', sub: 'hold the near target 2 s', done: nearSecs >= NEAR_MIN_S, prog: `${Math.min(nearSecs, NEAR_MIN_S).toFixed(0)}/${NEAR_MIN_S}s` },
    { id: 'call', label: 'Call the RAPD', sub: 'side and grade', done: call.side !== null, prog: call.side === null ? '' : call.side === 'none' ? 'none' : `${call.side}${call.grade ? ` ${call.grade}+` : ''}` },
  ];
}
