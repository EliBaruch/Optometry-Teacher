import { useEffect, useRef, useState } from 'preact/hooks';
import { TEST_CATALOG, type MiniGameModule, type MiniGameResult, type TestId } from '@core';
import { GlassPanel, Icon, IconOrText, isIconName, useLocale, useSfx, useStrings } from '@ui-kit';
import { S } from './strings';
import { testName } from './logic';

/** Offer a tidy hyphenation point in long clinical words so narrow cards never split them mid-syllable. */
const softBreak = (name: string) => name.replace(/(Ophthalmo)(scopy)/i, '$1\u00AD$2');

export function InstrumentTray(props: {
  instruments: MiniGameModule[];
  done: Partial<Record<TestId, MiniGameResult>>;
  techOk: boolean;
  onOpen: (mg: MiniGameModule) => void;
  onTech: (mg: MiniGameModule, from: HTMLElement) => void;
}) {
  const { instruments, done, techOk, onOpen, onTech } = props;
  const play = useSfx();
  const t = useStrings(S);
  const locale = useLocale();
  const nameOf = (mg: MiniGameModule) => testName(mg.id, mg, locale);
  const doneCount = instruments.filter((m) => done[m.id]).length;
  // Explicit scroll affordance: when the tile list is taller than its box, a small header button scrolls it (it never covers a tile).
  const listRef = useRef<HTMLUListElement>(null);
  const [more, setMore] = useState(false);
  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const measure = () => setMore(el.scrollTop + el.clientHeight < el.scrollHeight - 6);
    measure();
    el.addEventListener('scroll', measure, { passive: true });
    const ro = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(measure);
    ro?.observe(el);
    return () => {
      el.removeEventListener('scroll', measure);
      ro?.disconnect();
    };
  }, [instruments.length]);
  return (
    <GlassPanel
      class="exm-tray"
      title={t.trayTitle}
      eyebrow={<><span class="exm-no">01</span>{t.trayEyebrow}</>}
      icon="eye"
      padding="md"
      actions={
        <>
          {more && (
            <button
              type="button"
              class="exm-tray__more"
              aria-label={t.trayMore}
              title={t.trayMore}
              onClick={() => listRef.current?.scrollBy?.({ top: Math.max(120, (listRef.current?.clientHeight ?? 200) * 0.8), behavior: 'smooth' })}
            >
              <Icon name="chevron-right" size={14} strokeWidth={2.6} />
            </button>
          )}
          <span class="exm-count lm-num" aria-label={t.trayCount(doneCount, instruments.length)}>{doneCount}/{instruments.length}</span>
        </>
      }
    >
      {instruments.length === 0 ? (
        <p class="lm-muted">{t.trayEmpty}</p>
      ) : (
        <ul ref={listRef} class="exm-tools" data-testid="exm-tools">
          {instruments.map((mg, i) => {
            const r = done[mg.id];
            const info = TEST_CATALOG[mg.id];
            return (
              <li key={mg.id} class={`exm-tool${r ? ' is-done' : ''}`} style={{ '--i': i }}>
                <button
                  type="button"
                  class="exm-tool__main"
                  onClick={() => onOpen(mg)}
                  onPointerEnter={() => play('hover', { volume: 0.25 })}
                  aria-label={t.toolAria(nameOf(mg), info.minutes, !!r)}
                >
                  <span class="exm-tool__icon">
                    {isIconName(mg.id) ? <Icon name={mg.id} size={26} /> : <IconOrText icon={mg.icon} size={24} />}
                  </span>
                  <span class="exm-tool__text">
                    <span class="exm-tool__name">{softBreak(nameOf(mg))}</span>
                    <span class="exm-tool__sub lm-num">
                      {!r && <Icon name="play" size={11} strokeWidth={2.4} />}
                      {r ? (r.autoRun ? t.toolByTech : t.toolCharted) : t.toolMin(info.minutes)}
                    </span>
                  </span>
                  {r && (
                    <span class="exm-tool__check" aria-hidden="true">
                      <Icon name="check" size={14} strokeWidth={2.4} />
                    </span>
                  )}
                </button>
                {techOk && !r && (
                  <button
                    type="button"
                    class="exm-tool__tech"
                    title={t.techTitle}
                    onClick={(e) => onTech(mg, e.currentTarget as HTMLElement)}
                    aria-label={t.techAria(nameOf(mg))}
                  >
                    <Icon name="user" size={13} />
                    <span class="exm-tool__tech-full">{t.techFull}</span>
                    <span class="exm-tool__tech-short" aria-hidden="true">{t.techShort}</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassPanel>
  );
}
