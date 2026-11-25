import { describe, expect, it, vi } from 'vitest';
import { createRng } from '@core';
import modules from './index';
import { convergenceScenario, motilityScenario } from './practice';

const stubCtx = (testId: 'motility' | 'convergence') => {
  const rng = createRng('mount-' + testId);
  const sc = (testId === 'motility' ? motilityScenario : convergenceScenario)(rng.fork('s'), 0.5);
  return {
    testId, patient: sc.patient, findings: sc.findings, mode: 'practice' as const, difficulty: 0.5, rng,
    audio: { play: vi.fn() }, fx: new Proxy({}, { get: () => vi.fn() }), reducedMotion: true,
  } as never;
};

describe('mount lifecycle', () => {
  for (const m of modules) {
    it(`${m.id}: mounts content and the cleanup leaves the host empty`, async () => {
      const host = document.createElement('div');
      document.body.appendChild(host);
      const cleanup = m.mount(host, stubCtx(m.id as 'motility' | 'convergence'), vi.fn());
      await new Promise((r) => setTimeout(r, 30));
      expect(host.querySelector('.mot-root')).not.toBeNull();
      cleanup();
      expect(host.childElementCount).toBe(0);
      expect(host.classList.contains('mot-host')).toBe(false);
      host.remove();
    });
  }
});
