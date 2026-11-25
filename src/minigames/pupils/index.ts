import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { Game } from './Game';
import { makeScenario } from './practice';
import { report } from './report';
import { S } from './strings';
import './pupils.css';

const pupils: MiniGameModule = {
  id: 'pupils',
  title: 'Pupils',
  instructions: 'In a dim room, hold the penlight about 3 s on each eye and swing briskly between them: watch for a pupil that dilates. Size both pupils in light and dark, then test the near response.',
  icon: '◉',
  teaches: [
    'Swinging flashlight: hold about 3 s on each eye, swing briskly and evenly, never across the nose',
    'A relative afferent pupillary defect: both pupils dilate when the light reaches the affected eye',
    'RAPD grade: 1-2+ the lit pupil dilates after a delay, 3-4+ it dilates at once',
    'Anisocoria greater in the dark points to the small pupil (Horner pattern, with ptosis and dilation lag)',
    'Anisocoria greater in the light points to the large pupil (tonic, third nerve or drug-blocked)',
    'Light-near dissociation: poor reaction to light, brisk constriction to near',
  ],
  text: { he: { title: S.he.title, instructions: S.he.instructions, teaches: S.he.teaches } },
  mount(host, ctx, done) {
    let called = false;
    const once: typeof done = (r) => {
      if (called) return;
      called = true;
      done(r);
    };
    host.classList.add('pu-host');
    render(h(Game, { ctx, done: once }), host);
    return () => {
      render(null, host);
      host.classList.remove('pu-host');
    };
  },
  report: (findings, patient) => report(findings, patient),
  practice: (rng, difficulty) => makeScenario(rng, difficulty),
};

export default pupils;
