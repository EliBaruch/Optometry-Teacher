import { useEffect, useRef, useState } from 'preact/hooks';
import type { BurstOptions, GameServices, SfxId } from '@core';
import { createFxController, type FxController } from '@render';
import type { SandboxPage } from '../Sandbox';

type Kind = NonNullable<BurstOptions['kind']>;
const KINDS: { kind: Kind; label: string; sfx: SfxId; color: string }[] = [
  { kind: 'confetti', label: 'Confetti', sfx: 'levelup', color: '#3b6bff' },
  { kind: 'sparks', label: 'Sparks', sfx: 'sparkle', color: '#3b6bff' },
  { kind: 'coins', label: 'Coins', sfx: 'coins', color: '#f5a524' },
  { kind: 'stars', label: 'Stars', sfx: 'sparkle', color: '#f59e0b' },
  { kind: 'hearts', label: 'Hearts', sfx: 'pop', color: '#fb7185' },
  { kind: 'embers', label: 'Embers', sfx: 'whoosh', color: '#f97316' },
];

const CSS = `
.sbfx { position: absolute; inset: 0; overflow: hidden; color: var(--lm-ink, #0a1633); font-family: 'Inter Variable', system-ui, sans-serif;
  background: radial-gradient(60% 50% at 15% 10%, rgba(78,204,245,.35), transparent 70%), radial-gradient(55% 50% at 90% 15%, rgba(162,93,220,.22), transparent 70%), radial-gradient(60% 50% at 70% 95%, rgba(253,171,61,.22), transparent 70%), #eef2fa; user-select: none; touch-action: manipulation; }
.sbfx-stage { position: absolute; inset: 0; cursor: crosshair; }
.sbfx-stars { display: none; }
.sbfx-window { position: absolute; left: 50%; top: 46%; width: min(62vmin, 520px); transform: translate(-50%, -50%); opacity: 1; border-radius: 50%; background: rgba(255,255,255,.45); box-shadow: inset 0 1px 0 rgba(255,255,255,.9), 0 20px 60px rgba(34,87,240,.16); padding: 2%; box-sizing: border-box; pointer-events: none; }
.sbfx-title { position: absolute; top: 22px; left: 0; right: 0; text-align: center; pointer-events: none; }
.sbfx-title h1 { font: 800 clamp(28px, 5vw, 52px)/1.05 'Inter Variable', system-ui, sans-serif; margin: 0; letter-spacing: -.02em; color: var(--lm-ink, #0a1633); }
.sbfx-title p { margin: 6px 0 0; color: var(--lm-ink-3, #4a5878); font-size: 13px; }
.sbfx-panel { position: absolute; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(960px, calc(100% - 24px));
  box-sizing: border-box; padding: 14px; border-radius: 28px; background: var(--lm-glass); -webkit-backdrop-filter: var(--lm-glass-blur); backdrop-filter: var(--lm-glass-blur); box-shadow: var(--lm-glass-highlight), var(--lm-glass-shadow); }
.sbfx-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sbfx-row + .sbfx-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--lm-rule, rgba(10,22,51,.08)); }
.sbfx-label { font: 600 10px/1 'Inter Variable', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--lm-ink-3, #4a5878); min-width: 64px; }
.sbfx-btn { appearance: none; border: 1px solid var(--lm-border, #dbe6ea); background: rgba(255,255,255,.7); color: var(--lm-ink, #0a1633);
  font: 600 13px/1 'Inter Variable', sans-serif; padding: 10px 16px; border-radius: 999px; cursor: pointer; display: inline-flex; gap: 8px; align-items: center;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), border-color .18s, background .18s, box-shadow .18s; min-height: 40px; }
.sbfx-btn:hover { border-color: #3b6bff; background: #fff; box-shadow: 0 8px 20px rgba(59, 107, 255, .20); transform: translateY(-2px); }
.sbfx-btn:active { transform: translateY(1px) scale(.97); }
.sbfx-btn:focus-visible { outline: 2px solid #3b6bff; outline-offset: 2px; }
.sbfx-btn[aria-pressed="true"] { background: linear-gradient(180deg,#5b86ff,#2257f0); border-color: transparent; color: #fff; box-shadow: inset 0 1px 0 rgba(255,255,255,.4), 0 6px 16px rgba(34,87,240,.3); }
.sbfx-dot { width: 10px; height: 10px; border-radius: 50%; background: currentColor; box-shadow: 0 0 0 2px rgba(255,255,255,.9); }
.sbfx-btn[aria-pressed="true"] .sbfx-dot { background: #fff !important; box-shadow: none; }
.sbfx-btn[aria-pressed="true"] .sbfx-kbd { color: #fff; background: rgba(255,255,255,.22); border-color: rgba(255,255,255,.4); }
.sbfx-kbd { font: 500 10px/1 'Space Grotesk', monospace; color: var(--lm-ink-3, #4a5878); border: 1px solid var(--lm-border, #dbe6ea); border-radius: 4px; padding: 2px 4px; }
.sbfx-btn--good { background: #b6f0d4; border-color: transparent; } .sbfx-btn--bad { background: #ffd0d6; border-color: transparent; } .sbfx-btn--red { background: #ffc2cb; border-color: transparent; }
.sbfx-meta { margin-left: auto; font: 500 12px 'Space Grotesk', monospace; color: var(--lm-ink-3, #4a5878); }
@media (max-width: 600px) { .sbfx { overflow-y: auto; } .sbfx-stage { position: relative; inset: auto; height: 50vh; min-height: 300px; } .sbfx-window { top: 62%; width: min(62vw, 280px); } .sbfx-panel { position: relative; left: auto; bottom: auto; transform: none; margin: 8px 12px 16px; width: auto; } .sbfx-btn { padding: 9px 10px; font-size: 12px; } .sbfx-label { display: none; } .sbfx-panel { padding: 10px; } .sbfx-row { gap: 6px; } .sbfx-row + .sbfx-row { margin-top: 6px; padding-top: 6px; } .sbfx-btn { min-height: 36px; } .sbfx-kbd { display: none; } .sbfx-meta { margin-left: 0; } }
`;

