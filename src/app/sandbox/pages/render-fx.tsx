import { useEffect, useRef, useState } from 'preact/hooks';
import type { BurstOptions, GameServices, SfxId } from '@core';
import { createFxController, type FxController } from '@render';
import type { SandboxPage } from '../Sandbox';

type Kind = NonNullable<BurstOptions['kind']>;
const KINDS: { kind: Kind; label: string; sfx: SfxId; color: string }[] = [
  { kind: 'confetti', label: 'Confetti', sfx: 'levelup', color: '#ffd27a' },
  { kind: 'sparks', label: 'Sparks', sfx: 'sparkle', color: '#ffd27a' },
  { kind: 'coins', label: 'Coins', sfx: 'coins', color: '#f5b942' },
  { kind: 'stars', label: 'Stars', sfx: 'sparkle', color: '#fff1c2' },
  { kind: 'hearts', label: 'Hearts', sfx: 'pop', color: '#f472b6' },
  { kind: 'embers', label: 'Embers', sfx: 'whoosh', color: '#fb923c' },
];

const CSS = `
.sbfx { position: absolute; inset: 0; overflow: hidden; color: #f6efe4; font-family: 'Inter Variable', system-ui, sans-serif;
  background: radial-gradient(120% 90% at 50% 0%, #2a1748 0%, #1a0f2e 45%, #0b0716 100%); user-select: none; touch-action: manipulation; }
.sbfx-stage { position: absolute; inset: 0; cursor: crosshair; }
.sbfx-stars { position: absolute; inset: -10%; opacity: .55; pointer-events: none;
  background-image: radial-gradient(1px 1px at 12% 22%, #fff8, transparent), radial-gradient(1.5px 1.5px at 72% 12%, #ffd27aaa, transparent),
  radial-gradient(1px 1px at 33% 68%, #fff6, transparent), radial-gradient(1px 1px at 86% 58%, #fff7, transparent),
  radial-gradient(1.2px 1.2px at 52% 38%, #a78bfa99, transparent), radial-gradient(1px 1px at 22% 88%, #fff5, transparent),
  radial-gradient(1px 1px at 92% 84%, #38bdf888, transparent), radial-gradient(1px 1px at 6% 48%, #fff6, transparent); }
.sbfx-window { position: absolute; left: 50%; top: 46%; width: min(62vmin, 520px); transform: translate(-50%, -50%); opacity: .9; pointer-events: none; filter: drop-shadow(0 0 40px #a78bfa33); }
.sbfx-title { position: absolute; top: 22px; left: 0; right: 0; text-align: center; pointer-events: none; }
.sbfx-title h1 { font-family: 'Fraunces Variable', Georgia, serif; font-weight: 500; font-size: clamp(24px, 4vw, 40px); margin: 0; letter-spacing: .01em;
  background: linear-gradient(180deg, #fff6df, #ffd27a); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sbfx-title p { margin: 6px 0 0; color: #a99bbd; font-size: 13px; }
.sbfx-panel { position: absolute; left: 50%; bottom: max(16px, env(safe-area-inset-bottom)); transform: translateX(-50%); width: min(960px, calc(100% - 24px));
  box-sizing: border-box; padding: 14px; border-radius: 20px; background: linear-gradient(180deg, #ffffff12, #ffffff06);
  border: 1px solid #ffd27a33; box-shadow: 0 20px 60px #0008, inset 0 1px 0 #ffffff1f; backdrop-filter: blur(14px) saturate(1.2); -webkit-backdrop-filter: blur(14px) saturate(1.2); }
.sbfx-row { display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
.sbfx-row + .sbfx-row { margin-top: 10px; padding-top: 10px; border-top: 1px solid #ffffff10; }
.sbfx-label { font: 600 10px/1 'Inter Variable', sans-serif; letter-spacing: .14em; text-transform: uppercase; color: #a99bbd; min-width: 64px; }
.sbfx-btn { appearance: none; border: 1px solid #ffffff1f; background: linear-gradient(180deg, #ffffff14, #ffffff05); color: #f6efe4;
  font: 600 13px/1 'Inter Variable', sans-serif; padding: 10px 14px; border-radius: 12px; cursor: pointer; display: inline-flex; gap: 8px; align-items: center;
  transition: transform .18s cubic-bezier(.2,.8,.2,1), border-color .18s, background .18s, box-shadow .18s; min-height: 40px; }
.sbfx-btn:hover { border-color: #ffd27a88; box-shadow: 0 0 0 1px #ffd27a33, 0 6px 22px #ffd27a22; transform: translateY(-1px); }
.sbfx-btn:active { transform: translateY(1px) scale(.97); }
.sbfx-btn:focus-visible { outline: 2px solid #ffd27a; outline-offset: 2px; }
.sbfx-btn[aria-pressed="true"] { background: linear-gradient(180deg, #ffd27a33, #ffd27a14); border-color: #ffd27a; }
.sbfx-dot { width: 10px; height: 10px; border-radius: 50%; box-shadow: 0 0 10px currentColor; background: currentColor; }
.sbfx-kbd { font: 500 10px/1 'Space Grotesk', monospace; color: #a99bbd; border: 1px solid #ffffff22; border-radius: 4px; padding: 2px 4px; }
.sbfx-btn--good { border-color: #5eead466; } .sbfx-btn--bad { border-color: #f43f5e66; } .sbfx-btn--red { border-color: #ef444499; }
.sbfx-meta { margin-left: auto; font: 500 12px 'Space Grotesk', monospace; color: #a99bbd; }
@media (max-width: 600px) { .sbfx-btn { padding: 9px 10px; font-size: 12px; } .sbfx-label { display: none; } .sbfx-panel { padding: 10px; } .sbfx-row { gap: 6px; } .sbfx-row + .sbfx-row { margin-top: 6px; padding-top: 6px; } .sbfx-btn { min-height: 36px; } .sbfx-kbd { display: none; } .sbfx-meta { margin-left: 0; } }
`;

