/**
 * Visual acuity + pinhole: two TestIds from one instrument.
 * Default export is an array of two MiniGameModules.
 */
import { h, render } from 'preact';
import type { MiniGameModule, MiniGameResult } from '@core';
import { Game } from './Game';
import { acuityPractice, pinholePractice } from './practice';
import { reportAcuity, reportPinhole } from './report';
import type { Variant } from './steps';
import './va.css';

function mountWith(variant: Variant): MiniGameModule['mount'] {
  return (host, ctx, done) => {
    let called = false;
    const finish = (r: MiniGameResult) => {
      if (called) return;
      called = true;
      done(r);
    };
    const root = document.createElement('div');
    root.className = 'va-host';
    host.appendChild(root);
    render(h(Game, { ctx, variant, finish }), root);
    return () => {
      render(null, root);
      root.remove();
    };
  };
}

export const visualAcuity: MiniGameModule = {
  id: 'visual-acuity',
  title: 'Visual Acuity',
  instructions: 'One eye at a time: point to lines on the projector chart and find the smallest line the patient reads.',
  icon: 'visual-acuity',
  teaches: [
    'Monocular testing: OD first with OS occluded, then OS — never peeking',
    'Threshold = smallest line with more than half the optotypes correct (Snellen −/+ letter notation)',
    'Snellen 20/x ↔ metric 6/x ↔ logMAR (each line 0.1, each ETDRS letter 0.02)',
    'Off the chart: counts fingers → hand motion → light perception → NLP',
    'Age-appropriate optotypes: LEA symbols and tumbling E for young children',
    'Worse than 20/40 is abnormal; 20/200 or worse is critical',
  ],
  mount: mountWith('acuity'),
  report: reportAcuity,
  practice: acuityPractice,
};

export const pinhole: MiniGameModule = {
  id: 'pinhole',
  title: 'Pinhole',
  instructions: 'Flip the occluder to the pinhole and re-measure: does the acuity improve, or not?',
  icon: 'pinhole',
  teaches: [
    'A pinhole passes only central rays, shrinking the defocus blur circle',
    'Improvement of ≥ 2 lines points to an uncorrected refractive error',
    'No improvement (NI) points to media, macular or optic-nerve disease',
    'Pinhole is only informative when acuity is reduced (worse than 20/25)',
  ],
  mount: mountWith('pinhole'),
  report: reportPinhole,
  practice: pinholePractice,
};

const modules: MiniGameModule[] = [visualAcuity, pinhole];
export default modules;
