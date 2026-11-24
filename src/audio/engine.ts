import type { AudioPort, SfxId, TrackId } from '@core';
import { createKit, gain, type Kit } from './dsp';
import { Mixer, type Volumes } from './mixer';
import { MusicEngine } from './music/engine';
import { Reaper } from './music/player';
import { SFX } from './sfx';
import { centsToRatio, clamp } from './theory';
import { VoiceLimiter } from './voices';

type Ctor = new (opts?: AudioContextOptions) => AudioContext;

interface DocLike {
  hidden: boolean;
  addEventListener(type: 'visibilitychange', fn: () => void): void;
  removeEventListener(type: 'visibilitychange', fn: () => void): void;
}
interface WinLike {
  addEventListener(type: string, fn: () => void, opts?: AddEventListenerOptions): void;
  removeEventListener(type: string, fn: () => void): void;
}

/** Injectable environment so the engine can be tested without a browser. */
export interface AudioEnv {
  AudioContext?: Ctor;
  doc?: DocLike;
  win?: WinLike;
  setInterval: (fn: () => void, ms: number) => unknown;
  clearInterval: (id: unknown) => void;
  random: () => number;
}

export type AudioStatus = 'unavailable' | 'locked' | 'running' | 'suspended';

/** AudioPort plus the extras the sandbox/dev tools use. */
export interface AudioEngine extends AudioPort {
  status(): AudioStatus;
  /** The track currently requested (playing once unlocked). */
  track(): TrackId | null;
  /** Master analyser for visualisers (null until unlocked). */
  analyser(): AnalyserNode | null;
  dispose(): void;
}

export function browserAudioEnv(): AudioEnv {
  const g = globalThis as unknown as Record<string, unknown>;
  return {
    AudioContext: (g.AudioContext ?? g.webkitAudioContext) as Ctor | undefined,
    doc: typeof document !== 'undefined' ? document : undefined,
    win: typeof window !== 'undefined' ? window : undefined,
    setInterval: (fn, ms) => setInterval(fn, ms),
    clearInterval: (id) => clearInterval(id as ReturnType<typeof setInterval>),
    random: Math.random,
  };
}

/** Scheduler wake-up period. Notes are timed by the audio clock, not this. */
const WAKE_MS = 25;
const SFX_LEAD = 0.004;

