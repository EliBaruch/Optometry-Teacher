import { describe, expect, it } from 'vitest';
import { isMiniGameError } from './TestStage';

describe('TestStage async crash guard', () => {
  it('recognises errors thrown from a mini-game plugin (stack or source file)', () => {
    expect(isMiniGameError('Error: boom\n    at tick (http://localhost:5173/src/minigames/amsler/AmslerGame.tsx:343:25)')).toBe(true);
    expect(isMiniGameError(undefined, 'https://lumen.example/assets/src/minigames/tonometry/index.ts')).toBe(true);
  });
  it('ignores errors from the rest of the app so the stage is not failed spuriously', () => {
    expect(isMiniGameError('Error: x\n    at render (http://localhost:5173/src/scenes/exam/ExamScene.tsx:10:1)')).toBe(false);
    expect(isMiniGameError(undefined, undefined)).toBe(false);
  });
});
