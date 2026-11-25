import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { Game } from './Game';
import { onceDone } from './once';
import { makeScenario } from './practice';
import { report } from './report';
import './tonometry.css';

const tonometry: MiniGameModule = {
  id: 'tonometry',
  title: 'Tonometry',
  instructions: 'Numb and stain the eye, centre the glowing mires, then turn the drum until the inner edges of the two semicircles just touch.',
  icon: '◐',
  teaches: [
    'Goldmann applanation: 3.06 mm of cornea flattened; drum grams x10 = mmHg',
    'Fluorescein amount matters: thick mires over-read the pressure, thin mires under-read it',
    'Centre the mires first; the endpoint is the inner edges just touching, read at mid-pulse',
    'Normal IOP is 10-21 mmHg; above 21 is raised, 35 or more is an emergency',
    'A difference of 6 mmHg or more between the eyes is abnormal',
    'iCare rebound needs no drop or dye: average six shots, centred on the apex',
  ],
  mount(host, ctx, done) {
    const once = onceDone(done);
    host.classList.add('tn-host');
    render(h(Game, { ctx, done: once.done }), host);
    return () => {
      once.cancel();
      render(null, host);
      host.classList.remove('tn-host');
    };
  },
  report: (findings, patient) => report(findings, patient),
  practice: (rng, difficulty) => makeScenario(rng, difficulty),
};

export default tonometry;
