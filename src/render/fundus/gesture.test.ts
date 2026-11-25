import { describe, expect, it } from 'vitest';
import { createTapGesture } from './gesture';

describe('tap gesture', () => {
  it('a still single pointer is a tap', () => {
    const g = createTapGesture();
    g.down(1);
    g.move(1, 2);
    expect(g.up(1)).toBe(true);
  });
  it('a drag is not a tap', () => {
    const g = createTapGesture();
    g.down(1);
    g.move(1, 4);
    g.move(1, 5);
    expect(g.up(1)).toBe(false);
  });
  it('a pinch never ends in a tap, whichever finger lifts last', () => {
    const g = createTapGesture();
    g.down(1);
    g.down(2);
    expect(g.up(2)).toBe(false);
    expect(g.up(1)).toBe(false);
    const h = createTapGesture();
    h.down(1);
    h.down(2);
    expect(h.up(1)).toBe(false);
    expect(h.up(2)).toBe(false);
  });
  it('a pinch with no travel and a stray re-touch is still not a tap until a fresh gesture', () => {
    const g = createTapGesture();
    g.down(1);
    g.down(2);
    g.up(2);
    g.down(3); // finger re-lands while 1 is still down: same gesture
    g.up(3);
    expect(g.up(1)).toBe(false);
    g.down(4); // fresh gesture
    expect(g.up(4)).toBe(true);
  });
  it('cancelled pointers do not tap', () => {
    const g = createTapGesture();
    g.down(1);
    expect(g.up(1, true)).toBe(false);
  });
});
