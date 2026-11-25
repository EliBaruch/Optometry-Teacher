import { render, type ComponentType } from 'preact';
import { useEffect, useRef, useState } from 'preact/hooks';
import { buildFindings, type GameServices, type MiniGameModule, type MiniGameResult, type PatientProfile } from '@core';
import { ServicesProvider } from '@ui-kit';
import { discoverPlugins } from '../discover';
import { Shell } from '../Shell';
import './sandbox.css';

/**
 * Developer sandbox — isolates ONE plugin so it can be built, screenshotted and
 * reviewed on its own:
 *   ?sandbox=minigame/<id>[&case=<caseId>][&difficulty=0.5]
 *   ?sandbox=scene/<id>          (loads all plugins, opens that scene)
 *   ?sandbox=page/<name>         (pages from src/app/sandbox/pages/*.tsx)
 *   ?sandbox=index               (lists everything)
 */
export interface SandboxPage {
  id: string;
  title: string;
  component: ComponentType<{ services: GameServices }>;
}

const pages = import.meta.glob<{ default: SandboxPage }>('./pages/*.tsx');

const SAMPLE_PATIENT: PatientProfile = {
  name: 'Sam Sandbox', age: 45, sex: 'X', occupation: 'Tester',
  avatar: { skin: 2, hair: 'short', hairColor: '#3b2a20', irisColor: '#4a6b8a', outfit: '#3d5a80' },
};

export async function mountSandbox(root: HTMLElement, services: GameServices, spec: string) {
  const [kind, id = ''] = spec.split('/');
  const q = new URLSearchParams(location.search);
  document.body.classList.add('sandbox');

  if (kind === 'minigame') {
    // Load every mini-game folder: one folder may register several modules (e.g. visual-acuity + pinhole).
    await discoverPlugins(services, { filter: { systems: () => false, scenes: () => false, modes: () => false } });
    const mg = services.registries.minigames.get(id);
    render(<ServicesProvider services={services}>{mg ? <MiniGameHarness services={services} mg={mg} caseId={q.get('case')} difficulty={Number(q.get('difficulty') ?? 0.5)} /> : <p class="sb-error">Mini-game “{id}” not found or failed to load (see console).</p>}</ServicesProvider>, root);
    return;
  }

  if (kind === 'page') {
    const entry = Object.entries(pages).find(([p]) => p.endsWith(`/${id}.tsx`));
    await discoverPlugins(services, { filter: { systems: () => false, scenes: () => false, modes: () => false } });
    if (!entry) {
      render(<p class="sb-error">Sandbox page “{id}” not found.</p>, root);
      return;
    }
    const Page = (await entry[1]()).default.component;
    render(<ServicesProvider services={services}><Page services={services} /></ServicesProvider>, root);
    return;
  }

  if (kind === 'scene') {
    await discoverPlugins(services);
    const params = Object.fromEntries([...q.entries()].filter(([k]) => k !== 'sandbox'));
    services.router.replace(id, params);
    render(<ServicesProvider services={services}><Shell /></ServicesProvider>, root);
    return;
  }

  // index
  await discoverPlugins(services);
  const pageIds = Object.keys(pages).map((p) => p.replace(/^.*\/(.*)\.tsx$/, '$1'));
  const r = services.registries;
  render(
    <div class="sb-index">
      <h1>Lumen sandbox</h1>
      <h2>Mini-games</h2>
      <ul>{r.minigames.all().map((m) => <li key={m.id}><a href={`?sandbox=minigame/${m.id}`}>{m.icon} {m.title}</a></li>)}</ul>
      <h2>Scenes</h2>
      <ul>{r.scenes.all().map((s) => <li key={s.id}><a href={`?sandbox=scene/${s.id}`}>{s.id}</a></li>)}</ul>
      <h2>Pages</h2>
      <ul>{pageIds.map((p) => <li key={p}><a href={`?sandbox=page/${p}`}>{p}</a></li>)}</ul>
      <h2>Content</h2>
      <p>{r.cases.all().length} cases · {r.diagnoses.all().length} diagnoses · {r.systems.all().length} systems · {r.modes.all().length} modes</p>
    </div>,
    root,
  );
}

function MiniGameHarness(props: { services: GameServices; mg: MiniGameModule; caseId: string | null; difficulty: number }) {
  const host = useRef<HTMLDivElement>(null);
  const [result, setResult] = useState<MiniGameResult | null>(null);
  const [answer, setAnswer] = useState<string>('');
  const [run, setRun] = useState(0);
  useEffect(() => {
    const s = props.services;
    const rng = s.rng.fork(`sandbox-${run}`);
    const kase = props.caseId ? s.registries.cases.get(props.caseId) : undefined;
    let patient = SAMPLE_PATIENT;
    let findings = buildFindings(45);
    if (kase) {
      patient = kase.patient;
      findings = kase.findings;
      setAnswer(`Case ${kase.id}: ${kase.diagnosis}`);
    } else if (props.mg.practice) {
      const p = props.mg.practice(rng, props.difficulty);
      patient = p.patient;
      findings = p.findings;
      setAnswer(p.answer);
    }
    setResult(null);
    const cleanup = props.mg.mount(host.current!, {
      testId: props.mg.id, patient, findings, mode: kase ? 'case' : 'practice', difficulty: props.difficulty,
      rng, audio: s.audio, fx: s.fx, reducedMotion: false,
    }, (r) => setResult(r));
    return cleanup;
  }, [run]);
  return (
    <div class="sb-harness">
      <div class="sb-stage" ref={host} data-testid="minigame-host" />
      <aside class="sb-panel">
        <h3>{props.mg.icon} {props.mg.title}</h3>
        <p>{props.mg.instructions}</p>
        <button onClick={() => setRun((n) => n + 1)}>↻ New scenario</button>
        <details><summary>Answer key</summary><p>{answer}</p></details>
        {result && <pre data-testid="minigame-result">{JSON.stringify(result, null, 2)}</pre>}
      </aside>
    </div>
  );
}
