import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { buildFindings, createRng, nullAudio, nullFx, type MiniGameContext, type MiniGameResult } from '@core';
import { makeScenario } from './practice';
import retinoscopy from './index';

const flush = (ms = 0) => new Promise((r) => setTimeout(r, ms));
let rafs: Set<number>;
let observers: { disconnected: boolean }[];
const realRaf = globalThis.requestAnimationFrame?.bind(globalThis) ?? ((cb: FrameRequestCallback) => setTimeout(() => cb(performance.now()), 16) as unknown as number);
const realCancel = globalThis.cancelAnimationFrame?.bind(globalThis) ?? ((id: number) => clearTimeout(id));

function ctxFor(mode: 'case' | 'practice', reducedMotion = false): MiniGameContext {
  const sc = makeScenario(createRng(3), 0.5);
  return { testId: 'retinoscopy', patient: sc.patient, findings: sc.findings, mode, difficulty: 0.5, rng: createRng(5), audio: nullAudio, fx: nullFx, reducedMotion, locale: 'en' };
}
const click = (host: HTMLElement, text: RegExp) => {
  const b = [...host.querySelectorAll('button')].find((x) => text.test(x.textContent ?? ''));
  if (!b) throw new Error(`no button ${text}`);
  b.click();
};

beforeEach(() => {
  rafs = new Set();
  observers = [];
  try { localStorage.setItem('lumen.retinoscopy.tutorial.v1', '1'); } catch { /* ignore */ }
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id: number = realRaf((t) => { rafs.delete(id); cb(t); });
    rafs.add(id);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { rafs.delete(id); realCancel(id); });
  vi.stubGlobal('ResizeObserver', class { rec = { disconnected: false }; constructor() { observers.push(this.rec); } observe() {} unobserve() {} disconnect() { this.rec.disconnected = true; } });
  // jsdom has no canvas: give the painter a null context (it must cope)
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('retinoscopy mount / cleanup', () => {
  it('mounts, shows the instrument, and unmounts leaving nothing running', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const errors = vi.spyOn(console, 'error');
    const cleanup = retinoscopy.mount(host, ctxFor('practice'), () => {});
    await flush(80);
    expect(host.querySelector('.rt-root')).toBeTruthy();
    expect(host.querySelector('[role="slider"][aria-label="Trial lens power"]')).toBeTruthy();
    expect(host.querySelectorAll('.rt-seg__b')).toHaveLength(2);
    cleanup();
    await flush(30);
    expect(host.innerHTML).toBe('');
    expect(host.classList.contains('rt-host')).toBe(false);
    expect(rafs.size).toBe(0);
    expect(observers.every((o) => o.disconnected)).toBe(true);
    expect(errors).not.toHaveBeenCalled();
  });

  it('case mode: records the true chart and calls done exactly once', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const findings = buildFindings(30, { refraction: { OD: { sphere: -1.5, cylinder: -0.5, axis: 90 } } });
    const results: MiniGameResult[] = [];
    const ctx = { ...ctxFor('case'), findings };
    const cleanup = retinoscopy.mount(host, ctx, (r) => results.push(r));
    await flush(80);
    // measure OD the quick way: claim no reflex (a legal, if wrong, endpoint) then record
    click(host, /^No reflex$/);
    await flush(40);
    click(host, /Confirm: no reflex/);
    await flush(30);
    click(host, /Record findings/);
    await flush(60);
    click(host, /^Done$/);
    click(host, /^Done$/);
    await flush(30);
    expect(results).toHaveLength(1);
    expect(results[0]!.testId).toBe('retinoscopy');
    expect(results[0]!.findings.find((x) => x.label === 'Ret' && x.eye === 'OD')!.value).toBe('−1.50 −0.50 × 090');
    expect(results[0]!.accuracy).toBeLessThan(0.4);
    cleanup();
  });

  it('respects reduced motion (no auto-sweep) and unmounts cleanly', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const cleanup = retinoscopy.mount(host, ctxFor('practice', true), () => {});
    await flush(60);
    expect(host.querySelector('.rt-toggle[aria-pressed="true"]')).toBeNull();
    cleanup();
    await flush(120);
    expect(rafs.size).toBe(0);
  });
});
