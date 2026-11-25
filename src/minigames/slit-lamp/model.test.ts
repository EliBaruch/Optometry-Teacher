import { describe, expect, it } from 'vitest';
import { buildFindings, createRng } from '@core';
import { stainGeometry } from '@render';
import { clampPan, mmToScreen, screenToMm } from './geo';
import {
  buildSites, clarity, conePos, defaultSetting, emptyCoverage, isResolvable, judgeTag, lesionSpot, presetSetting, regionActive, scoreSession,
  technique, techniqueHint, windowMm, zoneOf, COVER_SECONDS, type LampSetting, type Site,
} from './model';
import { MENU, parseSelection, regionOf, describeSign } from './vocab';

const base = (eye: 'OD' | 'OS' = 'OD'): LampSetting => defaultSetting(eye);
const set = (t: Parameters<typeof presetSetting>[0], patch: Partial<LampSetting> = {}, eye: 'OD' | 'OS' = 'OD'): LampSetting => ({ ...presetSetting(t, base(eye)), ...patch });

const uveitis = () => buildFindings(34, {
  anterior: { OD: { conjunctiva: ['ciliary-flush'], cornea: ['keratic-precipitates'], anteriorChamber: { cells: 3, flare: 2, vanHerick: 2 } } },
});

describe('instrument', () => {
  it('derives the technique from the setting', () => {
    expect(technique(base())).toBe('diffuse');
    expect(technique(set('broad'))).toBe('broad');
    expect(technique(set('section'))).toBe('section');
    expect(technique(set('conical'))).toBe('conical');
    expect(technique(set('retro'))).toBe('retro');
  });
  it('keeps the illumination arm on its side when changing preset', () => {
    expect(presetSetting('section', base('OS')).angle).toBeLessThan(0);
    expect(presetSetting('section', base('OD')).angle).toBeGreaterThan(0);
  });
  it('shrinks the field of view with magnification', () => {
    expect(windowMm(10)).toBeGreaterThan(windowMm(16));
    expect(windowMm(16)).toBeGreaterThan(windowMm(25));
  });
});

describe('what can be resolved', () => {
  it('AC cells need a dark room, a 1 mm cone and high power', () => {
    const ok = set('conical', { mag: 25, lightsOff: true });
    expect(clarity('chamber/cells', ok)).toBeGreaterThanOrEqual(0.9);
    expect(clarity('chamber/cells', { ...ok, lightsOff: false })).toBeLessThan(0.5);
    expect(clarity('chamber/cells', { ...ok, mag: 10 })).toBeLessThan(0.5);
    expect(clarity('chamber/cells', set('broad', { mag: 25, lightsOff: true }))).toBeLessThan(0.5);
  });
  it('Van Herick needs a thin section at a wide angle', () => {
    expect(clarity('chamber/van-herick', set('section', { mag: 16, angle: 60 }))).toBe(1);
    expect(clarity('chamber/van-herick', set('section', { angle: 10 }))).toBeLessThan(0.5);
    expect(clarity('chamber/van-herick', set('broad'))).toBeLessThan(0.5);
  });
  it('lens opacities show in section and retro-illumination, not diffuse light', () => {
    expect(clarity('lens/cortical-cataract', set('retro', { mag: 16 }))).toBe(1);
    expect(clarity('lens/cortical-cataract', set('section', { mag: 16 }))).toBeGreaterThanOrEqual(0.5);
    expect(clarity('lens/cortical-cataract', base(), 2)).toBeLessThan(0.5);
  });
  it('conjunctival signs show in diffuse light', () => {
    expect(clarity('conj/pterygium', base())).toBe(1);
    expect(clarity('conj/pterygium', set('section'))).toBeLessThan(0.5);
  });
  it('KPs need magnification and a focal beam', () => {
    expect(clarity('cornea/deposits/keratic-precipitates', set('broad', { mag: 16 }))).toBe(1);
    expect(clarity('cornea/deposits/keratic-precipitates', set('broad', { mag: 10 }))).toBeLessThan(0.5);
    expect(clarity('cornea/deposits/keratic-precipitates', base())).toBeLessThan(0.5);
  });
  it('cobalt blue without dye hides ordinary white-light signs but lights the Fleischer ring', () => {
    expect(clarity('conj/pterygium', { ...base(), filter: 'cobalt' })).toBeLessThan(0.5);
    expect(clarity('cornea/deposits/fleischer-ring', set('broad', { mag: 16, filter: 'cobalt' }))).toBeGreaterThanOrEqual(0.5);
    expect(clarity('cornea/deposits/fleischer-ring', set('broad', { mag: 16, filter: 'redfree' }))).toBeLessThan(0.5);
  });
  it('every sign has a hint', () => {
    expect(techniqueHint('chamber/cells')).toMatch(/lights off/i);
  });
});

