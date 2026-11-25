import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import {
  buildFindings, createServices, type ClinicalCase, type GameServices, type MiniGameDone, type MiniGameModule, type SceneProps,
} from '@core';
import { ServicesProvider } from '@ui-kit';
import exam from './index';

const Exam = exam.component as preact.FunctionComponent<SceneProps>;
const BANNED = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

const avatar = { skin: 2, hair: 'short', hairColor: '#333', irisColor: '#456', outfit: '#223' } as const;
const kase: ClinicalCase = {
  id: 'test-glaucoma',
  difficulty: 3,
  tags: ['painful'],
  patient: { name: 'Ada Stone', age: 61, sex: 'F', occupation: 'Baker', personality: 'Cheerful.', avatar },
  chiefComplaint: 'My eye hurts and the lights have halos.',
  triageNote: 'Red eye.',
  history: [
    { id: 'onset', category: 'onset', q: 'When did it start?', a: 'Last night.', relevance: 'key' },
    { id: 'fam', category: 'family', q: 'Anyone in the family with eye problems?', a: 'My mother was blind in one eye.', relevance: 'helpful' },
  ],
  findings: buildFindings(61, {}),
  essentialTests: ['tonometry'],
  helpfulTests: [],
  diagnosis: 'dx-acg',
  differentials: ['dx-uveitis', 'dx-conj'],
  urgency: 'emergency',
  management: '',
  teachingPoints: [],
};

let host: HTMLDivElement;
let services: GameServices;
let finish: MiniGameDone | null;
let now: number;
const calls = { mount: 0, cleanup: 0 };

const tono: MiniGameModule = {
  id: 'tonometry', title: 'Tonometry', instructions: 'Align.', icon: 'tonometry', teaches: [],
  mount(el, ctx, done) {
    calls.mount++;
    expect(ctx.mode).toBe('case');
    expect(ctx.difficulty).toBeCloseTo(0.5);
    finish = done;
    el.textContent = 'tonometer';
    return () => void calls.cleanup++;
  },
  report: () => [{ label: 'IOP', value: '52 mmHg', eye: 'OD', flag: 'critical' }],
};
const broken: MiniGameModule = {
  id: 'amsler', title: 'Amsler Grid', instructions: '', icon: 'amsler', teaches: [],
  mount() {
    throw new Error('boom');
  },
  report: () => [],
};

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, 'error').mockImplementation(() => {});
  host = document.createElement('div');
  document.body.appendChild(host);
  now = 1_000_000;
  services = createServices({ now: () => now });
  services.registries.cases.register(kase);
  for (const [id, name, category] of [['dx-acg', 'Acute angle closure', 'glaucoma'], ['dx-uveitis', 'Anterior uveitis', 'anterior'], ['dx-conj', 'Conjunctivitis', 'anterior']] as const) {
    services.registries.diagnoses.register({ id, name, category, summary: 'SECRET SUMMARY', keyFindings: [], typicalUrgency: 'urgent', pearls: [], rarity: 'common' });
  }
  services.registries.minigames.register(tono);
  services.registries.minigames.register(broken);
  finish = null;
  calls.mount = calls.cleanup = 0;
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const mount = (params: Record<string, unknown> = { caseId: kase.id, modeId: 'single' }) => {
  act(() => render(<ServicesProvider services={services}><Exam services={services} params={params} /></ServicesProvider>, host));
  act(() => void vi.advanceTimersByTime(50));
};
const press = (el: Element | null | undefined) => act(() => void (el as HTMLElement).click());
const byText = (sel: string, text: string) => [...document.querySelectorAll<HTMLElement>(sel)].find((b) => b.textContent?.includes(text));
const tick = (ms: number) => act(() => void vi.advanceTimersByTime(ms));

