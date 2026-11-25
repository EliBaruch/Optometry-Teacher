import { h, render } from 'preact';
import type { MiniGameModule, MiniGameResult } from '@core';
import { Game } from './Game';
import { practiceScenario } from './practice';
import { report } from './report';
import { VF_TEXT } from './strings';
import './vf.css';

const visualFields: MiniGameModule = {
  id: 'visual-fields',
  title: 'Visual Fields',
  instructions: 'One eye at a time, eye on the fixation light: probe the bowl, build the plot, then name the pattern and find the lesion.',
  icon: 'visual-fields',
  teaches: [
    'Automated perimetry: threshold staircases (4-2 dB) versus quick supra-threshold screening',
    'The physiological blind spot sits 15° temporal, just below the horizontal meridian',
    'Arcuate and altitudinal defects respect the horizontal meridian (retina / optic nerve)',
    'Hemianopias respect the vertical meridian: bitemporal = chiasm, homonymous = behind the chiasm, opposite side',
    'Superior homonymous quadrantanopia = temporal lobe; inferior = parietal',
  ],
  text: { he: VF_TEXT },
  mount(host, ctx, done) {
    let called = false;
    const finish = (r: MiniGameResult) => {
      if (called) return;
      called = true;
      done(r);
    };
    const root = document.createElement('div');
    root.className = 'vf-host';
    host.appendChild(root);
    render(h(Game, { ctx, finish }), root);
    return () => {
      render(null, root);
      root.remove();
    };
  },
  report,
  practice: (rng, difficulty) => practiceScenario(rng, difficulty),
};

export default visualFields;
