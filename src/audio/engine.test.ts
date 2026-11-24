import { afterEach, describe, expect, it } from 'vitest';
import type { SfxId, TrackId } from '@core';
import { createAudio } from './index';
import { createAudioEngine, type AudioEnv } from './engine';
import { SFX } from './sfx';
import { COMPOSITIONS } from './music/tracks';
import { FakeAudioContext, fakeDoc, fakeWin, manualTimers } from './testing/fake-context';

function setup() {
  FakeAudioContext.instances = [];
  const timers = manualTimers();
  const doc = fakeDoc();
  const win = fakeWin();
  let seed = 1;
  const env: AudioEnv = {
    AudioContext: FakeAudioContext as unknown as AudioEnv['AudioContext'],
    doc,
    win,
    setInterval: timers.setInterval,
    clearInterval: timers.clearInterval,
    random: () => ((seed = (seed * 16807) % 2147483647) / 2147483647),
  };
  const audio = createAudioEngine(env);
  const ctx = () => FakeAudioContext.instances[0]!;
  const flush = () => new Promise((r) => setTimeout(r, 0));
  /** Run the scheduler for `seconds` of audio time. */
  const run = (seconds: number, dt = 0.025) => {
    for (let t = 0; t < seconds; t += dt) {
      ctx().advance(dt);
      timers.fire();
    }
  };
  return { audio, env, timers, doc, win, ctx, flush, run };
}

afterEach(() => {
  FakeAudioContext.instances = [];
  FakeAudioContext.allowResume = true;
});

describe('createAudio without WebAudio', () => {
  it('is a silent no-op that never throws (happy-dom has no AudioContext)', () => {
    const a = createAudio();
    expect(() => {
      a.play('click');
      a.play('legendary', { volume: 5, pitch: -1 });
      a.music('title');
      a.unlock();
      a.setVolumes({ master: 1, sfx: 1, music: 1 });
      a.music(null);
    }).not.toThrow();
  });

  it('reports unavailable', () => {
    const e = createAudioEngine({ setInterval: () => 0, clearInterval: () => {}, random: Math.random });
    expect(e.status()).toBe('unavailable');
    e.unlock();
    e.play('coin');
    expect(e.status()).toBe('unavailable');
  });
});

