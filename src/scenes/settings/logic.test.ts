import { describe, expect, it } from 'vitest';
import { countRecords, percent, sanitizeName, saveFileName, settingsOnly, sizeLabel, snapVolume, validateImport } from './logic';

const env = (data: unknown, v = 1) => JSON.stringify({ v, data });

describe('settings logic', () => {
  it('sanitises player names', () => {
    expect(sanitizeName('  Ada   Lovelace  ')).toBe('Ada Lovelace');
    expect(sanitizeName('<b>Eve</b>')).toBe('bEve/b');
    expect(sanitizeName('   ')).toBe('');
    expect(sanitizeName('x'.repeat(60))).toHaveLength(24);
    expect(sanitizeName('a\u0007b')).toBe('ab');
  });

  it('formats and snaps volumes', () => {
    expect(percent(0.804)).toBe('80%');
    expect(percent(2)).toBe('100%');
    expect(percent(NaN)).toBe('0%');
    expect(snapVolume(0.12345)).toBe(0.12);
    expect(snapVolume(-1)).toBe(0);
  });

  it('names save files by local date', () => {
    expect(saveFileName(new Date(2026, 10, 4, 12).getTime())).toBe('lumen-save-2026-11-04.json');
  });

  it('labels sizes', () => {
    expect(sizeLabel(10)).toBe('10 B');
    expect(sizeLabel(2048)).toBe('2.0 KB');
  });

  it('validates imports', () => {
    const good = JSON.stringify({ 'lumen:settings': env({ playerName: 'X' }), 'lumen:learning': env({ cards: {} }), other: 'ignored' });
    const r = validateImport(good);
    expect(r.ok).toBe(true);
    if (r.ok) {
      expect(r.records).toBe(2);
      expect(r.hasSettings).toBe(true);
      expect(JSON.parse(r.json)).not.toHaveProperty('other');
    }
    expect(validateImport('').ok).toBe(false);
    expect(validateImport('nope').ok).toBe(false);
    expect(validateImport('[]').ok).toBe(false);
    expect(validateImport('{"foo":"bar"}').ok).toBe(false);
    expect(validateImport(JSON.stringify({ 'lumen:x': 5 })).ok).toBe(false);
    expect(validateImport(JSON.stringify({ 'lumen:x': '{"data":1}' })).ok).toBe(false);
  });

  it('counts records and extracts settings', () => {
    const all = JSON.stringify({ 'lumen:settings': env({}), 'lumen:a': env(1) });
    expect(countRecords(all)).toBe(2);
    expect(countRecords('garbage')).toBe(0);
    expect(JSON.parse(settingsOnly(all)!)).toEqual({ 'lumen:settings': env({}) });
    expect(settingsOnly('{}')).toBeNull();
  });
});
