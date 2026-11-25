import { useEffect, useRef } from 'preact/hooks';
import { blit } from './paint';
import type { EyeVision } from './plates';
import type { PlateStore } from './store';
import { T } from './strings';
import type { Locale } from '@core';

export function PlateCanvas(props: { store: PlateStore; index: number; view?: EyeVision; viewKey?: string; blurPx?: number; label: string; class?: string }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) blit(ref.current, props.store.canvas(props.index, props.view, props.viewKey));
  }, [props.store, props.index, props.viewKey]);
  return (
    <canvas
      ref={ref}
      class={`cv-plate ${props.class ?? ''}`}
      role="img"
      aria-label={props.label}
      style={props.blurPx ? { filter: `blur(${props.blurPx}px)` } : undefined}
    />
  );
}

export interface PlateBookProps {
  store: PlateStore;
  index: number;
  direction: number;
  reducedMotion: boolean;
  label: string;
  locale?: Locale;
}

/** The open plate book on its easel: cream page, plate, folio and a page-turn. */
export function PlateBook({ store, index, direction, reducedMotion, label, locale = 'en' }: PlateBookProps) {
  const t = T(locale);
  const total = store.plates.length;
  const anim = reducedMotion ? 'cv-page--fade' : direction < 0 ? 'cv-page--back' : 'cv-page--fwd';
  return (
    <div class="cv-book" dir="ltr">
      <div class="cv-book__spine" aria-hidden="true" />
      <div class="cv-book__under" aria-hidden="true" />
      <div key={index} class={`cv-page ${anim}`}>
        <div class="cv-page__folio" aria-hidden="true">
          <span dir="auto">{index === 0 ? t.folioDemo : t.folioPlate(index + 1)}</span>
          <span class="cv-page__of">{index + 1} / {total}</span>
        </div>
        <PlateCanvas store={store} index={index} label={label} />
        <div class="cv-page__sheen" aria-hidden="true" />
      </div>
    </div>
  );
}
