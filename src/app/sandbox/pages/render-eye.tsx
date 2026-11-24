import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildFindings, type DeepPartial, type GameServices, type PatientFindings, type StainPattern } from '@core';
import {
  EyeCanvas, eyeStateFromFindings, paintIrisArt,
  type EyeLighting, type EyeState, type IrisRarity, type SlitBeam,
} from '@render';
import type { SandboxPage } from '../Sandbox';

interface Preset {
  id: string;
  title: string;
  note: string;
  age: number;
  patch?: DeepPartial<PatientFindings>;
  eye?: 'OD' | 'OS';
  lighting?: EyeLighting;
  iris?: string;
  extra?: Partial<EyeState>;
  beam?: SlitBeam;
}

const PRESETS: Preset[] = [
  { id: 'normal', title: 'Healthy eye', note: 'Quiet white conjunctiva, clear cornea, crisp iris architecture.', age: 28, iris: '#4f7ea6' },
  { id: 'nuclear', title: 'Nuclear cataract', note: 'Brunescent yellow-brown nucleus glowing in the pupil (penlight).', age: 74, lighting: 'penlight', iris: '#6d5a3a',
    patch: { anterior: { OD: { lens: ['nuclear-sclerosis'], lensGrade: 3 } } } },
  { id: 'cortical', title: 'Cortical cataract', note: 'White cuneiform spokes pointing to the centre (dilated).', age: 68, iris: '#5f7f6a', lighting: 'dim',
    patch: { anterior: { OD: { lens: ['cortical-cataract'], lensGrade: 3 } }, pupils: { sizeDarkMm: { OD: 7.5 } } } },
  { id: 'aac', title: 'Acute angle closure', note: 'Ciliary flush, hazy oedematous cornea, mid-dilated fixed pupil, shallow AC.', age: 66, iris: '#6b5134',
    patch: { anterior: { OD: { conjunctiva: ['ciliary-flush'], cornea: ['edema'], anteriorChamber: { depth: 'shallow', vanHerick: 1, cells: 0.5, flare: 1 } } }, pupils: { sizeLightMm: { OD: 5.5 }, shape: { OD: 'mid-dilated' }, reactivity: { OD: 'fixed' } } } },
  { id: 'uveitis', title: 'Anterior uveitis', note: 'Ciliary flush, KPs (Arlt triangle), posterior synechiae, small hypopyon.', age: 34, iris: '#7a5a3c',
    patch: { anterior: { OD: { conjunctiva: ['ciliary-flush'], cornea: ['keratic-precipitates'], iris: ['posterior-synechiae'], anteriorChamber: { cells: 3, flare: 2, hypopyon: true } } }, pupils: { sizeLightMm: { OD: 2.5 } } } },
  { id: 'uveitis-slit', title: 'Cells & flare (slit)', note: 'Conical beam through the AC: drifting cells (SUN 3+) and flare haze.', age: 34, iris: '#7a5a3c',
    patch: { anterior: { OD: { conjunctiva: ['ciliary-flush'], cornea: ['keratic-precipitates'], anteriorChamber: { cells: 3, flare: 2 } } } },
    beam: { x: 0.05, width: 1, angleDeg: 45, height: 3, mag: 2.6 } },
  { id: 'conj', title: 'Bacterial conjunctivitis', note: 'Diffuse injection maximal in the fornices, mucopurulent discharge.', age: 22, iris: '#3d6d9a',
    patch: { anterior: { OD: { conjunctiva: ['diffuse-injection', 'papillae', 'discharge-mucopurulent'] } } } },
  { id: 'abrasion', title: 'Abrasion (cobalt)', note: 'Sharp-edged geographic epithelial defect fluoresces green.', age: 31, lighting: 'cobalt', iris: '#4f7ea6',
    patch: { anterior: { OD: { cornea: ['abrasion'], fluorescein: 'linear-abrasion', conjunctiva: ['diffuse-injection'] } } } },
  { id: 'dendrite', title: 'Herpetic dendrite', note: 'Branching ulcer with terminal bulbs — classic HSV keratitis.', age: 45, lighting: 'cobalt', iris: '#7d8f5a',
    patch: { anterior: { OD: { cornea: ['dendrite'], fluorescein: 'dendritic' } } } },
  { id: 'pterygium', title: 'Pterygium', note: 'Nasal fibrovascular wing crossing the limbus toward the pupil.', age: 52, iris: '#5b3d26',
    patch: { anterior: { OD: { conjunctiva: ['pterygium'] } } } },
  { id: 'sch', title: 'Subconjunctival haemorrhage', note: 'Flat, sharply demarcated bright red patch; white, quiet eye otherwise.', age: 61, iris: '#4c6c8c',
    patch: { anterior: { OD: { conjunctiva: ['subconjunctival-hemorrhage'] } } } },
  { id: 'hyphema', title: 'Traumatic hyphema', note: 'Layered blood level in the inferior anterior chamber.', age: 19, iris: '#4a7a56',
    patch: { anterior: { OD: { anteriorChamber: { hyphema: true, cells: 2 } } } } },
  { id: 'ulcer', title: 'Microbial keratitis', note: 'Dense white stromal infiltrate with overlying epithelial defect.', age: 27, iris: '#3f6f98',
    patch: { anterior: { OD: { cornea: ['ulcer'], conjunctiva: ['ciliary-flush'], anteriorChamber: { cells: 1 } } } } },
  { id: 'eso', title: 'Left esotropia (Hirschberg)', note: 'Penlight reflex decentred temporally in the turned-in left eye (~30Δ).', age: 6, lighting: 'penlight', eye: 'OS', iris: '#5b7da0',
    patch: { motility: { distance: { horizontal: 30, vertical: 0, type: 'tropia', deviatingEye: 'OS' } } } },
  { id: 'vh1', title: 'Van Herick grade 1', note: 'Peripheral optic section: AC gap < ¼ corneal thickness.', age: 70, iris: '#6b5134',
    patch: { anterior: { OD: { anteriorChamber: { vanHerick: 1, depth: 'shallow' } } } }, beam: { x: -0.95, width: 0.15, angleDeg: 60, mag: 3.2 } },
  { id: 'vh4', title: 'Van Herick grade 4', note: 'Peripheral optic section: AC gap ≥ corneal thickness.', age: 30, iris: '#4f7ea6',
    beam: { x: -0.95, width: 0.15, angleDeg: 60, mag: 3.2 } },
];

