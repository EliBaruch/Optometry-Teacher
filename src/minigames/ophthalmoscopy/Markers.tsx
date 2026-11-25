import { useEffect, useState } from 'preact/hooks';
import { fundusToCanvas, type FundusViewport } from '@render';

/** Tiny pub/sub so only the marker layer re-renders while the view pans. */
export class ViewStore {
  v: FundusViewport = { cx: 0.5, cy: 0.5, zoom: 1 };
  private subs = new Set<(v: FundusViewport) => void>();
  set(v: FundusViewport) {
    this.v = v;
    this.subs.forEach((f) => f(v));
  }
  sub(f: (v: FundusViewport) => void) {
    this.subs.add(f);
    return () => {
      this.subs.delete(f);
    };
  }
}

export type MarkerTone = 'tag' | 'disc' | 'found' | 'missed' | 'false';

export interface Marker {
  id: string;
  x: number;
  y: number;
  label: string;
  tone: MarkerTone;
}

export interface MarkerLayerProps {
  store: ViewStore;
  size: number;
  inverted: boolean;
  markers: Marker[];
  /** only show markers inside this radius (px) of the scope centre */
  clipRadius: number;
}

export function MarkerLayer({ store, size, inverted, markers, clipRadius }: MarkerLayerProps) {
  const [v, setV] = useState(store.v);
  useEffect(() => {
    setV(store.v);
    return store.sub(setV);
  }, [store]);
  return (
    <div class="oph-markers" aria-hidden="true">
      {markers.map((m) => {
        const p = fundusToCanvas(v, size, size, m.x, m.y);
        const x = inverted ? size - p.x : p.x;
        const y = inverted ? size - p.y : p.y;
        if (Math.hypot(x - size / 2, y - size / 2) > clipRadius) return null;
        const flip = x > size * 0.62;
        return (
          <span key={m.id} class={`oph-marker oph-marker--${m.tone}${flip ? ' is-flip' : ''}`} style={{ transform: `translate(${x}px, ${y}px)` }}>
            <i />
            <b>{m.label}</b>
          </span>
        );
      })}
    </div>
  );
}
