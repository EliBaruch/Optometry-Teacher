import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { Game } from './Game';
import { makeScenario } from './practice';
import { report } from './report';
import './phoropter.css';

const phoropter: MiniGameModule = {
  id: 'phoropter',
  title: 'Subjective Refraction',
  instructions: 'Fog, bracket the sphere, refine the cylinder with the cross-cylinder and confirm on the duochrome — "which is better, one or two?"',
  icon: '👓',
  teaches: [
    'Start from an objective estimate, then fog so accommodation cannot hide plus',
    'Maximum plus to maximum visual acuity: give minus only for clearer letters',
    'Jackson cross-cylinder: follow the red dot for axis, then refine the power while holding the spherical equivalent',
    'Duochrome endpoint: red blacker add minus, green blacker add plus',
    'Binocular balance with prism dissociation',
  ],
  mount(host, ctx, done) {
    let called = false;
    const once: typeof done = (r) => {
      if (called) return;
      called = true;
      done(r);
    };
    host.classList.add('php-host');
    render(h(Game, { ctx, done: once }), host);
    return () => {
      render(null, host);
      host.classList.remove('php-host');
    };
  },
  report,
  practice: (rng, difficulty) => makeScenario(rng, difficulty),
};

export default phoropter;
