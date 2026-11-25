/**
 * The welcome-back note has several possible hosts (lounge scene, hub banner,
 * a global top-bar widget). Exactly one may render it, and the global host
 * never interrupts a run in progress.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices, type GameServices, type ModeModule } from '@core';
import { ServicesProvider } from '@ui-kit';
import comfort, { comfortOf } from '../index';
import { leaseHolder } from './hooks';
import { WelcomeBack, type WelcomeHost } from './WelcomeBack';

let host: HTMLElement;
let services: GameServices;
let off: () => void;

const MODE: ModeModule = {
  id: 'shift', title: 'Shift', tagline: '', icon: '', accent: '#fff', order: 1, rules: { length: 3 }, pickNext: () => null,
};

function Hosts(props: { hosts: WelcomeHost[] }) {
  return (
    <ServicesProvider services={services}>
      {props.hosts.map((h) => (
        <WelcomeBack key={h} services={services} host={h} />
      ))}
    </ServicesProvider>
  );
}

const show = (hosts: WelcomeHost[]) => act(() => render(<Hosts hosts={hosts} />, host));
const dialogs = () => host.querySelectorAll('.cf-welcome [role="dialog"]').length;

beforeEach(() => {
  services = createServices({ now: () => new Date(2026, 10, 24, 20).getTime() });
  off = comfort.install(services);
  comfortOf(services)!.state.update((s) => ({
    ...s,
    jar: 30,
    welcome: { awayMs: 5 * 3_600_000, coins: 30, comebackCoins: 0, at: services.clock.now() },
  }));
  host = document.createElement('div');
  document.body.appendChild(host);
});

afterEach(() => {
  act(() => render(null, host));
  host.remove();
  off();
});

describe('leaseHolder', () => {
  it('prefers the highest priority, then the oldest lease', () => {
    expect(leaseHolder([])).toBeNull();
    expect(leaseHolder([{ id: 1, priority: 0 }, { id: 2, priority: 1 }, { id: 3, priority: 1 }])).toBe(2);
    expect(leaseHolder([{ id: 4, priority: 0 }, { id: 5, priority: 0 }])).toBe(4);
  });
});

describe('WelcomeBack hosting', () => {
  it('renders exactly one note when several hosts are mounted', () => {
    show(['global', 'banner', 'scene']);
    expect(dialogs()).toBe(1);
  });

  it('the global host takes over when the banner goes away', () => {
    show(['global', 'banner']);
    expect(dialogs()).toBe(1);
    show(['global']);
    expect(dialogs()).toBe(1);
  });

  it('the global host waits for a run to finish', () => {
    act(() => services.run.start(MODE, 'seed'));
    show(['global']);
    expect(dialogs()).toBe(0);
    act(() => {
      services.run.end();
    });
    expect(dialogs()).toBe(1);
  });

  it('shows nothing once the note is dismissed', () => {
    show(['global']);
    expect(dialogs()).toBe(1);
    act(() => comfortOf(services)!.dismissWelcome());
    // Modal plays its exit, then unmounts
    expect(comfortOf(services)!.state.get().welcome).toBeNull();
  });
});
