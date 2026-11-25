import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { Game } from './Game';
import { makeScenario } from './practice';
import { report } from './report';
import './cover-test.css';

const coverTest: MiniGameModule = {
  id: 'cover-test',
  title: 'Cover Test',
  instructions: 'Cover one eye and watch the other: a tropia moves to take up fixation, a phoria only moves when the cover comes off. Alternate cover shows the total deviation; neutralise it with a prism bar.',
  icon: '◐',
  teaches: [
    'Cover-uncover separates a tropia (manifest) from a phoria (latent)',
    'Refixation is opposite to the deviation: eso moves out, exo moves in, hyper moves down',
    'A phoria shows only when fusion is broken: watch the covered eye recover on uncover',
    'Alternate cover measures the total deviation (tropia plus phoria)',
    'Neutralise with prism: base-out for eso, base-in for exo, base-down over the higher eye',
    'Test at distance (6 m) and near (33 cm): the pattern of difference helps classify the deviation',
  ],
  mount(host, ctx, done) {
    let called = false;
    const once: typeof done = (r) => { if (called) return; called = true; done(r); };
    host.classList.add('cvt-host');
    render(h(Game, { ctx, done: once }), host);
    return () => {
      render(null, host);
      host.classList.remove('cvt-host');
    };
  },
  report: (findings, patient) => report(findings, patient),
  practice: (rng, difficulty) => makeScenario(rng, difficulty),
};

export default coverTest;