function RoseWindow() {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const jewels = ['#3b6bff', '#4eccf5', '#a25ddc', '#ff5a6e', '#00c875', '#fdab3d'];
  return (
    <svg class="sbfx-window" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="sbfx-glow"><stop offset="0" stop-color="#7aa2ff" stop-opacity=".5" /><stop offset="1" stop-color="#7aa2ff" stop-opacity="0" /></radialGradient>
      </defs>
      <circle r="98" fill="url(#sbfx-glow)" opacity=".35" />
      {petals.map((a, i) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0,-22 C14,-40 14,-70 0,-92 C-14,-70 -14,-40 0,-22Z" fill={jewels[i % jewels.length]} opacity=".5" stroke="#3b6bff" stroke-opacity=".45" stroke-width=".8" />
          <circle cy="-80" r="5" fill={jewels[(i + 3) % jewels.length]} opacity=".6" stroke="#3b6bff" stroke-opacity=".5" stroke-width=".6" />
        </g>
      ))}
      <circle r="22" fill="#3b6bff" opacity=".12" stroke="#3b6bff" stroke-opacity=".6" stroke-width="1" />
      <circle r="95" fill="none" stroke="#3b6bff" stroke-opacity=".35" stroke-width="1.2" />
      <circle r="10" fill="#ffffff" stroke="#3b6bff" stroke-opacity=".7" />
    </svg>
  );
}

