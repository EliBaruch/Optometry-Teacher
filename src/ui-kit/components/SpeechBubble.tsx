import type { ComponentChildren } from 'preact';
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSfx } from '../hooks/useSfx';
import { buildSchedule, totalDuration, visibleChars } from '../lib/typewriter';
import { cx } from '../lib/cx';
import './SpeechBubble.css';

export interface SpeechBubbleProps {
  text: string;
  /** Name plate above the text (patient name, colleague…) */
  speaker?: ComponentChildren;
  /** Characters per second. */
  speed?: number;
  /** ms before typing starts */
  delay?: number;
  /** Which side the tail points to. */
  tail?: 'left' | 'right' | 'bottom' | 'top' | 'none';
  /** Soft voice blips while typing. */
  voice?: boolean;
  /** Accent colour for the speaker plate. */
  accent?: string;
  onDone?: () => void;
  class?: string;
}

/**
 * Speech bubble with a typewriter reveal. Click / Enter / Space skips to the
 * end. The full text is laid out invisibly from the start, so the bubble
 * never jumps in size while typing; screen readers get the full sentence.
 */
export function SpeechBubble({ text, speaker, speed = 48, delay = 0, tail = 'left', voice = true, accent, onDone, class: klass }: SpeechBubbleProps) {
  const reduced = useReducedMotion();
  const play = useSfx();
  const schedule = useMemo(() => buildSchedule(text, speed), [text, speed]);
  const [count, setCount] = useState(reduced ? text.length : 0);
  const skipped = useRef(false);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;
  const typing = count < text.length;

  useEffect(() => {
    skipped.current = false;
    if (reduced || !text) {
      setCount(text.length);
      return;
    }
    setCount(0);
    let raf = 0;
    let t0 = -1;
    let lastBlip = 0;
    const total = totalDuration(schedule);
    const timer = setTimeout(() => {
      const step = (now: number) => {
        if (skipped.current) return;
        if (t0 < 0) t0 = now;
        const n = visibleChars(schedule, now - t0);
        setCount(n);
        if (voice && n > lastBlip + 2 && /\S/.test(text[n - 1] ?? '')) {
          lastBlip = n;
          play('tick', { volume: 0.12, pitch: 1.4 + ((n * 7) % 5) * 0.06 });
        }
        if (now - t0 < total) raf = requestAnimationFrame(step);
      };
      raf = requestAnimationFrame(step);
    }, delay);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(raf);
    };
  }, [text, schedule, reduced]);

  useEffect(() => {
    if (count >= text.length) doneRef.current?.();
  }, [count >= text.length, text]);

  const skip = () => {
    if (!typing) return;
    skipped.current = true;
    setCount(text.length);
  };

  return (
    <div
      class={cx('lm-speech', `lm-speech--tail-${tail}`, typing && 'is-typing', klass)}
      style={accent ? { '--speech-c': accent } : undefined}
      onClick={skip}
      onKeyDown={(e) => {
        if (typing && (e.key === 'Enter' || e.key === ' ')) {
          e.preventDefault();
          skip();
        }
      }}
      tabIndex={typing ? 0 : undefined}
      aria-label={typing ? 'Speech — press Enter to skip' : undefined}
    >
      {speaker && <div class="lm-speech__speaker">{speaker}</div>}
      <p class="lm-speech__text">
        <span class="lm-sr-only">{text}</span>
        <span aria-hidden="true">
          {text.slice(0, count)}
          {typing && <span class="lm-speech__caret" />}
          <span class="lm-speech__ghost">{text.slice(count)}</span>
        </span>
      </p>
    </div>
  );
}
