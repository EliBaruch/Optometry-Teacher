import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createRng, nullAudio, nullFx, type MiniGameContext, type MiniGameResult } from '@core';
import { practiceScenario } from './practice';
import ophthalmoscopy from './index';

type Listener = EventListenerOrEventListenerObject;
const live = new Map<string, number>();
const idOf = (o: unknown, k: '__id' | '__lid') => {
  const t = o as Record<string, number>;
  return t[k] ?? (t[k] = Math.random());
};
let rafs: Set<number>;
const realRaf = globalThis.requestAnimationFrame.bind(globalThis);
const realCancel = globalThis.cancelAnimationFrame.bind(globalThis);
const origAdd = EventTarget.prototype.addEventListener;
const origRemove = EventTarget.prototype.removeEventListener;
const origGetContext = HTMLCanvasElement.prototype.getContext;

/** A permissive 2D context: every method is a no-op, gradients accept colour stops, pixel reads return blank data. */
function fakeCtx(): unknown {
  const store: Record<string, unknown> = {};
  const grad = { addColorStop() {} };
  return new Proxy(store, {
    get(t, k: string) {
      if (k in t) return t[k];
      if (k === 'createImageData' || k === 'getImageData') return (w: number, h: number) => ({ width: w, height: h, data: new Uint8ClampedArray(Math.max(1, w * h * 4)) });
      if (k.startsWith('create')) return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      if (k === 'canvas') return document.createElement('canvas');
      return () => undefined;
    },
    set(t, k: string, v) {
      t[k] = v;
      return true;
    },
  });
}

function ctxFor(mode: 'case' | 'practice'): MiniGameContext {
  const sc = practiceScenario(createRng(11), 0.4);
  return { testId: 'ophthalmoscopy', patient: sc.patient, findings: sc.findings, mode, difficulty: 0.4, rng: createRng(5), audio: nullAudio, fx: nullFx, reducedMotion: true };
}
const flush = (ms = 0) => new Promise((r) => setTimeout(r, ms));
const click = (host: HTMLElement, sel: string) => {
  const b = host.querySelector<HTMLElement>(sel);
  if (!b) throw new Error(`nothing matches ${sel}`);
  b.click();
};

beforeEach(() => {
  live.clear();
  rafs = new Set();
  try { localStorage.clear(); } catch { /* ignore */ }
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => {
    const id: number = realRaf((t) => { rafs.delete(id); cb(t); });
    rafs.add(id);
    return id;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => { rafs.delete(id); realCancel(id); });
  vi.stubGlobal('ResizeObserver', class { observe() {} unobserve() {} disconnect() {} });
  HTMLCanvasElement.prototype.getContext = (() => fakeCtx()) as never;
  EventTarget.prototype.addEventListener = function (this: EventTarget, type: string, l: Listener, o?: unknown) {
    if (l) live.set(`${idOf(this, '__id')}|${type}|${idOf(l, '__lid')}`, 1);
    return origAdd.call(this, type, l, o as never);
  } as never;
  EventTarget.prototype.removeEventListener = function (this: EventTarget, type: string, l: Listener, o?: unknown) {
    if (l) live.delete(`${idOf(this, '__id')}|${type}|${idOf(l, '__lid')}`);
    return origRemove.call(this, type, l, o as never);
  } as never;
});
afterEach(() => {
  EventTarget.prototype.addEventListener = origAdd;
  EventTarget.prototype.removeEventListener = origRemove;
  HTMLCanvasElement.prototype.getContext = origGetContext;
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

describe('ophthalmoscopy mount / cleanup', () => {
  it('shows the tutorial, then the red-reflex step, and leaves nothing behind after cleanup', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const done = vi.fn();
    const cleanup = ophthalmoscopy.mount(host, ctxFor('case'), done);
    await flush(60);
    expect(host.querySelector('.oph')).not.toBeNull();
    expect(host.querySelector('.oph-tutorial')).not.toBeNull();
    click(host, '[data-testid="oph-tutorial-skip"]');
    await flush(40);
    expect(host.querySelector('.oph-tutorial')).toBeNull();
    expect(host.querySelector('[data-testid="oph-light"]')).not.toBeNull();
    // Record is not offered until the exam is under way
    expect(host.querySelector('[data-testid="oph-record"]')).toBeNull();
    cleanup();
    await flush(40);
    expect(host.querySelector('.oph-host')).toBeNull();
    expect(host.childElementCount).toBe(0);
    expect(done).not.toHaveBeenCalled();
    expect(live.size).toBe(0);
    expect(rafs.size).toBe(0);
  });

  it('the exam offers the lens wheel and a disabled Record button with a reason, and cleanup is idempotent', async () => {
    const host = document.createElement('div');
    document.body.append(host);
    const results: MiniGameResult[] = [];
    const cleanup = ophthalmoscopy.mount(host, ctxFor('case'), (r) => results.push(r));
    await flush(60);
    click(host, '[data-testid="oph-tutorial-skip"]');
    await flush(40);
    click(host, '[data-testid="oph-light"]');
    await flush(40);
    for (const e of ['OD', 'OS']) click(host, `[data-testid^="oph-reflex-${e}-"]`);
    await flush(20);
    click(host, '[data-testid="oph-reflex-continue"]');
    await flush(120);
    const rec = host.querySelector<HTMLButtonElement>('[data-testid="oph-record"]');
    expect(rec).not.toBeNull();
    expect(rec!.disabled).toBe(true);
    expect(host.querySelector('#oph-need')).not.toBeNull();
    expect(host.querySelector('[data-testid="oph-dial"]')).not.toBeNull();
    expect(results).toHaveLength(0);
    cleanup();
    cleanup();
    await flush(40);
    expect(host.childElementCount).toBe(0);
    expect(live.size).toBe(0);
    expect(rafs.size).toBe(0);
    expect(results).toHaveLength(0);
  });
});
