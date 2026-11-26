/**
 * The back-lit projector chart, drawn as the patient sees it. Geometry is in
 * arcmin of visual angle (a logMAR-l optotype is 5·10^l arcmin tall), so the
 * defocus blur — a Gaussian in arcmin, elongated along the astigmatic
 * meridian — scales with the chart zoom for free.
 */
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { chartLines, lineSymbols, type ChartKind, type Optotype } from './charts';
import { glyphFor } from './optotypes';
import { mar, type BlurSpec } from './optics';

export interface ProjectorProps {
  kind: ChartKind;
  optotype: Optotype;
  seed: number;
  index: number;
  blur: BlurSpec;
  /** Examiner's ticks (✓ / ✗) under the letters of lines already read */
  marks: Map<number, boolean[]>;
  pinhole: boolean;
  reducedMotion: boolean;
  onPick(index: number): void;
}

let uidSeq = 0;
const FIX_Y = 0.47;

interface Laid {
  y: number;
  h: number;
}

function layout(kind: ChartKind): Laid[] {
  const lines = chartLines(kind);
  const out: Laid[] = [];
  let y = 0;
  lines.forEach((l, i) => {
    const h = 5 * mar(l.logmar);
    if (i > 0) {
      const prev = out[i - 1]!;
      y = prev.y + prev.h / 2 + h * (kind === 'etdrs' ? 1 : 0.9) + h / 2;
    }
    out.push({ y, h });
  });
  return out;
}

/**
 * Camera zoom for the selected line. Letters grow with line size, but only
 * as ~h^0.38, so small lines still look small (like a real chart) while
 * staying big enough to judge the blur on screen.
 */
function targetZoom(h: number, count: number, W: number, H: number): number {
  const base = Math.max(22, Math.min(58, H * 0.075));
  const px = Math.min(H * 0.24, base * Math.pow(h / 5, 0.38));
  let z = px / h;
  const width = (2 * count - 1) * h;
  if (width * z > W * 0.86) z = (W * 0.86) / width;
  return z;
}

function mixHex(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1), 16);
  const pb = parseInt(b.slice(1), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `rgb(${ch(16)},${ch(8)},${ch(0)})`;
}

