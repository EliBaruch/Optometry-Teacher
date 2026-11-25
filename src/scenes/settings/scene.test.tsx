import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices, memoryStorage, type GameServices, type SceneProps } from '@core';
import { ServicesProvider } from '@ui-kit';
import settings from './index';

const Settings = settings.component as preact.FunctionComponent<SceneProps>;
const BANNED = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

let host: HTMLDivElement;
let services: GameServices;
beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  services = createServices({ storage: memoryStorage() });
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  vi.useRealTimers();
});
const mount = () => act(() => render(<ServicesProvider services={services}><Settings services={services} params={{}} /></ServicesProvider>, host));

describe('settings scene', () => {
  it('applies volume and comfort settings live', () => {
    mount();
    const music = host.querySelector<HTMLInputElement>('#vol-music')!;
    act(() => {
      music.value = '25';
      music.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(services.settings.get().musicVolume).toBe(0.25);
    act(() => host.querySelector<HTMLButtonElement>('#sw-motion')!.click());
    act(() => host.querySelector<HTMLButtonElement>('#sw-metric')!.click());
    act(() => host.querySelector<HTMLButtonElement>('#sw-contrast')!.click());
    expect(services.settings.get()).toMatchObject({ reducedMotion: true, metricVA: true, highContrast: true });
    expect(host.textContent).toContain('6/12');
  });

  it('mutes and restores a channel', () => {
    mount();
    const mute = host.querySelector<HTMLButtonElement>('button[aria-label="Mute Effects"]')!;
    act(() => mute.click());
    expect(services.settings.get().sfxVolume).toBe(0);
    act(() => host.querySelector<HTMLButtonElement>('button[aria-label="Unmute Effects"]')!.click());
    expect(services.settings.get().sfxVolume).toBe(0.9);
  });

  it('shows the disclaimer and opens the reset confirmation', () => {
    mount();
    const text = host.textContent ?? '';
    expect(text).toContain('not medical advice');
    expect(text).not.toMatch(BANNED);
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Reset progress'))!.click());
    expect(document.body.textContent).toContain('Erase all progress?');
    expect(document.body.textContent).toContain('Keep my progress');
  });

  it('exports a JSON save', () => {
    const create = vi.fn(() => 'blob:x');
    const revoke = vi.fn();
    Object.assign(URL, { createObjectURL: create, revokeObjectURL: revoke });
    services.settings.update((s) => ({ ...s, playerName: 'Ada' }));
    act(() => void vi.advanceTimersByTime(500));
    mount();
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Export save'))!.click());
    expect(create).toHaveBeenCalledTimes(1);
    act(() => void vi.advanceTimersByTime(2000));
    expect(revoke).toHaveBeenCalledWith('blob:x');
  });

  it('validates an imported file, confirms, then restores it', async () => {
    const donor = createServices({ storage: memoryStorage() });
    donor.save.slot('demo', { n: 0 }).set({ n: 7 });
    act(() => void vi.advanceTimersByTime(500));
    const raw = donor.save.exportAll();
    expect(raw).toContain('demo');
    const importAll = vi.spyOn(services.save, 'importAll');
    mount();
    const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File([raw], 'lumen-save.json', { type: 'application/json' })] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(document.body.textContent).toContain('Load this save?');
    expect(document.body.textContent).toContain('lumen-save.json');
    expect(importAll).not.toHaveBeenCalled();
    act(() => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes('Restore & reload'))!.click());
    expect(importAll).toHaveBeenCalledWith(expect.stringContaining('demo'));
    expect(services.save.exportAll()).toContain('demo');
    expect(document.body.textContent).toContain('Reopening the clinic');
  });

  it('rejects a file that is not a save, without touching progress', async () => {
    const importAll = vi.spyOn(services.save, 'importAll');
    mount();
    const input = host.querySelector<HTMLInputElement>('input[type=file]')!;
    Object.defineProperty(input, 'files', { configurable: true, value: [new File(['not json'], 'notes.txt')] });
    await act(async () => {
      input.dispatchEvent(new Event('change', { bubbles: true }));
      for (let i = 0; i < 5; i++) await Promise.resolve();
    });
    expect(host.querySelector('.settings-error')?.textContent?.length).toBeGreaterThan(0);
    expect(document.body.textContent).not.toContain('Load this save?');
    expect(importAll).not.toHaveBeenCalled();
  });

  it('erases progress only after a full press-and-hold, keeping settings by default', () => {
    services.save.slot('demo', { n: 0 }).set({ n: 3 });
    services.settings.update((s) => ({ ...s, playerName: 'Ada' }));
    act(() => void vi.advanceTimersByTime(500));
    mount();
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Reset progress'))!.click());
    const hold = document.querySelector<HTMLButtonElement>('.settings-hold')!;
    // A short press is cancelled.
    act(() => void hold.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    act(() => void vi.advanceTimersByTime(500));
    act(() => void hold.dispatchEvent(new KeyboardEvent('keyup', { key: 'Enter', bubbles: true })));
    expect(services.save.exportAll()).toContain('demo');
    // Holding through the full duration confirms.
    act(() => void hold.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    act(() => void vi.advanceTimersByTime(1500));
    expect(services.save.exportAll()).not.toContain('demo');
    expect(services.settings.get().playerName).toBe('Ada');
    expect(services.save.exportAll()).toContain('Ada');
    expect(document.body.textContent).toContain('Reopening the clinic');
  });
});
