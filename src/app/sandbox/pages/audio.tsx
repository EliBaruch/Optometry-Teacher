import { useEffect, useRef, useState } from 'preact/hooks';
import type { AudioPort, GameServices, SfxId, TrackId } from '@core';
import { Backdrop, Icon, isIconName, useInterval, useReducedMotion, type BackdropVariant } from '@ui-kit';
import { COMPOSITIONS, type AudioEngine, type AudioStatus } from '@audio';
import type { SandboxPage } from '../Sandbox';

/* ------------------------------------------------------------------ data */

interface TrackInfo { id: TrackId; name: string; mode: string; colour: string; mood: string; backdrop: BackdropVariant }
const TRACKS: TrackInfo[] = [
  { id: 'title', name: 'Observatory', mode: 'D lydian', colour: '#ffd27a', mood: 'Lush pads · celesta', backdrop: 'title' },
  { id: 'hub', name: 'Clinic Lounge', mode: 'D major', colour: '#f5b942', mood: 'Lo-fi keys · brushes', backdrop: 'hub' },
  { id: 'exam', name: 'Focus', mode: 'D lydian', colour: '#5eead4', mood: 'Minimal pulse', backdrop: 'exam' },
  { id: 'emergency', name: 'Code Red', mode: 'D phrygian', colour: '#ef4444', mood: 'Heartbeat · rising drone', backdrop: 'emergency' },
  { id: 'results', name: 'Triumph', mode: 'D major', colour: '#f472b6', mood: 'Rising shimmer', backdrop: 'results' },
  { id: 'zen', name: 'Stillness', mode: 'D lydian', colour: '#38bdf8', mood: 'Distant bells', backdrop: 'calm' },
];

/** `tier` marks the escalating fanfares (rare < level up < legendary). */
interface Pad { id: SfxId; label: string; icon?: string; tier?: 1 | 2 | 3 }
interface Family { name: string; blurb: string; colour: string; wide?: boolean; pads: Pad[] }
const FAMILIES: Family[] = [
  {
    name: 'Interface', blurb: 'Tactile glass — quiet enough to hear a thousand times', colour: '#38bdf8',
    pads: [
      { id: 'click', label: 'Click', icon: 'target' }, { id: 'hover', label: 'Hover', icon: 'sparkle' },
      { id: 'select', label: 'Select', icon: 'check' }, { id: 'back', label: 'Back', icon: 'chevron-left' },
      { id: 'pop', label: 'Pop', icon: 'plus' }, { id: 'whoosh', label: 'Whoosh', icon: 'arrow-right' },
      { id: 'thud', label: 'Thud', icon: 'minus' }, { id: 'tick', label: 'Tick', icon: 'clock' },
    ],
  },
  {
    name: 'Instruments', blurb: 'Precise optical hardware', colour: '#a78bfa',
    pads: [
      { id: 'lens-click', label: 'Lens click', icon: 'phoropter' }, { id: 'dial', label: 'Dial detent', icon: 'keratometry' },
      { id: 'flashlight', label: 'Penlight', icon: 'pupils' }, { id: 'door', label: 'Patient enters', icon: 'user' },
      { id: 'stamp', label: 'Grade stamp', icon: 'check' },
    ],
  },
  {
    name: 'Rewards', blurb: 'Coins, brass and glass — escalating fanfares', colour: '#ffd27a', wide: true,
    pads: [
      { id: 'success', label: 'Success', icon: 'check' }, { id: 'coin', label: 'Coin', icon: 'coin' },
      { id: 'coins', label: 'Coin shower', icon: 'coin' }, { id: 'combo', label: 'Combo', icon: 'lightning' },
      { id: 'sparkle', label: 'Sparkle', icon: 'sparkle' }, { id: 'streak-fire', label: 'Streak fire', icon: 'flame' },
      { id: 'unlock', label: 'Unlock', icon: 'unlock' }, { id: 'drumroll', label: 'Drumroll', icon: 'stats' },
      { id: 'reveal', label: 'Reveal', icon: 'eye' }, { id: 'chest-open', label: 'Chest', icon: 'crate' },
      { id: 'rare', label: 'Rare find', icon: 'gem', tier: 1 }, { id: 'levelup', label: 'Level up', icon: 'trophy', tier: 2 },
      { id: 'legendary', label: 'Legendary', icon: 'crown', tier: 3 },
    ],
  },
  {
    name: 'Alerts', blurb: 'Mistakes are gentle; emergencies are clear', colour: '#f43f5e',
    pads: [
      { id: 'fail', label: 'Gentle miss', icon: 'x' }, { id: 'error', label: 'Error', icon: 'warning' },
      { id: 'countdown', label: 'Countdown', icon: 'clock' }, { id: 'heartbeat', label: 'Heartbeat', icon: 'heart' },
      { id: 'alarm', label: 'Monitor alarm', icon: 'alert' },
    ],
  },
];

/** The sandbox passes the real engine; these extras are optional so any AudioPort still works. */
type Inspectable = AudioPort & Partial<Pick<AudioEngine, 'status' | 'track' | 'analyser'>>;

/* ------------------------------------------------------------ visualiser */