describe('sites', () => {
  it('a normal eye only has the Van Herick measurement', () => {
    const s = buildSites(buildFindings(30), 'OD', 11);
    expect(s.map((x) => x.sign)).toEqual(['chamber/van-herick']);
    expect(s[0]!.grade).toBe('4');
  });
  it('Van Herick sits on the temporal limbus', () => {
    const od = buildSites(buildFindings(30), 'OD', 11)[0]!;
    const os = buildSites(buildFindings(30), 'OS', 11)[0]!;
    expect(od.x).toBeLessThan(0);
    expect(os.x).toBeGreaterThan(0);
  });
  it('lists every pathological sign with its grade', () => {
    const s = buildSites(uveitis(), 'OD', 11);
    const signs = s.map((x) => x.sign);
    expect(signs).toEqual(expect.arrayContaining(['conj/injection/ciliary-flush', 'cornea/deposits/keratic-precipitates', 'chamber/cells', 'chamber/flare', 'chamber/van-herick']));
    expect(s.find((x) => x.sign === 'chamber/cells')!.grade).toBe('3');
    expect(s.find((x) => x.sign === 'chamber/van-herick')!.grade).toBe('2');
  });
  it('every site sign exists in the menu tree', () => {
    const paths = new Set<string>();
    (function walk(n: typeof MENU) { n.forEach((x) => { paths.add(x.path); if (x.children) walk(x.children); }); })(MENU);
    const f = buildFindings(70, { anterior: { OD: { lids: ['chalazion', 'ptosis'], conjunctiva: ['pterygium', 'discharge-watery'], cornea: ['dendrite', 'cone-thinning', 'ulcer'], iris: ['neovascularization'], lens: ['posterior-subcapsular'], anteriorChamber: { hypopyon: true, cells: 2, flare: 1 } } } });
    for (const s of buildSites(f, 'OD', 5)) expect(paths.has(s.sign)).toBe(true);
  });
  it('mirrors the renderer: lesion spot matches the stain geometry', () => {
    for (const seed of [11, 205, 4096]) {
      const u = lesionSpot(seed, 'ulcer');
      const blob = stainGeometry('round-ulcer', seed).blobs[0]!.pts;
      const cx = blob.reduce((a, p) => a + p[0], 0) / blob.length;
      const cy = blob.reduce((a, p) => a + p[1], 0) / blob.length;
      expect(Math.hypot(cx - u.x, cy - u.y)).toBeLessThan(0.15);
      const fb = lesionSpot(seed, 'fb');
      const fbl = stainGeometry('focal', seed).blobs[0]!.pts;
      expect(Math.hypot(fbl.reduce((a, p) => a + p[0], 0) / fbl.length - fb.x, fbl.reduce((a, p) => a + p[1], 0) / fbl.length - fb.y)).toBeLessThan(0.15);
    }
  });
  it('places the cone deterministically', () => {
    expect(conePos(9, 'OD')).toEqual(conePos(9, 'OD'));
    expect(conePos(9, 'OD').y).toBeGreaterThan(1);
  });
});

describe('judging tags', () => {
  const sites = buildSites(uveitis(), 'OD', 11);
  const cone = set('conical', { mag: 25, lightsOff: true });
  const tag = (leaf: string, s: LampSetting, x = 0, y = 0) => judgeTag(sites, new Set(), { eye: 'OD', x, y, zone: 'cornea', leaf }, s, 0, 0);
  it('accepts the right sign and grade with the right technique', () => {
    const t = tag('chamber/cells/3', cone);
    expect(t.result).toBe('correct');
    expect(t.credit).toBe(1);
  });
  it('gives partial credit for the right sign with a wrong grade', () => {
    const t = tag('chamber/cells/2', cone);
    expect(t.result).toBe('partial');
    expect(t.credit).toBeGreaterThan(0.65);
    expect(tag('chamber/cells/0.5', cone).credit).toBeCloseTo(0.65, 2);
  });
  it('does not accept a sign that cannot be resolved with the current setting', () => {
    expect(tag('chamber/cells/3', set('diffuse')).result).toBe('unseen');
  });
  it('rejects a sign that is not there', () => {
    expect(tag('chamber/hypopyon', cone).result).toBe('wrong');
    expect(tag('cornea/epithelium/dendrite', cone).result).toBe('wrong');
  });
  it('rejects the right sign in the wrong place', () => {
    expect(tag('cornea/deposits/keratic-precipitates', set('broad', { mag: 16 }), 0, -4.5).result).toBe('wrong');
    expect(judgeTag(sites, new Set(), { eye: 'OD', x: 0, y: 2.6, zone: 'cornea', leaf: 'cornea/deposits/keratic-precipitates' }, set('broad', { mag: 16 }), 0, 2.6).result).toBe('correct');
  });
  it('lid and conjunctival signs match by zone', () => {
    const r = judgeTag(sites, new Set(), { eye: 'OD', x: 9, y: 0, zone: 'conj', leaf: 'conj/injection/ciliary-flush' }, base(), 9, 0);
    expect(r.result).toBe('correct');
  });
  it('does not credit a site twice', () => {
    const taken = new Set(sites.map((s) => s.id));
    expect(judgeTag(sites, taken, { eye: 'OD', x: 0, y: 0, zone: 'cornea', leaf: 'chamber/cells/3' }, cone, 0, 0).result).toBe('wrong');
  });
  it('requires the beam to be over the sign for beam techniques', () => {
    const site = sites.find((s) => s.sign === 'chamber/van-herick')!;
    const sec = set('section', { mag: 16, angle: 60 });
    expect(isResolvable(site, sec, site.x, 0)).toBe(true);
    expect(isResolvable(site, sec, 0, 0)).toBe(false);
  });
});

