import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { buildFindings, type DeepPartial, type Eye, type GameServices, type PosteriorSegment } from '@core';
import { FundusView, fundusToCanvas, paintFundus, type FundusMap, type FundusMark, type FundusViewport } from '@render';
import type { SandboxPage } from '../Sandbox';

interface Preset { id: string; title: string; note: string; eye?: Eye; age?: number; post?: DeepPartial<PosteriorSegment> }

const PRESETS: Preset[] = [
  { id: 'normal-od', title: 'Normal · right eye', note: 'Disc nasal to the fovea → on the RIGHT of an OD photo. CDR 0.3, ISNT rim, AV ratio 2:3, foveal reflex.' },
  { id: 'normal-os', title: 'Normal · left eye', eye: 'OS', note: 'Mirror image: the OS disc sits on the LEFT of the photo.' },
  { id: 'glaucoma', title: 'Glaucoma', note: 'Vertical CDR 0.8 with inferior rim thinning/notch (ISNT violated), Drance disc haemorrhage, lamina pores.',
    post: { disc: { cdr: 0.8, rimThinning: 'inferior' }, lesions: [{ type: 'disc-hemorrhage', zone: 'disc', density: 1 }] } },
  { id: 'npdr', title: 'Severe NPDR', note: 'Microaneurysms & blot haemorrhages in 4 quadrants, venous beading, IRMA, cotton-wool spots, circinate exudate.',
    post: { lesions: [
      { type: 'microaneurysm', zone: 'diffuse', density: 4 }, { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 4 },
      { type: 'cotton-wool-spot', zone: 'superotemporal', density: 2 }, { type: 'hard-exudate', zone: 'macula', density: 2 },
      { type: 'venous-beading', zone: 'inferotemporal', density: 2 }, { type: 'venous-beading', zone: 'superotemporal', density: 1 },
      { type: 'irma', zone: 'superotemporal', density: 2 }] } },
  { id: 'pdr', title: 'Proliferative DR', note: 'Neovascularisation at the disc (NVD) and elsewhere (NVE), boat-shaped pre-retinal bleed, blot haemorrhages, CWS.',
    post: { lesions: [
      { type: 'neovascularization', zone: 'disc', density: 3 }, { type: 'neovascularization', zone: 'superotemporal', density: 2 },
      { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 3 }, { type: 'microaneurysm', zone: 'diffuse', density: 3 },
      { type: 'cotton-wool-spot', zone: 'diffuse', density: 2 }, { type: 'hard-exudate', zone: 'inferotemporal', density: 1 },
      { type: 'preretinal-hemorrhage', zone: 'inferotemporal', density: 2 }] } },
  { id: 'prp', title: 'PDR after PRP', note: 'Pan-retinal photocoagulation scars sparing the disc and macula.',
    post: { lesions: [{ type: 'laser-scars', zone: 'diffuse', density: 4 }, { type: 'neovascularization', zone: 'disc', density: 1 }] } },
  { id: 'htn', title: 'Hypertensive retinopathy', note: 'Arteriolar narrowing (AV 1:2), copper wiring, AV nicking, flames, CWS, swollen disc + macular star (grade IV).',
    post: { disc: { margins: 'blurred', edema: true, color: 'hyperemic' }, vessels: { avRatio: 0.45, avNicking: true, copperWiring: true, tortuosity: 'normal', venousDilation: false },
      lesions: [{ type: 'flame-hemorrhage', zone: 'diffuse', density: 2 }, { type: 'cotton-wool-spot', zone: 'diffuse', density: 3 }, { type: 'hard-exudate', zone: 'macula', density: 3 }] } },
  { id: 'dry-amd', title: 'Dry AMD', note: 'Large soft drusen, pigment clumping and geographic atrophy exposing choroidal vessels.', age: 78,
    post: { lesions: [{ type: 'drusen-large', zone: 'macula', density: 3 }, { type: 'drusen-small', zone: 'macula', density: 3 }, { type: 'pigment-clumping', zone: 'macula', density: 1 }, { type: 'geographic-atrophy', zone: 'macula', density: 2 }] } },
  { id: 'wet-amd', title: 'Wet (neovascular) AMD', note: 'Subretinal haemorrhage around a grey-green CNV, exudate and macular oedema.', age: 81,
    post: { lesions: [{ type: 'subretinal-hemorrhage', zone: 'macula', density: 2 }, { type: 'drusen-large', zone: 'macula', density: 2 }, { type: 'macular-edema', zone: 'macula', density: 2 }] } },
  { id: 'crao', title: 'CRAO', note: 'Milky ischaemic whitening of the posterior pole, cherry-red spot, attenuated box-carred arterioles.',
    post: { vessels: { avRatio: 0.35, segmentation: true }, lesions: [{ type: 'retinal-whitening', zone: 'diffuse', density: 4 }, { type: 'cherry-red-spot', zone: 'macula', density: 1 }] } },
  { id: 'brao', title: 'BRAO (embolic)', note: 'Hollenhorst plaque at an arteriolar bifurcation with sectoral whitening.',
    post: { lesions: [{ type: 'hollenhorst-plaque', zone: 'superotemporal', density: 1 }, { type: 'retinal-whitening', zone: 'superotemporal', density: 2 }] } },
  { id: 'crvo', title: 'CRVO', note: '“Blood and thunder”: dilated tortuous veins, haemorrhages in all quadrants, CWS, disc swelling, macular oedema.',
    post: { disc: { margins: 'blurred' }, vessels: { venousDilation: true, tortuosity: 'increased' },
      lesions: [{ type: 'flame-hemorrhage', zone: 'diffuse', density: 5 }, { type: 'dot-blot-hemorrhage', zone: 'diffuse', density: 4 }, { type: 'cotton-wool-spot', zone: 'diffuse', density: 3 }, { type: 'macular-edema', zone: 'macula', density: 3 }] } },
  { id: 'rd', title: 'RD · macula-off', note: 'Grey, billowing detached retina with folds superiorly, extending through the fovea; horseshoe tear.',
    post: { detachment: { zones: ['superotemporal', 'superonasal'], maculaOff: true }, lesions: [{ type: 'retinal-tear', zone: 'superotemporal', density: 1 }] } },
  { id: 'papilledema', title: 'Papilloedema', note: 'Swollen hyperaemic disc, obscured vessels at the margin, Paton lines, peripapillary flames.',
    post: { disc: { edema: true, margins: 'elevated', color: 'hyperemic', svp: false }, vessels: { venousDilation: true },
      lesions: [{ type: 'flame-hemorrhage', zone: 'disc', density: 2 }, { type: 'cotton-wool-spot', zone: 'disc', density: 1 }] } },
  { id: 'tigroid', title: 'Tigroid myopic fundus', note: 'Visible choroidal vessels through thin RPE, temporal crescent, peripheral lattice.',
    post: { fundusTone: 'tigroid', disc: { cdr: 0.4 }, lesions: [{ type: 'lattice', zone: 'periphery', density: 2 }] } },
  { id: 'hole', title: 'Macular hole · ERM', note: 'Full-thickness hole with a cuff of fluid; cellophane membrane with striae nearby.',
    post: { lesions: [{ type: 'macular-hole', zone: 'macula', density: 3 }, { type: 'epiretinal-membrane', zone: 'macula', density: 2 }] } },
  { id: 'nevus', title: 'Choroidal nevus · dark fundus', note: 'Flat slate-grey lesion with overlying drusen; pigmented fundus.',
    post: { fundusTone: 'dark', lesions: [{ type: 'nevus', zone: 'inferotemporal', density: 2 }] } },
  { id: 'weiss', title: 'PVD · Weiss ring', note: 'Translucent ring floater in front of the disc after posterior vitreous detachment.',
    post: { vitreous: 'weiss-ring', fundusTone: 'light' } },
  { id: 'vh', title: 'Vitreous haemorrhage', note: 'Red haze obscuring detail, with a boat-shaped preretinal bleed.',
    post: { vitreous: 'hemorrhage', lesions: [{ type: 'neovascularization', zone: 'disc', density: 3 }] } },
];

