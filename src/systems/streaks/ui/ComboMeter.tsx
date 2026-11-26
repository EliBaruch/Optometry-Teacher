/** Exam overlay: a small, subtle combo meter for the patient on the chair. */
import type { GameServices } from '@core';
import { Icon, cx, useSignal, useStrings } from '@ui-kit';
import { S } from '../strings';
import { TIERS, formatMult, graceReady, nextTier, tierFor, tierIndex } from '../combo';
import { Flame } from './Flame';
import { useStreaks } from './hooks';

const PIPS = TIERS[TIERS.length - 1].min;

export function ComboMeter({ services }: { services: GameServices }) {
  const { ctl, combo } = useStreaks(services);
  const t = useStrings(S);
  const session = useSignal(services.session.state);
  if (!ctl || !session || session.submitted || combo.modeId !== session.modeId || combo.count < 1) return null;
  const tier = tierFor(combo.count);
  const next = nextTier(combo.count);
  const net = graceReady(combo);
  const label = t.comboAria(formatMult(tier.mult), combo.count, next ? next.need : null, next ? formatMult(next.tier.mult) : '', net);
  return (
    <div class={cx('sk-meter', `is-${tier.key}`)} style={{ '--sk-tier': tier.color }} role="status" aria-label={label} title={label}>
      <Flame size={20} intensity={tierIndex(combo.count)} embers={tier.mult >= 2} class="sk-meter__flame" />
      <span class="sk-meter__mult lm-num" key={tier.key}>{formatMult(tier.mult)}</span>
      <span class="sk-meter__side">
        <span class="sk-meter__pips" aria-hidden="true">
          {Array.from({ length: PIPS }, (_, i) => (
            <span key={i} class={cx('sk-meter__pip', i < combo.count && 'is-on', TIERS.some((t) => t.min === i + 1) && 'is-step')} />
          ))}
        </span>
        <span class="sk-meter__count lm-num" key={combo.count}>
          {t.statInARow(combo.count)}
          {net && (
            <span class="sk-meter__net" aria-hidden="true">
              <Icon name="heart" size={9} />
            </span>
          )}
        </span>
      </span>
    </div>
  );
}
