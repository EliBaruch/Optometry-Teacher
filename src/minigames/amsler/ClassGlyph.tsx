import type { AmslerClass } from './geometry';

/** Tiny illustrated grid for each classification option. */
export function ClassGlyph({ kind }: { kind: AmslerClass }) {
  const lines: string[] = [];
  const N = 5;
  for (let i = 0; i <= N; i++) {
    const c = 4 + i * 6;
    let v = `M${c} 4`;
    let h = `M4 ${c}`;
    for (let t = 4; t <= 34; t += 2) {
      let dx = 0;
      let dy = 0;
      if (kind === 'metamorphopsia') {
        const ex = c - 19;
        const ey = t - 19;
        const env = Math.exp(-(ex * ex + ey * ey) / 60);
        dx = Math.sin(t * 0.7) * 2.4 * env;
        const ex2 = t - 19;
        const ey2 = c - 19;
        const env2 = Math.exp(-(ex2 * ex2 + ey2 * ey2) / 60);
        dy = Math.sin(t * 0.7 + 1) * 2.4 * env2;
      }
      v += ` L${(c + dx).toFixed(2)} ${t}`;
      h += ` L${t} ${(c + dy).toFixed(2)}`;
    }
    lines.push(v, h);
  }
  return (
    <svg class={`amsler-glyph amsler-glyph--${kind}`} viewBox="0 0 38 38" aria-hidden="true">
      <rect x="1" y="1" width="36" height="36" rx="5" fill="#07050b" stroke="rgba(255,236,210,0.14)" />
      <path d={lines.join(' ')} fill="none" stroke="#f6efe4" stroke-width="0.9" stroke-linecap="round" opacity="0.88" />
      {kind === 'scotoma' && (
        <>
          <defs>
            <radialGradient id="amsler-glyph-hole">
              <stop offset="0" stop-color="#07050b" stop-opacity="1" />
              <stop offset="0.6" stop-color="#2a2533" stop-opacity="0.95" />
              <stop offset="1" stop-color="#07050b" stop-opacity="0" />
            </radialGradient>
          </defs>
          <circle cx="23" cy="15" r="9" fill="url(#amsler-glyph-hole)" />
        </>
      )}
      <circle cx="19" cy="19" r="1.4" fill="#ffd27a" />
    </svg>
  );
}
