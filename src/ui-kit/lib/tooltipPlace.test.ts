import { describe, expect, it } from 'vitest';
import { clampSpan, placeTooltip } from './tooltipPlace';

const phone = { width: 375, height: 812 };
const bubble = { width: 260, height: 60 };

describe('clampSpan', () => {
  it('leaves a span that already fits alone', () => {
    expect(clampSpan(187, 100, 375, 8)).toBe(0);
  });
  it('slides right when it would overflow the left edge', () => {
    // centre 121, width 260 → starts at -9; must start at 8.
    expect(clampSpan(121, 260, 375, 8)).toBe(17);
  });
  it('slides left when it would overflow the right edge', () => {
    // starts at 300 → must end at 367 → start 107.
    expect(clampSpan(430, 260, 375, 8)).toBe(107 - 300);
  });
  it('pins to the leading margin when it cannot fit at all', () => {
    expect(clampSpan(100, 400, 375, 8)).toBe(8 - (100 - 200));
  });
});

describe('placeTooltip', () => {
  it('reproduces the 375px RAPD case: shifts the bubble on screen and keeps the arrow on the trigger', () => {
    const trigger = { left: 60, top: 400, width: 122, height: 36 }; // centre x = 121
    const r = placeTooltip({ trigger, bubble, viewport: phone, placement: 'top' });
    expect(r.placement).toBe('top');
    expect(r.shift).toBe(17);
    const left = 121 - 130 + r.shift;
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + bubble.width).toBeLessThanOrEqual(375 - 8);
    // arrow moves back by the same amount so it still points at x = 121
    expect(121 - 130 + r.shift + 130 + r.arrow).toBe(121);
  });

  it('does nothing when the preferred side fits', () => {
    const r = placeTooltip({ trigger: { left: 150, top: 300, width: 80, height: 30 }, bubble, viewport: { width: 1440, height: 900 }, placement: 'top' });
    expect(r).toEqual({ placement: 'top', shift: 0, arrow: 0 });
  });

  it('flips top → bottom near the top edge', () => {
    const r = placeTooltip({ trigger: { left: 600, top: 20, width: 80, height: 30 }, bubble, viewport: { width: 1440, height: 900 }, placement: 'top' });
    expect(r.placement).toBe('bottom');
  });

  it('flips bottom → top near the bottom edge', () => {
    const r = placeTooltip({ trigger: { left: 600, top: 860, width: 80, height: 30 }, bubble, viewport: { width: 1440, height: 900 }, placement: 'bottom' });
    expect(r.placement).toBe('top');
  });

  it('flips right → left near the right edge', () => {
    const r = placeTooltip({ trigger: { left: 1300, top: 400, width: 80, height: 30 }, bubble, viewport: { width: 1440, height: 900 }, placement: 'right' });
    expect(r.placement).toBe('left');
  });

  it('falls back to a vertical side when neither horizontal side fits (phone)', () => {
    const r = placeTooltip({ trigger: { left: 150, top: 400, width: 60, height: 30 }, bubble, viewport: phone, placement: 'left' });
    expect(['top', 'bottom']).toContain(r.placement);
    const centre = 180;
    const left = centre - 130 + r.shift;
    expect(left).toBeGreaterThanOrEqual(8);
    expect(left + 260).toBeLessThanOrEqual(367);
  });

  it('clamps the arrow so it never leaves the rounded corners', () => {
    // trigger hugging the left edge: bubble shifts a lot, arrow capped at size/2 - inset
    const r = placeTooltip({ trigger: { left: 0, top: 400, width: 10, height: 20 }, bubble, viewport: phone, placement: 'top' });
    expect(r.arrow).toBe(-(130 - 14));
  });

  it('slides left/right bubbles vertically into the margin', () => {
    const r = placeTooltip({ trigger: { left: 100, top: 2, width: 40, height: 20 }, bubble: { width: 120, height: 80 }, viewport: { width: 1440, height: 900 }, placement: 'right' });
    expect(r.placement).toBe('right');
    expect(12 - 40 + r.shift).toBe(8);
  });
});
