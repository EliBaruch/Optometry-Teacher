/**
 * Keyboard reachability of the interactive props painted into the lounge
 * illustration (lamp, coffee, cat). They are SVG groups with role="button",
 * so they must carry the lowercase `tabindex` attribute (SVG ignores the
 * camelCase spelling) and respond to Enter / Space as well as clicks.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act as flush } from 'preact/test-utils';
import { useState } from 'preact/hooks';
import { LoungeArt } from './LoungeArt';

let host: HTMLElement;
const onCat = vi.fn();
const onCoffee = vi.fn();

function Harness() {
  const [lampOn, setLamp] = useState(true);
  return (
    <LoungeArt
      lampOn={lampOn}
      sip={0}
      pet={0}
      quiet={false}
      onCat={onCat}
      onCoffee={onCoffee}
      onLamp={() => setLamp((v) => !v)}
    />
  );
}

const SELECTORS = ['.cf-art__lampshade', '.cf-art__coffee', '.cf-art__cat'];
const q = (sel: string) => host.querySelector(sel) as SVGGElement;
const key = (el: Element, k: string) =>
  flush(() => {
    el.dispatchEvent(new KeyboardEvent('keydown', { key: k, bubbles: true, cancelable: true }));
  });

beforeEach(() => {
  onCat.mockReset();
  onCoffee.mockReset();
  host = document.createElement('div');
  document.body.appendChild(host);
  flush(() => render(<Harness />, host));
});

afterEach(() => {
  render(null, host);
  host.remove();
});

describe('LoungeArt keyboard access', () => {
  it('root is a labelled group, props are buttons with a lowercase tabindex', () => {
    const svg = host.querySelector('svg')!;
    expect(svg.getAttribute('role')).toBe('group');
    expect(svg.getAttribute('aria-label')).toBeTruthy();
    for (const sel of SELECTORS) {
      const el = q(sel);
      expect(el, sel).toBeTruthy();
      expect(el.getAttribute('role')).toBe('button');
      expect(el.getAttribute('aria-label')).toBeTruthy();
      expect(el.getAttribute('tabindex')).toBe('0');
      // the camelCase spelling is the bug that made these unreachable
      expect(el.outerHTML).not.toContain('tabIndex=');
    }
  });

  it('each prop can take focus', () => {
    for (const sel of SELECTORS) {
      const el = q(sel);
      el.focus();
      expect(document.activeElement, sel).toBe(el);
    }
  });

  it('Enter and Space toggle the lamp (aria-pressed flips)', () => {
    const lamp = q('.cf-art__lampshade');
    expect(lamp.getAttribute('aria-pressed')).toBe('true');
    key(lamp, 'Enter');
    expect(q('.cf-art__lampshade').getAttribute('aria-pressed')).toBe('false');
    expect(q('.cf-art__lampshade').getAttribute('aria-label')).toMatch(/light/i);
    key(q('.cf-art__lampshade'), ' ');
    expect(q('.cf-art__lampshade').getAttribute('aria-pressed')).toBe('true');
  });

  it('Enter / Space fire the cat and coffee handlers; other keys do not', () => {
    key(q('.cf-art__cat'), 'Enter');
    key(q('.cf-art__cat'), ' ');
    key(q('.cf-art__cat'), 'a');
    expect(onCat).toHaveBeenCalledTimes(2);
    key(q('.cf-art__coffee'), ' ');
    expect(onCoffee).toHaveBeenCalledTimes(1);
    expect(onCoffee.mock.calls[0]![0]).toEqual({ x: expect.any(Number), y: expect.any(Number) });
  });

  it('Space does not scroll the page', () => {
    const ev = new KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true });
    q('.cf-art__cat').dispatchEvent(ev);
    expect(ev.defaultPrevented).toBe(true);
  });

  it('clicks still work', () => {
    flush(() => {
      q('.cf-art__coffee').dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    expect(onCoffee).toHaveBeenCalledTimes(1);
  });
});