describe('exam scene', () => {
  it('starts a session when none is active and shows only installed instruments', () => {
    mount();
    expect(services.session.state.get()?.caseId).toBe(kase.id);
    const text = host.textContent ?? '';
    expect(text).toContain('Ada Stone');
    expect(text).toContain('Tonometry');
    expect(text).toContain('Amsler Grid');
    expect(text).not.toContain('Keratometry');
    expect(text).not.toMatch(BANNED);
  });

  it('reuses the active session instead of restarting it', () => {
    services.session.start(kase, 'shift');
    services.session.ask('onset');
    mount({ caseId: kase.id, modeId: 'shift' });
    expect(services.session.state.get()?.askedQuestions).toEqual(['onset']);
    expect(host.textContent).toContain('Last night.');
  });

  it('asking a question records it and writes the patient voice into the log', () => {
    mount();
    press(byText('.exm-q', 'When did it start?'));
    expect(services.session.state.get()?.askedQuestions).toEqual(['onset']);
    expect(host.querySelector('.exm-msg--them')?.textContent).toContain('Last night.');
    press(byText('.exm-q', 'When did it start?')); // asking twice is a no-op
    expect(services.session.state.get()?.askedQuestions).toHaveLength(1);
  });

  it('does not label key questions', () => {
    mount();
    expect(host.innerHTML).not.toMatch(/key question|relevance|red-herring/i);
  });

  it('the technician records an auto-run result at half skill', () => {
    mount();
    press(host.querySelector('button[aria-label*="Tonometry"].exm-tool__tech'));
    const r = services.session.state.get()?.testsDone.tonometry;
    expect(r?.autoRun).toBe(true);
    expect(r?.accuracy).toBe(0.5);
    expect(services.session.state.get()?.chart[0]?.label).toBe('IOP');
    tick(1500);
    expect(host.querySelector('.exm-row--critical')).toBeTruthy();
  });

  it('technician is hidden when the mode forbids auto-run', () => {
    services.registries.modes.register({ id: 'strict', title: 'Strict', tagline: '', icon: '', accent: '', order: 1, rules: { length: 3, autoRun: false }, pickNext: () => null });
    mount({ caseId: kase.id, modeId: 'strict' });
    expect(host.querySelector('.exm-tool__tech')).toBeNull();
  });

  it('mounts the mini-game, records its result once and always cleans up', () => {
    mount();
    press(byText('.exm-tool__main', 'Tonometry'));
    tick(100);
    expect(calls.mount).toBe(1);
    act(() => void finish?.({ testId: 'tonometry', accuracy: 0.9, timeMs: 5000, findings: [{ label: 'IOP', value: '15 mmHg', eye: 'OD', flag: 'normal' }] }));
    act(() => void finish?.({ testId: 'tonometry', accuracy: 0.1, timeMs: 1, findings: [] })); // double done is ignored
    expect(services.session.state.get()?.testsDone.tonometry?.accuracy).toBe(0.9);
    tick(500);
    expect(calls.cleanup).toBe(1);
  });

  it('a mini-game that throws in mount does not crash the scene', () => {
    mount();
    const amsler = byText('.exm-tool__main', 'Amsler');
    press(amsler);
    tick(100);
    expect(document.querySelector('.exm-stage-failed')).toBeTruthy();
    expect(host.textContent).toContain('Ada Stone');
    press(byText('.exm-stage-failed button', 'Skip'));
    tick(500);
    expect(document.querySelector('.exm-stage-failed')).toBeNull();
    expect(services.session.state.get()?.testsDone.amsler).toBeUndefined();
  });

  it('hints cost efficiency, point at an essential test and emit hint:used', () => {
    const used = vi.fn();
    services.bus.on('hint:used', used);
    mount();
    press(host.querySelector('button[aria-label^="Ask a colleague"]'));
    expect(services.session.state.get()?.hintsUsed).toBe(1);
    expect(used).toHaveBeenCalledWith({ caseId: kase.id });
    expect(document.querySelector('.exm-nudge')?.textContent).toContain('Tonometry');
  });

  it('pins and reorders suspects (max four) as plain notes', () => {
    mount();
    press(byText('.exm-suspects button', 'Pin a suspect'));
    tick(100);
    press(byText('.exm-opt', 'Anterior uveitis'));
    press(byText('.exm-opt', 'Conjunctivitis'));
    expect([...host.querySelectorAll('.exm-pin__name')].map((n) => n.textContent)).toEqual(['Anterior uveitis', 'Conjunctivitis']);
    press(host.querySelector('button[aria-label="Move Conjunctivitis up"]'));
    expect(host.querySelector('.exm-pin__name')?.textContent).toBe('Conjunctivitis');
    press(host.querySelector('button[aria-label="Unpin Conjunctivitis"]'));
    expect(host.querySelectorAll('.exm-pin')).toHaveLength(1);
  });

  it('diagnosis board: no summaries, needs all three answers, submits with confidence and moves to results', () => {
    mount();
    press(byText('button', 'Diagnose'));
    tick(100);
    const board = document.querySelector('.exm-board')!;
    expect(board.textContent).not.toContain('SECRET SUMMARY');
    expect(board.querySelectorAll('.exm-dx')).toHaveLength(3);
    const submit = board.querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(submit.disabled).toBe(true);
    const radios = (name: string) => [...board.querySelectorAll<HTMLInputElement>(`input[name=${name}]`)];
    act(() => void radios('dx').find((r) => r.value === 'dx-acg')!.click());
    act(() => void radios('urgency').find((r) => r.value === 'emergency')!.click());
    expect(submit.disabled).toBe(true);
    act(() => void radios('conf').find((r) => r.value === 'certain')!.click());
    expect(submit.disabled).toBe(false);
    press(submit);
    const sub = services.session.state.get()?.submitted;
    expect(sub?.diagnosisId).toBe('dx-acg');
    expect(sub?.urgency).toBe('emergency');
    expect(sub?.confidence).toBe('certain');
    expect(sub?.score.diagnosisCorrect).toBe(true);
    tick(2200);
    expect(services.router.current.get()).toMatchObject({ id: 'results', params: { caseId: kase.id, modeId: 'single' } });
  });

  it('timed cases fail with a timeout and go to results', () => {
    services.session.start(kase, 'code-red', 20);
    mount({ caseId: kase.id, modeId: 'code-red' });
    expect(host.querySelector('[role=timer]')?.textContent).toContain('0:20');
    now += 21_000;
    tick(500);
    expect(services.session.state.get()?.failed).toBe('timeout');
    expect(services.router.current.get()).toMatchObject({ id: 'results', params: { caseId: kase.id, modeId: 'code-red', timeout: true } });
  });

  it('shows a graceful message for an unknown case', () => {
    mount({ caseId: 'nope' });
    expect(host.textContent).toContain('No patient is waiting');
  });
});
