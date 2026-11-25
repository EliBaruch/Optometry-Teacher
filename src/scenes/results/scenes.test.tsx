import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { buildFindings, createServices, type ClinicalCase, type GameServices, type ModeModule, type RunSnapshot } from '@core';
import { ServicesProvider } from '@ui-kit';
import scenes from './index';
import { findRun, runLogSlot } from './run-log';
import { Safe } from './Safe';

const Results = scenes.find((s) => s.id === 'results')!.component as preact.FunctionComponent<{ services: GameServices; params: Record<string, unknown> }>;
const Summary = scenes.find((s) => s.id === 'run-summary')!.component as preact.FunctionComponent<{ services: GameServices; params: Record<string, unknown> }>;

const mkCase = (id: string): ClinicalCase => ({
  id, difficulty: 2, tags: [],
  patient: { name: `Pat ${id}`, age: 50, sex: 'M', avatar: { skin: 2, hair: 'short', hairColor: '#222', irisColor: '#345', outfit: '#123' } },
  chiefComplaint: 'Blurry.',
  history: [{ id: 'q1', category: 'onset', q: 'When did it start?', a: 'Yesterday, suddenly.', relevance: 'key' }],
  findings: buildFindings(50),
  essentialTests: ['visual-acuity'], helpfulTests: [],
  diagnosis: 'myopia', differentials: ['hyperopia'], urgency: 'routine',
  management: 'Glasses.', teachingPoints: ['Minus lenses for myopia.'], redFlags: ['Sudden loss.'],
});

const mode: ModeModule = {
  id: 'shift', title: 'Clinic Shift', tagline: '', icon: 'eye', accent: '#fff', order: 0,
  rules: { length: 2 },
  pickNext: (s, run) => s.registries.cases.all().find((c) => !run.completed.includes(c.id) && !run.failed.includes(c.id)) ?? null,
};

const BANNED = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

let host: HTMLDivElement;
let services: GameServices;
let played: string[];

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  played = [];
  services = createServices({ audio: { play: (id) => void played.push(id), music() {}, unlock() {}, setVolumes() {} } });
  services.registries.cases.register(mkCase('c1'));
  services.registries.cases.register(mkCase('c2'));
  services.registries.diagnoses.register({
    id: 'myopia', name: 'Myopia', category: 'refractive', summary: 'Short sight.', keyFindings: ['Distance blur that improves with pinhole'],
    typicalUrgency: 'routine', pearls: ['Cycloplege children.'], rarity: 'common',
  });
  services.registries.modes.register(mode);
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  vi.useRealTimers();
});

const mount = (C: typeof Results, params: Record<string, unknown>) =>
  act(() => render(<ServicesProvider services={services}><C services={services} params={params} /></ServicesProvider>, host));

function playCase(diagnosisId: string, confidence?: 'certain' | 'guessing') {
  services.run.start(mode, 'seed-1');
  const k = services.run.next()!;
  services.session.start(k, 'shift');
  services.bus.emit('reward:granted', { source: 'core', label: 'Lumens', value: '+50', icon: 'coin' });
  services.session.submit(diagnosisId, 'routine', confidence);
  return k;
}

