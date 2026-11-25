export interface FlyChip {
  text: string;
  color: string;
}

/** Where on screen a flourish should fly to: the visible element carrying `data-fly-target="chart"` or the chart tab. */
export function findChartTarget(): HTMLElement | null {
  const cands = [...document.querySelectorAll<HTMLElement>('[data-fly-target="chart"], [data-tab="chart"]')];
  return cands.find((el) => el.getClientRects().length > 0 && el.getBoundingClientRect().width > 0) ?? null;
}

/**
 * Findings fly from `from` into `target` (the chart) as small glowing chips along an arc.
 * Returns a cancel function. `onArrive` fires once, when the last chip lands (or immediately without Web Animations).
 */
export function flyChips(
  from: { x: number; y: number },
  target: HTMLElement | null,
  chips: FlyChip[],
  onArrive: (x: number, y: number) => void,
): () => void {
  const r = target?.getBoundingClientRect();
  const tx = r ? r.left + r.width / 2 : from.x;
  const ty = r ? r.top + Math.min(r.height / 2, 64) : from.y;
  if (!target || !chips.length || typeof document === 'undefined') {
    onArrive(tx, ty);
    return () => {};
  }
  const layer = document.createElement('div');
  layer.className = 'exm-fly-layer';
  layer.setAttribute('aria-hidden', 'true');
  document.body.appendChild(layer);
  const anims: Animation[] = [];
  let cancelled = false;
  let landed = 0;
  const land = () => {
    landed++;
    if (landed >= chips.length) {
      layer.remove();
      if (!cancelled) onArrive(tx, ty);
    }
  };
  chips.forEach((c, i) => {
    const el = document.createElement('span');
    el.className = 'exm-fly';
    el.textContent = c.text;
    el.style.setProperty('--c', c.color);
    layer.appendChild(el);
    if (typeof el.animate !== 'function') {
      el.remove();
      land();
      return;
    }
    const dx = tx - from.x;
    const dy = ty - from.y;
    const at = (k: number, lift: number, s: number) => `translate(${from.x + dx * k}px, ${from.y + dy * k - lift}px) translate(-50%, -50%) scale(${s})`;
    const a = el.animate(
      [
        { transform: at(0, 0, 0.5), opacity: 0 },
        { transform: at(0.3, 110, 1.08), opacity: 1, offset: 0.3 },
        { transform: at(0.75, 40, 0.9), opacity: 1, offset: 0.75 },
        { transform: at(1, 0, 0.35), opacity: 0 },
      ],
      { duration: 950, delay: i * 95, easing: 'cubic-bezier(0.45, 0, 0.2, 1)', fill: 'both' },
    );
    anims.push(a);
    a.onfinish = () => {
      el.remove();
      land();
    };
  });
  return () => {
    cancelled = true;
    for (const a of anims) a.cancel();
    layer.remove();
  };
}
