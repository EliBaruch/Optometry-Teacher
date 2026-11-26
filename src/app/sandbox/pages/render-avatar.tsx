import { useMemo, useRef, useState } from 'preact/hooks';
import { createRng, type AvatarSpec, type Eye, type GameServices } from '@core';
import {
  AVATAR_EXPRESSIONS, AvatarBust, HAIR_STYLES, PatientAvatar, generateAvatar,
  type AvatarExpression, type AvatarExternal, type AvatarGaze, type AvatarSex, type AvatarStrabismus,
} from '@render';
import type { SandboxPage } from '../Sandbox';

interface Pt { spec: AvatarSpec; age: number; sex: AvatarSex; name: string }

const AGES = [4, 7, 11, 15, 19, 24, 29, 34, 41, 47, 53, 58, 64, 71, 78, 86];
const SEXES: AvatarSex[] = ['F', 'M', 'X', 'M', 'F', 'F', 'M', 'X', 'F', 'M', 'F', 'M', 'X', 'F', 'M', 'F'];
const FIRST = ['Ava', 'Kofi', 'Rin', 'Mateo', 'Priya', 'Lena', 'Omar', 'Sky', 'Hana', 'Jonas', 'Amara', 'Diego', 'Noor', 'Edith', 'Walter', 'Rosa'];

const CSS = `
.sbav { position: absolute; inset: 0; overflow: auto; color: var(--lm-ink, #0f2a3a); font-family: 'Inter Variable', system-ui, sans-serif;
  background: linear-gradient(180deg, #f7fbfc 0%, #eaf4f6 100%); }
.sbav-wrap { display: grid; grid-template-columns: minmax(300px, 420px) 1fr; gap: 24px; padding: 24px; max-width: 1400px; margin: 0 auto; box-sizing: border-box; }
.sbav h1 { font: 700 30px/1.1 'Inter Variable', system-ui, sans-serif; letter-spacing: -.02em; margin: 0 0 4px; color: var(--lm-ink, #0f2a3a); }
.sbav-sub { color: var(--lm-ink-2, #44606f); font-size: 13px; margin: 0 0 16px; }
.sbav-card { border-radius: 22px; padding: 16px; background: var(--lm-surface, #fff); border: 1px solid var(--lm-border, #dbe6ea);
  box-shadow: 0 12px 40px rgba(15, 40, 60, .08), 0 2px 6px rgba(15, 40, 60, .04); }
.sbav-portrait { border-radius: 18px; overflow: hidden; border: 1px solid var(--lm-border, #dbe6ea); box-shadow: 0 8px 24px rgba(15, 40, 60, .10); aspect-ratio: 5 / 6; }
.sbav-name { display: flex; align-items: baseline; justify-content: space-between; margin: 12px 2px 8px; }
.sbav-name b { font: 650 20px 'Inter Variable', sans-serif; }
.sbav-name span { font: 500 13px 'Space Grotesk', monospace; color: var(--lm-ink-2, #44606f); }
.sbav-label { font: 600 10px/1 'Inter Variable', sans-serif; letter-spacing: .12em; text-transform: uppercase; color: var(--lm-ink-2, #44606f); margin: 14px 0 8px; }
.sbav-chips { display: flex; flex-wrap: wrap; gap: 6px; }
.sbav-chip { appearance: none; border: 1px solid var(--lm-border, #dbe6ea); background: var(--lm-surface, #fff); color: var(--lm-ink, #0f2a3a); font: 600 12px/1 'Inter Variable', sans-serif;
  padding: 8px 11px; border-radius: 999px; cursor: pointer; min-height: 32px; transition: all .18s cubic-bezier(.2,.8,.2,1); }
.sbav-chip:hover { border-color: #3b6bff; }
.sbav-chip:focus-visible { outline: 2px solid #3b6bff; outline-offset: 2px; }
.sbav-chip[aria-pressed="true"] { background: #e6f7f8; border-color: #3b6bff; color: #07676d; }
.sbav-chip--sign[aria-pressed="true"] { background: #fff4dc; border-color: #f59e0b; color: #8a5300; }
.sbav-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(132px, 1fr)); gap: 14px; }
.sbav-tile { appearance: none; border: 1px solid var(--lm-border, #dbe6ea); background: var(--lm-surface, #fff); border-radius: 16px; padding: 0; cursor: pointer; overflow: hidden; color: inherit;
  transition: transform .2s cubic-bezier(.2,.8,.2,1), border-color .2s, box-shadow .2s; text-align: left; }
.sbav-tile:hover { transform: translateY(-3px); border-color: #7aa2ff; box-shadow: 0 10px 26px rgba(15, 40, 60, .12); }
.sbav-tile:focus-visible { outline: 2px solid #3b6bff; outline-offset: 2px; }
.sbav-tile[aria-current="true"] { border-color: #3b6bff; box-shadow: 0 0 0 2px #3b6bff33, 0 8px 22px rgba(59, 107, 255, .16); }
.sbav-tile small { display: flex; justify-content: space-between; padding: 7px 10px 9px; font: 500 12px 'Space Grotesk', monospace; color: var(--lm-ink-2, #44606f); }
.sbav-tile small b { color: var(--lm-ink, #0f2a3a); font: 600 12px 'Inter Variable', sans-serif; }
.sbav-row { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; }
.sbav-bust { display: flex; flex-direction: column; align-items: center; gap: 6px; font: 500 11px 'Space Grotesk', monospace; color: var(--lm-ink-2, #44606f); }
.sbav-select { background: var(--lm-surface, #fff); color: var(--lm-ink, #0f2a3a); border: 1px solid var(--lm-border, #dbe6ea); border-radius: 10px; padding: 7px 10px; font: 500 12px 'Inter Variable', sans-serif; }
@media (max-width: 860px) { .sbav-wrap { grid-template-columns: 1fr; padding: 16px; } .sbav-grid { grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap: 10px; } }
`;

