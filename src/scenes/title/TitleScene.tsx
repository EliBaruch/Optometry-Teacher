import { useEffect, useRef, useState } from 'preact/hooks';
import type { SceneProps } from '@core';
import { Backdrop, Button, Icon, Modal, useReducedMotion, useSignal } from '@ui-kit';
import { Intro } from './Intro';
import { LivingEye } from './LivingEye';
import './title.css';

const ZOOM_MS = 1150;

function useViewport() {
  const read = () => ({ w: window.innerWidth, h: window.innerHeight });
  const [v, setV] = useState(read);
  useEffect(() => {
    const on = () => setV(read());
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);
  return v;
}

export function TitleScene({ services }: SceneProps) {
  const reduced = useReducedMotion();
  const settings = useSignal(services.settings);
  const vp = useViewport();
  const [phase, setPhase] = useState<'idle' | 'intro' | 'zoom'>('idle');
  const [credits, setCredits] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const timer = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const narrow = vp.w < 640;
  const eyeW = Math.round(Math.min(vp.w * (narrow ? 1.04 : 0.8), 980, vp.h * (narrow ? 0.9 : 1.2)));
  const eyeH = Math.round(eyeW * 0.5);

  // parallax: smoothed pointer offset written to CSS variables (no re-render)
  useEffect(() => {
    const root = rootRef.current;
    if (!root || reduced) return;
    let tx = 0, ty = 0, cx = 0, cy = 0, raf = 0, dead = false;
    const on = (e: PointerEvent) => {
      tx = (e.clientX / window.innerWidth - 0.5) * 2;
      ty = (e.clientY / window.innerHeight - 0.5) * 2;
    };
    const step = () => {
      if (dead) return;
      cx += (tx - cx) * 0.06;
      cy += (ty - cy) * 0.06;
      root.style.setProperty('--px', cx.toFixed(3));
      root.style.setProperty('--py', cy.toFixed(3));
      raf = requestAnimationFrame(step);
    };
    window.addEventListener('pointermove', on, { passive: true });
    step();
    return () => {
      dead = true;
      cancelAnimationFrame(raf);
      window.removeEventListener('pointermove', on);
    };
  }, [reduced]);

  useEffect(() => () => clearTimeout(timer.current), []);

  const zoomAndGo = () => {
    setPhase('zoom');
    services.audio.play('reveal');
    services.fx.flash('#ffd27a', 500);
    timer.current = window.setTimeout(() => services.router.go('hub'), reduced ? 350 : ZOOM_MS);
  };

  const open = () => {
    if (phaseRef.current !== 'idle') return;
    services.audio.unlock();
    services.audio.play('door');
    if (!services.settings.get().onboarded) setPhase('intro');
    else zoomAndGo();
  };

  const finishIntro = () => {
    services.settings.update((s) => ({ ...s, onboarded: true }));
    zoomAndGo();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Enter' || e.defaultPrevented || phaseRef.current !== 'idle' || credits) return;
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === 'BUTTON' || tag === 'A' || tag === 'INPUT') return; // let the focused control handle it
      e.preventDefault();
      open();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [credits]);

  const zooming = phase === 'zoom';
  const first = !settings.onboarded;

  return (
    <div ref={rootRef} class={`ttl ${zooming ? 'is-zoom' : ''} ${reduced ? 'is-reduced' : ''}`}>
      <Backdrop variant="title" fixed />
      <div class="ttl__layer ttl__dome" aria-hidden="true" style={{ '--depth': 6 } as never}>
        <svg viewBox="0 0 1200 800" preserveAspectRatio="xMidYMid slice">
          <defs>
            <linearGradient id="ttl-rib" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#ffd27a" stop-opacity="0.35" />
              <stop offset="1" stop-color="#a78bfa" stop-opacity="0.04" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#ttl-rib)" stroke-width="1.2">
            {[0.25, 0.5, 0.75, 1, 1.28, 1.6].map((k) => (
              <ellipse key={k} cx="600" cy="880" rx={560 * k} ry={760} />
            ))}
            {[-480, -300, -150, 0, 150, 300, 480].map((x) => (
              <path key={x} d={`M600 -40 Q ${600 + x * 0.55} 300 ${600 + x * 1.5} 820`} />
            ))}
          </g>
        </svg>
      </div>
      <div class="ttl__layer ttl__stars" aria-hidden="true" style={{ '--depth': 14 } as never} />
      <div class="ttl__layer ttl__halo" aria-hidden="true" style={{ '--depth': 22 } as never} />

      <div class="ttl__stage">
        <div class={`ttl-eye ${zooming ? 'is-zoom' : ''}`} style={{ width: `${eyeW}px`, height: `${eyeH}px`, '--depth': 30 } as never}>
          <div class="ttl-eye__glow" aria-hidden="true" />
          <div class="ttl-eye__frame">
            <LivingEye width={eyeW} height={eyeH} reduced={reduced} focusCentre={zooming} />
          </div>
          <div class="ttl-flare" aria-hidden="true" />
        </div>

        <header class={`ttl-mark ${zooming ? 'is-out' : ''}`}>
          <div class="lm-eyebrow ttl-mark__eyebrow lm-enter" style={{ '--lm-delay': '500ms' } as never}>An after-hours eye clinic</div>
          <h1 class="ttl-mark__word lm-enter" style={{ '--lm-delay': '650ms' } as never} aria-label="Lumen">
            {'LUMEN'.split('').map((c, i) => (
              <span key={i} class="ttl-mark__ch" style={{ '--i': i } as never} aria-hidden="true">{c}</span>
            ))}
          </h1>
          <p class="ttl-mark__sub lm-enter" style={{ '--lm-delay': '1000ms' } as never}>
            <i /> The Eye Clinic <i />
          </p>
        </header>

        <div class={`ttl-cta ${zooming ? 'is-out' : ''} lm-enter`} style={{ '--lm-delay': '1300ms' } as never}>
          <Button variant="primary" size="lg" icon="eye" sfx={false} onClick={open} class="ttl-cta__main" disabled={phase !== 'idle'}>
            {first ? 'Open the clinic' : 'Step inside'}
          </Button>
          <div class="ttl-cta__hint">
            Press <kbd class="lm-num">Enter</kbd>
          </div>
        </div>
      </div>

      <nav class={`ttl-links ${zooming ? 'is-out' : ''}`} aria-label="Secondary">
        <button type="button" class="ttl-link" onClick={() => { services.audio.play('click'); services.router.go('settings'); }}>
          <Icon name="settings" size={16} /> Settings
        </button>
        <button type="button" class="ttl-link" onClick={() => { services.audio.play('click'); setCredits(true); }}>
          <Icon name="info" size={16} /> Credits
        </button>
      </nav>

      {phase === 'intro' && <Intro onDone={finishIntro} />}
      <div class="ttl__veil" aria-hidden="true" />

      <Modal open={credits} onClose={() => setCredits(false)} title="Credits" eyebrow="Lumen" icon="sparkle" size="sm">
        <p class="ttl-credits">
          Lumen is a teaching game about the optometric consultation. Every eye, iris and chart is painted procedurally in your browser.
        </p>
        <p class="ttl-credits ttl-credits--small">
          Fonts: Fraunces, Inter and Space Grotesk. Clinical content is for education only and is not a substitute for supervised training.
        </p>
      </Modal>
    </div>
  );
}
