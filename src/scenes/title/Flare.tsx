import { beamIllumination } from './logic';

const GHOSTS = [
  { f: 0.35, s: 0.07, c: '255,190,120', a: 0.5 },
  { f: 0.7, s: 0.12, c: '150,170,255', a: 0.32 },
  { f: 1.15, s: 0.05, c: '255,240,200', a: 0.55 },
  { f: 1.6, s: 0.2, c: '170,130,255', a: 0.22 },
  { f: 2.1, s: 0.09, c: '120,220,200', a: 0.3 },
];

/** Multi-element lens flare: core, anamorphic streak and ghosts along the source/centre axis. */
export function Flare({ elRef }: { elRef: { current: HTMLDivElement | null } }) {
  return (
    <div ref={elRef} class="ttl-flare" aria-hidden="true">
      <i class="ttl-flare__streak" />
      <i class="ttl-flare__core" />
      {GHOSTS.map((_, n) => (
        <i key={n} class="ttl-flare__ghost" data-n={n} />
      ))}
    </div>
  );
}

/** Reposition the flare for a sweep phase (-1 = between sweeps). Writes styles directly; no re-render. */
export function updateFlare(el: HTMLElement | null, phase: number, w: number, h: number, reduced: boolean) {
  if (!el) return;
  const live = phase >= 0 && !reduced;
  const sx = live ? (-0.25 + phase * 1.5) * w : w * 0.78;
  const sy = h * 0.2;
  const k = reduced ? 0.35 : 0.38 + 0.62 * beamIllumination(phase);
  const cx = w / 2, cy = h / 2;
  el.style.opacity = String(Math.min(1, k));
  const kids = el.children;
  const streak = kids[0] as HTMLElement, core = kids[1] as HTMLElement;
  const ang = Math.atan2(cy - sy, cx - sx);
  streak.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) rotate(${(ang * 57.3).toFixed(1)}deg) scaleX(${(0.7 + k * 0.6).toFixed(2)})`;
  core.style.transform = `translate(${sx}px, ${sy}px) translate(-50%, -50%) scale(${(0.7 + k * 0.7).toFixed(2)})`;
  GHOSTS.forEach((g, n) => {
    const e = kids[2 + n] as HTMLElement;
    const gx = cx + (cx - sx) * g.f * 0.55;
    const gy = cy + (cy - sy) * g.f * 0.55;
    const d = Math.max(14, g.s * w);
    e.style.width = e.style.height = `${d}px`;
    e.style.transform = `translate(${gx}px, ${gy}px) translate(-50%, -50%)`;
    e.style.opacity = String((g.a * k).toFixed(2));
    e.style.background = `radial-gradient(circle, rgba(${g.c},0) 45%, rgba(${g.c},0.55) 78%, rgba(${g.c},0) 100%)`;
  });
}
