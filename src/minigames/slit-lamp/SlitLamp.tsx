import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { EYES, hashString, type Eye, type MiniGameContext, type MiniGameDone } from '@core';
import { Button, Icon, IconButton, ProgressBar } from '@ui-kit';
import { eyeStateFromFindings } from '@render';
import { Dial } from './Dial';
import { presentOf } from './gate';
import { clampPan, mmToScreen, screenToMm, viewScale, type Pan } from './geo';
import { Joystick, type StickValue } from './Joystick';
import {
  buildSites, coveredCount, COVER_SECONDS, defaultSetting, emptyCoverage, fissureMm, judgeTag, MAGS, presetSetting, regionActive,
  scoreSession, technique, techniqueHint, temporalSide, TECHNIQUES, TECHNIQUE_LABEL, windowMm, zoneOf, type Coverage, type FilterId,
  type LampSetting, type Mag, type Tag, type Technique,
} from './model';
import { createPainter, type LampPainter, type Pin } from './painter';
import { Challenge, Debrief, Tutorial, type DebriefItem, type TutStep } from './Overlays';
import { makeSlitChallenge } from './practice';
import { RadialMenu } from './RadialMenu';
import { report } from './report';
import { pearl } from './teach';
import { describeSign, MENU, REGION_IDS, REGION_LABEL, signLabel, type RegionId } from './vocab';

const TUT_KEY = 'lumen.slit-lamp.tutorial.v1';
const tutorialSeen = () => { try { return localStorage.getItem(TUT_KEY) === '1'; } catch { return false; } };
const markSeen = () => { try { localStorage.setItem(TUT_KEY, '1'); } catch { /* private mode */ } };

const TUT: TutStep[] = [
  { title: 'Light the eye, then look closer', body: 'Pick a beam below: diffuse for an overview, a broad beam for the cornea, a thin optic section for depth, a 1 mm cone for cells in the dark, retro-illumination for the lens. Magnification and filters change what you can resolve.', keys: ['1', '2', '3', '4', '5'] },
  { title: 'Drive the lamp', body: 'Drag the joystick (or the view itself, or use the arrow keys) to travel across lids, conjunctiva, cornea and iris. Some signs only exist in the right light: if the picture looks empty, change your technique.', keys: ['←', '↑', '↓', '→'] },
  { title: 'Tap what you find', body: 'Tap a sign to open the menu: choose the region, name the sign, grade it if asked. Correct tags pin to the eye; wrong ones cost you. Examine both eyes, then record your findings.', keys: ['T', 'E'] },
];

const SPEED = 0.55; // window-widths per second at full stick
const REGION_GUIDE: Record<RegionId, string> = {
  lids: 'Diffuse light, low power: scan the lids and lashes.',
  conj: 'Travel across the conjunctiva, nasal and temporal.',
  cornea: 'Broad beam at 16×: sweep the cornea for deposits and defects.',
  chamber: 'Room lights off. Make a 1 mm cone at 25× and aim it through the pupil.',
  iris: 'Broad beam at 16×: inspect the iris surface and pupil margin.',
  lens: 'Optic section or retro-illumination through the pupil at 16×.',
};

interface PinRec { x: number; y: number; eye: Eye; color: string; mark: Pin['mark']; born: number; ttl?: number }
interface Toast { text: string; tone: 'good' | 'warn' | 'bad' | 'info'; key: number }
interface MenuState { x: number; y: number; mm: { x: number; y: number }; zone: 'lids' | 'conj' | 'cornea' }

const fmtWidth = (w: number) => (w >= 8 ? 'Diffuser' : w < 1 ? `${w.toFixed(2)} mm` : `${w.toFixed(1)} mm`);
const snapWidth = (v: number) => (v >= 8 ? 12 : v < 0.3 ? Math.round(v * 20) / 20 || 0.05 : v < 1.5 ? Math.round(v * 10) / 10 : Math.round(v * 2) / 2);

