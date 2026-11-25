import { useEffect, useState } from 'preact/hooks';
import { isLiteRendering, onLiteRenderingChange } from '../lib/quality';

/**
 * True while the page renders in "lite" mode (no live glass blur; see
 * lib/quality). Components can use it to skip their own expensive effects.
 */
export function useLiteRendering(): boolean {
  const [lite, setLite] = useState(isLiteRendering);
  useEffect(() => {
    setLite(isLiteRendering());
    return onLiteRenderingChange(setLite);
  }, []);
  return lite;
}
