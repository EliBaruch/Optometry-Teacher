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
.sbfx { position: absolute; inset: 0; overflow: hidden; color: var(--lm-ink, #0f2a3a); font-family: 'Inter Variable', system-ui, sans-serif;
  background: radial-gradient(120% 90% at 50% 0%, #ffffff 0%, #f1f8f9 55%, #e3f1f3 100%); user-select: none; touch-action: manipulation; }
.sbfx-stage { position: absolute; inset: 0; cursor: crosshair; }
.sbfx-stars { display: none; }
.sbfx-window { position: absolute; left: 50%; top: 46%; width: min(62vmin, 520px); transform: translate(-50%, -50%); opacity: .8; pointer-events: none; }
.sbfx-title { position: absolute; top: 22px; left: 0; right: 0; text-align: center; pointer-events: none; }
.sbfx-title h1 { font: 700 clamp(24px, 4vw, 38px)/1.1 'Inter Variable', system-ui, sans-serif; margin: 0; letter-spacing: -.02em; color: var(--lm-ink, #0f2a3a); }
.sbfx-title p { margin: 6px 0 0; color: var(--lm-ink-2, #44606f); font-size: 13px; }
.sbfx-panel { position: absolute; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(960px, calc(100% - 24px));
  box-sizing: border-box; padding: 14px; border-radius: 20px; background: var(--lm-surface, #fff);
  border: 1px solid var(--lm-border, #dbe6ea); box-shadow: 0 12px 40px rgba(15, 40, 60, .10), 0 2px 6px rgba(15, 40, 60, .05); }
.sbfx-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sbfx-row + .sbfx-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--lm-border, #dbe6ea); }
.sbfx-label { font: 600 10px/1 'Inter Variable', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--lm-ink-2, #44606f); min-width: 64px; }
.sbfx-btn { appearance: none; border: 1px solid var(--lm-border, #dbe6ea); background: var(--lm-surface, #fff); color: var(--lm-ink, #0f2a3a);
  font: 600 13px/1 'Inter Variable', sans-serif; padding: 10px 14px; border-radius: 12px; cursor: pointer; display: inline-flex; gap: 8px; align-items: center;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), border-color .18s, background .18s, box-shadow .18s; min-height: 40px; }
.sbfx-btn:hover { border-color: #3b6bff; box-shadow: 0 4px 14px rgba(59, 107, 255, .14); transform: translateY(-1px); }
.sbfx-btn:active { transform: translateY(1px) scale(.97); }
.sbfx-btn:focus-visible { outline: 2px solid #3b6bff; outline-offset: 2px; }
.sbfx-btn[aria-pressed="true"] { background: #e6f7f8; border-color: #3b6bff; color: #07676d; }
.sbfx-dot { width: 10px; height: 10px; border-radius: 50%; background: currentColor; }
.sbfx-kbd { font: 500 10px/1 'Space Grotesk', monospace; color: var(--lm-ink-2, #44606f); border: 1px solid var(--lm-border, #dbe6ea); border-radius: 4px; padding: 2px 4px; }
.sbfx-btn--good { border-color: #34d39988; } .sbfx-btn--bad { border-color: #fb718588; } .sbfx-btn--red { border-color: #ef444488; }
.sbfx-meta { margin-left: auto; font: 500 12px 'Space Grotesk', monospace; color: var(--lm-ink-2, #44606f); }
@media (max-width: 600px) { .sbfx-btn { padding: 9px 10px; font-size: 12px; } .sbfx-label { display: none; } .sbfx-panel { padding: 10px; } .sbfx-row { gap: 6px; } .sbfx-row + .sbfx-row { margin-top: 6px; padding-top: 6px; } .sbfx-btn { min-height: 36px; } .sbfx-kbd { display: none; } .sbfx-meta { margin-left: 0; } }
`;

function RoseWindow() {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const jewels = ['#3b6bff', '#38bdf8', '#a78bfa', '#fb7185', '#34d399', '#f59e0b'];
  return (
    <svg class="sbfx-window" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="sbfx-glow"><stop offset="0" stop-color="#7aa2ff" stop-opacity=".5" /><stop offset="1" stop-color="#7aa2ff" stop-opacity="0" /></radialGradient>
      </defs>
      <circle r="98" fill="url(#sbfx-glow)" opacity=".35" />
      {petals.map((a, i) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0,-22 C14,-40 14,-70 0,-92 C-14,-70 -14,-40 0,-22Z" fill={jewels[i % jewels.length]} opacity=".28" stroke="#3b6bff" stroke-opacity=".45" stroke-width=".8" />
          <circle cy="-80" r="5" fill={jewels[(i + 3) % jewels.length]} opacity=".3" stroke="#3b6bff" stroke-opacity=".5" stroke-width=".6" />
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
    fx().flash('#dff3f4', 280);
    fx().burst(c.x, c.y, { kind: 'stars', count: 22 });
    fx().burst(c.x, c.y, { kind: 'confetti', count: 90 });
    fx().floatText('+120', c.x, c.y - 30, { size: 44 });
    sfx('success');
    setTimeout(() => {
      fx()?.burst(c.x, c.y + 40, { kind: 'coins', count: 16 });
      fx()?.floatText('✦ 35', c.x + 70, c.y + 10, { color: '#d98a0b', size: 28 });
      sfx('coins');
    }, 260);
  };
  const wrong = () => {
    fx().shake(14, 420);
    fx().vignette('#f43f5e', 700);
    const c = centre();
    fx().floatText('Missed', c.x, c.y, { color: '#f43f5e', size: 30 });
    sfx('fail');
  };
  const codeRed = () => {
    fx().vignette('#ef4444', 1800);
    fx().shake(6, 900);
    // embers rise from the bottom edge, so they read above any control panel
    const w = window.innerWidth;
    const y = window.innerHeight - 6;
    for (let i = 0; i < 5; i++) fx().burst(w * (0.1 + i * 0.2), y, { kind: 'embers', count: 10, color: i % 2 ? '#f97316' : '#ef4444' });
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
          <button class="sbfx-btn" data-fx="flash" onClick={() => { fx().flash('#dff3f4', 300); sfx('reveal'); }}>Flash</button>
          <button class="sbfx-btn" data-fx="vignette" onClick={() => { fx().vignette('#38bdf8', 1100); sfx('whoosh'); }}>Vignette</button>
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
