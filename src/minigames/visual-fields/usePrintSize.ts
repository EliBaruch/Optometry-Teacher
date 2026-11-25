import { useEffect, useState } from 'preact/hooks';

export type PrintPhase = 'test' | 'interpret' | 'debrief';

export function usePrintSize(ref: { current: HTMLElement | null }, phase: PrintPhase): number {
  const [s, setS] = useState(200);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const r = el.getBoundingClientRect();
      if (phase === 'test') setS(Math.max(130, Math.min(r.width < 520 ? 160 : 250, Math.floor(r.width - 64))));
      else setS(Math.max(130, Math.min(330, Math.floor(r.width / 2 - 88), Math.floor(r.height - 120))));
    };
    measure();
    const ro = typeof ResizeObserver === 'function' ? new ResizeObserver(measure) : null;
    ro?.observe(el);
    return () => ro?.disconnect();
  }, [phase]);
  return s;
}
