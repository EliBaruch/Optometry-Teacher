import { describe, expect, it } from 'vitest';
import { h, render } from 'preact';
import { act } from 'preact/test-utils';
import { createRng, type AvatarSpec, type HairStyle } from '@core';
import { ACCESSORIES, FACIAL_HAIR, GLASSES, HAIR_STYLES, HEADWEAR, generateAvatar, type AvatarSex } from './generate';
import { buildGeo, traitsFor } from './geometry';
import { EXPRESSIONS, eyeShape, rigAttrs, targetRig } from './rig';
import { PatientAvatar } from './PatientAvatar';
import { AvatarBust } from './AvatarBust';
import { activeTickers } from './ticker';
import { describeSigns, signSideFor } from './PatientAvatar';

const HEX = /^#[0-9a-f]{6}$/i;

function many(seed: number, n: number) {
  const rng = createRng(seed);
  const out: { spec: AvatarSpec; age: number; sex: AvatarSex }[] = [];
  for (let i = 0; i < n; i++) {
    const age = rng.int(0, 100);
    const sex = rng.pick(['F', 'M', 'X'] as const);
    out.push({ spec: generateAvatar(rng.fork(i), { age, sex }), age, sex });
  }
  return out;
}

describe('generateAvatar', () => {
  it('is deterministic for the same rng seed', () => {
    const a = generateAvatar(createRng('patient-42'), { age: 63, sex: 'F' });
    const b = generateAvatar(createRng('patient-42'), { age: 63, sex: 'F' });
    expect(a).toEqual(b);
    const c = generateAvatar(createRng('patient-43'), { age: 63, sex: 'F' });
    expect(c).not.toEqual(a);
  });

  it('always produces a valid spec', () => {
    for (const { spec } of many(1, 600)) {
      expect([0, 1, 2, 3, 4, 5]).toContain(spec.skin);
      expect(HAIR_STYLES).toContain(spec.hair);
      expect(spec.hairColor).toMatch(HEX);
      expect(spec.irisColor).toMatch(HEX);
      expect(spec.outfit).toMatch(HEX);
      expect(GLASSES).toContain(spec.glasses);
      expect(FACIAL_HAIR).toContain(spec.facialHair);
      expect(HEADWEAR).toContain(spec.headwear);
      expect(ACCESSORIES).toContain(spec.accessory);
    }
  });

  it('respects age and sex plausibility', () => {
    for (const { spec, age, sex } of many(2, 800)) {
      if (age < 18 || sex === 'F') expect(spec.facialHair).toBe('none');
      if (age < 13) expect(spec.hair).not.toBe('bald');
      if (age < 20 || age > 65) expect(spec.headwear).not.toBe('hard-hat');
      if (age < 55) expect(spec.accessory).not.toBe('hearing-aid');
    }
  });

  it('covers diverse skin tones and every hair style across a population', () => {
    const all = many(3, 1500);
    const tones = new Set(all.map((p) => p.spec.skin));
    const styles = new Set<HairStyle>(all.map((p) => p.spec.hair));
    expect(tones.size).toBe(6);
    for (const s of HAIR_STYLES) expect(styles.has(s)).toBe(true);
  });

  it('greys hair with age', () => {
    const greyish = (c: string) => {
      const n = parseInt(c.slice(1), 16);
      const r = (n >> 16) & 255, g = (n >> 8) & 255, b = n & 255;
      return Math.max(r, g, b) - Math.min(r, g, b) < 20 && r > 110;
    };
    const old = many(4, 500).filter((p) => p.age >= 75);
    const young = many(4, 500).filter((p) => p.age <= 25);
    const share = (l: typeof old) => l.filter((p) => greyish(p.spec.hairColor)).length / Math.max(1, l.length);
    expect(share(old)).toBeGreaterThan(0.6);
    expect(share(young)).toBe(0);
  });
});

