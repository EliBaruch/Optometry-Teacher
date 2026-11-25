import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFindings, createRng, nullAudio, nullFx, type MiniGameContext, type MiniGameResult } from '@core';
import { makeScenario } from './practice';
import pupils from './index';

type Listener = EventListenerOrEventListenerObject;
const live = new Map<string, number>();
const keyOf = (t: unknown, type: string, l: Listener) => {
  const id = (t as { __id?: number }).__id ?? ((t as { __id?: number }).__id = Math.random());
  return `${id}|${type}|${(l as { __lid?: number }).__lid ?? ((l as { __lid?: number }).__lid = Math.random())}`;
};
/** Pending animation frames (requested, neither run nor cancelled). */
let rafs: Set<number>;
let observers: { disconnected: boolean }[];
const realRaf = globalThis.requestAnimationFrame.bind(globalThis);
const realCancel = globalThis.cancelAnimationFrame.bind(globalThis);
const origAdd = EventTarget.prototype.addEventListener;
const origRemove = EventTarget.prototype.removeEventListener;

function ctxFor(mode: 'case' | 'practice', reducedMotion = false): MiniGameContext {
  const sc = makeScenario(createRng(3), 0.5, 'rapd');
  return { testId: 'pupils', patient: sc.patient, findings: sc.findings, mode, difficulty: 0.5, rng: createRng(5), audio: nullAudio, fx: nullFx, reducedMotion, locale: 'en' };
}
const flush = (ms = 0) => new Promise((r) => setTimeout(r, ms));
/** Let preact effects (scheduled after paint) and a few real frames run. */
const settle = () => flush(220);
const click = (host: HTMLElement, text: RegExp) => {
  const b = [...host.querySelectorAll('button')].find((x) => text.test(x.textContent ?? ''));
  if (!b) throw new Error(`no button ${text}`);
  b.click();
};

beforeEach(() => {
  live.clear();
  rafs = new Set();
  observers = [];
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id: number = realRaf((t) => { rafs.delete(id); cb(t); });
    rafs.add(id);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { rafs.delete(id); realCancel(id); });
  vi.stubGlobal('ResizeObserver', class { rec = { disconnected: false }; constructor() { observers.push(this.rec); } observe() {} unobserve() {} disconnect() { this.rec.disconnected = true; } });
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, l: Listener, o?: unknown) {
    if (l) live.set(keyOf(this, type, l), 1);
    return origAdd.call(this, type, l, o as never);
  } as never;
  EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, l: Listener, o?: unknown) {
    if (l) live.delete(keyOf(this, type, l));
    return origRemove.call(this, type, l, o as never);
  } as never;
});
afterEach(() => {
  EventTarget.prototype.addEventListener = origAdd;
  EventTarget.prototype.removeEventListener = origRemove;
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('pupils mount / cleanup', () => {
  it('leaves no listeners, frames, observers or DOM behind after cleanup', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const done = vi.fn();
    const cleanup = pupils.mount(host, ctxFor('case'), done);
    await settle();
    expect(host.querySelector('.pu-root')).not.toBeNull();
    expect(rafs.size).toBeGreaterThan(0); // the exam loop is running
    expect(observers.length).toBeGreaterThan(0);
    click(host, /skip/i);
    await settle();
    cleanup();
    expect(host.innerHTML).toBe('');
    expect(host.classList.contains('pu-host')).toBe(false);
    expect(observers.every((o) => o.disconnected)).toBe(true);
    await settle(); // preact's own post-paint frames may still drain; the exam loop must not respawn
    expect(rafs.size).toBe(0);
    const survivors = [...live.keys()].filter((k) => {
      const id = k.split('|')[0];
      return [window, document, document.body, host].some((t) => String((t as { __id?: number }).__id) === id);
    });
    expect(survivors).toEqual([]);
    expect(done).not.toHaveBeenCalled();
  });

  it('cleanup is safe to call twice', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const cleanup = pupils.mount(host, ctxFor('case'), vi.fn());
    await settle();
    cleanup();
    expect(() => cleanup()).not.toThrow();
    await settle();
    expect(rafs.size).toBe(0);
  });

  it('calls done exactly once with a chart (case mode, no quiz)', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const results: MiniGameResult[] = [];
    const ctx = ctxFor('case');
    const cleanup = pupils.mount(host, ctx, (r) => results.push(r));
    await settle();
    click(host, /skip/i);
    await flush();
    click(host, /record findings/i);
    await flush();
    const finish = () => click(host, /^finish$/i);
    finish();
    finish();
    await flush();
    expect(results).toHaveLength(1);
    expect(results[0]!.testId).toBe('pupils');
    expect(results[0]!.accuracy).toBeGreaterThanOrEqual(0);
    expect(results[0]!.accuracy).toBeLessThanOrEqual(1);
    expect(results[0]!.findings).toEqual(pupils.report(ctx.findings, ctx.patient));
    expect(results[0]!.findings.some((l) => l.flag === 'critical')).toBe(true);
    cleanup();
  });

  it('practice mode asks a recognition question and blends it into accuracy', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const results: MiniGameResult[] = [];
    const cleanup = pupils.mount(host, ctxFor('practice'), (r) => results.push(r));
    await settle();
    click(host, /skip/i);
    await flush();
    click(host, /record findings/i);
    await flush();
    const fin = [...host.querySelectorAll('button')].find((x) => /^finish$/i.test(x.textContent ?? ''))!;
    expect(fin.disabled).toBe(true);
    (host.querySelectorAll('[role=radio].pu-quiz__opt')[0] as HTMLElement).click();
    await flush();
    click(host, /^finish$/i);
    expect(results).toHaveLength(1);
    expect(results[0]!.perfect).toBe(false); // nothing was measured
    cleanup();
  });

  it('reduced motion mounts and cleans up without errors', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const err = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cleanup = pupils.mount(host, { ...ctxFor('case', true), findings: buildFindings(30) }, vi.fn());
    await flush();
    await settle();
    cleanup();
    await settle();
    expect(err).not.toHaveBeenCalled();
    expect(rafs.size).toBe(0);
  });
});