function RoseWindow() {
  const petals = Array.from({ length: 12 }, (_, i) => i * 30);
  const jewels = ['#a78bfa', '#f472b6', '#38bdf8', '#f5b942', '#4ade80', '#fb923c'];
  return (
    <svg class="sbfx-window" viewBox="-100 -100 200 200" aria-hidden="true">
      <defs>
        <radialGradient id="sbfx-glow"><stop offset="0" stop-color="#ffd27a" stop-opacity=".5" /><stop offset="1" stop-color="#ffd27a" stop-opacity="0" /></radialGradient>
      </defs>
      <circle r="98" fill="url(#sbfx-glow)" opacity=".35" />
      {petals.map((a, i) => (
        <g key={a} transform={`rotate(${a})`}>
          <path d="M0,-22 C14,-40 14,-70 0,-92 C-14,-70 -14,-40 0,-22Z" fill={jewels[i % jewels.length]} opacity=".18" stroke="#ffd27a" stroke-opacity=".45" stroke-width=".8" />
          <circle cy="-80" r="5" fill={jewels[(i + 3) % jewels.length]} opacity=".3" stroke="#ffd27a" stroke-opacity=".5" stroke-width=".6" />
        </g>
      ))}
      <circle r="22" fill="#ffd27a" opacity=".12" stroke="#ffd27a" stroke-opacity=".6" stroke-width="1" />
      <circle r="95" fill="none" stroke="#ffd27a" stroke-opacity=".35" stroke-width="1.2" />
      <circle r="10" fill="#1a0f2e" stroke="#ffd27a" stroke-opacity=".7" />
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
    fx().flash('#fff1c9', 280);
    fx().burst(c.x, c.y, { kind: 'stars', count: 22 });
    fx().burst(c.x, c.y, { kind: 'confetti', count: 90 });
    fx().floatText('+120', c.x, c.y - 30, { size: 44 });
    sfx('success');
    setTimeout(() => {
      fx()?.burst(c.x, c.y + 40, { kind: 'coins', count: 16 });
      fx()?.floatText('✦ 35', c.x + 70, c.y + 10, { color: '#f5b942', size: 28 });
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
          <button class="sbfx-btn" data-fx="flash" onClick={() => { fx().flash('#fff1c9', 300); sfx('reveal'); }}>Flash</button>
          <button class="sbfx-btn" data-fx="vignette" onClick={() => { fx().vignette('#a78bfa', 1100); sfx('whoosh'); }}>Vignette</button>
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
