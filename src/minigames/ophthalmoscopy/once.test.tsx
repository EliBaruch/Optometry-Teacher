import { describe, expect, it, vi } from 'vitest';
import { createRng, nullAudio, nullFx, type MiniGameContext, type MiniGameResult } from '@core';

// A stand-in Game that reports twice: the module wrapper must forward only the first result.
vi.mock('./Game', () => ({
  Game: ({ finish }: { finish: (r: MiniGameResult) => void }) => {
    const r: MiniGameResult = { testId: 'ophthalmoscopy', accuracy: 0.8, timeMs: 1000, findings: [], perfect: false };
    finish(r);
    finish({ ...r, accuracy: 0.1 });
    return null;
  },
}));

describe('ophthalmoscopy done()', () => {
  it('is forwarded exactly once even if the game reports twice', async () => {
    const { default: mod } = await import('./index');
    const host = document.createElement('div');
    document.body.append(host);
    const done = vi.fn();
    const ctx = { testId: 'ophthalmoscopy', mode: 'case', difficulty: 0.5, rng: createRng(1), audio: nullAudio, fx: nullFx, reducedMotion: true } as unknown as MiniGameContext;
    const cleanup = mod.mount(host, ctx, done);
    await new Promise((r) => setTimeout(r, 30));
    expect(done).toHaveBeenCalledTimes(1);
    expect(done.mock.calls[0]![0].accuracy).toBe(0.8);
    cleanup();
    expect(host.childElementCount).toBe(0);
  });
});
