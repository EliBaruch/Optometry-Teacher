import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { buildFindings, createServices, type ClinicalCase, type GameServices } from '@core';
import { ServicesProvider } from '@ui-kit';
import rivals from '../index';
import { MiniStanding } from './MiniStanding';
import { ResultsPanel } from './ResultsPanel';

const kase: ClinicalCase = {
  id: 'ui-myopia', difficulty: 2, tags: [],
  patient: { name: 'Pat', age: 30, sex: 'M', avatar: { skin: 2, hair: 'short', hairColor: '#222', irisColor: '#345', outfit: '#123' } },
  chiefComplaint: 'Blurry far away.',
  history: [{ id: 'q1', category: 'onset', q: 'When?', a: 'Months.', relevance: 'key' }],
  findings: buildFindings(30),
  essentialTests: ['visual-acuity', 'retinoscopy'], helpfulTests: [],
  diagnosis: 'myopia', differentials: ['astigmatism', 'hyperopia'], urgency: 'routine',
  management: 'Glasses.', teachingPoints: ['Pinhole improves refractive blur.'],
};

let host: HTMLDivElement;
let services: GameServices;
let uninstall: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  host = document.createElement('div');
  document.body.appendChild(host);
  services = createServices();
  services.registries.cases.register(kase);
  services.registries.diagnoses.register({ id: 'myopia', name: 'Myopia', category: 'refractive', summary: '', keyFindings: ['Distance blur'], typicalUrgency: 'routine', pearls: [], rarity: 'common' });
  services.registries.diagnoses.register({ id: 'hyperopia', name: 'Hyperopia', category: 'refractive', summary: '', keyFindings: ['Near blur'], typicalUrgency: 'routine', pearls: [], rarity: 'common' });
  uninstall = rivals.install(services);
});
afterEach(() => {
  act(() => render(null, host));
  host.remove();
  uninstall();
  vi.useRealTimers();
});

const mount = (node: preact.VNode) => act(() => render(<ServicesProvider services={services}>{node}</ServicesProvider>, host));

function finish(diagnosisId: string) {
  services.session.start(kase, 'shift');
  services.session.recordTest({ testId: 'visual-acuity', accuracy: 0.9, timeMs: 1, findings: [] });
  act(() => void services.session.submit(diagnosisId, 'routine'));
}

describe('top-bar chip', () => {
  it('never leaves an exam in progress; shows the standing in a popover instead', () => {
    const go = vi.spyOn(services.router, 'go');
    mount(<MiniStanding services={services} />);
    act(() => services.session.start(kase, 'shift'));
    const btn = host.querySelector('button.rv-mini') as HTMLButtonElement;
    act(() => btn.click());
    expect(go).not.toHaveBeenCalled();
    expect(host.querySelector('.rv-mini__pop')?.textContent).toMatch(/opens after this patient/i);
    expect(btn.getAttribute('aria-expanded')).toBe('true');
    // Once the patient is submitted the chip navigates again.
    act(() => void services.session.submit('myopia', 'routine'));
    act(() => btn.click());
    expect(go).toHaveBeenCalledWith('rivals');
  });
});

describe('results-extra panel', () => {
  it('shows the per-patient comparison only for the finished patient, with the player’s call', () => {
    services.router.replace('results');
    finish('hyperopia');
    mount(<ResultsPanel services={services} />);
    expect(host.textContent).toContain('How your colleagues did on this patient');
    expect(host.textContent).toContain('Called it Hyperopia');
    expect(host.querySelectorAll('.rv-rrow')).toHaveLength(6);
    // A test path can be expanded to read the names (touch users).
    const path = host.querySelector('.rv-path__btn') as HTMLButtonElement;
    act(() => path.click());
    expect(host.querySelector('.rv-path__names')?.textContent).toMatch(/Visual Acuity/);
  });

  it('on the run summary shows the shift card instead of the last patient', () => {
    act(() => services.bus.emit('mode:started', { modeId: 'shift' }));
    finish('myopia');
    act(() => services.session.clear());
    services.router.replace('run-summary');
    mount(<ResultsPanel services={services} />);
    expect(host.textContent).not.toContain('on this patient');
    expect(host.textContent).toContain('This shift on the colleagues board');
    expect(host.textContent).toMatch(/board points from 1 patient/);
  });

  it('hides when a newer case has started', () => {
    services.router.replace('results');
    finish('myopia');
    mount(<ResultsPanel services={services} />);
    expect(host.querySelector('.rv-results')).not.toBeNull();
    act(() => services.session.start({ ...kase, id: 'other' }, 'shift'));
    expect(host.querySelector('.rv-results')).toBeNull();
  });
});
