import { afterEach, describe, expect, it, vi } from 'vitest';
import { buildFindings, createRng, type MiniGameContext, type MiniGameResult } from '@core';
import modules from './index';

function ctx(id: string): MiniGameContext {
  return {
    testId: id as MiniGameContext['testId'],
    patient: { name: 'Test Patient', age: 40, sex: 'F', occupation: 'x', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } },
    findings: buildFindings(40),
    mode: 'case', difficulty: 0.5, rng: createRng('mount'),
    audio: { play: vi.fn() } as unknown as MiniGameContext['audio'],
    fx: { burst: vi.fn(), shake: vi.fn() } as unknown as MiniGameContext['fx'],
    reducedMotion: true,
  };
}

describe('visual-acuity module mount', () => {
  afterEach(() => { document.body.innerHTML = ''; });
  it('exports both modules', () => {
    expect(modules.map((m) => m.id)).toEqual(['visual-acuity', 'pinhole']);
  });
  for (const m of modules) {
    it(`${m.id}: mounts, blocks Record until charted, and cleans up the DOM`, () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const done = vi.fn<(r: MiniGameResult) => void>();
      const cleanup = m.mount(host, ctx(m.id), done);
      expect(host.querySelector('.va')).toBeTruthy();
      expect(host.querySelector<HTMLButtonElement>('[data-testid=va-record]')?.disabled).toBe(true);
      expect(done).not.toHaveBeenCalled();
      cleanup();
      expect(host.children.length).toBe(0);
    });
  }
});
