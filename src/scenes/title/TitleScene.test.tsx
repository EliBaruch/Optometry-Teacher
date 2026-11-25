import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices } from '@core';
import { ServicesProvider } from '@ui-kit';
import { TitleScene } from './TitleScene';

HTMLCanvasElement.prototype.getContext = (() => null) as never;

async function mount(onboarded: boolean) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const services = createServices();
  services.settings.update((s) => ({ ...s, onboarded }));
  const go = vi.spyOn(services.router, 'go').mockImplementation(() => undefined as never);
  await act(() => {
    render(<ServicesProvider services={services}><TitleScene services={services} params={{}} /></ServicesProvider>, host);
  });
  return { host, services, go };
}

describe('TitleScene flow', () => {
  afterEach(() => { vi.useRealTimers(); document.body.innerHTML = ''; });

  it('Enter opens once and routes to the hub exactly once for onboarded players', async () => {
    vi.useFakeTimers();
    const { go } = await mount(true);
    await act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' }));
    });
    expect(document.querySelector('[role="dialog"]')).toBeNull();
    await act(() => { vi.advanceTimersByTime(2000); });
    expect(go).toHaveBeenCalledTimes(1);
    expect(go.mock.calls[0]![0]).toBe('hub');
  });

  it('first-time players see the intro, and finishing sets onboarded then goes to the hub once', async () => {
    vi.useFakeTimers();
    const { services, go } = await mount(false);
    await act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    expect(document.querySelector('[role="dialog"]')).not.toBeNull();
    expect(go).not.toHaveBeenCalled();
    for (let i = 0; i < 5 && document.querySelector('.ttl-intro__next'); i++) {
      await act(() => { document.querySelector<HTMLButtonElement>('.ttl-intro__next')?.click(); });
    }
    await act(() => { vi.advanceTimersByTime(2000); });
    expect(services.settings.get().onboarded).toBe(true);
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('unlocks audio on start and ignores Enter while zooming', async () => {
    vi.useFakeTimers();
    const { services, go } = await mount(true);
    const unlock = vi.spyOn(services.audio, 'unlock');
    await act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    expect(unlock).toHaveBeenCalledTimes(1);
    expect(document.querySelector('.ttl.is-zoom')).not.toBeNull();
    await act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    expect(unlock).toHaveBeenCalledTimes(1);
    await act(() => { vi.advanceTimersByTime(3000); });
    expect(go).toHaveBeenCalledTimes(1);
  });

  it('ignores Enter while the credits modal is open', async () => {
    vi.useFakeTimers();
    const { go } = await mount(true);
    await act(() => { document.querySelectorAll<HTMLButtonElement>('.ttl-link')[1]!.click(); });
    await act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter' })); });
    await act(() => { vi.advanceTimersByTime(3000); });
    expect(go).not.toHaveBeenCalled();
  });
});
