import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { buildFindings, createServices, type ClinicalCase, type Diagnosis, type GameServices, type SceneProps } from '@core';
import { ServicesProvider } from '@ui-kit';
import codex from './index';

const Codex = codex.component as preact.FunctionComponent<SceneProps>;
const BANNED = /\b(sins?|deadly|vice|pride|greed|envy|gluttony|lust|wrath|sloth)\b/i;

const dx = (id: string, name: string, category: Diagnosis['category']): Diagnosis => ({
  id, name, category, summary: `${name} summary.`, keyFindings: [`${name} finding`], typicalUrgency: 'routine',
  pearls: [`${name} pearl`], rarity: 'common', reference: 'https://eyewiki.org/X',
});
const kase: ClinicalCase = {
  id: 'case-myopia', difficulty: 1, tags: [],
  patient: { name: 'Pat', age: 12, sex: 'F', avatar: { skin: 2, hair: 'bob', hairColor: '#222', irisColor: '#345', outfit: '#123' } },
  chiefComplaint: 'Board is blurry.', history: [], findings: buildFindings(12), essentialTests: ['visual-acuity'], helpfulTests: [],
  diagnosis: 'myopia', differentials: ['hyperopia'], urgency: 'routine', management: 'Specs.', teachingPoints: [],
};

let host: HTMLDivElement;
let services: GameServices;
beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  services = createServices();
  services.learning = { ...services.learning, seen: (id) => id === 'myopia', mastery: (id) => (id === 'myopia' ? 0.6 : 0) };
  services.registries.diagnoses.register(dx('myopia', 'Myopia', 'refractive'));
  services.registries.diagnoses.register(dx('hyperopia', 'Hyperopia', 'refractive'));
  services.registries.diagnoses.register(dx('crao', 'Central Retinal Artery Occlusion', 'retina'));
  services.registries.cases.register(kase);
  services.registries.scenes.register({ id: 'exam', component: () => null });
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  vi.useRealTimers();
});

const mount = (params: Record<string, unknown> = {}) =>
  act(() => render(<ServicesProvider services={services}><Codex services={services} params={params} /></ServicesProvider>, host));
const button = (text: string) => [...document.querySelectorAll('button')].find((b) => b.textContent?.includes(text));

describe('codex scene', () => {
  it('groups by category and keeps unseen entries sealed', () => {
    mount();
    const text = host.textContent ?? '';
    expect(text).toContain('Refraction');
    expect(text).toContain('Retina & Vitreous');
    expect(text).toContain('Myopia');
    expect(text).not.toContain('Hyperopia');
    expect(host.querySelectorAll('.codex-card.is-locked')).toHaveLength(2);
    expect(text).not.toMatch(BANNED);
  });

  it('study mode opens every entry and persists', () => {
    mount();
    act(() => host.querySelector<HTMLButtonElement>('.codex-study')!.click());
    expect(host.querySelectorAll('.codex-card.is-locked')).toHaveLength(0);
    expect(services.save.slot('scene:codex', { study: false }).get().study).toBe(true);
  });

  it('filters by search', () => {
    mount();
    act(() => host.querySelector<HTMLButtonElement>('.codex-study')!.click());
    const input = host.querySelector<HTMLInputElement>('input[type=search]')!;
    act(() => {
      input.value = 'artery';
      input.dispatchEvent(new Event('input', { bubbles: true }));
    });
    expect(host.querySelectorAll('.codex-card')).toHaveLength(1);
    expect(host.textContent).toContain('Central Retinal Artery Occlusion');
  });

  it('deep-links into an entry and practises a matching case', () => {
    mount({ diagnosisId: 'myopia' });
    const text = document.body.textContent ?? '';
    expect(text).toContain('Myopia finding');
    expect(text).toContain('Myopia pearl');
    expect(text).toContain('Typical urgency');
    expect(text).toContain('EyeWiki');
    act(() => button('Practise a case')!.click());
    expect(services.router.current.get()).toMatchObject({ id: 'exam', params: { caseId: 'case-myopia', modeId: 'single' } });
    expect(services.session.state.get()?.caseId).toBe('case-myopia');
  });

  it('a sealed entry explains itself instead of opening', () => {
    mount();
    act(() => host.querySelector<HTMLButtonElement>('.codex-card.is-locked')!.click());
    expect(document.body.textContent).toContain('Undiscovered');
    expect(document.body.textContent).not.toContain('Hyperopia summary');
  });

  it('does not lead to a dead end when the exam room is not installed', () => {
    services = createServices();
    services.learning = { ...services.learning, seen: () => true, mastery: () => 0.2 };
    services.registries.diagnoses.register(dx('myopia', 'Myopia', 'refractive'));
    services.registries.cases.register(kase);
    mount({ diagnosisId: 'myopia' });
    const btn = button('Exam room opening soon');
    expect(btn).toBeTruthy();
    expect(btn!.disabled).toBe(true);
    expect(button('Practise a case')).toBeUndefined();
  });

  it('names the category of sealed look-alikes instead of a blank chip', () => {
    mount({ diagnosisId: 'myopia' });
    const chip = document.querySelector('.codex-confused__chip.is-locked');
    expect(chip?.textContent).toContain('Sealed');
    expect(chip?.textContent).toContain('Refraction');
    expect(chip?.textContent).not.toContain('Hyperopia');
  });
});
