import { useEffect, useState } from 'preact/hooks';
import { useOptionalServices } from '../context';

const QUERY = '(prefers-reduced-motion: reduce)';

/** Non-hook check (for imperative code): OS preference or the `html.reduced-motion` class set by the app. */
export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.classList.contains('reduced-motion')) return true;
  if (typeof matchMedia === 'function') {
    try {
      return matchMedia(QUERY).matches;
    } catch {
      return false;
    }
  }
  return false;
}

/**
 * True when motion should be minimised: the player's in-game setting
 * (services.settings.reducedMotion, when inside a ServicesProvider),
 * the html.reduced-motion class, or the OS prefers-reduced-motion query.
 */
export function useReducedMotion(): boolean {
  const services = useOptionalServices();
  const [osPref, setOsPref] = useState(prefersReducedMotion);
  const [setting, setSetting] = useState(() => services?.settings.get().reducedMotion ?? false);

  useEffect(() => {
    if (typeof matchMedia !== 'function') return;
    let mq: MediaQueryList;
    try {
      mq = matchMedia(QUERY);
    } catch {
      return;
    }
    const on = () => setOsPref(prefersReducedMotion());
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, []);

  // The app (or a test harness) may toggle html.reduced-motion at any time.
  useEffect(() => {
    if (typeof MutationObserver === 'undefined' || typeof document === 'undefined') return;
    const mo = new MutationObserver(() => setOsPref(prefersReducedMotion()));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => mo.disconnect();
  }, []);

  useEffect(() => {
    if (!services) return;
    setSetting(services.settings.get().reducedMotion);
    return services.settings.subscribe((s) => setSetting(s.reducedMotion));
  }, [services]);

  return setting || osPref;
}
