import { h, render } from 'preact';
import type { MiniGameModule, MiniGameResult } from '@core';
import { report } from './clinical';
import { ColorVisionGame } from './Game';
import { practiceScenario } from './practice';

const colorVision: MiniGameModule = {
  id: 'color-vision',
  title: 'Colour Plates',
  instructions: 'Show the plates to each eye, compare red saturation, then classify: normal, protan, deutan, tritan or acquired — and which eye.',
  icon: '🎨',
  teaches: [
    'Pseudo-isochromatic plate types: demonstration, vanishing, transformation, hidden-digit, classification, tracing and blue-yellow',
    'Telling protan from deutan on the classification plate',
    'Congenital (symmetric, stable) vs acquired (asymmetric) colour loss — Köllner’s rule',
    'Red-cap desaturation as a sign of optic neuropathy',
  ],
  mount(host, ctx, done) {
    let called = false;
    const finish = (r: MiniGameResult) => {
      if (called) return;
      called = true;
      done(r);
    };
    render(h(ColorVisionGame, { ctx, finish }), host);
    return () => {
      render(null, host);
      host.textContent = '';
    };
  },
  report,
  practice: practiceScenario,
};

export default colorVision;
