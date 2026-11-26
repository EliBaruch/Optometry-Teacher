import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { Game } from './Game';
import { makeScenario } from './practice';
import { report } from './report';
import { S } from './strings';
import './keratometry.css';

const keratometry: MiniGameModule = {
  id: 'keratometry',
  title: 'Keratometry',
  instructions: 'Focus the mires, rotate to the principal meridian, then turn the drums until the plus and minus signs fuse — read K1, K2 and the axis.',
  icon: '◎',
  teaches: [
    'Focus first: the reference mire doubles until the keratometer is in focus',
    'Rotate to a principal meridian: broken plus-sign bars mean the instrument is off-axis',
    'Read K1 (flat) and K2 (steep) with their meridians; corneal cylinder = K2 − K1',
    'With-the-rule (steep vertical), against-the-rule (steep horizontal) and oblique corneas',
    'Steep K above 47 D with irregular, wavy mires points to keratoconus — refer for topography',
  ],
  text: { he: { title: S.he.title, instructions: S.he.instructions, teaches: S.he.teaches } },
  mount(host, ctx, done) {
    let called = false;
    const once: typeof done = (r) => {
      if (called) return;
      called = true;
      done(r);
    };
    host.classList.add('kr-host');
    render(h(Game, { ctx, done: once }), host);
    return () => {
      render(null, host);
      host.classList.remove('kr-host');
    };
  },
  report: (findings) => report(findings),
  practice: (rng, difficulty) => makeScenario(rng, difficulty),
};

export default keratometry;
