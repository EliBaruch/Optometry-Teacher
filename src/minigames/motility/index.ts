import { h, render } from 'preact';
import type { MiniGameModule } from '@core';
import { MotilityGame } from './MotilityGame';
import { ConvergenceGame } from './ConvergenceGame';
import { convergenceScenario, motilityScenario } from './practice';
import { reportConvergence, reportMotility } from './report';
import { CONVERGENCE_TEXT, MOTILITY_TEXT } from './strings';
import './motility.css';

const mountWith = (Comp: typeof MotilityGame): MiniGameModule['mount'] => (host, ctx, done) => {
  let called = false;
  const once: typeof done = (r) => { if (called) return; called = true; done(r); };
  host.classList.add('mot-host');
  // honour the OS setting even when the host did not pass it down
  const rm = ctx.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);
  render(h(Comp, { ctx: rm === ctx.reducedMotion ? ctx : { ...ctx, reducedMotion: rm }, done: once }), host);
  return () => { render(null, host); host.classList.remove('mot-host'); };
};

const motility: MiniGameModule = {
  id: 'motility',
  title: 'Extraocular Motility',
  instructions: 'Lead the eyes through the H: nine positions of gaze. Watch for an eye that stops short or overshoots, listen for double vision and pain, then grade each eye on the chart.',
  icon: '◎',
  teaches: [
    'Test versions in the nine diagnostic positions of gaze; if unequal, test ductions',
    'Underaction is graded −1 to −4, overaction +1 to +4',
    'CN VI palsy: abduction deficit and esotropia, worst in gaze toward the weak eye',
    'CN IV palsy: the affected eye is higher and fails to depress when adducted; inferior oblique over-acts',
    'CN III palsy: eye down and out with ptosis, ± a dilated pupil (an emergency if pupil-involving)',
    'Pain on eye movement with full ductions suggests optic neuritis',
  ],
  text: { he: MOTILITY_TEXT },
  mount: mountWith(MotilityGame),
  report: reportMotility,
  practice: motilityScenario,
};

const convergence: MiniGameModule = {
  id: 'convergence',
  title: 'Near Point of Convergence',
  instructions: 'Slide the target toward the nose at a steady pace and press Break when one eye drifts out; retreat to recovery. Then push up letters for the amplitude of accommodation.',
  icon: '◉',
  teaches: [
    'NPC: break ≤ 5–6 cm and recovery ≤ 7 cm are normal; beyond 10 cm is receded',
    'Move the target at about 2–5 cm/s: faster gives an inaccurate, nearer break',
    'Convergence insufficiency: receded NPC, exophoria greater at near, reduced positive fusional vergence',
    'Amplitude of accommodation = 100 ÷ near point (cm); Hofstetter average 18.5 − 0.3 × age',
    'A big difference between the two eyes’ amplitude is a red flag (CN III, Adie pupil, drugs)',
  ],
  text: { he: CONVERGENCE_TEXT },
  mount: mountWith(ConvergenceGame as never),
  report: reportConvergence,
  practice: convergenceScenario,
};

export default [motility, convergence] as MiniGameModule[];