function Visualiser(props: { audio: Inspectable; colour: string; reduced: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const colour = useRef(props.colour);
  colour.current = props.colour;

  useEffect(() => {
    const cv = canvas.current;
    const g = cv?.getContext('2d');
    if (!cv || !g) return;
    let raf = 0;
    let w = 0;
    let h = 0;
    const resize = () => {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      w = cv.clientWidth;
      h = cv.clientHeight;
      cv.width = Math.round(w * dpr);
      cv.height = Math.round(h * dpr);
      g.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(resize) : null;
    ro?.observe(cv);

    const BARS = 56;
    const SPAN = 200; // 40 Hz … 8 kHz: where the score and the effects actually live
    const levels = new Float32Array(BARS);
    const peaks = new Float32Array(BARS);
    const peakAge = new Float32Array(BARS);
    let freq: Uint8Array<ArrayBuffer> | null = null;
    let wave: Uint8Array<ArrayBuffer> | null = null;
    let last = 0;

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw);
      if (props.reduced && now - last < 66) return; // ~15 fps, no idle motion
      last = now;
      const an = props.audio.analyser?.() ?? null;
      g.clearRect(0, 0, w, h);
      const mid = h * 0.68;
      const acc = colour.current;

      // Floor glow.
      const floor = g.createLinearGradient(0, mid, 0, h);
      floor.addColorStop(0, `${acc}22`);
      floor.addColorStop(1, '#0000');
      g.fillStyle = floor;
      g.fillRect(0, mid, w, h - mid);

      if (an) {
        if (!freq || freq.length !== an.frequencyBinCount) {
          freq = new Uint8Array(new ArrayBuffer(an.frequencyBinCount));
          wave = new Uint8Array(new ArrayBuffer(an.fftSize));
        }
        an.getByteFrequencyData(freq);
        an.getByteTimeDomainData(wave!);
      }
      // Log-spaced spectrum bars, mirrored below the horizon like a reflection.
      const gap = 3;
      const bw = Math.max(2, (w - gap * (BARS - 1)) / BARS);
      const grad = g.createLinearGradient(0, mid - h * 0.46, 0, mid);
      grad.addColorStop(0, '#fff4da');
      grad.addColorStop(0.35, acc);
      grad.addColorStop(1, '#a78bfa');
      for (let i = 0; i < BARS; i++) {
        let v = 0;
        if (freq && an) {
          // Log-spaced bands. Music energy falls ~4.5 dB/octave, so lift each band
          // by its position (pink-noise style tilt) to let glass and sparkle read
          // as clearly as the bass.
          const binHz = an.context.sampleRate / 2 / freq.length;
          const f0 = 40 * Math.pow(SPAN, i / BARS);
          const f1 = 40 * Math.pow(SPAN, (i + 1) / BARS);
          const lo = Math.max(1, Math.floor(f0 / binHz));
          const hi = Math.max(lo + 1, Math.ceil(f1 / binHz));
          let sum = 0;
          let n = 0;
          for (let k = lo; k < hi && k < freq.length; k++) {
            v = Math.max(v, freq[k]!);
            sum += freq[k]!;
            n++;
          }
          const x = (0.7 * v + 0.3 * (n ? sum / n : 0)) / 255;
          v = x > 0.08 ? Math.min(1, Math.pow(x + 0.26 * (i / BARS), 1.7)) : 0;
        } else if (!props.reduced) {
          v = 0.04 + 0.03 * Math.sin(now / 900 + i * 0.35);
        }
        levels[i] = Math.max(v, levels[i]! * 0.9);
        if (levels[i]! >= peaks[i]!) {
          peaks[i] = levels[i]!;
          peakAge[i] = 0;
        } else if (++peakAge[i]! > 18) {
          peaks[i] = Math.max(0, peaks[i]! - 0.012);
        }
        const bh = Math.max(2, levels[i]! * h * 0.46);
        const x = i * (bw + gap);
        g.fillStyle = grad;
        g.globalAlpha = 0.9;
        roundRect(g, x, mid - bh, bw, bh, Math.min(3, bw / 2));
        g.globalAlpha = 0.18;
        roundRect(g, x, mid + 3, bw, bh * 0.45, Math.min(3, bw / 2));
        if (peaks[i]! > 0.03) {
          g.globalAlpha = 0.85;
          g.fillStyle = '#fff4da';
          g.fillRect(x, mid - peaks[i]! * h * 0.46 - 5, bw, 2);
        }
      }
      g.globalAlpha = 1;

      // Oscilloscope trace.
      g.beginPath();
      const N = wave?.length ?? 128;
      let peak = 0.02;
      if (wave) for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(wave[i]! - 128) / 128);
      const scopeGain = Math.min(8, 0.8 / peak);
      for (let i = 0; i < N; i++) {
        const x = (i / (N - 1)) * w;
        const s = wave ? ((wave[i]! - 128) / 128) * scopeGain : props.reduced ? 0 : Math.sin(i / 9 + now / 600) * 0.03;
        const y = h * 0.2 + s * h * 0.15;
        if (i) g.lineTo(x, y);
        else g.moveTo(x, y);
      }
      g.strokeStyle = '#f6efe4cc';
      g.lineWidth = 1.5;
      g.shadowColor = acc;
      g.shadowBlur = 12;
      g.stroke();
      g.shadowBlur = 0;
    };
    raf = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(raf);
      ro?.disconnect();
    };
  }, [props.audio, props.reduced]);

  return <canvas ref={canvas} class="sbau-vis" aria-hidden="true" />;
}

