import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { createServices, type AudioPort, type GameServices } from '@core';
import { ServicesProvider } from '../context';
import { Button } from './Button';
import { Modal } from './Modal';
import { ToastHost } from './ToastHost';
import { Tabs } from './Tabs';
import { Stars } from './Stars';
import { GradeStamp } from './GradeStamp';
import { RewardChip } from './RewardChip';
import { SpeechBubble } from './SpeechBubble';
import { CountUp } from './CountUp';
import { useSfx } from '../hooks/useSfx';

let host: HTMLDivElement;
let services: GameServices;
let played: string[];

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  played = [];
  const audio: AudioPort = { play: (id) => void played.push(id), music() {}, unlock() {}, setVolumes() {} };
  services = createServices({ audio });
});
afterEach(() => {
  render(null, host);
  host.remove();
  vi.useRealTimers();
});

const mount = (ui: preact.ComponentChildren) => act(() => render(<ServicesProvider services={services}>{ui}</ServicesProvider>, host));

describe('Button', () => {
  it('plays its sound and calls onClick', () => {
    const onClick = vi.fn();
    mount(<Button onClick={onClick}>Go</Button>);
    act(() => host.querySelector('button')!.click());
    expect(onClick).toHaveBeenCalledOnce();
    expect(played).toContain('click');
  });
  it('ignores clicks while loading and marks itself busy', () => {
    const onClick = vi.fn();
    mount(<Button loading onClick={onClick}>Go</Button>);
    const b = host.querySelector('button')!;
    act(() => b.click());
    expect(onClick).not.toHaveBeenCalled();
    expect(b.getAttribute('aria-busy')).toBe('true');
  });
});

describe('useSfx outside a provider', () => {
  it('is a silent no-op', () => {
    let play: ReturnType<typeof useSfx> | null = null;
    const Probe = () => {
      play = useSfx();
      return null;
    };
    act(() => render(<Probe />, host));
    expect(() => play!('click')).not.toThrow();
  });
});

describe('Modal', () => {
  it('renders a labelled dialog, closes on Escape, and unmounts after the exit animation', () => {
    const onClose = vi.fn();
    mount(<Modal open title="Hello" onClose={onClose}><button>inside</button></Modal>);
    const dialog = host.querySelector('[role="dialog"]')!;
    expect(dialog.getAttribute('aria-modal')).toBe('true');
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)!.textContent).toBe('Hello');
    act(() => {
      dialog.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).toHaveBeenCalledOnce();
    mount(<Modal open={false} title="Hello" onClose={onClose}>x</Modal>);
    expect(host.querySelector('.lm-modal.is-closing')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(400); });
    expect(host.querySelector('[role="dialog"]')).toBeNull();
  });
  it('does not close on Escape when not dismissible', () => {
    const onClose = vi.fn();
    mount(<Modal open dismissible={false} ariaLabel="Stage" onClose={onClose}>x</Modal>);
    act(() => {
      host.querySelector('[role="dialog"]')!.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    });
    expect(onClose).not.toHaveBeenCalled();
  });
});

describe('ToastHost', () => {
  it('shows toasts from the bus and auto-dismisses them', () => {
    mount(<ToastHost duration={1000} />);
    act(() => services.bus.emit('toast', { message: 'Saved', tone: 'good' }));
    expect(host.textContent).toContain('Saved');
    expect(played).toContain('success');
    act(() => { vi.advanceTimersByTime(1000 + 400); });
    expect(host.textContent).not.toContain('Saved');
  });
  it('caps the stack and unsubscribes on unmount', () => {
    mount(<ToastHost max={2} />);
    act(() => {
      for (const m of ['a1', 'b2', 'c3']) services.bus.emit('toast', { message: m });
    });
    expect(host.querySelectorAll('.lm-toast')).toHaveLength(2);
    expect(host.textContent).not.toContain('a1');
    act(() => render(null, host));
    expect(() => services.bus.emit('toast', { message: 'late' })).not.toThrow();
  });
});

describe('Tabs', () => {
  it('selects with arrow keys and skips disabled tabs', () => {
    const onChange = vi.fn();
    mount(
      <Tabs id="t" value="a" onChange={onChange} items={[{ id: 'a', label: 'A' }, { id: 'b', label: 'B', disabled: true }, { id: 'c', label: 'C' }]} />,
    );
    const list = host.querySelector('[role="tablist"]')!;
    act(() => {
      list.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true }));
    });
    expect(onChange).toHaveBeenCalledWith('c');
    const tabs = host.querySelectorAll('[role="tab"]');
    expect(tabs[0]!.getAttribute('aria-selected')).toBe('true');
    expect(tabs[0]!.getAttribute('tabindex')).toBe('0');
    expect(tabs[2]!.getAttribute('tabindex')).toBe('-1');
  });
});

describe('display components', () => {
  it('Stars clamps the value and labels itself', () => {
    mount(<Stars value={7} animate={false} />);
    expect(host.querySelector('[role="img"]')!.getAttribute('aria-label')).toBe('3 of 3 stars');
    expect(host.querySelectorAll('.lm-star.is-on')).toHaveLength(3);
  });
  it('GradeStamp stamps (sound) at impact', () => {
    const onImpact = vi.fn();
    mount(<GradeStamp grade="S" onImpact={onImpact} />);
    expect(host.querySelector('[aria-label^="Grade S"]')).not.toBeNull();
    act(() => { vi.advanceTimersByTime(400); });
    expect(onImpact).toHaveBeenCalledOnce();
    expect(played).toContain('stamp');
  });
  it('RewardChip shows the grant and its rarity', () => {
    mount(<RewardChip grant={{ source: 'core', label: 'Supply crate', value: '+1', rarity: 'epic', icon: 'crate' }} sfx={false} />);
    expect(host.querySelector('.lm-reward--epic')).not.toBeNull();
    expect(host.querySelector('[role="group"]')!.getAttribute('aria-label')).toBe('Supply crate: +1 (Epic)');
  });
  it('SpeechBubble exposes the full line to screen readers and skips on click', () => {
    const onDone = vi.fn();
    mount(<SpeechBubble text="It is blurry at night." onDone={onDone} voice={false} />);
    expect(host.querySelector('.lm-sr-only')!.textContent).toBe('It is blurry at night.');
    act(() => (host.querySelector('.lm-speech') as HTMLElement).click());
    expect(host.querySelector('.lm-speech__ghost')!.textContent).toBe('');
    expect(onDone).toHaveBeenCalled();
  });
  it('CountUp announces the final value', () => {
    mount(<CountUp value={1234} prefix="+" />);
    expect(host.querySelector('.lm-sr-only')!.textContent).toBe('+1,234');
  });
});