function postFor(p: Preset): PosteriorSegment {
  const eye = p.eye ?? 'OD';
  return buildFindings(p.age ?? 55, { posterior: { [eye]: p.post ?? {} } as never }).posterior[eye];
}

function initialView(lens: boolean, map: FundusMap | null): FundusViewport {
  const q = new URLSearchParams(location.search);
  const z = Number(q.get('zoom'));
  if (z > 0) return { cx: Number(q.get('cx') ?? map?.disc.x ?? 0.5), cy: Number(q.get('cy') ?? map?.disc.y ?? 0.5), zoom: z };
  return { cx: lens ? (map?.disc.x ?? 0.5) : 0.5, cy: 0.5, zoom: lens ? 2.6 : 1 };
}

function useVw(): number {
  const [w, setW] = useState(() => (typeof window !== 'undefined' ? window.innerWidth : 1200));
  useEffect(() => {
    const on = () => setW(window.innerWidth);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return w;
}

function Thumb(props: { post: PosteriorSegment; eye: Eye; seed: number; size: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, devicePixelRatio || 1);
    c.width = props.size * dpr;
    c.height = props.size * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    paintFundus(ctx, props.size, props.size, props.post, { eye: props.eye, seed: props.seed });
  }, [props.post, props.size, props.seed]);
  return <canvas ref={ref} style={{ width: `${props.size}px`, height: `${props.size}px`, display: 'block' }} />;
}

