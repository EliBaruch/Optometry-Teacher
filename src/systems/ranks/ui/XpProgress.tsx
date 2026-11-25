import { useEffect, useRef, useState } from 'preact/hooks';
import { ease, formatNumber, useLocale, useReducedMotion, useSfx, useStrings } from '@ui-kit';
import { S } from '../strings';
import { levelInfo } from '../model/ladder';

export interface XpProgressProps {
  /** Animate the bar from this total XP… */
  from: number;
  /** …to this one (may cross several levels). */
  to: number;
  delay?: number;
  duration?: number;
  size?: 'md' | 'lg';
  /** Called each time the animated bar crosses into a new level. */
  onLevel?: (level: number) => void;
}

/**
 * The Career XP bar. Animates through level boundaries: the fill races to the
 * end, flares, and restarts in the next level. Readout counts in step.
 */
export function XpProgress({ from, to, delay = 0, duration, size = 'md', onLevel }: XpProgressProps) {
  const reduced = useReducedMotion();
  const t = useStrings(S);
  const locale = useLocale();
  const play = useSfx();
  const [xp, setXp] = useState(reduced ? to : from);
  const [flare, setFlare] = useState(0);
  const onLevelRef = useRef(onLevel);
  onLevelRef.current = onLevel;

  useEffect(() => {
    if (reduced || from === to) {
      setXp(to);
      return;
    }
    const levels = levelInfo(to).level - levelInfo(from).level;
    const dur = duration ?? Math.min(2600, 900 + Math.log10(Math.abs(to - from) + 1) * 300 + levels * 500);
    let raf = 0;
    let t0 = -1;
    let lastLevel = levelInfo(from).level;
    const timer = setTimeout(() => {
      const step = (now: number) => {
        if (t0 < 0) t0 = now;
        const t = Math.min(1, (now - t0) / dur);
        const v = Math.round(from + (to - from) * ease.outCubic(t));
        const lv = levelInfo(v).level;
        if (lv > lastLevel) {
          lastLevel = lv;
          setFlare((n) => n + 1);
          play('levelup', { volume: 0.55 });
          onLevelRef.current?.(lv);
        }
        setXp(v);
        if (t < 1) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [from, to, reduced]);

  const info = levelInfo(xp, locale);
  const gained = info.level === levelInfo(from).level ? Math.max(0, info.into - (from - info.levelStartXp)) : info.into;
  const startPct = info.level === levelInfo(from).level ? ((from - info.levelStartXp) / info.span) * 100 : 0;
  return (
    <div class={`rk-xp rk-xp--${size}`} style={{ '--rk-c': info.rank.color, '--rk-c2': info.rank.color2 }}>
      <div class="rk-xp__row">
        <span class="rk-xp__title">{info.title}</span>
        <span class="rk-xp__val lm-num" dir="ltr">
          {formatNumber(info.into)} / {formatNumber(info.span)} XP
        </span>
      </div>
      <div
        class="rk-xp__track"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={info.span}
        aria-valuenow={info.into}
        aria-label={t.xpBar(info.title, formatNumber(info.into), formatNumber(info.span))}
      >
        <div class="rk-xp__base" style={{ width: `${startPct}%` }} />
        <div class="rk-xp__gain" style={{ insetInlineStart: `${startPct}%`, width: `${Math.max(0, info.progress * 100 - startPct)}%` }} data-gained={gained} />
        <div class="rk-xp__tip" style={{ insetInlineStart: `${info.progress * 100}%` }} />
        {flare > 0 && <div key={flare} class="rk-xp__flare" />}
      </div>
      <div class="rk-xp__next">
        <span>
          <b class="lm-num">{formatNumber(info.toNext)}</b> {t.xpTail(info.nextTitle)}
        </span>
        {info.nextRank && info.nextRank.title !== info.nextTitle.replace(/ ([IVXLCDM]+|[א-י]׳)$/, '') && (
          <span class="rk-xp__rank">
            <b class="lm-num">{formatNumber(info.toNextRank)}</b> {t.toTail(info.nextRank.title)}
          </span>
        )}
      </div>
    </div>
  );
}