const STAINS: StainPattern[] = ['none', 'inferior-punctate', 'diffuse-punctate', 'interpalpebral', 'linear-abrasion', 'dendritic', 'round-ulcer', 'vertical-linear-scratches'];
const LIGHTS: EyeLighting[] = ['room', 'penlight', 'slit', 'cobalt', 'dim'];
const IRIS_SWATCHES = ['#4f7ea6', '#3d6d9a', '#6a8f7a', '#7d8f5a', '#8a6a3c', '#5b3d26', '#2e1c12', '#7d8a96'];
const ART: { rarity: IrisRarity; palette: string[] }[] = [
  { rarity: 'common', palette: ['#6a5034', '#7f9a6a', '#3f5a40'] },
  { rarity: 'rare', palette: ['#c9873a', '#3f8fb8', '#203a5e', '#ffd27a'] },
  { rarity: 'epic', palette: ['#c86bd8', '#5a7cff', '#1c1f5e', '#7affc8'] },
  { rarity: 'legendary', palette: ['#ffcf6b', '#ff6a8a', '#3a1650', '#7ad8ff', '#fff3c4'] },
];

function presetState(p: Preset): EyeState {
  const eye = p.eye ?? 'OD';
  const patch = p.patch ? JSON.parse(JSON.stringify(p.patch).replace(/"OD"/g, `"${eye}"`)) : undefined;
  const f = buildFindings(p.age, patch);
  const s = eyeStateFromFindings(f, eye, { lighting: p.lighting ?? 'room', irisColor: p.iris, irisSeed: p.id.length * 97 + 3 });
  return { ...s, ...(p.extra ?? {}) };
}

function useViewportWidth(): number {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

function IrisArt(props: { seed: number; rarity: IrisRarity; palette: string[]; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = props.size * dpr;
    c.height = props.size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintIrisArt(ctx, props.size, props.seed, { palette: props.palette, rarity: props.rarity });
  }, [props.seed, props.rarity, props.size]);
  return <canvas ref={ref} style={{ width: `${props.size}px`, height: `${props.size}px`, borderRadius: '14px', display: 'block' }} />;
}

