import { useEffect, useRef } from 'preact/hooks';
import { paintIrisArt } from '@render';
import { cx } from '@ui-kit';
import type { CrestRarity } from './logic';

/** The player's personal iris crest: a procedurally painted iris jewel in a brass bezel with a slow halo. */
export function Crest(props: { seed: number; palette: string[]; rarity: CrestRarity; size: number; initials: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current;
    const ctx = c?.getContext('2d');
    if (!c || !ctx) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    c.width = c.height = Math.round(props.size * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    try {
      paintIrisArt(ctx, props.size, props.seed, { palette: props.palette, rarity: props.rarity, t: 0 });
    } catch {
      /* art is decorative */
    }
  }, [props.seed, props.rarity, props.size, props.palette.join()]);

  return (
    <div class={cx('profile-crest', `profile-crest--${props.rarity}`)} style={{ '--s': `${props.size}px` }} aria-hidden="true">
      <svg class="profile-crest__halo" viewBox="0 0 100 100">
        {Array.from({ length: 60 }, (_, i) => {
          const a = (i / 60) * Math.PI * 2;
          const major = i % 5 === 0;
          const r1 = 49;
          const r2 = major ? 45 : 47;
          return <line key={i} x1={50 + r1 * Math.cos(a)} y1={50 + r1 * Math.sin(a)} x2={50 + r2 * Math.cos(a)} y2={50 + r2 * Math.sin(a)} class={major ? 'is-major' : ''} />;
        })}
      </svg>
      <div class="profile-crest__bezel">
        <canvas ref={ref} class="profile-crest__art" />
        <span class="profile-crest__glass" />
        <span class="profile-crest__shimmer" />
      </div>
      <span class="profile-crest__monogram">{props.initials}</span>
    </div>
  );
}