function RenderFxPage({ services }: { services: GameServices }) {
  const stage = useRef<HTMLDivElement>(null);
  const layer = useRef<HTMLDivElement>(null);
  const fxRef = useRef<FxController | null>(null);
  const [reduced, setReduced] = useState(false);
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const [kind, setKind] = useState<Kind>('confetti');
  const kindRef = useRef(kind);
  kindRef.current = kind;
  const [count, setCount] = useState(0);

  useEffect(() => {
    const fx = createFxController(layer.current!, stage.current!, { reducedMotion: () => reducedRef.current });
    fxRef.current = fx;
    const iv = setInterval(() => setCount(fx.particleCount), 250);
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= KINDS.length) {
        const k = KINDS[n - 1]!;
        setKind(k.kind);
        fire(k.kind);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => {
      clearInterval(iv);
      window.removeEventListener('keydown', onKey);
      fx.destroy();
      fxRef.current = null;
    };
  }, []);

  const centre = () => {
    const r = stage.current!.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height * 0.42 };
  };
  const sfx = (id: SfxId, pitch?: number) => services.audio.play(id, pitch ? { pitch } : undefined);
  const fire = (k: Kind, x?: number, y?: number) => {
    const c = centre();
    const meta = KINDS.find((m) => m.kind === k)!;
    fxRef.current?.burst(x ?? c.x, y ?? c.y, { kind: k });
    sfx(meta.sfx);
  };

  const onStageDown = (e: PointerEvent) => {
    if ((e.target as HTMLElement).closest('.sbfx-panel')) return;
    services.audio.unlock();
    fire(kindRef.current, e.clientX, e.clientY);
  };

  const fx = () => fxRef.current!;
  const correct = () => {
    const c = centre();
    fx().hitstop(110);
    fx().flash('#eaf0ff', 280);
    fx().burst(c.x, c.y, { kind: 'stars', count: 22 });
    fx().burst(c.x, c.y, { kind: 'confetti', count: 90 });
    fx().floatText('+120', c.x, c.y - 30, { size: 44 });
    sfx('success');
    setTimeout(() => {
      fx()?.burst(c.x, c.y + 40, { kind: 'coins', count: 16 });
      fx()?.floatText('✦ 35', c.x + 70, c.y + 10, { color: '#e08a00', size: 28 });
      sfx('coins');
    }, 260);
  };
  const wrong = () => {
    fx().shake(14, 420);
    fx().vignette('#ff5a6e', 700);
    const c = centre();
    fx().floatText('Missed', c.x, c.y, { color: '#ff5a6e', size: 30 });
    sfx('fail');
  };
  const codeRed = () => {
    fx().vignette('#ff5a6e', 1800);
    fx().shake(6, 900);
    // embers rise from the bottom edge, so they read above any control panel
    const w = window.innerWidth;
    const y = window.innerHeight - 6;
    for (let i = 0; i < 5; i++) fx().burst(w * (0.1 + i * 0.2), y, { kind: 'embers', count: 10, color: i % 2 ? '#f97316' : '#ff5a6e' });
    sfx('alarm');
  };

  return (
    <div class="sbfx">
      <style>{CSS}</style>
      <div class="sbfx-stage" ref={stage} onPointerDown={onStageDown} data-testid="fx-stage">
        <div class="sbfx-stars" />
        <RoseWindow />
        <div class="sbfx-title">
          <h1>Light &amp; Spectacle</h1>
          <p>Click or tap anywhere to burst · keys 1–6 pick a particle</p>
        </div>
      </div>
      <div class="sbfx-panel" role="toolbar" aria-label="Effects">
        <div class="sbfx-row">
          <span class="sbfx-label">Particles</span>
          {KINDS.map((k, i) => (
            <button key={k.kind} class="sbfx-btn" aria-pressed={kind === k.kind} data-kind={k.kind}
              onClick={() => { setKind(k.kind); fire(k.kind); }}>
              <span class="sbfx-dot" style={{ color: k.color }} />{k.label}<span class="sbfx-kbd">{i + 1}</span>
            </button>
          ))}
        </div>
        <div class="sbfx-row">
          <span class="sbfx-label">Feel</span>
          <button class="sbfx-btn" data-fx="float" onClick={() => { const c = centre(); fx().floatText(`+${10 + Math.floor(Math.random() * 190)}`, c.x, c.y); sfx('pop'); }}>Float text</button>
          <button class="sbfx-btn" data-fx="shake" onClick={() => { fx().shake(12, 420); sfx('thud'); }}>Shake</button>
          <button class="sbfx-btn" data-fx="flash" onClick={() => { fx().flash('#eaf0ff', 300); sfx('reveal'); }}>Flash</button>
          <button class="sbfx-btn" data-fx="vignette" onClick={() => { fx().vignette('#4eccf5', 1100); sfx('whoosh'); }}>Vignette</button>
          <button class="sbfx-btn" data-fx="hitstop" onClick={() => { const c = centre(); fx().burst(c.x, c.y, { kind: 'sparks' }); fx().hitstop(140); sfx('stamp'); }}>Hit-stop</button>
        </div>
        <div class="sbfx-row">
          <span class="sbfx-label">Moments</span>
          <button class="sbfx-btn sbfx-btn--good" data-fx="correct" onClick={correct}>Correct diagnosis</button>
          <button class="sbfx-btn sbfx-btn--bad" data-fx="wrong" onClick={wrong}>Wrong call</button>
          <button class="sbfx-btn sbfx-btn--red" data-fx="codered" onClick={codeRed}>Code Red</button>
          <button class="sbfx-btn" aria-pressed={reduced} data-fx="reduced" onClick={() => setReduced((r) => !r)}>Reduced motion</button>
          <span class="sbfx-meta" aria-live="off">{count} particles</span>
        </div>
      </div>
      <div ref={layer} style={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: 5 }} />
    </div>
  );
}

const page: SandboxPage = { id: 'render-fx', title: 'Render · FX', component: RenderFxPage };
export default page;