type EyeSet = Partial<Record<'redEye' | 'tearing' | 'ptosis' | 'proptosis', Eye[]>>;

function toggleEye(list: Eye[] | undefined, e: Eye): Eye[] {
  const s = new Set(list ?? []);
  if (s.has(e)) s.delete(e);
  else s.add(e);
  return [...s].sort() as Eye[];
}

function RenderAvatarPage(_: { services: GameServices }) {
  const [seed, setSeed] = useState(2024);
  const patients = useMemo<Pt[]>(() => {
    const rng = createRng(seed);
    return AGES.map((age, i) => {
      const sex = SEXES[i]!;
      return { spec: generateAvatar(rng.fork(i), { age, sex }), age, sex, name: FIRST[i]! };
    });
  }, [seed]);
  const [sel, setSel] = useState(8);
  const p = patients[sel]!;
  const [expr, setExpr] = useState<AvatarExpression>('neutral');
  const [eyes, setEyes] = useState<EyeSet>({});
  const [flags, setFlags] = useState({ squinting: false, photophobia: false, rash: false, temple: false });
  const [patch, setPatch] = useState<Eye | null>(null);
  const [strab, setStrab] = useState<string>('none');
  const [aniso, setAniso] = useState(false);
  const [follow, setFollow] = useState(true);
  const [animated, setAnimated] = useState(true);
  const [reduced, setReduced] = useState(false);
  const [look, setLook] = useState<AvatarGaze | null>(null);
  const portrait = useRef<HTMLDivElement>(null);

  const external: AvatarExternal = {
    ...eyes,
    squinting: flags.squinting || undefined,
    photophobia: flags.photophobia || undefined,
    rash: flags.rash ? 'forehead-dermatomal' : undefined,
    templeTenderness: flags.temple || undefined,
    eyePatch: patch ?? undefined,
  };
  const strabismus: AvatarStrabismus | undefined = strab === 'none' ? undefined : { eye: strab.slice(0, 2) as Eye, direction: strab.slice(3) as AvatarStrabismus['direction'] };

  const onMove = (e: PointerEvent) => {
    if (!follow) return;
    const r = portrait.current!.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 2 - 1;
    const y = ((e.clientY - (r.top + r.height * 0.45)) / r.height) * 2;
    setLook({ x: Math.max(-1, Math.min(1, x * 1.4)), y: Math.max(-1, Math.min(1, y * 1.6)) });
  };

  const eyeChip = (key: keyof EyeSet, e: Eye, label: string) => (
    <button class="sbav-chip sbav-chip--sign" aria-pressed={!!eyes[key]?.includes(e)} data-sign={`${key}-${e}`}
      onClick={() => setEyes((s) => ({ ...s, [key]: toggleEye(s[key], e) }))}>{label} {e}</button>
  );
  const flag = (k: keyof typeof flags, label: string) => (
    <button class="sbav-chip sbav-chip--sign" aria-pressed={flags[k]} data-sign={k} onClick={() => setFlags((f) => ({ ...f, [k]: !f[k] }))}>{label}</button>
  );

  return (
    <div class="sbav" onPointerMove={onMove} onPointerLeave={() => setLook(null)}>
      <style>{CSS}</style>
      <div class="sbav-wrap">
        <section>
          <h1>Patient Portraits</h1>
          <p class="sbav-sub">Procedural, animated, clinically expressive. OD = patient's right = your left.</p>
          <div class="sbav-card">
            <div class="sbav-portrait" ref={portrait}>
              <PatientAvatar spec={p.spec} age={p.age} sex={p.sex} expression={expr} external={external} strabismus={strabismus}
                pupils={aniso ? { OD: 1.65 } : undefined} lookAt={follow ? look : null} animated={animated} reducedMotion={reduced} />
            </div>
            <div class="sbav-name"><b>{p.name}</b><span>{p.age} y · {p.sex} · {p.spec.hair}</span></div>
            <div class="sbav-label">Expression</div>
            <div class="sbav-chips">
              {AVATAR_EXPRESSIONS.map((x) => (
                <button key={x} class="sbav-chip" aria-pressed={expr === x} data-expr={x} onClick={() => setExpr(x)}>{x}</button>
              ))}
            </div>
            <div class="sbav-label">Visible signs</div>
            <div class="sbav-chips">
              {eyeChip('redEye', 'OD', 'Red eye')}{eyeChip('redEye', 'OS', 'Red eye')}
              {eyeChip('tearing', 'OD', 'Tearing')}{eyeChip('tearing', 'OS', 'Tearing')}
              {eyeChip('ptosis', 'OD', 'Ptosis')}{eyeChip('ptosis', 'OS', 'Ptosis')}
              {eyeChip('proptosis', 'OD', 'Proptosis')}{eyeChip('proptosis', 'OS', 'Proptosis')}
              {flag('squinting', 'Squinting')}{flag('photophobia', 'Photophobia')}
              {flag('rash', 'Dermatomal rash')}{flag('temple', 'Temporal artery')}
              <button class="sbav-chip sbav-chip--sign" aria-pressed={patch === 'OD'} data-sign="patch-OD" onClick={() => setPatch((v) => (v === 'OD' ? null : 'OD'))}>Patch OD</button>
              <button class="sbav-chip sbav-chip--sign" aria-pressed={patch === 'OS'} data-sign="patch-OS" onClick={() => setPatch((v) => (v === 'OS' ? null : 'OS'))}>Patch OS</button>
              <button class="sbav-chip sbav-chip--sign" aria-pressed={aniso} data-sign="aniso" onClick={() => setAniso((v) => !v)}>Dilated pupil OD</button>
            </div>
            <div class="sbav-label">Deviation &amp; motion</div>
            <div class="sbav-chips">
              <select class="sbav-select" value={strab} aria-label="Strabismus" data-ctl="strab" onChange={(e) => setStrab((e.target as HTMLSelectElement).value)}>
                <option value="none">Eyes straight</option>
                {(['OD', 'OS'] as const).flatMap((e) => (['in', 'out', 'up', 'down'] as const).map((d) => <option key={`${e}-${d}`} value={`${e}-${d}`}>{e} turns {d}</option>))}
              </select>
              <button class="sbav-chip" aria-pressed={follow} onClick={() => setFollow((v) => !v)}>Follow cursor</button>
              <button class="sbav-chip" aria-pressed={animated} onClick={() => setAnimated((v) => !v)}>Animated</button>
              <button class="sbav-chip" aria-pressed={reduced} onClick={() => setReduced((v) => !v)}>Reduced motion</button>
              <button class="sbav-chip" data-ctl="reroll" onClick={() => setSeed((s) => s + 1)}>New patients</button>
            </div>
          </div>
        </section>
        <section>
          <div class="sbav-label">Waiting room · tap to examine</div>
          <div class="sbav-grid">
            {patients.map((q, i) => (
              <button key={`${seed}-${i}`} class="sbav-tile" aria-current={i === sel} data-tile={i} onClick={() => setSel(i)} aria-label={`${q.name}, ${q.age}`}>
                <PatientAvatar spec={q.spec} age={q.age} sex={q.sex} animated={!reduced} reducedMotion={reduced} />
                <small><b>{q.name}</b>{q.age}</small>
              </button>
            ))}
          </div>
          <div class="sbav-label">Every hair style (bust variant)</div>
          <div class="sbav-row">
            {HAIR_STYLES.map((h, i) => {
              const q = patients[(i * 5) % patients.length]!;
              const age = h === 'bald' ? 62 : Math.max(q.age, 9);
              return (
                <div key={h} class="sbav-bust">
                  <AvatarBust spec={{ ...q.spec, hair: h, headwear: 'none' }} age={age} sex={q.sex} size={64} ring={['#a78bfa', '#f5b942', '#4ade80', '#fb923c', '#f472b6', '#38bdf8'][i % 6]} />
                  {h}
                </div>
              );
            })}
          </div>
          <div class="sbav-label">Headwear &amp; eyewear</div>
          <div class="sbav-row">
            {(['cap', 'headscarf', 'kippah', 'beanie', 'hard-hat'] as const).map((hw, i) => {
              const q = patients[(i * 3 + 4) % patients.length]!;
              return (
                <div key={hw} class="sbav-bust">
                  <AvatarBust spec={{ ...q.spec, headwear: hw, facialHair: hw === 'headscarf' ? 'none' : q.spec.facialHair }} age={Math.max(24, q.age)} sex={hw === 'headscarf' ? 'F' : q.sex} size={64} />
                  {hw}
                </div>
              );
            })}
            {(['round', 'square', 'cat-eye', 'aviator', 'half-rim'] as const).map((gl, i) => {
              const q = patients[(i * 3 + 2) % patients.length]!;
              return (
                <div key={gl} class="sbav-bust">
                  <AvatarBust spec={{ ...q.spec, glasses: gl, headwear: 'none' }} age={Math.max(30, q.age)} sex={q.sex} size={64} />
                  {gl}
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}

const page: SandboxPage = { id: 'render-avatar', title: 'Render · Avatar', component: RenderAvatarPage };
export default page;