describe('selection parsing', () => {
  it('splits grade leaves', () => {
    expect(parseSelection('chamber/cells/2')).toEqual({ sign: 'chamber/cells', grade: '2' });
    expect(parseSelection('cornea/epithelium/dendrite')).toEqual({ sign: 'cornea/epithelium/dendrite' });
    expect(regionOf('lens/iol')).toBe('lens');
    expect(describeSign('chamber/cells', '0.5')).toBe('AC cells 0.5+');
    expect(describeSign('chamber/van-herick', '1')).toBe('Van Herick Grade 1');
  });
});

describe('coverage & scoring', () => {
  it('activates regions only with the right technique', () => {
    expect(regionActive('chamber', set('conical', { mag: 25, lightsOff: true }), 0, 0)).toBe(true);
    expect(regionActive('chamber', base(), 0, 0)).toBe(false);
    expect(regionActive('cornea', set('broad', { mag: 16 }), 0, 0)).toBe(true);
    expect(regionActive('cornea', set('broad', { mag: 16 }), 8, 0)).toBe(false);
    expect(regionActive('lids', base(), 0, 0)).toBe(true);
  });
  const full = { OD: { ...emptyCoverage() }, OS: { ...emptyCoverage() } };
  for (const e of ['OD', 'OS'] as const) for (const k of Object.keys(COVER_SECONDS) as (keyof typeof COVER_SECONDS)[]) full[e][k] = COVER_SECONDS[k];
  it('scores a flawless session as perfect', () => {
    const sites = buildSites(uveitis(), 'OD', 11);
    const tags = sites.map((s, i) => ({ id: i, eye: s.eye, x: s.x, y: s.y, sign: s.sign, grade: s.grade, siteId: s.id, result: 'correct' as const, credit: 1 }));
    const sc = scoreSession(sites, tags, full, 0);
    expect(sc.perfect).toBe(true);
    expect(sc.accuracy).toBeCloseTo(1, 6);
  });
  it('rewards speed gently but never at the cost of perfect', () => {
    const sites = buildSites(uveitis(), 'OD', 11);
    const tags = sites.map((s, i) => ({ id: i, eye: s.eye, x: s.x, y: s.y, sign: s.sign, grade: s.grade, siteId: s.id, result: 'correct' as const, credit: 1 }));
    const fast = scoreSession(sites, tags, full, 0, 60_000);
    const slow = scoreSession(sites, tags, full, 0, 12 * 60_000);
    expect(fast.accuracy).toBeGreaterThan(slow.accuracy);
    expect(slow.accuracy).toBeGreaterThan(0.9);
    expect(slow.perfect).toBe(true);
  });
  it('penalises wrong tags, hints and missed signs', () => {
    const sites = buildSites(uveitis(), 'OD', 11);
    const none = scoreSession(sites, [], { OD: emptyCoverage(), OS: emptyCoverage() }, 0);
    expect(none.accuracy).toBe(0);
    const wrong = scoreSession(sites, [{ id: 1, eye: 'OD', x: 0, y: 0, sign: 'lens/iol', result: 'wrong', credit: 0 }], full, 0);
    const clean = scoreSession(sites, [], full, 0);
    expect(wrong.accuracy).toBeLessThan(clean.accuracy);
    expect(scoreSession(sites, [], full, 2).accuracy).toBeLessThan(clean.accuracy);
  });
});

describe('geometry', () => {
  it('maps between screen and millimetres', () => {
    const p = { x: 3, y: -1.5 };
    const s = mmToScreen(2, 1, p, 500, 16);
    const m = screenToMm(s.x, s.y, p, 500, 16);
    expect(m.x).toBeCloseTo(2, 6);
    expect(m.y).toBeCloseTo(1, 6);
    expect(mmToScreen(3, -1.5, p, 500, 25)).toEqual({ x: 250, y: 250 });
    expect(clampPan({ x: 99, y: -99 })).toEqual({ x: 16, y: -9.5 });
  });
  it('classifies points against the fissure', () => {
    const fissure: [number, number][] = [[-15, 0], [-8, -4], [0, -5], [8, -4], [15, 0], [8, 4], [0, 5], [-8, 4]];
    expect(zoneOf(fissure, 0, 0)).toBe('cornea');
    expect(zoneOf(fissure, 9, 0)).toBe('conj');
    expect(zoneOf(fissure, 0, -8)).toBe('lids');
  });
  it('rng helper is stable', () => {
    expect(createRng(3).next()).toBe(createRng(3).next());
  });
  it('Site type is exported', () => {
    const s: Site | undefined = undefined;
    expect(s).toBeUndefined();
  });
});