function roundRect(g: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  g.beginPath();
  g.moveTo(x + r, y);
  g.arcTo(x + w, y, x + w, y + h, r);
  g.arcTo(x + w, y + h, x, y + h, r);
  g.arcTo(x, y + h, x, y, r);
  g.arcTo(x, y, x + w, y, r);
  g.closePath();
  g.fill();
}

/* ------------------------------------------------------------- pad juice */

const EASE_OUT = 'cubic-bezier(.2,.8,.2,1)';

/**
 * Hit feedback for an SFX pad: a glow + ripple bursting from the press point
 * and a springy icon bump. Driven by the Web Animations API on child elements
 * Preact never re-classes, so the re-render that follows a press cannot wipe
 * it (it fires on the first press of every pad, mouse, touch or keyboard).
 */
function flashPad(e: MouseEvent): void {
  const pad = e.currentTarget as HTMLElement | null;
  if (!pad || typeof pad.animate !== 'function') return;
  const r = pad.getBoundingClientRect();
  const keyboard = e.detail === 0; // Enter/Space: burst from the icon
  const x = keyboard ? 28 : e.clientX - r.left;
  const y = keyboard ? r.height / 2 : e.clientY - r.top;
  const flash = pad.querySelector<HTMLElement>('.sbau-pad-flash');
  if (flash) {
    flash.style.setProperty('--x', `${x}px`);
    flash.style.setProperty('--y', `${y}px`);
    flash.animate([{ opacity: 0.95 }, { opacity: 0 }], { duration: 560, easing: EASE_OUT });
  }
  const ring = pad.querySelector<HTMLElement>('.sbau-pad-ring');
  if (ring) {
    ring.style.left = `${x}px`;
    ring.style.top = `${y}px`;
    const reach = (2 * Math.hypot(Math.max(x, r.width - x), Math.max(y, r.height - y))) / 20; // ring is 20px
    ring.animate(
      [
        { transform: 'translate(-50%, -50%) scale(0.2)', opacity: 0.9 },
        { transform: `translate(-50%, -50%) scale(${reach.toFixed(2)})`, opacity: 0 },
      ],
      { duration: 640, easing: EASE_OUT },
    );
  }
  pad.querySelector<HTMLElement>('.sbau-pad-icon')?.animate(
    [
      { transform: 'scale(1)' },
      { transform: 'scale(1.22) rotate(-6deg)', offset: 0.35 },
      { transform: 'scale(0.96) rotate(2deg)', offset: 0.7 },
      { transform: 'scale(1)' },
    ],
    { duration: 420, easing: 'ease-out' },
  );
}

const STATUS_TEXT: Record<AudioStatus, string> = {
  running: 'Live',
  unavailable: 'Audio unavailable',
  suspended: 'Paused — tap to resume',
  locked: 'Tap to wake the audio',
};

/* ------------------------------------------------------------------ page */

type VolKey = 'masterVolume' | 'sfxVolume' | 'musicVolume';
const FADERS: { key: VolKey; label: string; colour: string }[] = [
  { key: 'masterVolume', label: 'Master', colour: '#ffd27a' },
  { key: 'sfxVolume', label: 'Effects', colour: '#a78bfa' },
  { key: 'musicVolume', label: 'Music', colour: '#38bdf8' },
];