describe('rig', () => {
  const spec = generateAvatar(createRng(9), { age: 40, sex: 'X' });
  const g = buildGeo(40, 'X', traitsFor(spec, 40, 'X'));

  it('produces finite path data for every expression and sign', () => {
    for (const e of EXPRESSIONS) {
      const p = targetRig(e, { ptosis: ['OD'], proptosis: ['OS'], squinting: true });
      const a = rigAttrs(g, { params: p, gazeL: { x: 1, y: -1 }, gazeR: { x: -1, y: 1 }, blink: 0.5, breath: 1, sway: -1, nod: 0.3 });
      for (const kv of Object.values(a)) for (const v of Object.values(kv)) expect(v).not.toMatch(/NaN|Infinity|undefined/);
    }
  });

  it('ptosis lowers the lid on the named eye only and lifts that brow', () => {
    const p = targetRig('neutral', { ptosis: ['OS'] });
    expect(p.lidR).toBeGreaterThan(p.lidL + 0.3);
    expect(p.browOutR).toBeLessThan(p.browOutL);
  });

  it('a closed lid meets the lower lid', () => {
    const s = eyeShape(g, -1, 1, 0, 0);
    expect(s.lidEdge).toContain('C');
    expect(s.almond.endsWith('Z')).toBe(true);
  });

  it('describes visible signs with patient laterality for screen readers', () => {
    expect(describeSigns({ ptosis: ['OS'] })).toEqual(['drooping left upper eyelid']);
    expect(describeSigns({ redEye: ['OD', 'OS'] })).toEqual(['both eyes red']);
    expect(describeSigns(undefined, undefined, { OD: 1.6 })).toEqual(['large right pupil']);
    expect(describeSigns({ templeTenderness: true, redEye: ['OS'] })).toContain('prominent, tortuous left temple artery');
    expect(describeSigns(undefined)).toEqual([]);
  });

  it('faces differ meaningfully between patients', () => {
    const geos = many(11, 40).filter((p) => p.age >= 20).map((p) => buildGeo(p.age, p.sex, traitsFor(p.spec, p.age, p.sex)));
    const spread = (k: 'jawW' | 'noseW' | 'chinY' | 'eyeW' | 'eyeTilt' | 'earW') => Math.max(...geos.map((g) => g[k])) - Math.min(...geos.map((g) => g[k]));
    expect(spread('jawW')).toBeGreaterThan(5);
    expect(spread('noseW')).toBeGreaterThan(2.5);
    expect(spread('chinY')).toBeGreaterThan(6);
    expect(spread('eyeW')).toBeGreaterThan(1.2);
    expect(spread('eyeTilt')).toBeGreaterThan(1.5);
    expect(spread('earW')).toBeGreaterThan(1.8);
  });

  it('places unilateral skin signs on the affected side (OD = viewer left)', () => {
    expect(signSideFor({ redEye: ['OS'] })).toBe(1);
    expect(signSideFor({ redEye: ['OD'] })).toBe(-1);
    expect(signSideFor({})).toBe(-1);
  });
});

describe('<PatientAvatar/>', () => {
  it('renders accessible stacked layers with rig parts and cleans up its ticker', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const spec: AvatarSpec = { skin: 3, hair: 'braids', hairColor: '#2a1d16', irisColor: '#5a3a22', outfit: '#3d5a80', glasses: 'cat-eye', headwear: 'none', accessory: 'earrings', facialHair: 'none' };
    act(() => render(h(PatientAvatar, { spec, age: 34, sex: 'F', expression: 'worried', external: { redEye: ['OD'], tearing: ['OD'], rash: 'forehead-dermatomal', eyePatch: 'OS', photophobia: true, templeTenderness: true }, strabismus: { eye: 'OD', direction: 'out' } }), host));
    const root = host.querySelector('.lav-portrait')!;
    expect(root.getAttribute('role')).toBe('img');
    const label = root.getAttribute('aria-label')!;
    expect(label).toMatch(/red right eye/);
    expect(label).toMatch(/patch over the left eye/);
    expect(label).toMatch(/right eye turned out/);
    for (const k of ['lidL', 'lidR', 'irisL', 'browL', 'mUpper']) expect(root.querySelector(`[data-r="${k}"]`)).not.toBeNull();
    // lids/irises live in their own layer so a blink repaints only that layer
    const eyes = root.querySelector('.lav-eyes')!;
    expect(eyes.querySelector('[data-r="lidL"]')).not.toBeNull();
    expect(eyes.querySelector('[data-r="browL"]')).toBeNull();
    // breathing/sway wrappers are plain divs moved by CSS transforms
    expect(root.querySelectorAll('div.lav-rig').length).toBe(2);
    expect(root.innerHTML).not.toMatch(/NaN|undefined|mix-blend/);
    expect(activeTickers()).toBe(1);
    act(() => render(null, host));
    expect(activeTickers()).toBe(0);
    host.remove();
  });

  it('renders every hair style, headwear and glasses without NaN', () => {
    const host = document.createElement('div');
    for (const hair of HAIR_STYLES) {
      for (const headwear of HEADWEAR) {
        const spec: AvatarSpec = { skin: 1, hair, hairColor: '#6b4a2f', irisColor: '#4f7ca8', outfit: '#7b3f61', glasses: GLASSES[(hair.length + headwear.length) % GLASSES.length], facialHair: 'beard', headwear, accessory: 'hearing-aid' };
        render(h(PatientAvatar, { spec, age: 72, sex: 'M', animated: false }), host);
        expect(host.innerHTML).not.toMatch(/NaN|undefined/);
      }
    }
    render(h(AvatarBust, { spec: { skin: 5, hair: 'afro', hairColor: '#1c1410', irisColor: '#3f2a1a', outfit: '#2f6b5e' }, age: 6, sex: 'X', ring: '#a78bfa' }), host);
    const bust = host.querySelector('svg.lav-bust')!;
    expect(bust).not.toBeNull();
    expect(bust.getAttribute('role')).toBe('img');
    expect(bust.innerHTML.match(/#a78bfa/g)?.length).toBe(1);
    render(null, host);
  });
});