function RenderEyePage({ services }: { services: GameServices }) {
  const vw = useViewportWidth();
  const [presetId, setPresetId] = useState(() => {
    const q = new URLSearchParams(location.search).get('preset');
    return PRESETS.some((p) => p.id === q) ? q! : 'normal';
  });
  const preset = PRESETS.find((p) => p.id === presetId)!;
  const base = useMemo(() => presetState(preset), [presetId]);
  const [over, setOver] = useState<Partial<EyeState>>({});
  const [beam, setBeam] = useState<SlitBeam | undefined>(preset.beam);
  const [animate, setAnimate] = useState(true);
  const state: EyeState = { ...base, ...over, gaze: { ...base.gaze, ...(over.gaze ?? {}) } };
  const wide = vw > 960;
  const mainW = Math.max(300, Math.min(820, wide ? vw - 420 : vw - 32));
  const mainH = Math.round(mainW * 0.56);
  const thumbW = wide ? 220 : Math.floor((vw - 48) / 2);

  const choose = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    setPresetId(id);
    setOver({});
    setBeam(p.beam);
    services.audio.play('select');
  };
  const set = (patch: Partial<EyeState>) => setOver((o) => ({ ...o, ...patch }));

  return (
    <div class="re-page">
      <style>{CSS}</style>
      <header class="re-head">
        <h1>Eye close-up</h1>
        <p>Procedural anterior segment · {state.eye === 'OD' ? 'right eye (OD) — nasal on the viewer’s right' : 'left eye (OS) — nasal on the viewer’s left'}</p>
      </header>
      <div class="re-main">
        <div class="re-stage">
          <EyeCanvas state={state} width={mainW} height={mainH} animate={animate} blink={animate && !beam && !navigator.webdriver} beam={beam} class="re-canvas" />
          <div class="re-caption"><strong>{preset.title}</strong> — {preset.note}</div>
        </div>
        <aside class="re-panel" aria-label="Controls">
          <label>Lighting
            <div class="re-seg">{LIGHTS.map((l) => (
              <button key={l} class={state.lighting === l && !beam ? 'on' : ''} onClick={() => { setBeam(undefined); set({ lighting: l }); services.audio.play('click'); }}>{l}</button>
            ))}</div>
          </label>
          <label>Eye
            <div class="re-seg">{(['OD', 'OS'] as const).map((e) => <button key={e} class={state.eye === e ? 'on' : ''} onClick={() => set({ eye: e })}>{e}</button>)}</div>
          </label>
          <label>Iris colour
            <div class="re-swatches">{IRIS_SWATCHES.map((c) => <button key={c} aria-label={c} style={{ background: c }} class={state.irisColor === c ? 'on' : ''} onClick={() => set({ irisColor: c })} />)}</div>
          </label>
          <label>Iris seed <input type="range" min={1} max={500} value={state.irisSeed} onInput={(e) => set({ irisSeed: +e.currentTarget.value })} /></label>
          <label>Pupil {state.pupilMm.toFixed(1)} mm <input type="range" min={1.5} max={8.5} step={0.1} value={state.pupilMm} onInput={(e) => set({ pupilMm: +e.currentTarget.value })} /></label>
          <label>Gaze x <input type="range" min={-1} max={1} step={0.01} value={state.gaze.x} onInput={(e) => set({ gaze: { x: +e.currentTarget.value, y: state.gaze.y } })} /></label>
          <label>Gaze y <input type="range" min={-1} max={1} step={0.01} value={state.gaze.y} onInput={(e) => set({ gaze: { x: state.gaze.x, y: +e.currentTarget.value } })} /></label>
          <label>Lid aperture <input type="range" min={0} max={1.1} step={0.01} value={state.lidAperture} onInput={(e) => set({ lidAperture: +e.currentTarget.value })} /></label>
          <label>Redness <input type="range" min={0} max={1} step={0.01} value={state.redness} onInput={(e) => set({ redness: +e.currentTarget.value })} /></label>
          <label>Corneal haze <input type="range" min={0} max={1} step={0.01} value={state.cornealHaze} onInput={(e) => set({ cornealHaze: +e.currentTarget.value })} /></label>
          <label>Lens opacity <input type="range" min={0} max={1} step={0.01} value={state.lensOpacity} onInput={(e) => set({ lensOpacity: +e.currentTarget.value, lensType: state.lensType === 'none' ? 'nuclear' : state.lensType })} /></label>
          <label>Fluorescein
            <select value={state.stain} onChange={(e) => set({ stain: e.currentTarget.value as StainPattern, lighting: 'cobalt' })}>{STAINS.map((s) => <option key={s} value={s}>{s}</option>)}</select>
          </label>
          <fieldset>
            <legend>Slit beam</legend>
            <button class={beam ? 'on wide' : 'wide'} onClick={() => setBeam(beam ? undefined : { x: -0.95, width: 0.15, angleDeg: 60, mag: 3 })}>{beam ? 'Beam on' : 'Beam off'}</button>
            {beam && <>
              <label>Position <input type="range" min={-1.1} max={1.1} step={0.01} value={beam.x} onInput={(e) => setBeam({ ...beam, x: +e.currentTarget.value })} /></label>
              <label>Width {beam.width.toFixed(2)} mm <input type="range" min={0.1} max={3} step={0.05} value={beam.width} onInput={(e) => setBeam({ ...beam, width: +e.currentTarget.value })} /></label>
              <label>Magnification {(beam.mag ?? 1).toFixed(1)}× <input type="range" min={1} max={5} step={0.1} value={beam.mag ?? 1} onInput={(e) => setBeam({ ...beam, mag: +e.currentTarget.value })} /></label>
              <label>Angle {beam.angleDeg}° <input type="range" min={-70} max={70} step={1} value={beam.angleDeg} onInput={(e) => setBeam({ ...beam, angleDeg: +e.currentTarget.value })} /></label>
              <label>Van Herick {state.vanHerick}
                <div class="re-seg">{([1, 2, 3, 4] as const).map((g) => <button key={g} class={state.vanHerick === g ? 'on' : ''} onClick={() => set({ vanHerick: g })}>{g}</button>)}</div>
              </label>
              <label>Cells {state.acCells}
                <div class="re-seg">{([0, 0.5, 1, 2, 3, 4] as const).map((g) => <button key={g} class={state.acCells === g ? 'on' : ''} onClick={() => set({ acCells: g })}>{g}</button>)}</div>
              </label>
              <label>Flare {state.acFlare}
                <div class="re-seg">{([0, 1, 2, 3, 4] as const).map((g) => <button key={g} class={state.acFlare === g ? 'on' : ''} onClick={() => set({ acFlare: g })}>{g}</button>)}</div>
              </label>
            </>}
          </fieldset>
          <label class="re-check"><input type="checkbox" checked={animate} onChange={(e) => setAnimate(e.currentTarget.checked)} /> Alive (micro-saccades, blinks)</label>
        </aside>
      </div>

      <h2>Presets</h2>
      <div class="re-grid">
        {PRESETS.map((p) => (
          <button key={p.id} class={`re-card ${p.id === presetId ? 'on' : ''}`} onClick={() => choose(p.id)} data-preset={p.id}>
            <EyeCanvas state={presetState(p)} width={thumbW} height={Math.round(thumbW * 0.56)} animate={false} beam={p.beam} />
            <span>{p.title}</span>
          </button>
        ))}
      </div>

      <h2>Gallery iris cards</h2>
      <div class="re-art">
        {ART.map((a, i) => (
          <figure key={a.rarity}>
            <IrisArt seed={101 + i * 37} rarity={a.rarity} palette={a.palette} size={wide ? 200 : Math.floor((vw - 48) / 2)} />
            <figcaption class={`r-${a.rarity}`}>{a.rarity}</figcaption>
          </figure>
        ))}
      </div>
    </div>
  );
}

