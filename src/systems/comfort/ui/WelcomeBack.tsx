import { useEffect, useRef, useState } from 'preact/hooks';
import { beginRun, type GameServices } from '@core';
import { Button, CountUp, Modal, useReducedMotion } from '@ui-kit';
import { ACCENT } from '../controller';
import { COMEBACK_AFTER_MS, EARN_CAP_HOURS, formatDuration, ratePerHour, welcomeLine } from '../logic';
import { Jar } from './Jar';
import { centerOf, doctorName, safePlay, useComfort } from './hooks';

/**
 * "Welcome back, Doctor" — shown once after a real absence. Warm, never
 * guilt-tripping: the clinic simply hands over what it earned, adds a
 * comeback gift after a long break, and points at reviews that are due.
 */
export function WelcomeBack(props: { services: GameServices }) {
  const { services } = props;
  const { ctl, state } = useComfort(services);
  const reduced = useReducedMotion();
  const jarRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  useEffect(() => () => clearTimeout(timer.current), []);
  const note = state.welcome;
  if (!ctl) return null;

  const coins = Math.floor(state.jar);
  const comeback = note?.comebackCoins ?? 0;
  const capped = (note?.awayMs ?? 0) >= EARN_CAP_HOURS * 3_600_000;
  let due = 0;
  try {
    due = services.learning.due(50).length;
  } catch {
    due = 0;
  }
  const review = services.registries.modes.get('review');
  let reviewOpen = false;
  try {
    reviewOpen = !!review && !review.locked?.(services);
  } catch {
    reviewOpen = false;
  }

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
      eyebrow={note ? `Away ${formatDuration(note.awayMs)}` : undefined}
      title={`Welcome back, ${doctorName(services)}`}
      accent={ACCENT}
      size="md"
      class="cf-welcome"
      initialFocus=".cf-welcome__collect"
      footer={
        <div class="cf-welcome__actions">
          <Button variant="ghost" onClick={() => ctl.dismissWelcome()} sfx="back">
            Keep it in the jar
          </Button>
          <Button variant="primary" icon="coin" class="cf-welcome__collect" onClick={() => finish()} loading={closing} sfx={false}>
            {coins + comeback > 0 ? `Collect ✦ ${coins + comeback}` : 'Into the clinic'}
          </Button>
        </div>
      }
    >
      {note && (
        <div class="cf-welcome__body">
          <p class="cf-welcome__line">{welcomeLine(note.awayMs, hour)}</p>
          <div class="cf-welcome__grid">
            <div class="cf-welcome__jar" ref={jarRef}>
              <Jar fill={Math.min(1, state.jar / (ratePerHour(state) * EARN_CAP_HOURS))} size={128} />
            </div>
            <div class="cf-welcome__earn">
              <div class="lm-eyebrow">Your technicians earned</div>
              <div class="cf-welcome__coins">
                <span class="cf-welcome__glyph">✦</span>
                <CountUp value={coins} from={0} delay={reduced ? 0 : 350} class="cf-welcome__num" />
              </div>
              <p class="lm-muted cf-welcome__rate">
                ✦ {ratePerHour(state).toFixed(1)} an hour{capped ? ` · the jar holds ${EARN_CAP_HOURS} hours` : ''}
              </p>
              {comeback > 0 && (
                <div class="cf-welcome__bonus">
                  <strong>+{comeback}</strong> welcome back gift
                  {note.awayMs >= COMEBACK_AFTER_MS && <span> — we kept your chair warm.</span>}
                </div>
              )}
            </div>
          </div>
          {due > 0 && (
            <div class="cf-welcome__flag">
              <span>
                Your team set aside <strong>{due}</strong> {due === 1 ? 'diagnosis' : 'diagnoses'} for a second look — a short review now makes them stick.
              </span>
              {reviewOpen && (
                <Button size="sm" variant="glass" icon="refresh" onClick={() => finish(() => beginRun(services, 'review'))}>
                  {review!.title}
                </Button>
              )}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
