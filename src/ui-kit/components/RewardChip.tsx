import { useEffect, useRef } from 'preact/hooks';
import type { RewardGrant, SfxId } from '@core';
import { useInView } from '../hooks/useInView';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSfx } from '../hooks/useSfx';
import { IconOrText } from '../icons/Icon';
import { RARITY_COLOR, RARITY_LABEL, type Rarity } from '../lib/palette';
import { cx } from '../lib/cx';
import './RewardChip.css';

export interface RewardChipProps {
  grant: RewardGrant;
  /** Position in a cascade: staggers the entrance. */
  index?: number;
  /** ms between cascade items */
  stagger?: number;
  animate?: boolean;
  /** Play a rarity-appropriate sound as it lands (default true). */
  sfx?: boolean;
  class?: string;
}

const RARITY_SFX: Record<Rarity, SfxId> = { common: 'coin', rare: 'rare', epic: 'rare', legendary: 'legendary' };

/** A reward as granted by any engagement system, with a rarity glow. */
export function RewardChip({ grant, index = 0, stagger = 140, animate = true, sfx = true, class: klass }: RewardChipProps) {
  const reduced = useReducedMotion();
  const play = useSfx();
  const rarity: Rarity = grant.rarity ?? 'common';
  const accent = grant.color ?? RARITY_COLOR[rarity];
  const delay = index * stagger;
  const anim = animate && !reduced;
  const root = useRef<HTMLDivElement>(null);
  const loops = rarity === 'epic' || rarity === 'legendary';
  const inView = useInView(root);

  useEffect(() => {
    if (!sfx) return;
    const t = setTimeout(() => play(RARITY_SFX[rarity], { volume: rarity === 'common' ? 0.5 : 0.8 }), anim ? delay + 160 : 0);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={root}
      class={cx('lm-reward', `lm-reward--${rarity}`, anim && 'is-anim', loops && !inView && 'is-idle', klass)}
      style={{ '--rw-c': accent, '--rw-r': RARITY_COLOR[rarity], '--d': `${delay}ms` }}
      role="group"
      aria-label={`${grant.label}: ${grant.value}${rarity !== 'common' ? ` (${RARITY_LABEL[rarity]})` : ''}`}
    >
      <span class="lm-reward__icon" aria-hidden="true">
        <IconOrText icon={grant.icon ?? 'sparkle'} />
      </span>
      <span class="lm-reward__text" aria-hidden="true">
        <span class="lm-reward__value lm-num">{grant.value}</span>
        <span class="lm-reward__label">{grant.label}</span>
      </span>
      {rarity !== 'common' && (
        <span class="lm-reward__rarity" aria-hidden="true">
          {RARITY_LABEL[rarity]}
        </span>
      )}
      {(rarity === 'epic' || rarity === 'legendary') && <span class="lm-reward__shine" aria-hidden="true" />}
    </div>
  );
}
