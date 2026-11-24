import type { SceneModule } from '@core';
import { ResultsScene } from './ResultsScene';
import { RunSummaryScene } from './RunSummaryScene';

/**
 * Case results (params { caseId, modeId, timeout? }) and the end-of-run report
 * (params { modeId, snapshot }). Sandbox previews: add `&demo=correct|wrong|timeout|certain-wrong|guess-right`
 * (results; `&run=1` also starts a run) or `&demo=1` (run-summary).
 */
const scenes: SceneModule[] = [
  { id: 'results', component: ResultsScene, music: 'results' },
  { id: 'run-summary', component: RunSummaryScene, music: 'results' },
];

export default scenes;
