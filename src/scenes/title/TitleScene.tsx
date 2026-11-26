import { useCallback, useEffect, useRef, useState } from 'preact/hooks';
import type { SceneProps } from '@core';
import { Backdrop, Button, Icon, Modal, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { S } from './strings';
import { Intro } from './Intro';
import { Flare, updateFlare } from './Flare';
import { LivingEye } from './LivingEye';
import './title.css';

const ZOOM_MS = 1500;
/** The eye canvas is wider than the round lens that frames it, so the iris is cropped like a macro lens. */
const CROP = 1.36;

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

/** Lumen logo mark: an azure glass tile with a lens ring and a bright pupil. */
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
  // lens diameter, then a wider canvas behind it (the circle crops the lids like a macro view)
  const lens = Math.round(
    landscape
      ? Math.min(vp.w * 0.3, vp.h * (vp.h < 450 ? 0.48 : 0.6))
      : split
        ? Math.min(vp.w * 0.36, 580, vp.h * 0.66)
        : narrow
          ? Math.min(vp.w - 110, vp.h * 0.3)
          : Math.min(vp.w * 0.5, 480, vp.h * 0.34),
  );
  const eyeW = Math.round(lens * CROP);
  const eyeH = lens;
  dims.current = { w: eyeW, h: eyeH, reduced };
  const onSweep = useCallback((ph: number) => updateFlare(flareRef.current, ph, dims.current.w, dims.current.h, dims.current.reduced), []);
  const burst = Math.ceil((Math.max(vp.w, vp.h) * 2.4) / Math.max(40, lens * 0.42));

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
    services.fx.flash('#e4ecff', 500);
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
            <div class="ttl-mark__top lm-enter" style={{ '--lm-delay': '120ms' } as never}>
              <LumenMark />
              <div class="ttl-mark__pill">
                <i aria-hidden="true" /> {t.eyebrow}
              </div>
            </div>
            <h1 class="ttl-mark__word lm-enter" style={{ '--lm-delay': '220ms' } as never}>{t.brand}</h1>
            <div class="ttl-mark__rule lm-enter" style={{ '--lm-delay': '300ms' } as never}>
              <span class="ttl-mark__sub">{t.sub}</span>
              <i aria-hidden="true" />
            </div>
            <p class="ttl-mark__tag lm-enter" style={{ '--lm-delay': '380ms' } as never}>{t.tagline}<span class="ttl-mark__hi"> {t.taglineHi}</span></p>
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

        <div class={`ttl-eye ${zooming ? 'is-zoom' : ''}`} style={{ width: `${lens}px`, height: `${lens}px`, '--lens': `${lens}px` } as never}>
          <div class="ttl-eye__halo" aria-hidden="true"><i /><i /><i /><i /></div>
          <svg class="ttl-eye__rings" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="ttl-eye__ticks" cx="50" cy="50" r="49" pathLength="360" />
            <circle class="ttl-eye__ticks ttl-eye__ticks--major" cx="50" cy="50" r="49" pathLength="360" />
            <circle cx="50" cy="50" r="42" />
          </svg>
          <div class="ttl-eye__bezel" aria-hidden="true" />
          <div class="ttl-eye__frame">
            <div class="ttl-eye__stage" style={{ width: `${eyeW}px`, height: `${eyeH}px` }}>
              <LivingEye width={eyeW} height={eyeH} reduced={reduced} focusCentre={zooming} onSweep={onSweep} />
              <Flare elRef={flareRef} />
            </div>
            <i class="ttl-eye__gloss" aria-hidden="true" />
          </div>
          <div class="ttl-eye__burst" aria-hidden="true" style={{ '--burst': burst } as never} />

          <div class="ttl-card ttl-card--va" aria-hidden="true">
            <span class="ttl-card__k">{t.chipAcuityLabel}</span>
            <span class="ttl-card__row">
              <b class="ttl-card__num lm-num">{t.chipAcuityValue}</b>
              <span class="ttl-tag ttl-tag--green"><i />{t.tagNormal}</span>
            </span>
          </div>
          <div class="ttl-card ttl-card--pupils" aria-hidden="true">
            <span class="ttl-card__ico"><Icon name="eye" size={16} /></span>
            <span class="ttl-card__txt"><b>{t.chipPupilsLabel}</b><em>{t.chipPupilsValue}</em></span>
          </div>
          <div class="ttl-card ttl-card--triage" aria-hidden="true">
            <span class="ttl-tag ttl-tag--green"><i />{t.tagNormal}</span>
            <span class="ttl-tag ttl-tag--orange"><i />{t.tagMonitor}</span>
            <span class="ttl-tag ttl-tag--red"><i />{t.tagUrgent}</span>
          </div>
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
