import { useEffect, useRef, useState } from 'preact/hooks';
import type { Eye, PosteriorSegment } from '@core';
import { fundusAnatomy, paintFundus } from '@render';
import type { DiscCall } from './model';

const SIZE = 150;

/** A typical healthy fundus carrying only the player's own disc estimate (never the patient's truth). */
export function referencePosterior(call: DiscCall): PosteriorSegment {
  return {
    vitreous: 'clear',
    disc: { cdr: call.cdr, color: call.color, margins: call.margins, rimThinning: call.rim, edema: call.margins === 'elevated', svp: true },
    vessels: { avRatio: 0.67, avNicking: false, copperWiring: false, tortuosity: 'normal', venousDilation: false },
    lesions: [],
    fundusTone: 'medium',
  };
}

/** The real fundus painter, zoomed on the disc: what a cup of this size and rim would look like. */
export function DiscPreview({ call, eye, fallback }: { call: DiscCall; eye: Eye; fallback: () => preact.JSX.Element }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || failed) return;
    const raf = requestAnimationFrame(() => {
      try {
        const dpr = Math.min(2, window.devicePixelRatio || 1);
        cv.width = SIZE * dpr;
        cv.height = SIZE * dpr;
        const g = cv.getContext('2d');
        if (!g) throw new Error('no 2d context');
        g.setTransform(dpr, 0, 0, dpr, 0, 0);
        const d = fundusAnatomy(eye).disc;
        paintFundus(g, SIZE, SIZE, referencePosterior(call), { eye, seed: 7, view: { cx: d.x, cy: d.y, zoom: 7.5 }, frame: true, vitreous: false });
      } catch {
        setFailed(true);
      }
    });
    return () => cancelAnimationFrame(raf);
  }, [call.cdr, call.color, call.margins, call.rim, eye]);
  if (failed) return fallback();
  return <canvas ref={ref} class="oph-discprev" width={SIZE} height={SIZE} aria-hidden="true" />;
}
