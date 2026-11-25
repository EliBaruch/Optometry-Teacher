import { afterEach, describe, expect, it } from 'vitest';
import { render } from 'preact';
import { act } from 'preact/test-utils';
import { buildFindings, createServices, type ClinicalCase, type GameServices } from '@core';
import { ServicesProvider } from '@ui-kit';
import { DebriefWidget } from './Debrief';
import { announcement, spokenDuration } from './Countdown';

const avatar = { skin: 1 as const, hair: 'short' as const, hairColor: '#000', irisColor: '#333', outfit: '#555' };
const kase = (id: string, urgency: ClinicalCase['urgency']): ClinicalCase => ({
  id, difficulty: 3, tags: [], chiefComplaint: 'Sudden loss', history: [], findings: buildFindings(60),
  essentialTests: [], helpfulTests: [], diagnosis: 'crao', differentials: ['pvd'], urgency, management: '',
  teachingPoints: ['tp'], redFlags: ['Sudden painless loss with a cherry-red spot.'],
  patient: { name: 'Ada', age: 70, sex: 'F', avatar }, emergency: { timeLimitSec: 120 },
});

let host: HTMLDivElement | null = null;
afterEach(() => {
  if (host) render(null, host);
  host?.remove();
  host = null;
});

function debriefAfter(services: GameServices, c: ClinicalCase, dx: string, urgency: ClinicalCase['urgency']) {
  services.registries.cases.register(c);
  services.session.start(c, 'code-red');
  services.session.submit(dx, urgency);
  host = document.createElement('div');
  document.body.appendChild(host);
  act(() => render(<ServicesProvider services={services}><DebriefWidget services={services} /></ServicesProvider>, host!));
  return host;
}

describe('Debrief copy', () => {
  it('shows over-triage as safe, with both triage levels', () => {
    const el = debriefAfter(createServices(), kase('mk', 'urgent'), 'crao', 'emergency');
    expect(el.querySelector('.cr-debrief--over-triaged')).toBeTruthy();
    expect(el.textContent).toContain('Safe, if over-cautious');
    expect(el.textContent).toContain('You triaged');
    expect(el.textContent).toMatch(/Emergency.*Needed.*Urgent/);
    expect(el.textContent).not.toContain('slipped past');
  });
  it('shows a right-urgency wrong-diagnosis call as sent on in time', () => {
    const el = debriefAfter(createServices(), kase('c1', 'emergency'), 'pvd', 'emergency');
    expect(el.textContent).toContain('Sent on in time');
    expect(el.textContent).not.toContain('slipped past');
    expect(el.textContent).toContain('cherry-red spot');
  });
  it('keeps "slipped past" for a wrong diagnosis sent on too slowly', () => {
    const el = debriefAfter(createServices(), kase('c2', 'emergency'), 'pvd', 'routine');
    expect(el.textContent).toContain('This emergency slipped past');
  });
  it('labels the par marker on the timeline', () => {
    const el = debriefAfter(createServices(), kase('c3', 'emergency'), 'crao', 'emergency');
    expect(el.querySelector('.cr-debrief__parcap')?.textContent).toMatch(/par 1:12/);
    expect(el.querySelector('.cr-debrief__decision')?.textContent).toMatch(/^Decision /);
  });
});

describe('Countdown announcements', () => {
  it('announces the start once, then only thresholds below the starting clock', () => {
    expect(announcement(120, 120, false)).toBe('');
    expect(announcement(120, 120, true)).toBe('Emergency clock started: 2 minutes to decide');
    expect(announcement(59, 120, true)).toBe('One minute left');
    // A 30 s clock never opens with "30 seconds left" or "One minute left".
    expect(announcement(30, 30, true)).toBe('Emergency clock started: 30 seconds to decide');
    expect(announcement(20, 30, true)).toBe('Emergency clock started: 30 seconds to decide');
    expect(announcement(9, 30, true)).toBe('10 seconds left');
    expect(announcement(0, 30, true)).toBe('Time is up');
    expect(spokenDuration(90)).toBe('1 minute 30 seconds');
    expect(spokenDuration(1)).toBe('1 second');
  });
});
