import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SceneProps } from '@core';
import { Backdrop, Button, Icon, Modal, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { S } from './strings';
import { Intro } from './Intro';
import { Flare, updateFlare } from './Flare';
import { LivingEye } from './LivingEye';
import './title.css';

const ZOOM_MS = 1500;
/** Hero card aspect (height / width): a friendly macro crop of the eye, not a thin slit. */
const ASPECT = 0.74;

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

/** Lumen logo mark: a teal tile with a lens ring and a bright pupil. */
function LumenMark() {
  return (
    <svg class="ttl-mark__logo" viewBox="0 0 48 48" aria-hidden="true">
      <defs>
        <linearGradient id="ttl-logo-g" x1="6" y1="2" x2="42" y2="46" gradientUnits="userSpaceOnUse">
          <stop offset="0" stop-color="#5c87ff" />
          <stop offset="1" stop-color="#2257f0" />
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx="14" fill="url(#ttl-logo-g)" />
      <circle cx="24" cy="24" r="12.5" fill="none" stroke="#fff" stroke-width="3" />
      <circle cx="24" cy="24" r="5" fill="#fff" />
      <path d="M13.5 15.5a14 14 0 0 1 8-5" fill="none" stroke="#fff" stroke-opacity=".55" stroke-width="2" stroke-linecap="round" />
    </svg>
  );
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
  const split = landscape || vp.w >= 960;
  const eyeW = Math.round(
    landscape
      ? Math.min(vp.w * 0.4, (vp.h * 0.66) / ASPECT)
      : split
        ? Math.min(vp.w * 0.42, 640, (vp.h * 0.64) / ASPECT)
        : narrow
          ? Math.min(vp.w - 40, (vp.h * 0.33) / ASPECT)
          : Math.min(vp.w * 0.7, 560, (vp.h * 0.36) / ASPECT),
  );
  const eyeH = Math.round(eyeW * ASPECT);
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
    services.fx.flash('#cdf2f1', 500);
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

      <div class="ttl__stage" {...(phase === 'intro' ? ({ inert: true, 'aria-hidden': true } as object) : {})}>
        <nav class={`ttl-links ${zooming ? 'is-out' : ''}`} aria-label={t.secondary}>
          <button type="button" class="ttl-link" onClick={() => { services.audio.play('click'); services.router.go('settings'); }}>
            <Icon name="settings" size={16} /> {t.settings}
          </button>
          <button type="button" class="ttl-link" onClick={() => { services.audio.play('click'); setCredits(true); }}>
            <Icon name="info" size={16} /> {t.credits}
          </button>
        </nav>

        <div class="ttl-copy">
          <header class={`ttl-mark ${zooming ? 'is-out' : ''}`}>
            <div class="ttl-mark__pill lm-enter" style={{ '--lm-delay': '150ms' } as never}>
              <i aria-hidden="true" /> {t.eyebrow}
            </div>
            <div class="ttl-mark__lockup lm-enter" style={{ '--lm-delay': '250ms' } as never}>
              <LumenMark />
              <div class="ttl-mark__text">
                <h1 class="ttl-mark__word">{t.brand}</h1>
                <span class="ttl-mark__sub">{t.sub}</span>
              </div>
            </div>
            <p class="ttl-mark__tag lm-enter" style={{ '--lm-delay': '380ms' } as never}>{t.tagline}</p>
            <p class="ttl-mark__pitch lm-enter" style={{ '--lm-delay': '460ms' } as never}>{t.pitch}</p>
          </header>

          <div class={`ttl-cta ${zooming ? 'is-out' : ''} lm-enter`} style={{ '--lm-delay': '560ms' } as never}>
            <Button variant="primary" size="lg" trailingIcon="arrow-right" sfx={false} onClick={open} class="ttl-cta__main" disabled={phase !== 'idle'}>
              {first ? t.openFirst : t.openAgain}
            </Button>
            <div class="ttl-cta__hint">
              {t.press} <kbd class="lm-num">Enter</kbd>
            </div>
            <div class="ttl-cta__touch">{t.touch}</div>
          </div>
        </div>

        <div class={`ttl-eye ${zooming ? 'is-zoom' : ''}`} style={{ width: `${eyeW}px`, height: `${eyeH}px`, '--eye-h': `${eyeH}px` } as never}>
          <svg class="ttl-eye__rings" viewBox="0 0 100 100" aria-hidden="true">
            <circle cx="50" cy="50" r="49" />
            <circle cx="50" cy="50" r="38" />
            <circle cx="50" cy="50" r="27" />
          </svg>
          <div class="ttl-eye__frame">
            <LivingEye width={eyeW} height={eyeH} reduced={reduced} focusCentre={zooming} onSweep={onSweep} />
            <Flare elRef={flareRef} />
          </div>
          <div class="ttl-chip ttl-chip--a" aria-hidden="true">
            <span class="ttl-chip__ico"><Icon name="check" size={16} /></span>
            <span class="ttl-chip__txt"><b>{t.chipAcuityLabel}</b><em class="lm-num">{t.chipAcuityValue}</em></span>
          </div>
          <div class="ttl-chip ttl-chip--b" aria-hidden="true">
            <span class="ttl-chip__ico ttl-chip__ico--sky"><Icon name="eye" size={16} /></span>
            <span class="ttl-chip__txt"><b>{t.chipPupilsLabel}</b><em>{t.chipPupilsValue}</em></span>
          </div>
          <div class="ttl-eye__burst" aria-hidden="true" style={{ '--burst': burst } as never} />
        </div>
      </div>

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
