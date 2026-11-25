import { describe, expect, it, vi } from 'vitest';
import type { MiniGameResult } from '@core';
import { onceDone } from './once';
import { report } from './report';
import { makeScenario } from './practice';
import { createRng } from '@core';

const result = (): MiniGameResult => {
  const s = makeScenario(createRng('once'), 0.5);
  return { testId: 'tonometry', accuracy: 0.8, timeMs: 1000, findings: report(s.findings, s.patient) };
};

describe('tonometry done() contract', () => {
  it('fires exactly once with report-derived findings and accuracy in 0..1', () => {
    const spy = vi.fn();
    const g = onceDone(spy);
    const r = result();
    g.done(r);
    g.done(r);
    expect(spy).toHaveBeenCalledTimes(1);
    const got = spy.mock.calls[0]![0] as MiniGameResult;
    expect(got.findings.some((f) => f.label === 'IOP')).toBe(true);
    expect(got.accuracy).toBeGreaterThanOrEqual(0);
    expect(got.accuracy).toBeLessThanOrEqual(1);
  });
  it('never fires after the mount has been cleaned up', () => {
    const spy = vi.fn();
    const g = onceDone(spy);
    g.cancel();
    g.done(result());
    expect(spy).not.toHaveBeenCalled();
  });
});
