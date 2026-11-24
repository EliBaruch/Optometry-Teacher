import { describe, expect, it } from 'vitest';
import { render } from 'preact';
import { ALL_TESTS } from '@core';
import { ICON_NAMES, Icon, IconOrText, isIconName } from './Icon';

const REQUIRED_UI = [
  'coin', 'gem', 'star', 'trophy', 'flame', 'clock', 'heart', 'lock', 'unlock', 'chevron-left', 'chevron-right', 'close',
  'check', 'x', 'settings', 'sound-on', 'sound-off', 'gift', 'crate', 'eye', 'chart', 'user', 'users', 'crown',
  'lightning', 'sparkle', 'book', 'play', 'pause', 'refresh', 'info', 'warning', 'alert',
];

describe('Icon set', () => {
  it('has an icon for every clinical TestId', () => {
    for (const t of ALL_TESTS) expect(isIconName(t), t).toBe(true);
  });
  it('has every required interface icon', () => {
    for (const n of REQUIRED_UI) expect(ICON_NAMES, n).toContain(n);
  });
  it('rejects unknown names', () => {
    expect(isIconName('nope')).toBe(false);
    expect(isIconName('toString')).toBe(false);
    expect(isIconName(3)).toBe(false);
  });
  it('renders decorative icons hidden and labelled icons as images', () => {
    const host = document.createElement('div');
    render(<Icon name="eye" />, host);
    const svg = host.querySelector('svg')!;
    expect(svg.getAttribute('aria-hidden')).toBe('true');
    expect(svg.getAttribute('stroke-width')).toBe('1.75');
    render(<Icon name="eye" label="Eye" size={32} />, host);
    const s2 = host.querySelector('svg')!;
    expect(s2.getAttribute('role')).toBe('img');
    expect(s2.getAttribute('aria-label')).toBe('Eye');
    expect(s2.getAttribute('width')).toBe('32px');
  });
  it('IconOrText falls back to text for emoji / symbols', () => {
    const host = document.createElement('div');
    render(<IconOrText icon="✦" />, host);
    expect(host.textContent).toBe('✦');
    render(<IconOrText icon="coin" />, host);
    expect(host.querySelector('svg[data-icon="coin"]')).not.toBeNull();
  });
});
