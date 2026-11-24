import { describe, expect, it } from 'vitest';
import {
  KEY_ROOT, SCALES, centsToRatio, chordMidi, clamp, degreeToMidi, inScale, midiToHz, quantize, scaleRange, sliderToGain, voiceNear,
} from './theory';

describe('theory', () => {
  it('converts MIDI to Hz', () => {
    expect(midiToHz(69)).toBeCloseTo(440);
    expect(midiToHz(81)).toBeCloseTo(880);
    expect(midiToHz(KEY_ROOT)).toBeCloseTo(293.66, 1); // D4
  });

  it('maps scale degrees across octaves, including negatives', () => {
    expect(degreeToMidi(SCALES.lydian, 0)).toBe(62);
    expect(degreeToMidi(SCALES.lydian, 3)).toBe(68); // G#4 — the lydian #4
    expect(degreeToMidi(SCALES.lydian, 7)).toBe(74);
    expect(degreeToMidi(SCALES.major, -1)).toBe(61); // C#4
    expect(degreeToMidi(SCALES.pentatonic, 5)).toBe(74);
  });

  it('builds diatonic seventh chords', () => {
    expect(chordMidi(SCALES.lydian, 0)).toEqual([62, 66, 69, 73]); // Dmaj7
    expect(chordMidi(SCALES.lydian, 1)).toEqual([64, 68, 71, 74]); // E7 (lydian II)
    expect(chordMidi(SCALES.major, 5, 3)).toEqual([71, 74, 78]); // Bm
    expect(chordMidi(SCALES.phrygian, 1, 3)).toEqual([63, 67, 70]); // Eb
  });

  it('checks and snaps scale membership', () => {
    expect(inScale(66, SCALES.major)).toBe(true); // F#
    expect(inScale(65, SCALES.major)).toBe(false); // F
    expect(inScale(66 - 24, SCALES.major)).toBe(true);
    expect(quantize(65, SCALES.major)).toBe(64);
    expect(quantize(70, SCALES.pentatonic)).toBe(69);
    expect(quantize(62.4, SCALES.lydian)).toBe(62);
  });

  it('voices chords into a target register keeping shape', () => {
    const v = voiceNear([74, 78, 81], 55);
    expect(v).toEqual([62, 66, 69]);
    expect(v[0]).toBeGreaterThanOrEqual(55);
    expect(v[0]).toBeLessThan(67);
    expect(voiceNear([40, 44], 55)).toEqual([64, 68]);
    expect(voiceNear([], 55)).toEqual([]);
  });

  it('lists scale tones in a range', () => {
    expect(scaleRange(SCALES.pentatonic, 62, 74)).toEqual([62, 64, 66, 69, 71, 74]);
  });

  it('maps sliders to perceptual gain safely', () => {
    expect(sliderToGain(0)).toBe(0);
    expect(sliderToGain(1)).toBe(1);
    expect(sliderToGain(0.5)).toBeCloseTo(0.25);
    expect(sliderToGain(2)).toBe(1);
    expect(sliderToGain(Number.NaN)).toBe(0);
    expect(clamp(-1, 0, 1)).toBe(0);
    expect(centsToRatio(1200)).toBeCloseTo(2);
  });
});
