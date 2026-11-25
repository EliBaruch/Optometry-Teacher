import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFindings, createRng, type MiniGameContext, type MiniGameResult } from '@core';
import phoropter from './index';
import { report } from './report';

function ctx(mode: 'case' | 'practice'): MiniGameContext {
  const patient = { name: 'Test Patient', age: 34, sex: 'F' as const, occupation: 'x', avatar: { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#345' } };
  return {
    testId: 'phoropter',
    patient: patient as unknown as MiniGameContext['patient'],
    findings: buildFindings(34),
    mode, difficulty: 0.5, rng: createRng('phoropter-mount'),
    audio: { play: vi.fn() } as unknown as MiniGameContext['audio'],
    fx: { burst: vi.fn(), shake: vi.fn(), floatText: vi.fn() } as unknown as MiniGameContext['fx'],
    reducedMotion: true, locale: 'en',
  };
}

const click = (el: Element | null | undefined) => (el as HTMLElement).click();
const byText = (host: HTMLElement, sel: string, text: string) => [...host.querySelectorAll<HTMLElement>(sel)].find((e) => e.textContent?.includes(text));
const flush = async (ms = 50) => { await vi.advanceTimersByTimeAsync(ms); };

/** happy-dom has no 2D canvas: give the chart painter an inert context. */
function fakeContext(): CanvasRenderingContext2D {
  const store: Record<string, unknown> = {};
  return new Proxy(store, {
    get: (t, k: string) => (k in t ? t[k] : k === 'createRadialGradient' || k === 'createLinearGradient' ? () => ({ addColorStop() {} }) : () => undefined),
    set: (t, k: string, v) => { t[k] = v; return true; },
  }) as unknown as CanvasRenderingContext2D;
}

describe('phoropter mount / done() flow', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    localStorage.clear();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((() => fakeContext()) as never);
  });
  afterEach(() => { vi.restoreAllMocks(); vi.useRealTimers(); document.body.innerHTML = ''; });

  async function boot(mode: 'case' | 'practice') {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const done = vi.fn<(r: MiniGameResult) => void>();
    const c = ctx(mode);
    const winAdd = vi.spyOn(window, 'addEventListener');
    const winRem = vi.spyOn(window, 'removeEventListener');
    const docAdd = vi.spyOn(document, 'addEventListener');
    const docRem = vi.spyOn(document, 'removeEventListener');
    const cleanup = phoropter.mount(host, c, done);
    await flush();
    // first-time tutorial is skippable
    const skip = byText(host, 'button', 'Skip');
    if (skip) click(skip); // the in-session flag keeps it from reappearing in later tests
    await flush();
    expect(host.querySelector('.php-tut')).toBeNull();
    return { host, done, c, cleanup, leaks: () => winAdd.mock.calls.length - winRem.mock.calls.length + docAdd.mock.calls.length - docRem.mock.calls.length };
  }

  it('case mode: Record skips any recognition check and calls done() exactly once with report() findings', async () => {
    const { host, done, c, cleanup, leaks } = await boot('case');
    expect(host.querySelector('.php-challenge')).toBeNull();
    click(byText(host, 'button', 'Record'));
    await flush();
    expect(done).toHaveBeenCalledTimes(1);
    const r = done.mock.calls[0]![0];
    expect(r.testId).toBe('phoropter');
    expect(r.findings).toEqual(report(c.findings, c.patient));
    expect(r.accuracy).toBeGreaterThanOrEqual(0);
    expect(r.accuracy).toBeLessThanOrEqual(1);
    expect(host.querySelector('.php-challenge')).toBeNull();
    // a second press of Record (or any later interaction) cannot call done() again
    click(byText(host, 'button', 'Record'));
    await flush(2000);
    expect(done).toHaveBeenCalledTimes(1);
    cleanup();
    expect(host.children.length).toBe(0);
    expect(host.classList.contains('php-host')).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
    expect(leaks()).toBeLessThanOrEqual(0);
  });

  it('practice mode: shows the technique debrief first, then the recognition check, then done() once', async () => {
    const { host, done, cleanup } = await boot('practice');
    click(byText(host, 'button', 'Record'));
    await flush();
    expect(done).not.toHaveBeenCalled();
    // technique debrief comes first
    expect(host.querySelector('.php-result')).toBeTruthy();
    expect(host.querySelector('.php-challenge')).toBeNull();
    click(byText(host, 'button', 'Recognition check'));
    await flush();
    expect(host.querySelector('.php-challenge')).toBeTruthy();
    expect(done).not.toHaveBeenCalled();
    click(host.querySelector('.php-opt'));
    await flush();
    expect(host.querySelector('.php-challenge__explain')).toBeTruthy();
    click(byText(host, 'button', 'Finish'));
    await flush();
    expect(done).toHaveBeenCalledTimes(1);
    const r = done.mock.calls[0]![0];
    expect(r.accuracy).toBeGreaterThanOrEqual(0);
    expect(r.accuracy).toBeLessThanOrEqual(1);
    expect(Array.isArray(r.findings)).toBe(true);
    click(byText(host, 'button', 'Finish'));
    await flush();
    expect(done).toHaveBeenCalledTimes(1);
    cleanup();
    expect(host.children.length).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('cleanup mid-question leaves no pending timers or DOM', async () => {
    const { host, cleanup, done } = await boot('case');
    click(byText(host, 'button', 'One or two?'));
    await flush(5);
    cleanup();
    expect(host.children.length).toBe(0);
    expect(vi.getTimerCount()).toBe(0);
    await flush(3000);
    expect(done).not.toHaveBeenCalled();
  });
});