function RenderFundusPage({ services }: { services: GameServices }) {
  const vw = useVw();
  const [id, setId] = useState(() => {
    const q = new URLSearchParams(location.search).get('preset');
    return PRESETS.some((p) => p.id === q) ? q! : 'normal-od';
  });
  const preset = PRESETS.find((p) => p.id === id)!;
  const thumbPosts = useMemo(() => Object.fromEntries(PRESETS.map((p) => [p.id, postFor(p)])), []);
  const post = thumbPosts[id]!;
  const eye = preset.eye ?? 'OD';
  const [seed, setSeed] = useState(7);
  const [lens, setLens] = useState(() => new URLSearchParams(location.search).has('lens'));
  const [redFree, setRedFree] = useState(() => new URLSearchParams(location.search).has('redfree'));
  const [inverted, setInverted] = useState(false);
  const [showMap, setShowMap] = useState(() => new URLSearchParams(location.search).has('map'));
  const [map, setMap] = useState<FundusMap | null>(null);
  const [view, setView] = useState<FundusViewport>(() => initialView(lens, null));
  const [tapped, setTapped] = useState<FundusMark[] | null>(null);
  const wide = vw > 980;
  const size = Math.max(280, Math.min(640, wide ? vw - 460 : vw - 32));
  const thumb = wide ? 168 : Math.floor((vw - 56) / 2);

  const choose = (pid: string) => {
    setId(pid);
    setTapped(null);
    services.audio.play('select');
  };

  return (
    <div class="rf-page">
      <style>{CSS}</style>
      <header>
        <h1>Fundus</h1>
        <p>Procedural fundus photography · {eye === 'OD' ? 'right eye' : 'left eye'} · drag to pan, wheel / pinch / +/− to zoom, tap to probe.</p>
      </header>
      <div class="rf-main">
        <div class="rf-stage" style={{ width: `${size}px`, height: `${size}px` }}>
          <FundusView
            key={`${id}-${lens}`}
            post={post} eye={eye} seed={seed} width={size} height={size}
            lensView={lens ? { radius: 0.3 } : false} redFree={redFree} inverted={inverted}
            initialView={initialView(lens, map)} maxZoom={7}
            onMap={setMap} onViewChange={setView}
            onTap={(e) => { setTapped(e.marks); services.audio.play(e.marks.length ? 'sparkle' : 'click'); }}
            class="rf-canvas"
          />
          {showMap && map && !inverted && (
            <svg class="rf-overlay" viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
              {[{ ...map.disc, t: 'disc' }, { x: map.fovea.x, y: map.fovea.y, r: map.fovea.r, t: 'fovea' }].map((m) => {
                const p = fundusToCanvas(view, size, size, m.x, m.y);
                return <circle key={m.t} cx={p.x} cy={p.y} r={m.r * size * view.zoom} class="rf-anat" />;
              })}
              {(() => { const p = fundusToCanvas(view, size, size, map.cup.x, map.cup.y); return <ellipse cx={p.x} cy={p.y} rx={map.cup.rx * size * view.zoom} ry={map.cup.ry * size * view.zoom} class="rf-cup" />; })()}
              {map.lesions.map((m, i) => {
                const p = fundusToCanvas(view, size, size, m.x, m.y);
                return <circle key={i} cx={p.x} cy={p.y} r={Math.max(3, m.r * size * view.zoom)} class="rf-mark" />;
              })}
            </svg>
          )}
        </div>
        <aside class="rf-panel">
          <h3>{preset.title}</h3>
          <p>{preset.note}</p>
          <div class="rf-toggles">
            <button class={lens ? 'on' : ''} onClick={() => setLens(!lens)}>Ophthalmoscope</button>
            <button class={redFree ? 'on' : ''} onClick={() => setRedFree(!redFree)}>Red-free</button>
            <button class={inverted ? 'on' : ''} onClick={() => setInverted(!inverted)}>Inverted (BIO)</button>
            <button class={showMap ? 'on' : ''} onClick={() => setShowMap(!showMap)}>Hit map</button>
          </div>
          <label>Seed {seed}<input type="range" min={1} max={200} value={seed} onInput={(e) => setSeed(+e.currentTarget.value)} /></label>
          {map && (
            <dl class="rf-data">
              <dt>Vertical C/D</dt><dd>{map.cup.cdr.toFixed(2)}</dd>
              <dt>Disc</dt><dd>({map.disc.x.toFixed(2)}, {map.disc.y.toFixed(2)})</dd>
              <dt>Fovea</dt><dd>({map.fovea.x.toFixed(2)}, {map.fovea.y.toFixed(2)})</dd>
              <dt>Marks</dt><dd>{map.lesions.length}</dd>
              <dt>Zoom</dt><dd>{view.zoom.toFixed(2)}×</dd>
            </dl>
          )}
          <div class="rf-tap" aria-live="polite">
            {tapped === null ? 'Tap the fundus to probe a finding.' : tapped.length ? `Found: ${[...new Set(tapped.map((m) => `${m.type} (${m.zone})`))].join(', ')}` : 'Nothing there.'}
          </div>
        </aside>
      </div>
      <h2>Presets</h2>
      <div class="rf-grid">
        {PRESETS.map((p) => (
          <button key={p.id} class={`rf-card ${p.id === id ? 'on' : ''}`} onClick={() => choose(p.id)} data-preset={p.id}>
            <Thumb post={thumbPosts[p.id]!} eye={p.eye ?? 'OD'} seed={seed} size={thumb} />
            <span>{p.title}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

const CSS = `
.rf-page{height:100%;overflow:auto;box-sizing:border-box;padding:24px 16px 64px;color:var(--lm-ink-2);font-family:var(--lm-font-ui);
  background:radial-gradient(1100px 600px at 80% -10%,color-mix(in srgb,var(--lm-vivid-pink) 16%,transparent) 0%,transparent 60%),radial-gradient(900px 500px at 0% 0%,color-mix(in srgb,var(--lm-brand-400) 20%,transparent) 0%,transparent 60%),linear-gradient(180deg,#eef2fa,#e4ebf8)}
.rf-page h1{font-family:var(--lm-font-display);font-weight:750;font-size:clamp(28px,4vw,44px);margin:0;color:var(--lm-ink);letter-spacing:-.02em}
.rf-page header p{margin:4px 0 20px;color:var(--lm-ink-3)}
.rf-main{display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start}
.rf-stage{position:relative;flex:0 0 auto;max-width:100%}
.rf-canvas{border-radius:50%;outline:none;box-shadow:var(--lm-glass-highlight),var(--lm-glass-shadow);border:1px solid var(--lm-border)}
.rf-canvas:focus-visible{box-shadow:0 0 0 3px var(--lm-brand-600)}
.rf-overlay{position:absolute;inset:0;pointer-events:none}
.rf-anat{fill:none;stroke:#059669;stroke-width:1.5;stroke-dasharray:4 3}
.rf-cup{fill:none;stroke:#d97706;stroke-width:1.5}
.rf-mark{fill:none;stroke:#db2777;stroke-width:1.2;opacity:.85}
.rf-panel{flex:1 1 300px;max-width:420px;padding:16px;border-radius:28px;background:var(--lm-glass);backdrop-filter:var(--lm-glass-blur);-webkit-backdrop-filter:var(--lm-glass-blur);box-shadow:var(--lm-glass-highlight),var(--lm-glass-shadow);border:1px solid var(--lm-border);font-size:13px;display:flex;flex-direction:column;gap:12px}
.rf-panel h3{font-family:var(--lm-font-display);font-size:22px;margin:0;color:var(--lm-ink);font-weight:750;letter-spacing:-.01em}
.rf-panel p{margin:0;color:var(--lm-ink-2);line-height:1.5}
.rf-panel label{display:flex;flex-direction:column;gap:6px;color:var(--lm-ink-3)}
.rf-panel input{accent-color:var(--lm-brand-600)}
.rf-toggles{display:flex;flex-wrap:wrap;gap:6px}
.rf-toggles button{padding:7px 10px;border-radius:999px;border:1px solid var(--lm-border);background:var(--lm-surface);color:var(--lm-ink);font:inherit;cursor:pointer;transition:all .18s cubic-bezier(.2,.8,.2,1)}
.rf-toggles button.on{background:var(--lm-brand-600);color:var(--lm-text-on-gold);border-color:transparent;font-weight:600}
.rf-data{display:grid;grid-template-columns:auto 1fr;gap:4px 12px;margin:0;font-family:var(--lm-font-num)}
.rf-data dt{color:var(--lm-ink-3)}.rf-data dd{margin:0;color:var(--lm-ink)}
.rf-tap{padding:10px;border-radius:16px;background:var(--lm-brand-50);color:var(--lm-accent-text);min-height:20px}
.rf-page h2{font-family:var(--lm-font-display);font-weight:750;margin:36px 0 14px;font-size:24px;color:var(--lm-ink);letter-spacing:-.01em}
.rf-grid{display:flex;flex-wrap:wrap;gap:14px}
.rf-card{display:flex;flex-direction:column;align-items:center;gap:8px;padding:10px;border-radius:22px;background:var(--lm-glass);backdrop-filter:var(--lm-glass-blur);-webkit-backdrop-filter:var(--lm-glass-blur);box-shadow:var(--lm-glass-highlight),var(--lm-glass-shadow);border:1px solid var(--lm-border);color:var(--lm-ink);font:inherit;cursor:pointer;transition:transform .2s cubic-bezier(.2,.8,.2,1),border-color .2s}
.rf-card canvas{border-radius:50%}
.rf-card:hover,.rf-card:focus-visible{transform:translateY(-3px);border-color:var(--lm-brand-300);outline:none}
.rf-card.on{border-color:var(--lm-brand-600);box-shadow:var(--lm-glass-highlight),0 0 0 2px var(--lm-brand-600)}
.rf-card span{font-size:12.5px;max-width:170px;text-align:center;color:var(--lm-ink)}
@media (prefers-reduced-motion: reduce){.rf-card,.rf-toggles button{transition:none}}
`;

const page: SandboxPage = { id: 'render-fundus', title: 'Fundus renderer', component: RenderFundusPage };
export default page;
