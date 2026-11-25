import { afterEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices } from '@core';
import { ServicesProvider } from '@ui-kit';
import { Intro } from './Intro';
import { INTRO_CARDS } from './logic';

describe('Intro flow', () => {
  let host: HTMLElement | null = null;
  afterEach(() => {
    if (host) render(null, host);
    host?.remove();
    host = null;
  });

  it('finishes exactly once, however many Esc / Begin events arrive', async () => {
    host = document.createElement('div');
    document.body.appendChild(host);
    const onDone = vi.fn();
    const services = createServices();
    await act(() => {
      render(<ServicesProvider services={services}><Intro onDone={onDone} /></ServicesProvider>, host!);
    });
    const next = () => host!.querySelector<HTMLButtonElement>('.ttl-intro__next')!;
    for (let i = 0; i < INTRO_CARDS.length - 1; i++) {
      await act(() => { next().click(); });
      expect(onDone).not.toHaveBeenCalled();
    }
    expect(next().textContent).toBe('Begin');
    await act(() => {
      next().click();
      next().click();
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    });
    expect(onDone).toHaveBeenCalledTimes(1);
    expect(host.querySelector('[role="dialog"]')?.getAttribute('aria-modal')).toBe('true');
  });
});