function AudioStudio({ services }: { services: GameServices }) {
  const audio = services.audio as Inspectable;
  const reduced = useReducedMotion();
  const [status, setStatus] = useState<AudioStatus>(() => audio.status?.() ?? 'locked');
  const [track, setTrack] = useState<TrackId | null>(() => audio.track?.() ?? null);
  const [settings, setSettings] = useState(() => services.settings.get());
  const [pitch, setPitch] = useState(1);
  const [last, setLast] = useState<string>('');

  useEffect(() => services.settings.subscribe((s) => setSettings(s)), [services]);
  useInterval(() => {
    setStatus(audio.status?.() ?? 'running');
    setTrack(audio.track?.() ?? null);
  }, 250);

  const wake = () => audio.unlock();
  const playTrack = (id: TrackId | null) => {
    wake();
    audio.music(id);
    setTrack(id);
  };
  const playSfx = (id: SfxId, e?: MouseEvent) => {
    wake();
    audio.play(id, { pitch });
    setLast(id);
    // The flash/icon are never re-classed by Preact, so a re-render cannot cancel them.
    if (e && !reduced) flashPad(e);
  };
  const hoverPad = (e: PointerEvent) => {
    if (e.pointerType === 'mouse' && audio.status?.() === 'running') audio.play('hover', { pitch });
  };
  const setVol = (key: VolKey, v: number) => {
    services.settings.update((s) => ({ ...s, [key]: v }));
    const s = { ...services.settings.get(), [key]: v };
    audio.setVolumes({ master: s.masterVolume, sfx: s.sfxVolume, music: s.musicVolume });
  };

  // Keyboard: 1–6 tracks, 0 silence.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === '0') playTrack(null);
      const i = Number(e.key) - 1;
      if (i >= 0 && i < TRACKS.length) playTrack(TRACKS[i]!.id);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const current = TRACKS.find((t) => t.id === track);
  const accent = current?.colour ?? '#ffd27a';
  const live = status === 'running';

  return (
    <div class={`sbau ${reduced ? 'is-reduced' : ''}`} style={{ '--acc': accent }}>
      <style>{CSS}</style>
      <Backdrop variant={current?.backdrop ?? 'calm'} fixed />
      <main class="sbau-inner">
        <header class="sbau-head">
          <div>
            <p class="sbau-eyebrow">Lumen · Audio</p>
            <h1>Sound Studio</h1>
            <p class="sbau-sub">Every chime, coin and chord is synthesised live — no recordings. Everything is tuned to D, so effects always harmonise with the score.</p>
          </div>
          <button type="button" class={`sbau-status is-${status}`} onClick={wake}>
            <span class="sbau-led" aria-hidden="true" />
            {STATUS_TEXT[status]}
          </button>
          <p class="sbau-sr" role="status" aria-live="polite">{`Audio ${STATUS_TEXT[status].toLowerCase()}. ${current ? `Playing ${current.name}.` : 'No music.'}`}</p>
        </header>

        <section class="sbau-top">
          <div class="sbau-panel sbau-scope">
            <div class="sbau-now">
              <span class="sbau-label">Now playing</span>
              <strong>{current ? current.name : 'Silence'}</strong>
              {current && <span class="sbau-num">{current.mode} · {COMPOSITIONS[current.id].bpm} bpm</span>}
            </div>
            <Visualiser audio={audio} colour={accent} reduced={reduced} />
            {!live && <div class="sbau-veil">{status === 'unavailable' ? 'WebAudio is not available in this browser.' : 'Press any pad to begin.'}</div>}
          </div>

          <div class="sbau-panel sbau-desk" role="group" aria-label="Mixer">
            {FADERS.map((f) => {
              const v = settings[f.key];
              return (
                <div key={f.key} class="sbau-fader" style={{ '--fc': f.colour, '--fv': v }}>
                  <span class="sbau-num sbau-db" aria-hidden="true">{Math.round(v * 100)}</span>
                  <span class="sbau-track">
                    <input
                      type="range" min={0} max={1} step={0.01} value={v} aria-label={`${f.label} volume`}
                      aria-valuetext={`${Math.round(v * 100)} percent`}
                      onInput={(e) => setVol(f.key, Number((e.currentTarget as HTMLInputElement).value))}
                    />
                  </span>
                  <span class="sbau-label">{f.label}</span>
                </div>
              );
            })}
            <span class="sbau-desk-rule" aria-hidden="true" />
            <div class="sbau-fader" style={{ '--fc': '#f472b6', '--fv': (pitch - 0.5) / 1.5 }}>
              <span class="sbau-num sbau-db" aria-hidden="true">×{pitch.toFixed(2)}</span>
              <span class="sbau-track">
                <input
                  type="range" min={0.5} max={2} step={0.01} value={pitch} aria-label="Audition pitch"
                  aria-valuetext={`${pitch.toFixed(2)} times`} title="Audition pitch — double-click to reset"
                  onInput={(e) => setPitch(Number((e.currentTarget as HTMLInputElement).value))}
                  onDblClick={() => setPitch(1)}
                />
              </span>
              <button type="button" class="sbau-reset" disabled={pitch === 1} onClick={() => setPitch(1)}
                aria-label="Reset audition pitch" title="Reset pitch to ×1.00">
                <Icon name="refresh" size={12} /> Pitch
              </button>
            </div>
          </div>
        </section>

        <section class="sbau-panel">
          <div class="sbau-sec-head">
            <h2>Score</h2>
            <p>Generative and endlessly varying · crossfades between scenes<span class="sbau-keyhint"> · keys <kbd>1</kbd>–<kbd>6</kbd>, <kbd>0</kbd> silence</span></p>
          </div>
          <div class="sbau-tracks">
            {TRACKS.map((t, i) => {
              const on = track === t.id;
              return (
                <button key={t.id} type="button" class={`sbau-trackbtn ${on ? 'is-on' : ''}`} style={{ '--tc': t.colour }}
                  aria-pressed={on} onClick={() => playTrack(on ? null : t.id)}>
                  <span class="sbau-eq" aria-hidden="true"><i /><i /><i /><i /></span>
                  <span class="sbau-tname">{t.name}</span>
                  <span class="sbau-tmeta">{t.mode} · {COMPOSITIONS[t.id].bpm} bpm</span>
                  <span class="sbau-tmood">{t.mood}</span>
                  <kbd class="sbau-key">{i + 1}</kbd>
                </button>
              );
            })}
          </div>
        </section>

        <section class="sbau-families">
          {FAMILIES.map((f) => (
            <div key={f.name} class={`sbau-panel sbau-family ${f.wide ? 'is-wide' : ''}`} style={{ '--fc': f.colour }}>
              <div class="sbau-sec-head">
                <h2>{f.name}</h2>
                <p>{f.blurb}</p>
              </div>
              <div class="sbau-pads">
                {f.pads.filter((p) => !p.tier).map((p) => (
                  <button key={p.id} type="button" class={`sbau-pad ${last === p.id ? 'is-last' : ''}`}
                    onClick={(e) => playSfx(p.id, e)} onPointerEnter={hoverPad}>
                    <span class="sbau-pad-flash" aria-hidden="true" />
                    <span class="sbau-pad-ring" aria-hidden="true" />
                    <span class="sbau-pad-icon" aria-hidden="true">
                      {p.icon && isIconName(p.icon) ? <Icon name={p.icon} size={18} /> : <Icon name="play" size={16} />}
                    </span>
                    <span class="sbau-pad-label">{p.label}</span>
                    <span class="sbau-pad-id">{p.id}</span>
                  </button>
                ))}
              </div>
              {f.pads.some((p) => p.tier) && (
                <div class="sbau-ladder" role="group" aria-label="Fanfares, from smallest to grandest">
                  {f.pads.filter((p) => p.tier).map((p) => (
                    <button key={p.id} type="button" class={`sbau-pad sbau-fanfare ${last === p.id ? 'is-last' : ''}`}
                      style={{ '--tier': p.tier }} onClick={(e) => playSfx(p.id, e)} onPointerEnter={hoverPad}>
                      <span class="sbau-pad-flash" aria-hidden="true" />
                      <span class="sbau-pad-ring" aria-hidden="true" />
                      <span class="sbau-pad-icon" aria-hidden="true">
                        {p.icon && isIconName(p.icon) ? <Icon name={p.icon} size={22} /> : <Icon name="play" size={18} />}
                      </span>
                      <span class="sbau-pad-label">{p.label}</span>
                      <span class="sbau-pad-id">{p.id}</span>
                      <span class="sbau-pips" aria-hidden="true">{[1, 2, 3].map((n) => <i key={n} class={n <= p.tier! ? 'is-on' : ''} />)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </section>
      </main>
    </div>
  );
}

const CSS = `
.sbau { position: absolute; inset: 0; overflow-y: auto; overflow-x: hidden; color: var(--lm-ivory, #f6efe4);
  font-family: var(--lm-font-ui, 'Inter Variable', system-ui, sans-serif); background: #0b0716; -webkit-tap-highlight-color: transparent; }
.sbau-inner { position: relative; z-index: 1; max-width: 1180px; margin: 0 auto; padding: clamp(16px, 3vw, 36px) clamp(12px, 3vw, 32px) 48px; display: grid; gap: 18px; }
.sbau-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; }
.sbau-eyebrow { margin: 0 0 6px; font: 600 11px/1 var(--lm-font-ui, sans-serif); letter-spacing: .18em; text-transform: uppercase; color: var(--acc); opacity: .9; }
.sbau-head h1 { margin: 0; font-family: var(--lm-font-display, 'Fraunces Variable', Georgia, serif); font-weight: 500; font-size: clamp(30px, 4.4vw, 52px);
  line-height: 1.02; letter-spacing: -.01em; background: linear-gradient(180deg, #fff6df 20%, #ffd27a 100%); -webkit-background-clip: text; background-clip: text; color: transparent;
  filter: drop-shadow(0 0 24px #ffd27a33); }
.sbau-sub { margin: 10px 0 0; max-width: 62ch; color: var(--lm-muted, #a99bbd); font-size: 14px; line-height: 1.55; }
.sbau-status { appearance: none; display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; border-radius: 999px; cursor: pointer;
  font: 600 13px/1 var(--lm-font-ui, sans-serif); color: var(--lm-ivory, #f6efe4); background: linear-gradient(180deg, #ffffff14, #ffffff06);
  border: 1px solid #ffffff22; backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); transition: border-color .2s, box-shadow .2s; }
.sbau-status:hover { border-color: #ffd27a88; }
.sbau-status:focus-visible, .sbau-pad:focus-visible, .sbau-trackbtn:focus-visible { outline: 2px solid #ffd27a; outline-offset: 3px; }
.sbau-led { width: 9px; height: 9px; border-radius: 50%; background: #7d6f95; box-shadow: 0 0 0 3px #7d6f9533; }
.sbau-status.is-running .sbau-led { background: #5eead4; box-shadow: 0 0 12px #5eead4, 0 0 0 3px #5eead433; animation: sbau-breathe 2.4s ease-in-out infinite; }
.sbau-status.is-locked .sbau-led, .sbau-status.is-suspended .sbau-led { background: #ffd27a; box-shadow: 0 0 10px #ffd27a88; }
@keyframes sbau-breathe { 50% { box-shadow: 0 0 4px #5eead4, 0 0 0 6px #5eead411; } }

.sbau-panel { position: relative; border-radius: 22px; padding: 18px; background: linear-gradient(180deg, #ffffff10, #ffffff04 60%, #ffffff06);
  border: 1px solid #ffffff17; box-shadow: 0 24px 60px #0007, inset 0 1px 0 #ffffff1c; backdrop-filter: blur(16px) saturate(1.2); -webkit-backdrop-filter: blur(16px) saturate(1.2); }
.sbau-label { font: 600 10px/1 var(--lm-font-ui, sans-serif); letter-spacing: .16em; text-transform: uppercase; color: var(--lm-muted, #a99bbd); }
.sbau-num { font-family: var(--lm-font-num, 'Space Grotesk', monospace); font-variant-numeric: tabular-nums; }

.sbau-top { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 18px; }
.sbau-scope { display: flex; flex-direction: column; overflow: hidden; border-color: color-mix(in srgb, var(--acc) 30%, #ffffff17);
  box-shadow: 0 24px 60px #0007, 0 0 60px color-mix(in srgb, var(--acc) 14%, transparent), inset 0 1px 0 #ffffff1c; transition: border-color .6s, box-shadow .6s; }
.sbau-now { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; position: relative; z-index: 1; }
.sbau-now strong { font-family: var(--lm-font-display, Georgia, serif); font-weight: 500; font-size: 22px; color: var(--acc); transition: color .6s; }
.sbau-now .sbau-num { font-size: 12px; color: var(--lm-muted, #a99bbd); }
.sbau-vis { width: 100%; height: 210px; display: block; margin-top: 8px; }
.sbau-veil { position: absolute; inset: auto 0 18px; text-align: center; font-size: 13px; color: var(--lm-muted, #a99bbd); letter-spacing: .02em; pointer-events: none; }

.sbau-desk { display: flex; gap: 6px; padding: 16px 14px; align-items: center; }
.sbau-fader { display: grid; justify-items: center; gap: 10px; width: 66px; }
.sbau-db { font-size: 13px; color: var(--fc); min-height: 1em; }
.sbau-track { position: relative; height: 150px; width: 40px; display: grid; place-items: center; border-radius: 14px;
  background: linear-gradient(180deg, #00000055, #00000022); box-shadow: inset 0 1px 6px #000a, 0 1px 0 #ffffff12; }
.sbau-track::before { content: ''; position: absolute; left: 50%; bottom: 12px; width: 4px; transform: translateX(-50%); border-radius: 4px;
  height: calc((100% - 24px) * var(--fv));
  background: linear-gradient(0deg, color-mix(in srgb, var(--fc) 40%, transparent), var(--fc)); box-shadow: 0 0 14px var(--fc); pointer-events: none; }
.sbau-track input { writing-mode: vertical-lr; direction: rtl; appearance: none; -webkit-appearance: none; width: 40px; height: 126px; margin: 0; background: transparent; cursor: grab; position: relative; z-index: 1; touch-action: none; }
.sbau-track input:active { cursor: grabbing; }
.sbau-track input::-webkit-slider-runnable-track { width: 4px; background: #ffffff14; border-radius: 4px; }
.sbau-track input::-moz-range-track { width: 4px; background: #ffffff14; border-radius: 4px; }
.sbau-track input::-webkit-slider-thumb { -webkit-appearance: none; width: 30px; height: 16px; border-radius: 6px; margin-left: -13px;
  background: linear-gradient(180deg, #fff4da, #d9962a 55%, #a86d17); border: 1px solid #4a2e06; box-shadow: 0 4px 10px #000a, inset 0 1px 0 #ffffffaa, 0 0 0 3px color-mix(in srgb, var(--fc) 25%, transparent); }
.sbau-track input::-moz-range-thumb { width: 30px; height: 16px; border-radius: 6px; background: linear-gradient(180deg, #fff4da, #d9962a 55%, #a86d17); border: 1px solid #4a2e06; }
.sbau-track input:focus-visible { outline: 2px solid #ffd27a; outline-offset: 2px; border-radius: 8px; }

.sbau-desk-rule { align-self: stretch; width: 1px; margin: 8px 4px; background: linear-gradient(180deg, transparent, #ffffff26, transparent); }
.sbau-reset { appearance: none; display: inline-flex; align-items: center; gap: 4px; padding: 3px 7px; margin: -3px 0; border-radius: 999px; cursor: pointer;
  font: 600 10px/1 var(--lm-font-ui, sans-serif); letter-spacing: .16em; text-transform: uppercase; color: var(--lm-muted, #a99bbd);
  background: transparent; border: 1px solid transparent; transition: color .2s, border-color .2s, background .2s; }
.sbau-reset:not(:disabled) { color: var(--fc); border-color: color-mix(in srgb, var(--fc) 45%, transparent); background: color-mix(in srgb, var(--fc) 10%, transparent); }
.sbau-reset:not(:disabled):hover { background: color-mix(in srgb, var(--fc) 20%, transparent); }
.sbau-reset:disabled { cursor: default; }
.sbau-reset:focus-visible { outline: 2px solid #ffd27a; outline-offset: 2px; }
.sbau-sr { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; border: 0; }
@media (hover: none) { .sbau-keyhint, .sbau-key { display: none; } }
.sbau-sec-head { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; margin-bottom: 14px; }
.sbau-sec-head h2 { margin: 0; font-family: var(--lm-font-display, Georgia, serif); font-weight: 500; font-size: 22px; color: #fff4da; }
.sbau-sec-head p { margin: 0; font-size: 12.5px; color: var(--lm-muted, #a99bbd); }
.sbau kbd { font: 500 11px/1 var(--lm-font-num, monospace); padding: 2px 5px; border-radius: 5px; border: 1px solid #ffffff26; background: #ffffff0d; color: var(--lm-ivory-dim, #ddd3c4); }

.sbau-tracks { display: grid; grid-template-columns: repeat(6, minmax(0, 1fr)); gap: 10px; }
.sbau-trackbtn { appearance: none; position: relative; text-align: left; display: grid; gap: 4px; padding: 14px 14px 12px; border-radius: 16px; cursor: pointer; overflow: hidden;
  color: inherit; font: inherit; border: 1px solid #ffffff17; background: linear-gradient(160deg, color-mix(in srgb, var(--tc) 14%, transparent), #ffffff05 55%);
  transition: transform .22s cubic-bezier(.2,.8,.2,1), border-color .22s, box-shadow .22s; }
.sbau-trackbtn:hover { transform: translateY(-2px); border-color: color-mix(in srgb, var(--tc) 60%, transparent); box-shadow: 0 10px 30px #0006, 0 0 24px color-mix(in srgb, var(--tc) 20%, transparent); }
.sbau-trackbtn:active { transform: translateY(0) scale(.98); }
.sbau-trackbtn.is-on { border-color: var(--tc); box-shadow: 0 0 0 1px var(--tc), 0 0 36px color-mix(in srgb, var(--tc) 35%, transparent), inset 0 0 30px color-mix(in srgb, var(--tc) 12%, transparent); }
.sbau-tname { font-family: var(--lm-font-display, Georgia, serif); font-size: 17px; font-weight: 500; color: #fff4da; }
.sbau-tmeta { font: 500 11.5px/1.2 var(--lm-font-num, monospace); color: var(--tc); }
.sbau-tmood { font-size: 11.5px; color: var(--lm-muted, #a99bbd); }
.sbau-key { position: absolute; top: 10px; right: 10px; opacity: .7; }
.sbau-eq { display: flex; align-items: flex-end; gap: 3px; height: 16px; margin-bottom: 4px; }
.sbau-eq i { width: 3px; height: 4px; border-radius: 2px; background: var(--tc); opacity: .45; transition: height .3s; }
.sbau-trackbtn.is-on .sbau-eq i { opacity: 1; box-shadow: 0 0 8px var(--tc); animation: sbau-eq 1.1s ease-in-out infinite; }
.sbau-trackbtn.is-on .sbau-eq i:nth-child(2) { animation-delay: -.35s; } .sbau-trackbtn.is-on .sbau-eq i:nth-child(3) { animation-delay: -.7s; } .sbau-trackbtn.is-on .sbau-eq i:nth-child(4) { animation-delay: -.2s; }
@keyframes sbau-eq { 0%,100% { height: 4px; } 50% { height: 16px; } }

.sbau-families { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 18px; }
.sbau-family.is-wide { grid-column: 1 / -1; order: -1; }
.sbau-family.is-wide .sbau-pads { grid-template-columns: repeat(5, minmax(0, 1fr)); }
.sbau-family:not(.is-wide) .sbau-pads { grid-template-columns: repeat(auto-fill, minmax(136px, 1fr)); }
.sbau-ladder { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 10px; }
.sbau-fanfare { --g: calc(var(--tier) * 1); min-height: 68px; padding: 13px 14px; column-gap: 12px; grid-template-columns: auto 1fr auto;
  border-color: color-mix(in srgb, var(--fc) calc(18% + var(--tier) * 14%), transparent);
  background: linear-gradient(115deg, color-mix(in srgb, var(--fc) calc(4% + var(--tier) * 6%), transparent), #ffffff04 60%),
    radial-gradient(120% 140% at 100% 0%, color-mix(in srgb, #f472b6 calc(var(--tier) * 7%), transparent), transparent 60%);
  box-shadow: inset 0 1px 0 #ffffff1a, 0 6px 20px #0005, 0 0 calc(var(--tier) * 10px) color-mix(in srgb, var(--fc) calc(var(--tier) * 8%), transparent); }
.sbau-fanfare .sbau-pad-icon { width: 40px; height: 40px; border-radius: 12px;
  background: radial-gradient(circle at 35% 30%, color-mix(in srgb, var(--fc) 40%, transparent), color-mix(in srgb, var(--fc) 10%, transparent)); }
.sbau-fanfare .sbau-pad-label { font-family: var(--lm-font-display, Georgia, serif); font-weight: 500; font-size: 16px; color: #fff4da; }
.sbau-fanfare:nth-child(3) .sbau-pad-label { background: linear-gradient(90deg, #fff4da, #ffd27a 50%, #f472b6); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sbau-fanfare .sbau-pad-icon { grid-column: 1; grid-row: 1 / span 2; }
.sbau-fanfare .sbau-pad-label, .sbau-fanfare .sbau-pad-id { grid-column: 2; }
.sbau-pips { grid-column: 3; grid-row: 1 / span 2; display: flex; gap: 4px; position: relative; z-index: 1; }
.sbau-pips i { width: 6px; height: 6px; border-radius: 50%; background: #ffffff1f; }
.sbau-pips i.is-on { background: var(--fc); box-shadow: 0 0 8px var(--fc); }
.sbau-family { border-color: color-mix(in srgb, var(--fc) 22%, #ffffff17); }
.sbau-family .sbau-sec-head h2 { color: color-mix(in srgb, var(--fc) 55%, #fff4da); }
.sbau-pads { display: grid; grid-template-columns: repeat(auto-fill, minmax(148px, 1fr)); gap: 8px; }
.sbau-pad { appearance: none; position: relative; display: grid; grid-template-columns: auto 1fr; grid-template-rows: auto auto; column-gap: 10px; align-items: center;
  text-align: left; padding: 11px 12px; min-height: 52px; border-radius: 14px; cursor: pointer; color: inherit; font: inherit; overflow: hidden;
  border: 1px solid #ffffff14; background: linear-gradient(180deg, #ffffff0e, #ffffff03); box-shadow: inset 0 1px 0 #ffffff12, 0 4px 14px #0004;
  transition: transform .16s cubic-bezier(.2,.8,.2,1), border-color .2s, background .2s, box-shadow .2s; touch-action: manipulation; }
.sbau-pad:hover { border-color: color-mix(in srgb, var(--fc) 65%, transparent); background: linear-gradient(180deg, color-mix(in srgb, var(--fc) 16%, transparent), #ffffff05); transform: translateY(-1px); }
.sbau-pad:active { transform: translateY(1px) scale(.97); }
.sbau-pad.is-last { border-color: color-mix(in srgb, var(--fc) 80%, transparent); }
.sbau-pad-flash { position: absolute; inset: 0; border-radius: inherit; pointer-events: none; opacity: 0;
  background: radial-gradient(140px 90px at var(--x, 28px) var(--y, 50%), color-mix(in srgb, var(--fc) 60%, #fff4da 10%), color-mix(in srgb, var(--fc) 18%, transparent) 55%, transparent 80%); }
.sbau-pad-ring { position: absolute; left: 28px; top: 50%; width: 20px; height: 20px; border-radius: 50%; pointer-events: none; opacity: 0;
  border: 1.5px solid color-mix(in srgb, var(--fc) 70%, #fff4da); box-shadow: 0 0 10px var(--fc), inset 0 0 6px color-mix(in srgb, var(--fc) 40%, transparent); }
.sbau-pad.is-last::before { content: ''; position: absolute; left: 12px; right: 12px; bottom: 0; height: 2px; border-radius: 2px; pointer-events: none;
  background: linear-gradient(90deg, transparent, var(--fc), transparent); box-shadow: 0 0 10px var(--fc); }
.sbau-pad-icon { position: relative; z-index: 1; grid-row: span 2; width: 32px; height: 32px; border-radius: 10px; display: grid; place-items: center; color: var(--fc);
  background: color-mix(in srgb, var(--fc) 14%, transparent); box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--fc) 30%, transparent); }
.sbau-pad-label, .sbau-pad-id { position: relative; z-index: 1; }
.sbau-pad-label { font-size: 13px; font-weight: 600; line-height: 1.2; color: var(--lm-ivory, #f6efe4); }
.sbau-pad-id { font: 500 10.5px/1.2 var(--lm-font-num, monospace); color: var(--lm-muted-2, #7d6f95); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

.sbau.is-reduced *, .sbau.is-reduced *::before, .sbau.is-reduced *::after { animation: none !important; transition: none !important; }

@media (max-width: 980px) {
  .sbau-top { grid-template-columns: 1fr; }
  .sbau-desk { justify-content: space-around; }
  .sbau-tracks { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  .sbau-families { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sbau-family:first-child { grid-column: 1 / -1; }
  .sbau-family:first-child .sbau-pads { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
@media (max-width: 720px) {
  .sbau-families { grid-template-columns: 1fr; }
  .sbau-family.is-wide .sbau-pads, .sbau-family:first-child .sbau-pads { grid-template-columns: repeat(3, minmax(0, 1fr)); }
}
@media (max-width: 560px) {
  .sbau-inner { gap: 14px; padding-left: 12px; padding-right: 12px; }
  .sbau-panel { padding: 14px; border-radius: 18px; }
  .sbau-tracks { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
  .sbau-pads, .sbau-family.is-wide .sbau-pads, .sbau-family:first-child .sbau-pads { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .sbau-ladder { grid-template-columns: 1fr; gap: 8px; }
  .sbau-fader { width: auto; flex: 1; }
  .sbau-track { height: 130px; }
  .sbau-track input { height: 108px; }
  .sbau-vis { height: 170px; }
  .sbau-key { display: none; }
}
`;

const page: SandboxPage = {
  id: 'audio',
  title: 'Sound Studio',
  component: AudioStudio,
};
export default page;
