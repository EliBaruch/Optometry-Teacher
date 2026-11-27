import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices, type GameServices, type SceneProps } from '@core';
import { ServicesProvider } from '@ui-kit';
import profile from './index';

const Profile = profile.component as preact.FunctionComponent<SceneProps>;
const BANNED = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

let host: HTMLDivElement;
let services: GameServices;
beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  services = createServices();
  services.learning = { ...services.learning, stats: () => ({ seen: 3, mastered: 1, due: 2 }), seen: () => true, mastery: () => 0.5 };
  services.registries.diagnoses.register({ id: 'myopia', name: 'Myopia', category: 'refractive', summary: '', keyFindings: [], typicalUrgency: 'routine', pearls: [], rarity: 'common' });
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  vi.useRealTimers();
});
const mount = () => act(() => render(<ServicesProvider services={services}><Profile services={services} params={{}} /></ServicesProvider>, host));

describe('profile scene', () => {
  it('shows the player, learning stats and collapses an empty profile slot', () => {
    mount();
    act(() => void vi.advanceTimersByTime(3000));
    const text = host.textContent ?? '';
    expect(text).toContain('Add your name');
    expect(text).not.toMatch(/\bDoctor\b/);
    expect(text).toContain('Encountered');
    expect(text).toContain('Due for review');
    expect(text).toContain('Refraction');
    expect(host.querySelector('.profile-record')).toBeNull();
    expect(text).not.toMatch(BANNED);
  });

  it('renders engagement sections registered for the profile slot', () => {
    services.registries.hud.register({ id: 'x:profile', slot: 'profile', order: 1, component: () => <section>Rank card</section> });
    mount();
    expect(host.querySelector('.profile-record')?.textContent).toContain('Rank card');
  });

  it('renames the player through settings, sanitised', () => {
    mount();
    act(() => [...host.querySelectorAll('button')].find((b) => b.textContent === 'Add name')!.click());
    const input = host.querySelector<HTMLInputElement>('#profile-name-input')!;
    act(() => {
      input.value = '  Dr   <Ada>  Lovelace ';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    act(() => void input.form!.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
    expect(services.settings.get().playerName).toBe('Dr Ada Lovelace');
  });
});
