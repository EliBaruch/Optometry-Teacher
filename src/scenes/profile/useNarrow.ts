import { useEffect, useState } from 'preact/hooks';

/** True while the viewport is at most `px` wide — for sizes that live in props (canvas, SVG rings), not CSS. */
export function useNarrow(px = 640): boolean {
  const query = `(max-width: ${px}px)`;
  const [narrow, setNarrow] = useState(() => typeof matchMedia === 'function' && matchMedia(query).matches);
  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    const mq = matchMedia(query);
    const on = () => setNarrow(mq.matches);
    on();
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [query]);
  return narrow;
}
