import type { SceneModule } from '@core';
import { ExamScene } from './ExamScene';

/**
 * The exam room (params { caseId, modeId }). Sandbox: ?sandbox=scene/exam&caseId=<id>[&modeId=<id>]
 * A session is started only when none is active for that case (e.g. when opened from the sandbox).
 */
const exam: SceneModule = {
  id: 'exam',
  component: ExamScene,
  music: 'exam',
};

export default exam;