export function createAudioEngine(env: AudioEnv = browserAudioEnv()): AudioEngine {
  let Ctx = env.AudioContext;
  let ctx: AudioContext | null = null;
  let kit: Kit | null = null;
  let mixer: Mixer | null = null;
  let music: MusicEngine | null = null;
  const limiter = new VoiceLimiter(28);
  const reaper = new Reaper();
  let vols: Volumes = { master: 0.8, sfx: 0.9, music: 0.5 };
  let wanted: TrackId | null = null;
  let unlocked = false;
  let disposed = false;
  let pausedForHidden = false;
  let timer: unknown = null;
  let gestureArmed = false;
  let cleanupGesture: (() => void) | null = null;

  const hidden = () => !!env.doc?.hidden;
  const running = () => !!ctx && ctx.state === 'running';
  const safe = (fn: () => void) => {
    try { fn(); } catch { /* audio must never break the game */ }
  };

  function ensure(): boolean {
    if (ctx) return true;
    if (!Ctx || disposed) return false;
    try {
      ctx = new Ctx({ latencyHint: 'interactive' });
      kit = createKit(ctx, env.random);
      mixer = new Mixer(ctx, vols, env.random);
      music = new MusicEngine(kit, mixer.music, Math.floor(env.random() * 2 ** 31));
      ctx.addEventListener?.('statechange', onStateChange);
      return true;
    } catch {
      ctx = null;
      Ctx = undefined; // don't keep retrying on a broken implementation
      return false;
    }
  }

  function resume(): void {
    if (!ctx || ctx.state === 'running' || ctx.state === 'closed') {
      applyMusic();
      return;
    }
    const p = ctx.resume();
    if (p && typeof p.then === 'function') p.then(applyMusic, () => {});
  }

  function applyMusic(): void {
    if (!music || !unlocked || !running()) return;
    safe(() => music!.set(wanted));
    if (music.active) startTimer();
  }

  function tick(): void {
    if (!music || !ctx) return stopTimer();
    safe(() => music!.tick());
    reaper.sweep(ctx.currentTime);
    if (!music.active) stopTimer();
  }

  function startTimer() {
    if (timer === null) timer = env.setInterval(tick, WAKE_MS);
  }
  function stopTimer() {
    if (timer !== null) env.clearInterval(timer);
    timer = null;
  }

  function onVisibility() {
    if (!ctx || !unlocked) return;
    if (hidden()) {
      if (ctx.state === 'running') {
        pausedForHidden = true;
        safe(() => void ctx!.suspend().catch(() => {}));
      }
    } else if (pausedForHidden) {
      pausedForHidden = false;
      safe(resume);
    }
  }

  /** iOS can "interrupt" the context (calls, Siri); re-arm a gesture to resume. */
  function onStateChange() {
    if (!ctx || disposed || pausedForHidden || hidden() || ctx.state === 'running' || ctx.state === 'closed') return;
    if (gestureArmed || !env.win) return;
    gestureArmed = true;
    const again = () => {
      disarm();
      safe(resume);
    };
    const disarm = () => {
      gestureArmed = false;
      for (const ev of ['pointerdown', 'keydown', 'touchend']) env.win!.removeEventListener(ev, again);
    };
    for (const ev of ['pointerdown', 'keydown', 'touchend']) env.win.addEventListener(ev, again, { once: true });
    cleanupGesture = disarm;
  }
  env.doc?.addEventListener('visibilitychange', onVisibility);

  function play(id: SfxId, opts?: { volume?: number; pitch?: number }): void {
    if (disposed || !unlocked || !ctx || !kit || !mixer || !running() || hidden()) return;
    const def = SFX[id];
    if (!def) return;
    const now = ctx.currentTime;
    const steal = limiter.admit(id, now, def);
    if (!steal) return;
    for (const v of steal) safe(() => v.stop(now));
    const rnd = env.random;
    const pitch = clamp(opts?.pitch ?? 1, 0.25, 4);
    const rate = pitch * centsToRatio((rnd() * 2 - 1) * def.jitter);
    const vol = def.gain * clamp(opts?.volume ?? 1, 0, 2) * (1 + (rnd() * 2 - 1) * 0.06);
    if (vol <= 0) return;
    const c = ctx;
    const bus = mixer.sfx;
    const out = gain(c, bus.dry, vol);
    const nodes: AudioNode[] = [out];
    if (def.verb > 0) nodes.push(out.connect(gain(c, bus.verb, def.verb)));
    if (def.echo > 0) nodes.push(out.connect(gain(c, bus.echo, def.echo)));
    const air = gain(c, bus.verb, vol * 0.9);
    air.connect(bus.echo);
    nodes.push(air);
    const t = now + SFX_LEAD;
    let end = t + 0.2;
    safe(() => {
      end = def.play({ k: kit!, out, air, t, rate, rnd });
    });
    end = Math.min(Math.max(end, t + 0.05), t + 6);
    limiter.register({
      id, start: now, end,
      stop(at) {
        for (const p of [out.gain, air.gain]) {
          p.cancelScheduledValues(at);
          p.setValueAtTime(p.value, at);
          p.linearRampToValueAtTime(0, at + 0.03);
        }
      },
    });
    for (const n of nodes) reaper.add(n, end + 0.15);
    reaper.sweep(now);
  }

  return {
    play(id, opts) {
      safe(() => play(id, opts));
    },
    music(track) {
      wanted = track;
      safe(applyMusic);
    },
    unlock() {
      safe(() => {
        if (disposed || !ensure()) return;
        unlocked = true;
        if (!hidden()) resume();
      });
    },
    setVolumes(v) {
      vols = { master: clamp(v.master, 0, 1), sfx: clamp(v.sfx, 0, 1), music: clamp(v.music, 0, 1) };
      safe(() => mixer?.setVolumes(vols));
    },
    status() {
      if (!Ctx && !ctx) return 'unavailable';
      if (!ctx || !unlocked) return 'locked';
      return ctx.state === 'running' ? 'running' : 'suspended';
    },
    track: () => wanted,
    analyser: () => mixer?.analyser ?? null,
    dispose() {
      if (disposed) return;
      disposed = true;
      stopTimer();
      env.doc?.removeEventListener('visibilitychange', onVisibility);
      cleanupGesture?.();
      safe(() => {
        ctx?.removeEventListener?.('statechange', onStateChange);
        music?.dispose();
        reaper.flush();
        limiter.clear();
        mixer?.dispose();
        void ctx?.close().catch(() => {});
      });
      ctx = null;
      music = null;
      mixer = null;
    },
  };
}
