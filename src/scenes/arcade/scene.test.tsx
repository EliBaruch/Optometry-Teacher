import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { buildFindings, createServices, type GameServices, type MiniGameDone, type MiniGameModule, type SceneProps } from '@core';
import { ServicesProvider } from '@ui-kit';
import arcade from './index';

const Arcade = arcade.component as preact.FunctionComponent<SceneProps>;
const BANNED = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

let host: HTMLDivElement;
let services: GameServices;
let finish: MiniGameDone | null;
const calls = { mount: 0, cleanup: 0, practice: [] as number[] };

const fake: MiniGameModule = {
  id: 'tonometry', title: 'Tonometry', instructions: 'Align the mires.', icon: 'tonometry', teaches: ['GAT reads in mmHg'],
  mount(hostEl, ctx, done) {
    calls.mount++;
    expect(ctx.mode).toBe('practice');
    finish = done;
    hostEl.textContent = 'instrument';
    return () => void calls.cleanup++;
  },
  report: () => [],
  practice(_rng, difficulty) {
    calls.practice.push(difficulty);
    return { patient: { name: 'P', age: 60, sex: 'F', avatar: { skin: 1, hair: 'bob', hairColor: '#333', irisColor: '#456', outfit: '#222' } }, findings: buildFindings(60), answer: 'IOP 28 mmHg OD' };
  },
};

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  services = createServices();
  services.registries.minigames.register(fake);
  finish = null;
  calls.mount = calls.cleanup = 0;
  calls.practice = [];
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  vi.useRealTimers();
});

const mount = (params: Record<string, unknown> = {}) =>
  act(() => render(<ServicesProvider services={services}><Arcade services={services} params={params} /></ServicesProvider>, host));
const button = (text: string) => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes(text));

describe('arcade scene', () => {
  it('lists practicable instruments and placeholders for the rest', () => {
    mount();
    const text = host.textContent ?? '';
    expect(text).toContain('Tonometry');
    expect(text).toContain('Being calibrated');
    expect(text).toContain('1 instrument');
    expect(text).not.toMatch(BANNED);
  });

  it('plays a practice run, records the best score, emits practice:completed and goes again', () => {
    const seen: unknown[] = [];
    services.bus.on('practice:completed', (p) => void seen.push(p));
    mount();
    act(() => host.querySelector<HTMLButtonElement>('.arcade-card')!.click());
    expect(calls.mount).toBe(1);
    expect(calls.practice).toEqual([0.55]);
    act(() => finish!({ testId: 'tonometry', accuracy: 0.9, timeMs: 12000, findings: [{ label: 'IOP', value: '28 mmHg', eye: 'OD', flag: 'abnormal' }] }));
    act(() => void vi.advanceTimersByTime(2000));
    expect(seen).toHaveLength(1);
    const save = services.save.slot<{ games: Record<string, { best: number; plays: number }> }>('scene:arcade', { games: {} }).get();
    expect(save.games.tonometry).toMatchObject({ plays: 1, best: 1350 });
    expect(host.textContent).toContain('IOP 28 mmHg OD');
    // a second done() from the same run is ignored
    act(() => finish!({ testId: 'tonometry', accuracy: 0.1, timeMs: 1, findings: [] }));
    expect(seen).toHaveLength(1);
    act(() => button('Again')!.click());
    expect(calls.cleanup).toBe(1);
    expect(calls.mount).toBe(2);
  });

  it('opens straight into a game from params and cleans up on unmount', () => {
    mount({ testId: 'tonometry' });
    expect(calls.mount).toBe(1);
    act(() => render(null, host));
    expect(calls.cleanup).toBe(1);
  });

  it('remembers the chosen difficulty', () => {
    mount();
    act(() => button('Expert')!.click());
    act(() => host.querySelector<HTMLButtonElement>('.arcade-card')!.click());
    expect(calls.practice).toEqual([0.9]);
  });

  it('never shows a stale verdict over a newly opened instrument', () => {
    mount();
    act(() => host.querySelector<HTMLButtonElement>('.arcade-card')!.click());
    act(() => finish!({ testId: 'tonometry', accuracy: 0.9, timeMs: 1000, findings: [] }));
    // close and reopen before the 650 ms reveal fires
    act(() => document.querySelector<HTMLButtonElement>('.lm-modal__close')!.click());
    act(() => void vi.advanceTimersByTime(100));
    act(() => host.querySelector<HTMLButtonElement>('.arcade-card')!.click());
    act(() => void vi.advanceTimersByTime(2000));
    expect(document.querySelector('.arcade-result')).toBeNull();
  });

  it('acknowledges a first attempt even when it scores nothing', () => {
    mount();
    act(() => host.querySelector<HTMLButtonElement>('.arcade-card')!.click());
    act(() => finish!({ testId: 'tonometry', accuracy: 0, timeMs: 1000, findings: [] }));
    act(() => void vi.advanceTimersByTime(2000));
    expect(document.body.textContent).toContain('First attempt logged');
  });
});

