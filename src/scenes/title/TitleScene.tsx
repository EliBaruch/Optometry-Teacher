import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SceneProps } from '@core';
import { Backdrop, Button, Icon, Modal, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { S } from './strings';
import { Intro } from './Intro';
import { Flare, updateFlare } from './Flare';
import { Lattice } from './Lattice';
import { LivingEye } from './LivingEye';
import { RainGlass } from './RainGlass';
import './title.css';

const ZOOM_MS = 1500;

const MOTES = Array.from({ length: 22 }, (_, i) => {
  const r = (k: number) => { const x = Math.sin((i + 1) * 12.9898 + k * 78.233) * 43758.5453; return x - Math.floor(x); };
  const big = r(5) > 0.7;
  return { '--x': `${(r(1) * 100).toFixed(1)}%`, '--y': `${(30 + r(2) * 70).toFixed(1)}%`, '--s': `${big ? 22 + r(3) * 26 : 5 + r(3) * 8}px`, '--b': big ? '3px' : '0px', '--o': (big ? 0.35 : 0.8).toFixed(2), '--d': `${(9 + r(4) * 10).toFixed(1)}s`, '--dl': `-${(r(6) * 14).toFixed(1)}s`, '--dx': `${((r(7) - 0.5) * 80).toFixed(0)}px` };
});

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
  const t = useStrings(S);
  const reduced = useReducedMotion();
  const settings = useSignal(services.settings);
  const vp = useViewport();
  const [phase, setPhase] = useState<'idle' | 'intro' | 'zoom'>('idle');
  const [credits, setCredits] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const flareRef = useRef<HTMLDivElement>(null);
  const dims = useRef({ w: 0, h: 0, reduced });
  const timer = useRef(0);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  const narrow = vp.w < 640;
  const landscape = vp.h <= 520 && vp.w > vp.h;
  const eyeW = Math.round(
    landscape
      ? Math.min(vp.w * 0.46, vp.h * 1.1)
      : Math.min(vp.w * (narrow ? 1.0 : 0.8), 980, vp.h * (narrow ? 0.98 : 1.2)),
  );
  const eyeH = Math.round(eyeW * 0.5);
  dims.current = { w: eyeW, h: eyeH, reduced };
  const onSweep = useCallback((ph: number) => updateFlare(flareRef.current, ph, dims.current.w, dims.current.h, dims.current.reduced), []);
  const burst = Math.ceil((Math.max(vp.w, vp.h) * 2.4) / Math.max(40, eyeH * 0.42));

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
    phaseRef.current = 'zoom';
    setPhase('zoom');
    services.audio.play('reveal');
    services.fx.flash('#ffd27a', 500);
    timer.current = window.setTimeout(() => services.router.go('hub'), reduced ? 350 : ZOOM_MS);
  };

  const open = () => {
    if (phaseRef.current !== 'idle') return;
    services.audio.unlock();
    services.audio.play('door');
    if (!services.settings.get().onboarded) { phaseRef.current = 'intro'; setPhase('intro'); }
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
      <div class="ttl__layer ttl__arch" aria-hidden="true" style={{ '--depth': 4 } as never}>
        <svg viewBox="0 0 1000 1000" preserveAspectRatio="xMidYMax slice">
          <defs>
            <linearGradient id="ttl-arch" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="#cdbbff" stop-opacity="0.5" />
              <stop offset="1" stop-color="#ffd27a" stop-opacity="0.05" />
            </linearGradient>
          </defs>
          <g fill="none" stroke="url(#ttl-arch)">
            <path d="M120 1000 V420 Q120 120 500 20 Q880 120 880 420 V1000" stroke-width="2.4" />
            <path d="M200 1000 V440 Q200 190 500 110 Q800 190 800 440 V1000" stroke-width="1.2" />
          </g>
        </svg>
      </div>
      <div class="ttl__layer ttl__lattice ttl__lattice--far" aria-hidden="true" style={{ '--depth': 8 } as never}><Lattice cols={11} rows={9} seed={7} strong={false} /></div>
      <div class="ttl__layer ttl__lattice ttl__lattice--mid" aria-hidden="true" style={{ '--depth': 16 } as never}><Lattice cols={5} rows={4} seed={23} strong /></div>
      <div class="ttl__layer ttl__stars" aria-hidden="true" style={{ '--depth': 14 } as never} />
      <div class="ttl__motes" aria-hidden="true" style={{ '--depth': 26 } as never}>
        {MOTES.map((m, i) => <i key={i} style={m as never} />)}
      </div>
      <div class="ttl__layer ttl__halo" aria-hidden="true" style={{ '--depth': 22 } as never} />

      <div class="ttl__stage" {...(phase === 'intro' ? ({ inert: true, 'aria-hidden': true } as object) : {})}>
        <div class={`ttl-eye ${zooming ? 'is-zoom' : ''}`} style={{ width: `${eyeW}px`, height: `${eyeH}px`, '--depth': 30, '--eye-h': `${eyeH}px` } as never}>
          <div class="ttl-eye__glow" aria-hidden="true" />
          <div class="ttl-eye__frame">
            <LivingEye width={eyeW} height={eyeH} reduced={reduced} focusCentre={zooming} onSweep={onSweep} />
          </div>
          <Flare elRef={flareRef} />
          <div class="ttl-eye__burst" aria-hidden="true" style={{ '--burst': burst } as never} />
        </div>

        <div class="ttl-copy">
        <header class={`ttl-mark ${zooming ? 'is-out' : ''}`}>
          <div class="lm-eyebrow ttl-mark__eyebrow lm-enter" style={{ '--lm-delay': '500ms' } as never}>{t.eyebrow}</div>
          <h1 class="ttl-mark__word lm-enter" style={{ '--lm-delay': '650ms' } as never} aria-label={t.brandLabel}>
            {t.brand.split('').map((c, i) => (
              <span key={i} class="ttl-mark__ch" style={{ '--i': i } as never} aria-hidden="true">{c}</span>
            ))}
          </h1>
          <p class="ttl-mark__sub lm-enter" style={{ '--lm-delay': '1000ms' } as never}>
            <i /> {t.sub} <i />
          </p>
        </header>

        <div class={`ttl-cta ${zooming ? 'is-out' : ''} lm-enter`} style={{ '--lm-delay': '1300ms' } as never}>
          <Button variant="primary" size="lg" icon="eye" sfx={false} onClick={open} class="ttl-cta__main" disabled={phase !== 'idle'}>
            {first ? t.openFirst : t.openAgain}
          </Button>
          <div class="ttl-cta__hint">
            {t.press} <kbd class="lm-num">Enter</kbd>
          </div>
          <div class="ttl-cta__touch">{t.touch}</div>
        </div>
        </div>

      <nav class={`ttl-links ${zooming ? 'is-out' : ''}`} aria-label={t.secondary}>
        <button type="button" class="ttl-link" onClick={() => { services.audio.play('click'); services.router.go('settings'); }}>
          <Icon name="settings" size={16} /> {t.settings}
        </button>
        <button type="button" class="ttl-link" onClick={() => { services.audio.play('click'); setCredits(true); }}>
          <Icon name="info" size={16} /> {t.credits}
        </button>
      </nav>
      </div>
      <div class="ttl__vignette" aria-hidden="true" />
      <div class="ttl__layer ttl__pillars" aria-hidden="true" style={{ '--depth': 46 } as never} />
      <RainGlass reduced={reduced} />

      {phase === 'intro' && <Intro onDone={finishIntro} />}
      <div class="ttl__veil" aria-hidden="true" />

      <Modal open={credits} onClose={() => setCredits(false)} title={t.credits} eyebrow={t.creditsEyebrow} icon="sparkle" size="sm">
        <p class="ttl-credits">{t.credits1}</p>
        <p class="ttl-credits ttl-credits--small">{t.credits2}</p>
        <p class="ttl-credits ttl-credits--small">{t.credits3}</p>
      </Modal>
    </div>
  );
}