describe('results scene', () => {
  it('reports to the run exactly once, even across re-mounts', () => {
    const k = playCase('myopia');
    mount(Results, { caseId: k.id, modeId: 'shift' });
    act(() => void vi.advanceTimersByTime(100));
    mount(Results, { caseId: k.id, modeId: 'shift', again: 1 });
    act(() => render(null, host));
    mount(Results, { caseId: k.id, modeId: 'shift' });
    const run = services.run.state.get()!;
    expect(run.completed).toEqual([k.id]);
    expect(run.failed).toEqual([]);
    const entry = findRun(runLogSlot(services).get(), 'seed-1')!.entries[0]!;
    expect(entry).toMatchObject({ caseId: k.id, correct: true, grade: expect.any(String) });
  });

  it('runs the choreography, shows buffered and late rewards, and teaches', () => {
    const k = playCase('hyperopia', 'certain');
    mount(Results, { caseId: k.id, modeId: 'shift' });
    act(() => void vi.advanceTimersByTime(10000));
    act(() => services.bus.emit('reward:granted', { source: 'core', label: 'Late bonus', value: 'x2' }));
    act(() => void vi.advanceTimersByTime(2000));
    const text = host.textContent ?? '';
    expect(text).toContain('Not this time');
    expect(text).toContain('Hyperopia'); // what they picked (prettified)
    expect(text).toContain('Confidently wrong');
    expect(text).toContain('Lumens');
    expect(text).toContain('Late bonus');
    expect(text).toContain('Key questions you didn');
    expect(text).toContain('Yesterday, suddenly.');
    expect(text).toContain('What clinched it?');
    expect(text).toContain('Next patient');
    expect(text).not.toMatch(BANNED);
    expect(played).toContain('fail');
  });

  it('skips the choreography with Space and advances with Next patient', () => {
    const k = playCase('myopia', 'guessing');
    mount(Results, { caseId: k.id, modeId: 'shift' });
    act(() => void vi.advanceTimersByTime(50));
    act(() => void window.dispatchEvent(new KeyboardEvent('keydown', { key: ' ' })));
    expect(host.querySelector('.rs-skip')).toBeNull();
    expect(host.textContent).toContain('Lucky? Lock it in.');
    const next = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Next patient'))!;
    act(() => next.click());
    expect(services.router.current.get()).toMatchObject({ id: 'exam', params: { caseId: 'c2' } });
  });

  it('handles a timeout with a sober verdict and reports a null score', () => {
    services.run.start(mode, 'seed-2');
    const k = services.run.next()!;
    services.session.start(k, 'shift');
    services.session.fail('timeout');
    mount(Results, { caseId: k.id, modeId: 'shift', timeout: true });
    act(() => void vi.advanceTimersByTime(10000));
    expect(host.textContent).toContain('Out of time');
    expect(host.textContent).toContain('Myopia');
    expect(host.textContent).toContain('Where the clock stopped');
    expect(host.textContent).toContain('Visual Acuity'); // the essential route
    expect(services.run.state.get()!.failed).toEqual([k.id]);
  });

  it('renders a graceful empty state without a case', () => {
    mount(Results, {});
    expect(host.textContent).toContain('No case to review');
  });
});

describe('run-summary scene', () => {
  it('shows totals, patients and a personal best, and plays again', () => {
    const k = playCase('myopia');
    mount(Results, { caseId: k.id, modeId: 'shift' });
    act(() => render(null, host));
    const snapshot: RunSnapshot = services.run.end()!;
    mount(Summary, { modeId: 'shift', snapshot });
    act(() => void vi.advanceTimersByTime(5000));
    const text = host.textContent ?? '';
    expect(text).toContain('Pat c1');
    expect(text).toContain('1 of 1 correct');
    expect(text).toContain('First record set');
    expect(text).not.toMatch(BANNED);
    const again = [...host.querySelectorAll('button')].find((b) => b.textContent?.includes('Play again'))!;
    act(() => again.click());
    expect(services.router.current.get().id).toBe('exam');
  });

  it('lists missed diagnoses as a study list linking to the codex', () => {
    services.registries.scenes.register({ id: 'codex', component: () => null });
    const k = playCase('hyperopia');
    mount(Results, { caseId: k.id, modeId: 'shift' });
    act(() => render(null, host));
    const snapshot: RunSnapshot = services.run.end()!;
    mount(Summary, { modeId: 'shift', snapshot });
    act(() => void vi.advanceTimersByTime(5000));
    expect(host.textContent).toContain('Worth a second look');
    const item = host.querySelector<HTMLButtonElement>('.sm-study__item')!;
    expect(item.textContent).toContain('Myopia');
    act(() => item.click());
    expect(services.router.current.get()).toMatchObject({ id: 'codex', params: { diagnosisId: 'myopia' } });
  });

  it('collapses to an empty state without a snapshot', () => {
    mount(Summary, { modeId: 'shift' });
    expect(host.textContent).toContain('No patients seen');
  });
});

describe('Safe art boundary', () => {
  it('swaps a crashing painter for its fallback instead of blanking the screen', () => {
    const Boom = () => {
      throw new Error('painter broke');
    };
    act(() => render(<div><Safe fallback={<i class="ph" />}><Boom /></Safe><p>review</p></div>, host));
    expect(host.querySelector('.ph')).not.toBeNull();
    expect(host.textContent).toContain('review');
  });
});
