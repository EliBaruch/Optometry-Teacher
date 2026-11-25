import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { Game } from './Game';
import { makeScenario } from './practice';
import { report } from './report';
import './retinoscopy.css';

const retinoscopy: MiniGameModule = {
  id: 'retinoscopy',
  title: 'Retinoscopy',
  instructions: 'Sweep the streak across the pupil: with-motion needs plus, against-motion needs minus. Neutralise each principal meridian, then subtract the working distance.',
  icon: '◐',
  teaches: [
    'With motion means add plus; against motion means add minus (SPAM)',
    'Near neutrality the reflex is brighter, wider and faster; at neutrality the pupil fills at once',
    'In astigmatism the reflex breaks away from the streak unless you sweep a principal meridian',
    'Net Rx = gross neutralising lens minus the working-distance lens (67 cm = +1.50 D)',
    'Scissoring suggests keratoconus; a dull reflex points to a media opacity; no reflex means a dense opacity',
  ],
  mount(host, ctx, done) {
    let called = false;
    const once: typeof done = (r) => {
      if (called) return;
      called = true;
      done(r);
    };
    host.classList.add('rt-host');
    render(h(Game, { ctx, done: once }), host);
    return () => {
      render(null, host);
      host.classList.remove('rt-host');
    };
  },
  report: (findings, patient) => report(findings, patient),
  practice: (rng, difficulty) => makeScenario(rng, difficulty),
};

export default retinoscopy;
