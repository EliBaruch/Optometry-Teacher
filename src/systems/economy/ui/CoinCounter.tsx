import { useEffect, useRef, useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { CountUp, useReducedMotion, useSignal } from '@ui-kit';
import { formatCoins } from '../logic';
import { CoinGlyph } from './CoinGlyph';
import { useEconomy } from './hooks';

const FLYERS = 6;

/** Topbar wallet: lumens count up on gain with a coin burst; tap to visit the Boutique. */
export function CoinCounter({ services }: { services: GameServices }) {
  const store = useEconomy(services);
  if (!store) return null;
  return <Counter services={services} store={store} />;
}

function Counter({ services, store }: { services: GameServices; store: NonNullable<ReturnType<typeof useEconomy>> }) {
  const state = useSignal(store.state);
  const route = useSignal(services.router.current);
  const reduced = useReducedMotion();
  const ref = useRef<HTMLButtonElement>(null);
  const [pulse, setPulse] = useState<{ seq: number; delta: number } | null>(null);
  const initial = useRef(state.balance);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = store.gain.subscribe((g) => {
      if (!g || g.delta <= 0) return;
      const el = ref.current;
      services.audio.play(g.delta >= 50 ? 'coins' : 'coin', { volume: 0.7 });
      if (el) {
        const r = el.getBoundingClientRect();
        const x = r.left + 22;
        const y = r.top + r.height / 2;
        if (!reduced) services.fx.burst(x, y, { kind: 'coins', count: Math.min(26, 6 + Math.round(Math.sqrt(g.delta) * 1.6)), color: '#f5b942' });
        // Reduced motion: the text doesn't drift, so park it clear of the wallet.
        services.fx.floatText(`+${formatCoins(g.delta)} ✦`, r.left + r.width / 2, r.bottom + (reduced ? 24 : 14), { color: '#ffd27a', size: reduced ? 15 : 18 });
      }
      setPulse({ seq: g.seq, delta: g.delta });
      clearTimeout(timer);
      timer = setTimeout(() => setPulse(null), 1100);
    });
    return () => {
      off();
      clearTimeout(timer);
    };
  }, [store, reduced]);

  const crates = state.crates.length;
  const here = route.id === 'boutique';
  const label = `${formatCoins(state.balance)} lumens${crates ? `, ${crates} supply crate${crates > 1 ? 's' : ''} waiting` : ''}${here ? '' : ' — open the Boutique'}`;

  return (
    <button
      ref={ref}
      type="button"
      class={`eco-wallet${pulse ? ' is-gain' : ''}${here ? ' is-here' : ''}`}
      aria-label={label}
      title="Lumens — spend them in the Boutique"
      onClick={() => {
        if (here) return;
        services.audio.play('click');
        services.router.go('boutique');
      }}
    >
      <span class="eco-wallet__coin">
        <CoinGlyph size={24} />
        {pulse && !reduced && (
          <span class="eco-wallet__flyers" key={pulse.seq} aria-hidden="true">
            {Array.from({ length: FLYERS }, (_, i) => (
              <i key={i} style={{ '--i': i, '--a': `${(i / FLYERS) * 360 + 20}deg` }} />
            ))}
          </span>
        )}
      </span>
      <span class="eco-wallet__amount" aria-hidden="true">
        <CountUp value={state.balance} from={initial.current} format={formatCoins} tickSfx={false} />
      </span>
      {pulse && (
        <span class="eco-wallet__delta lm-num" key={`d${pulse.seq}`} aria-hidden="true">
          +{formatCoins(pulse.delta)}
        </span>
      )}
      {crates > 0 && (
        <span class="eco-wallet__crates lm-num" aria-hidden="true">
          {crates}
        </span>
      )}
    </button>
  );
}