describe('audio engine', () => {
  it('creates nothing before unlock, then starts requested music once unlocked', async () => {
    const { audio, ctx, flush, timers } = setup();
    audio.play('click');
    audio.music('title');
    expect(FakeAudioContext.instances).toHaveLength(0);
    expect(audio.status()).toBe('locked');
    audio.unlock();
    await flush();
    expect(audio.status()).toBe('running');
    expect(audio.track()).toBe('title');
    expect(timers.count).toBe(1);
    expect(ctx().byKind.osc ?? 0).toBeGreaterThan(0);
    expect(ctx().errors).toEqual([]);
  });

  it('renders every SFX with valid automation', async () => {
    const { audio, ctx, flush } = setup();
    audio.unlock();
    await flush();
    for (const id of Object.keys(SFX) as SfxId[]) {
      const before = ctx().created;
      audio.play(id, { pitch: 1.2, volume: 0.8 });
      expect(ctx().created, id).toBeGreaterThan(before);
      ctx().advance(0.5);
    }
    expect(ctx().errors).toEqual([]);
  });

  it('honours cooldown and voice limits', async () => {
    const { audio, ctx, flush } = setup();
    audio.unlock();
    await flush();
    const before = ctx().created;
    audio.play('hover');
    const one = ctx().created - before;
    for (let i = 0; i < 10; i++) audio.play('hover');
    expect(ctx().created - before).toBe(one); // cooldown swallowed the spam
    ctx().advance(0.1);
    audio.play('hover');
    expect(ctx().created - before).toBe(one * 2);
  });

  it.each(Object.keys(COMPOSITIONS) as TrackId[])('plays %s for a minute without errors', async (id) => {
    const { audio, ctx, flush, run } = setup();
    audio.unlock();
    await flush();
    audio.music(id);
    const before = ctx().byKind.osc ?? 0;
    run(60);
    expect((ctx().byKind.osc ?? 0) - before).toBeGreaterThan(30);
    expect(ctx().errors).toEqual([]);
  });

  it('crossfades between tracks and stops the scheduler when music ends', async () => {
    const { audio, flush, run, timers, ctx } = setup();
    audio.unlock();
    await flush();
    audio.music('hub');
    run(3);
    audio.music('exam');
    audio.music('exam'); // idempotent
    run(1);
    audio.music('emergency');
    run(4);
    audio.music(null);
    expect(timers.count).toBe(1);
    run(4);
    expect(timers.count).toBe(0);
    expect(ctx().errors).toEqual([]);
  });

  it('suspends while the page is hidden and resumes afterwards', async () => {
    const { audio, flush, doc, ctx } = setup();
    audio.unlock();
    audio.music('zen');
    await flush();
    doc.setHidden(true);
    await flush();
    expect(ctx().state).toBe('suspended');
    const before = ctx().created;
    audio.play('coin');
    expect(ctx().created).toBe(before);
    doc.setHidden(false);
    await flush();
    expect(ctx().state).toBe('running');
  });

  it('stops the wake-up timer while hidden and restarts it on return', async () => {
    const { audio, flush, doc, timers } = setup();
    audio.unlock();
    audio.music('hub');
    await flush();
    expect(timers.count).toBe(1);
    doc.setHidden(true);
    await flush();
    expect(timers.count).toBe(0);
    doc.setHidden(false);
    await flush();
    expect(timers.count).toBe(1);
  });

  it('retries a blocked unlock on the next activating gesture (iOS touch pointerdown)', async () => {
    const { audio, flush, win, ctx } = setup();
    FakeAudioContext.allowResume = false;
    audio.music('title');
    audio.unlock();
    await flush();
    expect(audio.status()).toBe('suspended');
    expect(win.listeners).toBeGreaterThan(0);
    FakeAudioContext.allowResume = true;
    win.dispatch('touchend');
    await flush();
    expect(ctx().state).toBe('running');
    expect(audio.track()).toBe('title');
    expect(win.listeners).toBe(0);
  });

  it('syncs the echo to each track tempo', async () => {
    const { audio, flush, ctx } = setup();
    audio.unlock();
    await flush();
    const before = ctx().automations;
    audio.music('emergency');
    expect(ctx().automations).toBeGreaterThan(before);
    expect(ctx().errors).toEqual([]);
  });

  it('ramps volumes smoothly and clamps bad input', async () => {
    const { audio, flush, ctx } = setup();
    audio.setVolumes({ master: 0.5, sfx: 0.5, music: 0.5 });
    audio.unlock();
    await flush();
    audio.setVolumes({ master: Number.NaN, sfx: 3, music: -1 });
    expect(ctx().errors).toEqual([]);
  });

  it('disposes cleanly', async () => {
    const { audio, flush, ctx, timers, doc, win } = setup();
    audio.unlock();
    audio.music('results');
    await flush();
    audio.dispose();
    await flush();
    expect(ctx().state).toBe('closed');
    expect(timers.count).toBe(0);
    expect(doc.listeners).toBe(0);
    expect(win.listeners).toBe(0);
    expect(() => audio.play('coin')).not.toThrow();
  });
});

describe('rapid scene changes', () => {
  it('switches tracks mid-crossfade without automation errors', async () => {
    const { audio, flush, run, ctx } = setup();
    audio.unlock();
    await flush();
    const order: TrackId[] = ['title', 'hub', 'exam', 'emergency', 'results', 'zen', 'title'];
    for (const id of order) {
      audio.music(id);
      run(0.3); // well inside the 1.8 s fade
    }
    expect(audio.track()).toBe('title');
    run(5);
    expect(ctx().errors).toEqual([]);
  });
});
