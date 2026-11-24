import { h, render } from 'preact';
import type { MiniGameModule, MiniGameResult } from '@core';
import { AmslerGame } from './AmslerGame';
import { practiceScenario } from './practice';
import { report } from './report';
import './amsler.css';

const amsler: MiniGameModule = {
  id: 'amsler',
  title: 'Amsler Grid',
  instructions: 'One eye at a time, eyes on the dot: map where the lines bend or vanish, then name it.',
  icon: 'amsler',
  teaches: [
    'The 10 cm, 20 × 20 Amsler grid tests the central 20° (1° per square at 33 cm)',
    'Metamorphopsia (wavy lines) versus scotoma (missing or grey patch)',
    'Charting defects in field terms: temporal versus nasal flips between eyes',
    'New distortion in an older patient warrants urgent retina review',
  ],
  mount(host, ctx, done) {
    let called = false;
    const finish = (r: MiniGameResult) => {
      if (called) return;
      called = true;
      done(r);
    };
    const root = document.createElement('div');
    root.className = 'amsler-host';
    host.appendChild(root);
    render(h(AmslerGame, { ctx, finish }), root);
    return () => {
      render(null, root);
      root.remove();
    };
  },
  report,
  practice: practiceScenario,
};

export default amsler;
