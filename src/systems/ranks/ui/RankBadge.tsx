import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { formatNumber, useReducedMotion, useSfx, useStrings } from '@ui-kit';
import { S } from '../strings';
import { Crest } from './Crest';
import { ACTIVE, useRanks } from './hooks';

const R = 21;
const C = 2 * Math.PI * R;

/** Top-bar rank badge: crest inside a luminous XP ring. Click → Career page. */
export function RankBadge({ services }: { services: GameServices }) {
  if (!ACTIVE.has(services)) return null;
  return <RankBadgeInner services={services} />;
}

function RankBadgeInner({ services }: { services: GameServices }) {
  const { info } = useRanks(services);
  const t = useStrings(S);
  const reduced = useReducedMotion();
  const play = useSfx();
  const ref = useRef<HTMLButtonElement>(null);
  const prevXp = useRef(info.xp);
  const prevLevel = useRef(info.level);
  const [pulse, setPulse] = useState<'gain' | 'level' | null>(null);

  useEffect(() => {
    const delta = info.xp - prevXp.current;
    const levelled = info.level > prevLevel.current;
    prevXp.current = info.xp;
    prevLevel.current = info.level;
    if (delta <= 0) return;
    const el = ref.current;
    if (el && !reduced) {
      const r = el.getBoundingClientRect();
      if (r.width > 0) services.fx.floatText(`+${formatNumber(delta)} XP`, r.left + r.width / 2, r.bottom + 6, { color: '#c4b5fd', size: 15 });
    }
    setPulse(levelled ? 'level' : 'gain');
    const t = setTimeout(() => setPulse(null), levelled ? 1600 : 900);
    return () => clearTimeout(t);
  }, [info.xp]);

  const label = t.badgeLabel(info.title, String(info.number), formatNumber(info.into), formatNumber(info.span), info.nextTitle);
  return (
    <button
      ref={ref}
      type="button"
      class={`rk-badge${pulse ? ` is-${pulse}` : ''}`}
      style={{ '--rk-c': info.rank.color, '--rk-c2': info.rank.color2 }}
      onClick={() => {
        play('click');
        services.router.go('career');
      }}
      aria-label={label}
      title={label}
    >
      <span class="rk-badge__dial" aria-hidden="true">
        <svg viewBox="0 0 48 48" class="rk-badge__ring">
          <circle cx="24" cy="24" r={R} class="rk-badge__track" />
          <circle
            cx="24"
            cy="24"
            r={R}
            class="rk-badge__arc"
            stroke-dasharray={C}
            stroke-dashoffset={C * (1 - Math.max(0.015, info.progress))}
            transform="rotate(-90 24 24)"
          />
        </svg>
        <Crest rankIndex={info.rankIndex} tier={info.tier} size={26} class="rk-badge__crest" />
        <span class="rk-badge__lv lm-num">{info.number}</span>
      </span>
      <span class="rk-badge__text" aria-hidden="true">
        <span class="rk-badge__title">{info.title}</span>
        <span class="rk-badge__xp lm-num">
          {formatNumber(info.into)}
          <span class="rk-badge__sep">/</span>
          {formatNumber(info.span)} XP
        </span>
      </span>
    </button>
  );
}