export function SlitLamp({ ctx, done }: { ctx: MiniGameContext; done: MiniGameDone }) {
  const f = ctx.findings;
  const practice = ctx.mode === 'practice';
  const reduced = ctx.reducedMotion || (typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches);

  const world = useMemo(() => {
    const iris = ctx.patient.avatar.irisColor;
    const mk = (eye: Eye) => {
      const seed = (hashString(`${ctx.patient.name}|${eye}`) % 9000) + 100;
      const common = { irisColor: iris, irisSeed: seed };
      const on = eyeStateFromFindings(f, eye, { ...common, lighting: 'room' });
      const off = eyeStateFromFindings(f, eye, { ...common, lighting: 'dim' });
      const sites = buildSites(f, eye, seed);
      return { seed, on, off, sites, present: presentOf(sites), fissure: fissureMm(on) };
    };
    return { OD: mk('OD'), OS: mk('OS') };
  }, []);
  const allSites = useMemo(() => [...world.OD.sites, ...world.OS.sites], [world]);
  const questions = useMemo(() => (practice ? makeSlitChallenge(f, ctx.rng.fork('slit-challenge')) : []), []);

  // ── mutable instrument state (the RAF loop reads these every frame)
  const S = useRef({
    pan: { x: 0, y: 0 } as Pan,
    vel: { x: 0, y: 0 },
    stick: { x: 0, y: 0 } as StickValue,
    keys: new Set<string>(),
    setting: defaultSetting('OD'),
    eye: 'OD' as Eye,
    cov: { OD: emptyCoverage(), OS: emptyCoverage() } as Record<Eye, Coverage>,
    pins: [] as PinRec[],
    tags: [] as Tag[],
    pending: null as { x: number; y: number } | null,
    menuOpen: false,
    d: 480,
    hints: 0,
    t0: performance.now(),
    finished: false,
    sfxAt: 0,
  });
  const [eye, setEyeState] = useState<Eye>('OD');
  const [setting, setSettingState] = useState<LampSetting>(S.current.setting);
  const [stick, setStick] = useState<StickValue>({ x: 0, y: 0 });
  const [tags, setTags] = useState<Tag[]>([]);
  const [covV, setCovV] = useState(0);
  const [menu, setMenu] = useState<MenuState | null>(null);
  const [toast, setToast] = useState<Toast | null>(null);
  const [tutorial, setTutorial] = useState(() => !tutorialSeen());
  const [phase, setPhase] = useState<'exam' | 'challenge' | 'debrief'>('exam');
  const [right, setRight] = useState<boolean[]>([]);
  const [dim, setDim] = useState({ d: 480, w: 700, h: 520 });
  const [pos, setPos] = useState({ x: 0, y: 0 }); // low-rate copy for the HUD
  const stageRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const toastTimer = useRef(0);
  const busy = tutorial || phase !== 'exam';
  const busyRef = useRef(busy);
  busyRef.current = busy || menu !== null;

  const sfx = (id: Parameters<typeof ctx.audio.play>[0], pitch = 1, volume = 0.5) => {
    const now = performance.now();
    if ((id === 'dial' || id === 'tick') && now - S.current.sfxAt < 50) return;
    S.current.sfxAt = now;
    ctx.audio.play(id, { pitch, volume });
  };
  const say = (text: string, tone: Toast['tone'] = 'info') => {
    clearTimeout(toastTimer.current);
    setToast({ text, tone, key: performance.now() });
    toastTimer.current = window.setTimeout(() => setToast(null), 3600);
  };
  const setLamp = (patch: Partial<LampSetting>) => {
    S.current.setting = { ...S.current.setting, ...patch };
    setSettingState(S.current.setting);
  };
  const pickTechnique = (t: Technique) => {
    if (busyRef.current) return;
    S.current.setting = presetSetting(t, S.current.setting);
    setSettingState(S.current.setting);
    sfx('lens-click', 0.9 + TECHNIQUES.indexOf(t) * 0.06);
  };
  const pickMag = (m: Mag) => { if (m !== S.current.setting.mag) { setLamp({ mag: m }); sfx('lens-click', 1 + MAGS.indexOf(m) * 0.12); } };
  const pickFilter = (fl: FilterId) => {
    if (fl === S.current.setting.filter) return;
    setLamp({ filter: fl });
    sfx('lens-click', 0.8);
    if (fl === 'cobalt') say('Cobalt blue needs fluorescein to be useful — that is the Fluorescein test. It still lights iron (Fleischer) rings.', 'info');
    if (fl === 'redfree') say('Red-free light turns blood vessels black — useful for injection and rubeosis.', 'info');
  };
  const toggleLights = () => { setLamp({ lightsOff: !S.current.setting.lightsOff }); sfx('flashlight', S.current.setting.lightsOff ? 0.7 : 1.2, 0.4); };
  const switchEye = (e: Eye) => {
    if (e === S.current.eye || busyRef.current) return;
    S.current.eye = e;
    S.current.pan = { x: 0, y: 0 };
    const side = temporalSide(e);
    setLamp({ angle: side * Math.max(15, Math.abs(S.current.setting.angle)) });
    setEyeState(e);
    sfx('lens-click', 0.7);
  };

  // ── layout: size the ocular from the stage
  useEffect(() => {
    const el = stageRef.current!;
    const measure = () => {
      const r = el.getBoundingClientRect();
      const d = Math.max(220, Math.floor(Math.min(r.width - 12, r.height - 12)));
      S.current.d = d;
      setDim({ d, w: r.width, h: r.height });
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // ── the loop: integrate the joystick, accumulate coverage, paint
  useEffect(() => {
    const canvas = canvasRef.current!;
    const painter: LampPainter = createPainter(canvas);
    let raf = 0;
    let last = performance.now();
    let lastCovPush = 0;
    let lastPos = 0;
    const loop = (now: number) => {
      raf = requestAnimationFrame(loop);
      const dt = Math.min(0.06, (now - last) / 1000);
      last = now;
      const s = S.current;
      const d = s.d;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      if (canvas.width !== Math.round(d * dpr)) { canvas.width = Math.round(d * dpr); canvas.height = Math.round(d * dpr); }
      // pan
      let tx = s.stick.x;
      let ty = s.stick.y;
      if (s.keys.has('ArrowLeft') || s.keys.has('a')) tx -= 1;
      if (s.keys.has('ArrowRight') || s.keys.has('d')) tx += 1;
      if (s.keys.has('ArrowUp') || s.keys.has('w')) ty -= 1;
      if (s.keys.has('ArrowDown') || s.keys.has('s')) ty += 1;
      if (busyRef.current) { tx = 0; ty = 0; }
      const m = Math.hypot(tx, ty);
      if (m > 1) { tx /= m; ty /= m; }
      const sp = windowMm(s.setting.mag) * SPEED;
      const k = 1 - Math.exp(-dt * 9);
      s.vel.x += (tx * sp - s.vel.x) * k;
      s.vel.y += (ty * sp - s.vel.y) * k;
      if (Math.abs(s.vel.x) > 0.001 || Math.abs(s.vel.y) > 0.001) s.pan = clampPan({ x: s.pan.x + s.vel.x * dt, y: s.pan.y + s.vel.y * dt });
      // coverage
      if (!busyRef.current) {
        const cov = s.cov[s.eye];
        for (const r of REGION_IDS) {
          if (regionActive(r, s.setting, s.pan.x, s.pan.y)) {
            const before = cov[r];
            cov[r] = before + dt;
            if (before < COVER_SECONDS[r] && cov[r] >= COVER_SECONDS[r]) {
              sfx('sparkle', 1.1, 0.35);
              say(`${REGION_LABEL[r]} examined`, 'good');
              setCovV((v) => v + 1);
            }
          }
        }
        if (now - lastCovPush > 450) { lastCovPush = now; setCovV((v) => v + 1); }
      }
      if (now - lastPos > 120) { lastPos = now; setPos({ x: s.pan.x, y: s.pan.y }); }
      // pins
      const live = s.pins.filter((p) => !p.ttl || now - p.born < p.ttl);
      if (live.length !== s.pins.length) s.pins = live;
      const pins: Pin[] = live.filter((p) => p.eye === s.eye).map((p) => ({ x: p.x, y: p.y, color: p.color, mark: p.mark, age: (now - p.born) / 1000 }));
      const w = world[s.eye];
      painter.paint({
        base: s.setting.lightsOff || s.setting.filter === 'cobalt' ? w.off : w.on,
        present: w.present, setting: s.setting, pan: s.pan, t: reduced ? 0 : now / 1000, d, pins, pending: s.pending, seed: w.seed, eye: s.eye, hint: null,
      });
    };
    raf = requestAnimationFrame(loop);
    return () => { cancelAnimationFrame(raf); painter.dispose(); };
  }, []);

  // ── keyboard
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (!rootRef.current?.contains(document.activeElement) && document.activeElement !== document.body) return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const k = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      if (busyRef.current) return;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(k) || ['a', 'd', 'w', 's'].includes(k)) {
        const tgt = e.target as HTMLElement;
        if (tgt?.getAttribute?.('role') === 'slider') return;
        S.current.keys.add(k);
        e.preventDefault();
      } else if (k >= '1' && k <= '5') pickTechnique(TECHNIQUES[Number(k) - 1]!);
      else if (k === 'm') pickMag(MAGS[(MAGS.indexOf(S.current.setting.mag) + 1) % 3]!);
      else if (k === 'f') pickFilter((['white', 'cobalt', 'redfree'] as FilterId[])[(['white', 'cobalt', 'redfree'].indexOf(S.current.setting.filter) + 1) % 3]!);
      else if (k === 'l') toggleLights();
      else if (k === 'e') switchEye(S.current.eye === 'OD' ? 'OS' : 'OD');
      else if (k === 't' || k === 'Enter') openMenuAt(S.current.d / 2, S.current.d / 2);
    };
    const up = (e: KeyboardEvent) => { S.current.keys.delete(e.key.length === 1 ? e.key.toLowerCase() : e.key); };
    const blur = () => S.current.keys.clear();
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    window.addEventListener('blur', blur);
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up); window.removeEventListener('blur', blur); };
  }, []);

  useEffect(() => () => { clearTimeout(toastTimer.current); }, []);
  useEffect(() => { if (!tutorial) rootRef.current?.focus({ preventScroll: true }); }, [tutorial]);

  // ── tagging
  const openMenuAt = (sx: number, sy: number) => {
    if (busyRef.current) return;
    const s = S.current;
    const mm = screenToMm(sx, sy, s.pan, s.d, s.setting.mag);
    const w = world[s.eye];
    const zone = zoneOf(w.fissure, mm.x, mm.y);
    const ocular = canvasRef.current!.getBoundingClientRect();
    const stage = stageRef.current!.getBoundingClientRect();
    s.pending = mm;
    s.menuOpen = true;
    setMenu({ x: ocular.left - stage.left + sx, y: ocular.top - stage.top + sy, mm, zone });
  };
  const closeMenu = () => { S.current.pending = null; S.current.menuOpen = false; setMenu(null); rootRef.current?.focus({ preventScroll: true }); };

  const onPick = (leaf: string) => {
    const s = S.current;
    const m = menu!;
    const taken = new Set(s.tags.filter((t) => t.siteId && t.result !== 'unseen' && t.result !== 'wrong').map((t) => t.siteId!));
    const res = judgeTag(allSites, taken, { eye: s.eye, x: m.mm.x, y: m.mm.y, zone: m.zone, leaf }, s.setting, s.pan.x, s.pan.y);
    // pointing at a sign that is already on the chart is not a mistake
    const dup = allSites.some((st) => st.eye === s.eye && st.sign === res.sign && taken.has(st.id) && Math.hypot((st.zone ? 0 : st.x) - m.mm.x, (st.zone ? 0 : st.y) - m.mm.y) <= (st.zone ? 99 : st.radius) && res.result === 'wrong');
    closeMenu();
    if (dup) { say('That sign is already on the chart.', 'info'); return; }
    const tag: Tag = { ...res, id: s.tags.length + 1 };
    s.tags = [...s.tags, tag];
    setTags(s.tags);
    const now = performance.now();
    const cr = canvasRef.current!.getBoundingClientRect();
    const scr = mmToScreen(m.mm.x, m.mm.y, s.pan, s.d, s.setting.mag);
    const px = cr.left + scr.x;
    const py = cr.top + scr.y;
    const label = describeSign(res.sign, res.grade);
    if (res.result === 'correct') {
      s.pins.push({ x: m.mm.x, y: m.mm.y, eye: s.eye, color: '#5eead4', mark: 'check', born: now });
      sfx('reveal', 1, 0.6);
      ctx.fx.burst(px, py, { kind: 'sparks', count: 16, color: '#5eead4' });
      say(`${label} — confirmed. ${pearl(res.sign) ?? ''}`, 'good');
    } else if (res.result === 'partial') {
      s.pins.push({ x: m.mm.x, y: m.mm.y, eye: s.eye, color: '#fbbf24', mark: 'dot', born: now });
      sfx('select', 1.2, 0.6);
      ctx.fx.burst(px, py, { kind: 'sparks', count: 8, color: '#fbbf24' });
      say(`${signLabel(res.sign)} is right — but the grade is off. ${pearl(res.sign) ?? ''}`, 'warn');
    } else {
      s.pins.push({ x: m.mm.x, y: m.mm.y, eye: s.eye, color: '#f43f5e', mark: 'cross', born: now, ttl: 1500 });
      sfx('error', 1, 0.55);
      ctx.fx.shake(0.35, 180);
      say(res.result === 'unseen' ? 'Nothing resolvable there with this setting — change your technique.' : 'Not confirmed there. Look again before you name it.', 'bad');
    }
  };

  const hint = () => {
    if (busyRef.current) return;
    const s = S.current;
    const found = new Set(s.tags.filter((t) => t.siteId && (t.result === 'correct' || t.result === 'partial')).map((t) => t.siteId));
    const next = world[s.eye].sites.find((st) => !found.has(st.id)) ?? allSites.find((st) => !found.has(st.id));
    s.hints += 1;
    sfx('sparkle', 0.9, 0.4);
    say(next ? `There is more to find — ${techniqueHint(next.sign)}` : 'You have charted everything. Check the other eye, then record.', 'info');
  };

  // ── pointer on the ocular: drag pans, tap tags
  const drag = useRef<{ x: number; y: number; pan: Pan; moved: boolean } | null>(null);
  const onDown = (e: JSX.TargetedPointerEvent<HTMLCanvasElement>) => {
    if (busyRef.current) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    drag.current = { x: e.clientX, y: e.clientY, pan: { ...S.current.pan }, moved: false };
  };
  const onMove = (e: JSX.TargetedPointerEvent<HTMLCanvasElement>) => {
    const dr = drag.current;
    if (!dr) return;
    const dx = e.clientX - dr.x;
    const dy = e.clientY - dr.y;
    if (!dr.moved && Math.hypot(dx, dy) > 7) dr.moved = true;
    if (dr.moved) {
      const sc = viewScale(S.current.d, S.current.setting.mag);
      S.current.pan = clampPan({ x: dr.pan.x - dx / sc, y: dr.pan.y - dy / sc });
    }
  };
  const onUp = (e: JSX.TargetedPointerEvent<HTMLCanvasElement>) => {
    const dr = drag.current;
    drag.current = null;
    if (!dr || dr.moved) return;
    const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const sx = e.clientX - r.left;
    const sy = e.clientY - r.top;
    if (Math.hypot(sx - r.width / 2, sy - r.height / 2) > r.width / 2) return;
    openMenuAt(sx, sy);
  };
  const onWheel = (e: JSX.TargetedWheelEvent<HTMLCanvasElement>) => {
    if (busyRef.current) return;
    e.preventDefault();
    const i = MAGS.indexOf(S.current.setting.mag) + (e.deltaY < 0 ? 1 : -1);
    if (i >= 0 && i < MAGS.length) pickMag(MAGS[i]!);
  };

  // ── progress & recording
  const cov = S.current.cov;
  void covV;
  const covN = { OD: coveredCount(cov.OD), OS: coveredCount(cov.OS) };
  const canRecord = covN.OD >= 2 && covN.OS >= 2;
  const totalCov = (covN.OD + covN.OS) / 12;
  const misses = tags.filter((t) => t.result === 'wrong' || t.result === 'unseen').length;
  const charted = tags.filter((t) => t.result === 'correct' || t.result === 'partial').length;
  const next = REGION_IDS.find((r) => cov[eye][r] < COVER_SECONDS[r]);
  const guidance = next
    ? REGION_GUIDE[next]
    : covN.OD >= 6 && covN.OS >= 6 ? 'Both eyes examined. Record your findings when you are ready.'
      : `${eye === 'OD' ? 'Right' : 'Left'} eye complete — switch eyes (E) and repeat.`;

  const score = useMemo(() => scoreSession(allSites, tags, S.current.cov, S.current.hints, performance.now() - S.current.t0), [tags, covV, phase]);
  const record = () => {
    if (!canRecord) { say('Examine both eyes first — at least two regions each.', 'warn'); sfx('error'); return; }
    sfx('stamp', 1, 0.6);
    setPhase(practice ? 'challenge' : 'debrief');
  };
  const finish = () => {
    if (S.current.finished) return;
    S.current.finished = true;
    const sc = scoreSession(allSites, S.current.tags, S.current.cov, S.current.hints, performance.now() - S.current.t0);
    const q = practice && right.length ? right.filter(Boolean).length / questions.length : 0;
    const accuracy = practice && questions.length ? sc.accuracy * 0.65 + q * 0.35 : sc.accuracy;
    done({
      testId: 'slit-lamp',
      accuracy: Math.max(0, Math.min(1, accuracy)),
      timeMs: Math.round(performance.now() - S.current.t0),
      findings: report(f),
      perfect: sc.perfect && (!practice || right.every(Boolean)),
    });
  };

  const debrief = useMemo(() => {
    if (phase !== 'debrief') return null;
    const credit = new Map<string, number>();
    for (const t of tags) if (t.siteId && (t.result === 'correct' || t.result === 'partial')) credit.set(t.siteId, Math.max(credit.get(t.siteId) ?? 0, t.credit));
    return EYES.map((e) => ({
      heading: e === 'OD' ? 'Right eye (OD)' : 'Left eye (OS)',
      items: world[e].sites.map<DebriefItem>((st) => {
        const c = credit.get(st.id) ?? 0;
        return {
          label: describeSign(st.sign, st.grade),
          status: c >= 1 ? 'found' : c > 0 ? 'partial' : 'missed',
          note: c >= 1 ? undefined : c > 0 ? 'grade differed' : techniqueHint(st.sign),
        };
      }),
    }));
  }, [phase]);

  const narrowMenu = dim.w < 560;
  const menuEl = menu && (
    <RadialMenu
      roots={MENU}
      anchor={{ x: menu.x, y: menu.y }}
      stage={{ w: dim.w, h: dim.h }}
      onPick={onPick}
      onClose={closeMenu}
      sfx={(id) => sfx(id === 'pop' ? 'pop' : id === 'back' ? 'back' : 'click', 1, 0.4)}
    />
  );

  const tech = technique(setting);
  const side = temporalSide(eye);
  const tintFor = (r: RegionId) => cov[eye][r] >= COVER_SECONDS[r] ? 1 : Math.min(0.99, cov[eye][r] / COVER_SECONDS[r]);

  return (
    <div class="sl-root" ref={rootRef} tabIndex={-1} data-eye={eye}>
      <header class="sl-head">
        <div class="sl-head__title"><Icon name="slit-lamp" size={20} /><span>Slit Lamp</span></div>
        <p class="sl-head__hint" key={guidance}><b>Tap a sign to name it.</b> {guidance}</p>
        <div class="sl-seg" role="radiogroup" aria-label="Eye">
          {EYES.map((e) => (
            <button key={e} type="button" role="radio" aria-checked={eye === e} class={`sl-seg__b${eye === e ? ' is-on' : ''}`} onClick={() => switchEye(e)} disabled={busy}>
              {e}{covN[e] >= 4 && <Icon name="check" size={13} class="sl-seg__ok" />}
            </button>
          ))}
        </div>
        <IconButton icon="info" label="Hint: how to see what is missing" size="sm" onClick={hint} disabled={busy} />
        <IconButton icon="book" label="Show the tutorial" size="sm" onClick={() => setTutorial(true)} />
      </header>

      <div class="sl-main">
        <div class="sl-stage" ref={stageRef}>
          <div class="sl-ocular" style={{ width: `${dim.d}px`, height: `${dim.d}px` }}>
            <canvas
              ref={canvasRef}
              class="sl-canvas"
              style={{ width: `${dim.d}px`, height: `${dim.d}px` }}
              tabIndex={0}
              role="application"
              aria-label="Slit-lamp view. Arrow keys move the lamp, T tags the centre, 1 to 5 choose the beam."
              onPointerDown={onDown}
              onPointerMove={onMove}
              onPointerUp={onUp}
              onPointerCancel={() => { drag.current = null; }}
              onWheel={onWheel}
            />
            <i class="sl-reticle" aria-hidden="true" />
            <div class="sl-hud" aria-live="off">
              <span>{setting.mag}×</span><i /><span>{TECHNIQUE_LABEL[tech]}{tech === 'section' || tech === 'broad' ? ` ${fmtWidth(setting.widthMm)}` : tech === 'conical' ? ' 1×1 mm' : ''}</span><i /><span>{Math.abs(setting.angle)}°</span>
              {setting.lightsOff && <><i /><span>dark room</span></>}
            </div>
            <div class="sl-pos" aria-hidden="true">{(pos.x >= 0 ? '+' : '−') + Math.abs(pos.x).toFixed(1)} , {(pos.y >= 0 ? '+' : '−') + Math.abs(pos.y).toFixed(1)} mm</div>
            {toast && <div class={`sl-toast sl-toast--${toast.tone}`} key={toast.key} role="status">{toast.text}</div>}
          </div>
          {menu && !narrowMenu && menuEl}
        </div>

        <aside class="sl-panel" aria-label="Instrument controls">
          <section class="sl-sec">
            <h4 class="sl-sec__t">Beam</h4>
            <div class="sl-presets" role="radiogroup" aria-label="Illumination technique">
              {TECHNIQUES.map((t, i) => (
                <button key={t} type="button" role="radio" aria-checked={tech === t} class={`sl-preset${tech === t ? ' is-on' : ''}`} onClick={() => pickTechnique(t)} title={`${TECHNIQUE_LABEL[t]} (${i + 1})`}>
                  <i class={`sl-glyph sl-glyph--${t}`} />
                  <span>{TECHNIQUE_LABEL[t]}</span>
                </button>
              ))}
            </div>
            <div class="sl-dials">
              <Dial size={54} label="Width" value={setting.widthMm} min={0.05} max={12} log snap={snapWidth} step={0.12}
                format={(v) => (tech === 'conical' ? '1 × 1 mm' : fmtWidth(v))}
                disabled={busy || tech === 'conical'} onChange={(v) => setLamp({ widthMm: v, short: false })} onDetent={() => sfx('dial', 1, 0.3)} />
              <Dial size={54} label="Arm angle" value={setting.angle} min={-75} max={75} step={5} snap={(v) => Math.round(v / 5) * 5}
                format={(v) => `${Math.abs(v)}° ${Math.sign(v) === side || v === 0 ? 'temporal' : 'nasal'}`}
                disabled={busy} onChange={(v) => setLamp({ angle: v || 5 })} onDetent={() => sfx('dial', 1.1, 0.3)} />
            </div>
          </section>

          <section class="sl-sec sl-sec--row">
            <div>
              <h4 class="sl-sec__t">Magnification</h4>
              <div class="sl-seg sl-seg--sm" role="radiogroup" aria-label="Magnification">
                {MAGS.map((m) => <button key={m} type="button" role="radio" aria-checked={setting.mag === m} class={`sl-seg__b${setting.mag === m ? ' is-on' : ''}`} disabled={busy} onClick={() => pickMag(m)}>{m}×</button>)}
              </div>
            </div>
            <div>
              <h4 class="sl-sec__t">Room lights</h4>
              <div class="sl-seg sl-seg--sm" role="radiogroup" aria-label="Room lights">
                <button type="button" role="radio" aria-checked={!setting.lightsOff} class={`sl-seg__b${!setting.lightsOff ? ' is-on' : ''}`} disabled={busy} onClick={() => setting.lightsOff && toggleLights()}>On</button>
                <button type="button" role="radio" aria-checked={setting.lightsOff} class={`sl-seg__b${setting.lightsOff ? ' is-on' : ''}`} disabled={busy} onClick={() => !setting.lightsOff && toggleLights()}>Off</button>
              </div>
            </div>
          </section>

          <section class="sl-sec">
            <h4 class="sl-sec__t">Filter</h4>
            <div class="sl-seg sl-seg--sm sl-seg--wide" role="radiogroup" aria-label="Illumination filter">
              {([['white', 'White'], ['cobalt', 'Cobalt blue'], ['redfree', 'Red-free']] as [FilterId, string][]).map(([id, label]) => (
                <button key={id} type="button" role="radio" aria-checked={setting.filter === id} class={`sl-seg__b${setting.filter === id ? ' is-on' : ''}`} disabled={busy} onClick={() => pickFilter(id)}>
                  <i class={`sl-swatch sl-swatch--${id}`} />{label}
                </button>
              ))}
            </div>
          </section>

          <section class="sl-sec sl-sec--row sl-sec--stick">
            <Joystick value={stick} onChange={(v) => { S.current.stick = v; setStick(v); if (v.x || v.y) sfx('tick', 1, 0.1); }} size={100} />
            <div class="sl-regions" aria-label="Regions examined in this eye">
              <h4 class="sl-sec__t">Examined · {eye}</h4>
              <ul>
                {REGION_IDS.map((r) => {
                  const p = tintFor(r);
                  return (
                    <li key={r} class={p >= 1 ? 'is-done' : p > 0 ? 'is-part' : ''}>
                      <i style={{ '--p': p } as JSX.CSSProperties} aria-hidden="true">{p >= 1 ? '✓' : ''}</i>{REGION_LABEL[r]}
                    </li>
                  );
                })}
              </ul>
            </div>
          </section>
        </aside>
      </div>

      <footer class="sl-foot">
        <div class="sl-foot__prog">
          <ProgressBar value={totalCov} max={1} size="sm" accent="var(--lm-gold)" ariaLabel="Examination completeness" label="Examined" valueText={`${covN.OD + covN.OS}/12`} />
        </div>
        <p class="sl-foot__stats"><span><b>{charted}</b> charted</span><span class={misses ? 'is-bad' : ''}><b>{misses}</b> misses</span></p>
        <Button variant="primary" icon="check" onClick={record} disabled={busy} class={canRecord ? 'sl-rec is-ready' : 'sl-rec'}>Record findings</Button>
      </footer>

      {menu && narrowMenu && menuEl}
      {tutorial && <Tutorial eyebrow="The slit lamp" steps={TUT} cta="Start examining" onClose={() => { markSeen(); setTutorial(false); }} />}
      {phase === 'challenge' && <Challenge questions={questions} audio={ctx.audio as never} onFinish={(r) => { setRight(r); setPhase('debrief'); }} />}
      {phase === 'debrief' && debrief && (
        <Debrief
          title="Anterior segment examined"
          accuracy={practice && questions.length ? score.accuracy * 0.65 + (right.filter(Boolean).length / questions.length) * 0.35 : score.accuracy}
          perfect={score.perfect}
          groups={debrief}
          stats={[{ label: 'signs found', value: `${score.found}/${score.total}` }, { label: 'regions', value: `${Math.round(score.coverage * 12)}/12` }, { label: 'misses', value: String(score.wrong) }]}
          challenge={practice && questions.length ? { right: right.filter(Boolean).length, total: questions.length } : undefined}
          finishLabel={practice ? 'Finish' : 'Add to chart'}
          onFinish={finish}
        />
      )}
    </div>
  );
}
