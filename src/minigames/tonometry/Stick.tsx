/** Slit-lamp joystick: drag the ball; the image follows. It springs back to centre. */
import { useEffect, useRef, useState } from 'preact/hooks';

export interface StickProps {
  onChange: (x: number, y: number) => void;
  /** keyboard deflection pushed in from the game (WASD) so the knob moves too */
  external: { x: number; y: number };
  disabled?: boolean;
}

export function Stick({ onChange, external, disabled }: StickProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const live = useRef({ onChange, disabled });
  live.current = { onChange, disabled };

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let id = -1;
    const at = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      const rad = r.width / 2;
      let x = (e.clientX - (r.left + rad)) / (rad * 0.62);
      let y = (e.clientY - (r.top + rad)) / (rad * 0.62);
      const m = Math.hypot(x, y);
      if (m > 1) { x /= m; y /= m; }
      setPos({ x, y });
      live.current.onChange(x, y);
    };
    const down = (e: PointerEvent) => {
      if (live.current.disabled) return;
      id = e.pointerId;
      try { el.setPointerCapture(id); } catch { /* synthetic */ }
      at(e);
      e.preventDefault();
    };
    const move = (e: PointerEvent) => { if (e.pointerId === id) at(e); };
    const up = (e: PointerEvent) => {
      if (e.pointerId !== id) return;
      id = -1;
      setPos({ x: 0, y: 0 });
      live.current.onChange(0, 0);
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);

  const x = pos.x || external.x;
  const y = pos.y || external.y;
  return (
    <div ref={ref} class="tn-stick" role="group" aria-label="Joystick: centre the mires (W A S D also work)" aria-disabled={disabled || undefined}>
      <span class="tn-stick__arrow tn-stick__arrow--u" aria-hidden="true" />
      <span class="tn-stick__arrow tn-stick__arrow--d" aria-hidden="true" />
      <span class="tn-stick__arrow tn-stick__arrow--l" aria-hidden="true" />
      <span class="tn-stick__arrow tn-stick__arrow--r" aria-hidden="true" />
      <div class="tn-stick__ball" style={{ transform: `translate(${x * 34}%, ${y * 34}%)` }} />
    </div>
  );
}
