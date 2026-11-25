import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { beginRun, modeText, type GameServices } from '@core';
import { Button, CountUp, Modal, useReducedMotion, useSignal, useStrings } from '@ui-kit';
import { ACCENT } from '../controller';
import { COMEBACK_AFTER_MS, EARN_CAP_HOURS, collectable, formatDuration, jarCapacity, ratePerHour, welcomeLine } from '../logic';
import { S } from '../strings';
import { Jar } from './Jar';
import { centerOf, doctorName, safePlay, useComfort, useHostLease } from './hooks';

/** Where the note is hosted. Only one host renders it: the lounge, then the hub banner, then the top bar. */
export type WelcomeHost = 'scene' | 'banner' | 'global';
const HOST_PRIORITY: Record<WelcomeHost, number> = { scene: 2, banner: 1, global: 0 };

/**
 * "Welcome back, Doctor" — shown once after a real absence. Warm, never
 * guilt-tripping: the clinic simply hands over what it earned, adds a
 * comeback gift after a long break, and points at reviews that are due.
 */
export function WelcomeBack(props: { services: GameServices; host: WelcomeHost }) {
  const { services } = props;
  const t = useStrings(S);
  const loc = services.locale;
  const { ctl, state } = useComfort(services);
  const mine = useHostLease(services, HOST_PRIORITY[props.host]);
  // The global host never interrupts a patient: it waits until the run is over.
  const inRun = useSignal(services.run.state) != null;
  const reduced = useReducedMotion();
  const jarRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const note = state.welcome;
  // Looked up once per welcome note, not on every render.
  const { due, review, reviewOpen } = useMemo(() => {
    if (!note) return { due: 0, review: undefined, reviewOpen: false };
    let due = 0;
    let reviewOpen = false;
    const review = services.registries.modes.get('review');
    try {
      due = services.learning.due(50).length;
    } catch {
      due = 0;
    }
    try {
      reviewOpen = !!review && !review.locked?.(services);
    } catch {
      reviewOpen = false;
    }
    return { due, review, reviewOpen };
  }, [note?.at, services]);
  if (!ctl || !mine || (props.host === 'global' && inRun)) return null;

  const coins = collectable(state);
  const kept = state.bonus;
  const comeback = note?.comebackCoins ?? 0;
  const capped = (note?.awayMs ?? 0) >= EARN_CAP_HOURS * 3_600_000;

  const finish = (after?: () => void) => {
    if (closing) return;
    setClosing(true);
    const c = centerOf(jarRef.current);
    const paid = ctl.collectEarnings();
    if (paid > 0) {
      safePlay(services, 'coins');
      services.fx.burst(c.x, c.y - 20, { kind: 'coins', count: Math.min(40, 10 + Math.round(paid / 6)) });
      services.fx.floatText(`+${paid} ✦`, c.x, c.y - 60, { color: '#ffd27a', size: 34 });
    }
    timer.current = setTimeout(() => {
      setClosing(false);
      after?.();
    }, reduced ? 0 : 420);
  };

  const hour = new Date(note?.at ?? services.clock.now()).getHours();
  return (
    <Modal
      open={!!note}
      onClose={() => ctl.dismissWelcome()}
      eyebrow={note ? t.away(formatDuration(note.awayMs, loc)) : undefined}
      title={t.welcomeTitle(doctorName(services))}
      accent={ACCENT}
      size="md"
      class="cf-welcome"
      initialFocus=".cf-welcome__collect"
      footer={
        <div class="cf-welcome__actions">
          <Button variant="ghost" onClick={() => ctl.dismissWelcome()} sfx="back">
            {t.keepJar}
          </Button>
          <Button variant="primary" icon="coin" class="cf-welcome__collect" onClick={() => finish()} loading={closing} sfx={false}>
            {coins + comeback > 0 ? t.collectN(coins + comeback) : t.intoClinic}
          </Button>
        </div>
      }
    >
      {note && (
        <div class="cf-welcome__body">
          <p class="cf-welcome__line">{welcomeLine(note.awayMs, hour, loc)}</p>
          <div class="cf-welcome__grid">
            <div class="cf-welcome__jar" ref={jarRef}>
              <Jar fill={Math.min(1, state.jar / jarCapacity(state))} size={128} />
            </div>
            <div class="cf-welcome__earn">
              <div class="lm-eyebrow">{t.technicians}</div>
              <div class="cf-welcome__coins">
                <span class="cf-welcome__glyph">✦</span>
                <CountUp value={coins} from={0} delay={reduced ? 0 : 350} class="cf-welcome__num" />
              </div>
              <p class="lm-muted cf-welcome__rate">
                {t.rateHour(ratePerHour(state).toFixed(1))}{capped ? t.jarHolds(EARN_CAP_HOURS) : ''}
              </p>
              {kept > 0 && <p class="cf-welcome__kept">{t.includesKept(kept)}</p>}
              {comeback > 0 && (
                <div class="cf-welcome__bonus">
                  <strong>+{comeback}</strong>{t.bonusLabel}
                  {note.awayMs >= COMEBACK_AFTER_MS && <span>{t.chairWarm}</span>}
                </div>
              )}
            </div>
          </div>
          {due > 0 && (
            <div class="cf-welcome__flag">
              <span>
                {t.dueA}<strong>{due}</strong>{t.dueB(due)}
              </span>
              {reviewOpen && (
                <Button variant="glass" icon="refresh" onClick={() => finish(() => beginRun(services, 'review'))}>
                  {modeText(review!, loc).title}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
