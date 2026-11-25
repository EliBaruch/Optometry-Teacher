import { h, render } from 'preact';
import type { MiniGameDone, MiniGameModule } from '@core';
import { Fluorescein } from './Fluorescein';
import { makeFluoScenario } from './fluo-practice';
import { SlitLamp } from './SlitLamp';
import { makeSlitScenario } from './practice';
import { fluoReport, report } from './report';
import './slit-lamp.css';

/** Mount a Preact game into the host, guaranteeing `done` fires once. */
function mountGame<P extends { ctx: Parameters<MiniGameModule['mount']>[1]; done: MiniGameDone }>(
  host: HTMLElement, Game: (p: P) => unknown, ctx: P['ctx'], done: MiniGameDone,
): () => void {
  let called = false;
  const once: MiniGameDone = (r) => {
    if (called) return;
    called = true;
    done(r);
  };
  host.classList.add('sl-host');
  render(h(Game as never, { ctx, done: once } as never), host);
  return () => {
    render(null, host);
    host.classList.remove('sl-host');
  };
}

export const slitLamp: MiniGameModule = {
  id: 'slit-lamp',
  title: 'Slit Lamp',
  instructions: 'Light the eye with the right beam, travel from lids to lens, and tap each sign to name and grade it.',
  icon: 'slit-lamp',
  teaches: [
    'Match the illumination to the target: diffuse and broad for lids and conjunctiva, optic section for depth, retro-illumination for lens opacities',
    'Van Herick: a thin beam at 45–60° on the temporal limbus; the dark gap against corneal thickness grades the angle (grade 1–2 = narrow, refer for gonioscopy)',
    'AC cells and flare need a dark room, a 1 × 1 mm cone and high power; grade cells by the SUN scale (0.5+ to 4+)',
    'Keratic precipitates sit on the endothelium and are seen in a parallelepiped or section at 16× or more',
    'Cobalt blue lights fluorescein and iron rings; red-free light darkens blood vessels',
  ],
  mount: (host, ctx, done) => mountGame(host, SlitLamp, ctx, done),
  report: (findings) => report(findings),
  practice: (rng, difficulty) => makeSlitScenario(rng, difficulty),
};

export const fluorescein: MiniGameModule = {
  id: 'fluorescein',
  title: 'Fluorescein',
  instructions: 'Instil a drop, blink it in, light it with cobalt blue and the yellow barrier — name the stain and time the tear film.',
  icon: 'fluorescein',
  teaches: [
    'One small drop of fluorescein, then a blink to spread it; too much dye floods the contrast',
    'Cobalt blue excites the dye and the yellow barrier filter blocks the glare, so stain glows green',
    'Staining patterns point to causes: dendrite = herpes simplex, inferior punctate = dry eye, linear = abrasion or lid foreign body',
    'Tear break-up time: the seconds from a blink to the first dark spot — under 10 s is reduced',
    'Take the mean of three readings and do not touch the eye or the lids',
  ],
  mount: (host, ctx, done) => mountGame(host, Fluorescein, ctx, done),
  report: (findings) => fluoReport(findings),
  practice: (rng, difficulty) => makeFluoScenario(rng, difficulty),
};

export default [slitLamp, fluorescein] as MiniGameModule[];
