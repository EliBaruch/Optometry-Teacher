import { useRef, useState } from 'preact/hooks';
import type { GameServices } from '@core';
import { Button, CountUp, GlassPanel, useLocale, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { COIN, CRATES, ECONOMY_COLOR } from '../catalog';
import { S } from '../strings';
import { crateText } from '../text';
import { formatCoins } from '../logic';
import type { Economy } from '../store';
import { CoinGlyph } from './CoinGlyph';
import { CrateArt } from './CrateArt';
import { CrateOpening } from './CrateOpening';
import { useEconomy } from './hooks';

/** results-extra: the consultation fee, line by line, plus any crate earned on this case. */
export function ResultsPanel({ services }: { services: GameServices }) {
  const store = useEconomy(services);
  if (!store) return null;
  return <Receipt services={services} store={store} />;
}

function Receipt({ services, store }: { services: GameServices; store: Economy }) {
  const receipt = useSignal(store.lastCase);
  const state = useSignal(store.state);
  const session = useSignal(services.session.state);
  const reduced = useReducedMotion();
  const t = useStrings(S);
  const locale = useLocale();
  const [opening, setOpening] = useState<string | null>(null);
  const cratesRef = useRef<HTMLDivElement>(null);
  const walletRef = useRef<HTMLParagraphElement>(null);
  if (!receipt) return null;
  if (session && session.caseId !== receipt.caseId) return null;

  const { fee } = receipt;
  const waiting = receipt.crates.filter((c) => state.crates.some((x) => x.id === c.id));
  const stagger = reduced ? 0 : 140;

  /** The "Open now" button that launched the theatre is gone once opened: keep focus nearby. */
  const closeOpening = () => {
    setOpening(null);
    setTimeout(() => {
      const active = document.activeElement;
      if (active && active !== document.body && document.contains(active)) return;
      (cratesRef.current?.querySelector<HTMLElement>('button') ?? walletRef.current)?.focus({ preventScroll: true });
    }, 40);
  };

  return (
    <GlassPanel class="eco-receipt" accent={ECONOMY_COLOR} glow strong eyebrow={t.receiptEyebrow} title={t.receiptTitle}>
      <div class="eco-receipt__hero">
        <CoinGlyph size={44} spin />
        <span class="eco-receipt__total">
          +<CountUp value={fee.total} format={formatCoins} delay={reduced ? 0 : 300} tickSfx="tick" /> <small>{COIN}</small>
        </span>
      </div>
      <ul class="eco-receipt__lines" role="list">
        {fee.lines.map((l, i) => (
          <li key={l.id} class={`eco-receipt__line eco-receipt__line--${l.id}`} style={{ '--d': `${400 + i * stagger}ms` }}>
            <span>{l.label}</span>
            <b class="lm-num">
              {l.amount >= 0 ? '+' : '−'}
              {formatCoins(Math.abs(l.amount))}
            </b>
          </li>
        ))}
      </ul>
      {receipt.coveredHints > 0 && (
        <p class="eco-receipt__note">
          {t.coveredNote(receipt.coveredHints)}
        </p>
      )}
      {fee.lines.some((l) => l.id === 'late') && (
        <p class="eco-receipt__note">{t.lateNote}</p>
      )}

      {receipt.crates.length > 0 && (
        <div class="eco-receipt__crates" ref={cratesRef}>
          {receipt.crates.map((c, i) => {
            const unopened = waiting.some((w) => w.id === c.id);
            return (
              <div key={c.id} class="eco-receipt__crate" style={{ '--trim': CRATES[c.kind].trim, '--d': `${900 + i * 200}ms` }}>
                <div class="eco-receipt__crate-art">
                  <CrateArt kind={c.kind} size={84} class="eco-crate--idle" />
                </div>
                <div class="eco-receipt__crate-text">
                  <b>{crateText(c.kind, locale).name}</b>
                  <span>{c.reason}</span>
                </div>
                {unopened ? (
                  <Button variant="primary" size="sm" icon="crate" onClick={() => setOpening(c.id)}>
                    {t.openNow}
                  </Button>
                ) : (
                  <span class="eco-receipt__opened">{t.opened}</span>
                )}
              </div>
            );
          })}
          {waiting.length > 0 && <p class="eco-receipt__later">{t.later}</p>}
        </div>
      )}

      <p class="eco-receipt__wallet" ref={walletRef} tabIndex={-1}>
        {t.wallet} <b class="lm-num">{formatCoins(state.balance)} {COIN}</b>
      </p>
      {opening && <CrateOpening services={services} store={store} crateId={opening} onClose={closeOpening} />}
    </GlassPanel>
  );
}
