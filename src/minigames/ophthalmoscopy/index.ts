import { h, render } from 'preact';
import type { MiniGameModule, MiniGameResult } from '@core';
import { Game } from './Game';
import { practiceScenario } from './practice';
import { report } from './report';
import './ophthalmoscopy.css';

const ophthalmoscopy: MiniGameModule = {
  id: 'ophthalmoscopy',
  title: 'Ophthalmoscopy',
  instructions: 'Check the red reflex, explore each fundus, then tag the disc, vessels, macula and every lesion you can name.',
  icon: 'ophthalmoscopy',
  teaches: [
    'The red reflex: dull, absent or white means a media opacity (cataract, vitreous haemorrhage, leukocoria)',
    'Direct (upright, about 15×, narrow) versus indirect 20 D (inverted and reversed, about 3×, wide, stereo)',
    'Estimating the vertical cup-to-disc ratio, the ISNT rim rule, disc colour and margins',
    'Vessel signs: A:V ratio, AV nicking, copper wiring, venous dilation, boxcarring',
    'Telling dot-blot and flame haemorrhages, cotton-wool spots, exudates, drusen and new vessels apart',
  ],
  mount(host, ctx, done) {
    let called = false;
    const finish = (r: MiniGameResult) => {
      if (called) return;
      called = true;
      done(r);
    };
    const root = document.createElement('div');
    root.className = 'oph-host';
    host.appendChild(root);
    render(h(Game, { ctx, finish }), root);
    return () => {
      render(null, root);
      root.remove();
    };
  },
  report,
  practice: practiceScenario,
};

export default ophthalmoscopy;