export function Projector(p: ProjectorProps) {
  const uid = useMemo(() => `vap${++uidSeq}`, []);
  const box = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ W: 640, H: 440 });
  const lines = chartLines(p.kind);
  const laid = useMemo(() => layout(p.kind), [p.kind]);
  const symbols = useMemo(() => lines.map((_, i) => lineSymbols(p.kind, p.optotype, i, p.seed)), [p.kind, p.optotype, p.seed]);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) setSize({ W: Math.round(r.width), H: Math.round(r.height) });
    };
    measure();
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, []);

  const { W, H } = size;
  const sel = laid[Math.min(p.index, laid.length - 1)]!;
  const tz = targetZoom(sel.h, lines[p.index]!.count, W, H);

  // Eased camera: zoom (log-space) and scroll glide to the selected line.
  const cam = useRef({ z: tz, y: sel.y });
  const [, setFrame] = useState(0);
  useEffect(() => {
    if (p.reducedMotion) {
      cam.current = { z: tz, y: sel.y };
      setFrame((n) => n + 1);
      return;
    }
    let raf = 0;
    let last = performance.now();
    const step = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const k = 1 - Math.exp(-dt / 85);
      const c = cam.current;
      const lz = Math.log(c.z) + (Math.log(tz) - Math.log(c.z)) * k;
      const ny = c.y + (sel.y - c.y) * k;
      const done = Math.abs(lz - Math.log(tz)) < 0.002 && Math.abs(ny - sel.y) * tz < 0.3;
      cam.current = done ? { z: tz, y: sel.y } : { z: Math.exp(lz), y: ny };
      setFrame((n) => n + 1);
      if (!done) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [tz, sel.y, p.reducedMotion]);

  const { z, y: cy } = cam.current;
  const fy = H * FIX_Y;
  const toScreenY = (ay: number) => fy + (ay - cy) * z;

  const b = p.blur;
  const veil = b.veil;
  const ink = mixHex('#15110d', '#b8ae9f', Math.min(0.75, veil * 0.9));
  const blurOn = b.major > 0.02 || b.minor > 0.02;
  const warpOn = b.warp > 0.01;

  const visible: number[] = [];
  laid.forEach((l, i) => {
    const sy = toScreenY(l.y);
    const hh = (l.h * z) / 2;
    if (sy + hh > -40 && sy - hh < H + 40 && l.h * z > 1.2) visible.push(i);
  });

  const glyphs = visible.map((i) => {
    const l = laid[i]!;
    const syms = symbols[i]!;
    const n = syms.length;
    return syms.map((s, k) => {
      const x = (k - (n - 1) / 2) * 2 * l.h - l.h / 2;
      const g = glyphFor(s);
      return (
        <g key={`${i}-${k}`} transform={`translate(${x} ${l.y - l.h / 2}) scale(${l.h / 5})${g.rotate ? ` rotate(${g.rotate} 2.5 2.5)` : ''}`} clip-path={`url(#${uid}-box)`}>
          {g.parts.map((part, j) =>
            part.kind === 'fill'
              ? <path key={j} d={part.d} fill={ink} fill-rule={part.evenodd ? 'evenodd' : 'nonzero'} />
              : <path key={j} d={part.d} fill="none" stroke={ink} stroke-width={part.w ?? 1} stroke-linecap="butt" stroke-linejoin="miter" />,
          )}
        </g>
      );
    });
  });

  const selY = toScreenY(sel.y);
  const selHalfW = ((2 * lines[p.index]!.count - 1) * sel.h * z) / 2;
  const selH = sel.h * z;

  const pick = (e: MouseEvent) => {
    const svg = e.currentTarget as SVGSVGElement;
    const r = svg.getBoundingClientRect();
    const sy = ((e.clientY - r.top) / r.height) * H;
    let best = p.index;
    let bd = Infinity;
    visible.forEach((i) => {
      const d = Math.abs(toScreenY(laid[i]!.y) - sy);
      if (d < bd) {
        bd = d;
        best = i;
      }
    });
    if (best !== p.index) p.onPick(best);
  };

  const scotR = Math.max(34, selH * (0.9 + b.scotoma));

  return (
    <div class="va-proj" ref={box}>
      <svg class="va-proj__svg" viewBox={`0 0 ${W} ${H}`} width={W} height={H} onClick={pick} aria-hidden="true">
        <defs>
          <radialGradient id={`${uid}-lum`} cx="48%" cy="44%" r="75%">
            <stop offset="0%" stop-color="#ffffff" />
            <stop offset="55%" stop-color="#f4f7fc" />
            <stop offset="100%" stop-color="#d3dbe9" />
          </radialGradient>
          <radialGradient id={`${uid}-ph`} cx="50%" cy={`${FIX_Y * 100}%`} r="60%">
            <stop offset="0%" stop-color="#000" stop-opacity="0" />
            <stop offset="45%" stop-color="#000" stop-opacity="0.05" />
            <stop offset="80%" stop-color="#05030a" stop-opacity="0.78" />
            <stop offset="100%" stop-color="#05030a" stop-opacity="0.94" />
          </radialGradient>
          <radialGradient id={`${uid}-scot`}>
            <stop offset="0%" stop-color="#8c97ab" stop-opacity="0.92" />
            <stop offset="55%" stop-color="#aab5c8" stop-opacity="0.7" />
            <stop offset="100%" stop-color="#d3dbe9" stop-opacity="0" />
          </radialGradient>
          <linearGradient id={`${uid}-bar`} x1="0" x2="1">
            <stop offset="0%" stop-color="#cfe0ff" stop-opacity="0" />
            <stop offset="18%" stop-color="#cfe0ff" stop-opacity="0.1" />
            <stop offset="82%" stop-color="#cfe0ff" stop-opacity="0.1" />
            <stop offset="100%" stop-color="#cfe0ff" stop-opacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-edge`} x1="0" x2="1">
            <stop offset="0%" stop-color="#d3dbe9" stop-opacity="1" />
            <stop offset="7%" stop-color="#e3e9f4" stop-opacity="0" />
            <stop offset="93%" stop-color="#e3e9f4" stop-opacity="0" />
            <stop offset="100%" stop-color="#d3dbe9" stop-opacity="1" />
          </linearGradient>
          <radialGradient id={`${uid}-vig`} cx="50%" cy="46%" r="72%">
            <stop offset="0%" stop-color="#fff6dc" stop-opacity="0.12" />
            <stop offset="45%" stop-color="#2a1c08" stop-opacity="0" />
            <stop offset="85%" stop-color="#1a1005" stop-opacity="0.34" />
            <stop offset="100%" stop-color="#0c0703" stop-opacity="0.55" />
          </radialGradient>
          <linearGradient id={`${uid}-sheen`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stop-color="#ffffff" stop-opacity="0.22" />
            <stop offset="22%" stop-color="#ffffff" stop-opacity="0.05" />
            <stop offset="40%" stop-color="#ffffff" stop-opacity="0" />
          </linearGradient>
          <clipPath id={`${uid}-box`} clipPathUnits="userSpaceOnUse"><rect x="0" y="0" width="5" height="5" /></clipPath>
          <filter id={`${uid}-blur`} x="-60%" y="-60%" width="220%" height="220%" color-interpolation-filters="sRGB">
            {warpOn && <feTurbulence type="fractalNoise" baseFrequency={(0.9 / sel.h).toFixed(4)} numOctaves={2} seed={7} result="noise" />}
            {warpOn && <feDisplacementMap in="SourceGraphic" in2="noise" scale={(b.warp * sel.h * 0.55).toFixed(3)} xChannelSelector="R" yChannelSelector="G" result="warped" />}
            <feGaussianBlur in={warpOn ? 'warped' : 'SourceGraphic'} stdDeviation={`${Math.max(0.001, b.major).toFixed(3)} ${Math.max(0.001, b.minor).toFixed(3)}`} />
          </filter>
          <filter id={`${uid}-glow`} x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="3" result="g" />
            <feMerge><feMergeNode in="g" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-lum)`} />
        {/* selected-line light bar (examiner's pointer, outside the patient's optics) */}
        <rect class="va-proj__bar" x={W / 2 - selHalfW - selH * 0.9} y={selY - selH * 0.95} width={selHalfW * 2 + selH * 1.8} height={selH * 1.9} rx={selH * 0.3} fill={`url(#${uid}-bar)`} />

        <g transform={`translate(${W / 2} ${fy}) scale(${z}) translate(0 ${-cy})`}>
          {blurOn || warpOn ? (
            <g transform={`rotate(${-b.angle})`} filter={`url(#${uid}-blur)`}>
              <g transform={`rotate(${b.angle})`}>{glyphs}</g>
            </g>
          ) : (
            <g>{glyphs}</g>
          )}
        </g>

        <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-vig)`} pointer-events="none" />
        <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-edge)`} pointer-events="none" opacity="0.6" />
        {b.scotoma > 0.01 && <circle cx={W / 2} cy={selY} r={scotR} fill={`url(#${uid}-scot)`} opacity={Math.min(1, b.scotoma + 0.15)} />}
        {veil > 0.01 && <rect x="0" y="0" width={W} height={H} fill="#fffaf0" opacity={veil * 0.42} />}
        {p.pinhole && <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-ph)`} />}
        {b.luminance < 1 && <rect x="0" y="0" width={W} height={H} fill="#0b0716" opacity={(1 - b.luminance) * 0.55} />}
        {b.dark && <rect class="va-proj__dark" x="0" y="0" width={W} height={H} fill="#06030d" opacity="0.94" />}

        <rect x="0" y="0" width={W} height={H} fill={`url(#${uid}-sheen)`} pointer-events="none" />
        {/* examiner overlays: pointer chevrons + marks */}
        <g class="va-proj__ptr" filter={`url(#${uid}-glow)`}>
          <path d={`M${W / 2 - selHalfW - selH * 0.75 - 14} ${selY - 8} l12 8 l-12 8z`} fill="#3b6bff" />
          <path d={`M${W / 2 + selHalfW + selH * 0.75 + 14} ${selY - 8} l-12 8 l12 8z`} fill="#3b6bff" />
        </g>
        {visible.map((i) => {
          const m = p.marks.get(i);
          if (!m) return null;
          const l = laid[i]!;
          const n = m.length;
          const sy = toScreenY(l.y) + (l.h * z) / 2 + Math.max(7, Math.min(14, l.h * z * 0.22));
          const r = Math.max(3.5, Math.min(7, l.h * z * 0.11));
          return m.map((ok, k) => (
            <circle key={`m${i}-${k}`} class={ok ? 'va-mark va-mark--ok' : 'va-mark va-mark--no'} cx={W / 2 + (k - (n - 1) / 2) * 2 * l.h * z} cy={sy} r={r} />
          ));
        })}
      </svg>
    </div>
  );
}