const CSS = `
.re-page{height:100%;overflow:auto;box-sizing:border-box;padding:24px 16px 64px;color:#f6efe4;font-family:'Inter Variable',system-ui,sans-serif;
  background:radial-gradient(1200px 600px at 20% -10%,#2a1846 0%,transparent 60%),linear-gradient(180deg,#0b0716,#1a0f2e)}
.re-head h1{font-family:'Fraunces Variable',Georgia,serif;font-weight:600;font-size:clamp(28px,4vw,44px);margin:0;color:#ffd27a;letter-spacing:.01em}
.re-head p{margin:4px 0 20px;color:#a99bbd}
.re-main{display:flex;gap:20px;align-items:flex-start;flex-wrap:wrap}
.re-stage{flex:0 1 auto;min-width:0}
.re-canvas{border-radius:18px;box-shadow:0 0 0 1px rgba(255,210,122,.25),0 30px 80px -20px rgba(0,0,0,.8),0 0 60px -10px rgba(167,139,250,.25)}
.re-caption{margin-top:10px;color:#d9cfe6;font-size:14px;max-width:820px}
.re-caption strong{font-family:'Fraunces Variable',Georgia,serif;color:#ffd27a;font-weight:600}
.re-panel{flex:0 0 340px;max-width:100%;box-sizing:border-box;display:flex;flex-direction:column;gap:12px;padding:16px;border-radius:16px;
  background:rgba(30,18,52,.55);backdrop-filter:blur(14px);border:1px solid rgba(255,210,122,.18);font-size:13px}
.re-panel label{display:flex;flex-direction:column;gap:6px;color:#a99bbd}
.re-panel input[type=range]{accent-color:#ffd27a;width:100%}
.re-panel select{background:#140c24;color:#f6efe4;border:1px solid rgba(255,255,255,.15);border-radius:8px;padding:6px}
.re-panel fieldset{border:1px solid rgba(255,255,255,.1);border-radius:12px;display:flex;flex-direction:column;gap:10px;padding:10px}
.re-panel legend{color:#ffd27a;padding:0 6px}
.re-seg{display:flex;flex-wrap:wrap;gap:4px}
.re-seg button,.re-panel .wide{flex:1;min-width:40px;padding:6px 8px;border-radius:8px;border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.04);color:#f6efe4;cursor:pointer;font:inherit;transition:all .18s cubic-bezier(.2,.8,.2,1)}
.re-seg button:hover,.re-panel .wide:hover{border-color:rgba(255,210,122,.6)}
.re-seg button.on,.re-panel .wide.on{background:linear-gradient(180deg,#ffd27a,#d9a54a);color:#1a0f2e;border-color:transparent;font-weight:600}
.re-swatches{display:flex;gap:6px;flex-wrap:wrap}
.re-swatches button{width:26px;height:26px;border-radius:50%;border:2px solid rgba(255,255,255,.2);cursor:pointer;transition:transform .18s cubic-bezier(.2,.8,.2,1)}
.re-swatches button.on{border-color:#ffd27a;transform:scale(1.15)}
.re-check{flex-direction:row!important;align-items:center}
.re-page h2{font-family:'Fraunces Variable',Georgia,serif;font-weight:500;color:#f6efe4;margin:36px 0 14px;font-size:24px}
.re-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(220px,calc(50% - 8px)),1fr));gap:14px}
.re-card{display:flex;flex-direction:column;gap:8px;padding:8px;border-radius:14px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.08);color:#f6efe4;cursor:pointer;font:inherit;text-align:left;overflow:hidden;transition:transform .2s cubic-bezier(.2,.8,.2,1),border-color .2s}
.re-card canvas{border-radius:10px;max-width:100%}
.re-card:hover,.re-card:focus-visible{transform:translateY(-3px);border-color:rgba(255,210,122,.5);outline:none}
.re-card.on{border-color:#ffd27a;box-shadow:0 0 24px -6px rgba(255,210,122,.6)}
.re-card span{font-size:13px;padding:0 4px 2px}
.re-art{display:flex;flex-wrap:wrap;gap:16px}
.re-art figure{margin:0;display:flex;flex-direction:column;align-items:center;gap:8px}
.re-art figcaption{font-family:'Space Grotesk',monospace;text-transform:uppercase;letter-spacing:.2em;font-size:11px}
.r-common{color:#a99bbd}.r-rare{color:#38bdf8}.r-epic{color:#a78bfa}.r-legendary{color:#ffd27a}
@media (prefers-reduced-motion: reduce){.re-card,.re-seg button{transition:none}}
`;

const page: SandboxPage = { id: 'render-eye', title: 'Eye renderer', component: RenderEyePage };
export default page;
