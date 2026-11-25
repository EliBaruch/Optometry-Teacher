/** Painted close-up of the periocular face: brows, lid folds, nose bridge, cheeks. Pure decoration behind the eye canvases. */
const BROW_HAIRS = 74;

function browHairs(side: 'L' | 'R'): { d: string; o: number; w: number }[] {
  const out: { d: string; o: number; w: number }[] = [];
  // medial end near the nose (x=44 / 56), lateral end far out; viewer's left brow is the patient's right (OD)
  const med = side === 'L' ? 43 : 57;
  const lat = side === 'L' ? 8 : 92;
  for (let i = 0; i < BROW_HAIRS; i++) {
    const s = i / (BROW_HAIRS - 1);
    const j = Math.sin(i * 12.9898) * 43758.5453; const r = j - Math.floor(j); // deterministic jitter
    const x = med + (lat - med) * s;
    const arch = 15.2 - 4.4 * Math.sin(Math.PI * Math.min(1, s * 0.92)) + 3.2 * s * s * s;
    const y = arch + (r - 0.5) * 2.4 * (0.6 + 0.4 * Math.sin(Math.PI * s));
    const dir = side === 'L' ? -1 : 1;
    const len = 1.4 + r * 1.2;
    out.push({ d: `M${x.toFixed(2)} ${y.toFixed(2)} q${(dir * len * 0.6).toFixed(2)} ${(-len * 0.7).toFixed(2)} ${(dir * len).toFixed(2)} ${(-len * 0.35 - s * 0.6).toFixed(2)}`, o: 0.5 + r * 0.45, w: 0.8 + r * 1.1 });
  }
  return out;
}
const HAIRS = { L: browHairs('L'), R: browHairs('R') };

export function Face() {
  return (
    <svg class="cvt-face" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true" focusable="false">
      <defs>
        <filter id="cvt-b4" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="1.6" /></filter>
        <filter id="cvt-b9" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="3.4" /></filter>
        <linearGradient id="cvt-bridge" x1="0" x2="1">
          <stop offset="0" stop-color="#1a0a0c" stop-opacity="0.5" /><stop offset="0.5" stop-color="#fff0dc" stop-opacity="0.16" /><stop offset="1" stop-color="#1a0a0c" stop-opacity="0.5" />
        </linearGradient>
      </defs>
      {/* brow ridge shadow, lid-fold shadow, under-eye bags */}
      <g filter="url(#cvt-b9)" fill="#1a0a0c">
        <ellipse cx="25" cy="22" rx="20" ry="4.5" opacity="0.42" />
        <ellipse cx="75" cy="22" rx="20" ry="4.5" opacity="0.42" />
      </g>
      <g filter="url(#cvt-b4)" fill="none" stroke="#2a1410" stroke-linecap="round">
        <path d="M8 31 Q25 22.5 43 29" stroke-width="2.4" opacity="0.36" vector-effect="non-scaling-stroke" />
        <path d="M92 31 Q75 22.5 57 29" stroke-width="2.4" opacity="0.36" vector-effect="non-scaling-stroke" />
        <path d="M12 66 Q25 71 40 66" stroke-width="2" opacity="0.22" vector-effect="non-scaling-stroke" />
        <path d="M88 66 Q75 71 60 66" stroke-width="2" opacity="0.22" vector-effect="non-scaling-stroke" />
      </g>
      {/* nose bridge, tip and nostrils */}
      <rect x="43.5" y="12" width="13" height="66" fill="url(#cvt-bridge)" filter="url(#cvt-b9)" />
      <g filter="url(#cvt-b4)">
        <ellipse cx="50" cy="84" rx="7" ry="5" fill="#fff0dc" opacity="0.16" />
        <ellipse cx="44.6" cy="92.5" rx="2.6" ry="1.6" fill="#1a0808" opacity="0.7" />
        <ellipse cx="55.4" cy="92.5" rx="2.6" ry="1.6" fill="#1a0808" opacity="0.7" />
      </g>
      <g filter="url(#cvt-b4)" fill="none" stroke="#2a1410" stroke-linecap="round" opacity="0.32">
        <path d="M43 80 Q39 88 42.5 93" stroke-width="2" vector-effect="non-scaling-stroke" />
        <path d="M57 80 Q61 88 57.5 93" stroke-width="2" vector-effect="non-scaling-stroke" />
      </g>
      {/* cheek highlights */}
      <g filter="url(#cvt-b9)" fill="#fff0dc"><ellipse cx="17" cy="80" rx="13" ry="7" opacity="0.1" /><ellipse cx="83" cy="80" rx="13" ry="7" opacity="0.1" /></g>
      {/* brow hairs */}
      {(['L', 'R'] as const).map((s) => (
        <g key={s} fill="none" stroke="#150a0a" stroke-linecap="round">
          {HAIRS[s].map((h, i) => <path key={i} d={h.d} opacity={h.o} stroke-width={h.w} vector-effect="non-scaling-stroke" />)}
        </g>
      ))}
    </svg>
  );
}
