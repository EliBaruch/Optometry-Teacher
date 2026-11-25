import { describe, expect, it } from 'vitest';
import { createRng } from '@core';
import { makeResponder } from './patient';
import { Runner, type RunnerEvent } from './runner';

function drain(r: Runner, until = 60000): RunnerEvent[] {
  const out: RunnerEvent[] = [];
  for (let t = 0; t < until; t += 16) out.push(...r.update(t));
  return out;
}

describe('perimeter runner', () => {
  it('plays every flash, buzzes for seen ones, then emits results in order', () => {
    const runner = new Runner(createRng(4));
    const resp = makeResponder('full', 'OD', 40, 0);
    runner.enqueue(resp, { x: 3, y: 3 }, 'threshold', 6);
    runner.enqueue(resp, { x: -9, y: 9 }, 'screen', 6);
    expect(runner.enqueue(resp, { x: 3, y: 3 }, 'threshold', 6)).toBe(false); // already queued
    const ev = drain(runner);
    const results = ev.filter((e) => e.type === 'result');
    expect(results).toHaveLength(2);
    expect(results.map((e) => (e.type === 'result' ? e.result.x : 0))).toEqual([3, -9]);
    const flashes = ev.filter((e) => e.type === 'flash').length;
    expect(flashes).toBe(runner.stimuli('OD'));
    const seen = ev.filter((e) => e.type === 'flash' && e.flash.seen).length;
    expect(ev.filter((e) => e.type === 'buzz')).toHaveLength(seen);
    expect(ev[ev.length - 1]!.type === 'idle' || ev.some((e) => e.type === 'idle')).toBe(true);
    expect(runner.busy).toBe(false);
  });
  it('slips in blind-spot catch trials and can be cancelled', () => {
    const runner = new Runner(createRng(8));
    const resp = makeResponder('full', 'OS', 40, 1);
    const pts = [{ x: 3, y: 3 }, { x: -3, y: 3 }, { x: 3, y: -3 }, { x: -3, y: -3 }, { x: 9, y: 9 }, { x: -9, y: 9 }];
    for (const p of pts) runner.enqueue(resp, p, 'threshold', 6);
    const ev = drain(runner);
    expect(ev.filter((e) => e.type === 'catch').length).toBeGreaterThan(0);
    runner.enqueue(resp, { x: 15, y: 15 }, 'threshold', 6);
    runner.cancel();
    expect(runner.busy).toBe(false);
    expect(drain(runner, 3000).filter((e) => e.type === 'result')).toHaveLength(0);
  });
});
