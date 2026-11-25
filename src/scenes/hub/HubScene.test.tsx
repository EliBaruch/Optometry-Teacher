import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices, type GameServices, type ModeModule, type SceneProps } from '@core';
import { ServicesProvider } from '@ui-kit';
import hub from './index';

const Hub = hub.component as preact.FunctionComponent<SceneProps>;
const BANNED = new RegExp('\\b(' + ['si' + 'ns?', 'dead' + 'ly', 'vi' + 'ce', 'pr' + 'ide', 'gr' + 'eed', 'en' + 'vy', 'glut' + 'tony', 'lu' + 'st', 'wra' + 'th', 'slo' + 'th'].join('|') + ')\\b', 'i');

const mode = (id: string, order: number, locked?: string): ModeModule => ({
  id, title: `Mode ${id}`, tagline: `Tag ${id}`, icon: 'star', accent: '#ffd27a', order, rules: { length: 3 },
  pickNext: () => null, locked: locked ? () => locked : undefined,
});

let host: HTMLDivElement;
let services: GameServices;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  services = createServices();
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  vi.useRealTimers();
});

const mount = () => act(() => render(<ServicesProvider services={services}><Hub services={services} params={{}} /></ServicesProvider>, host));
const names = () => [...host.querySelectorAll('.hub-mode__title')].map((n) => n.textContent);

describe('hub scene', () => {
  it('shows an empty state without modes and still renders', () => {
    mount();
    expect(host.querySelector('.hub-empty')).not.toBeNull();
    expect(host.querySelector('.hub-wings-wrap')).toBeNull();
    expect(host.textContent).not.toMatch(BANNED);
  });

  it('sorts modes, locks gated ones and never starts them', () => {
    services.registries.modes.register(mode('b', 2));
    services.registries.modes.register(mode('a', 1));
    services.registries.modes.register(mode('z', 3, 'See 3 more patients'));
    const start = vi.spyOn(services.run, 'start');
    mount();
    expect(names()).toEqual(['Mode a', 'Mode b']);
    const locked = host.querySelector<HTMLElement>('.hub-soon')!;
    expect(locked.getAttribute('aria-disabled')).toBe('true');
    act(() => locked.click());
    vi.advanceTimersByTime(2000);
    expect(start).not.toHaveBeenCalled();
    expect(host.querySelector('.hub-soon-note')!.textContent).toContain('See 3 more patients');
  });

  it('guards double activation: one beginRun after the door delay, and Escape cancels', () => {
    services.registries.modes.register(mode('a', 1));
    const start = vi.spyOn(services.run, 'start');
    mount();
    const card = host.querySelector<HTMLElement>('.hub-mode')!;
    act(() => { card.click(); card.click(); });
    expect(host.querySelector('.hub-door')).not.toBeNull();
    act(() => { window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })); });
    expect(host.querySelector('.hub-door')).toBeNull();
    vi.advanceTimersByTime(2000);
    expect(start).not.toHaveBeenCalled();
    act(() => card.click());
    vi.advanceTimersByTime(1000);
    expect(start).toHaveBeenCalledTimes(1);
  });

  it('shows core wings only when their scene is registered', () => {
    mount();
    expect(host.querySelector('.hub-wing')).toBeNull();
    act(() => services.registries.scenes.register({ id: 'codex', component: () => null }));
    expect(host.querySelector('.hub-wing')?.textContent).toContain('Codex');
    expect(host.querySelector('.hub-wing')?.getAttribute('aria-label')).not.toMatch(BANNED);
  });
});
