import { useRef } from 'preact/hooks';

export interface StickValue { x: number; y: number }

/** The instrument joystick: drag the ball; it springs back to centre on release. */
export function Joystick(props: { value: StickValue; onChange: (v: StickValue) => void; size?: number; label?: string }) {
  const size = props.size ?? 112;
  const base = useRef<HTMLDivElement>(null);
  const active = useRef(false);
  const R = size / 2 - 24;

  const set = (clientX: number, clientY: number) => {
    const r = base.current!.getBoundingClientRect();
    let x = (clientX - (r.left + r.width / 2)) / R;
    let y = (clientY - (r.top + r.height / 2)) / R;
    const m = Math.hypot(x, y);
    if (m > 1) { x /= m; y /= m; }
    props.onChange({ x, y });
  };

  return (
    <div
      class="sl-stick"
      ref={base}
      style={{ width: `${size}px`, height: `${size}px` }}
      role="group"
      aria-label={props.label ?? 'Joystick: move the slit lamp across the eye'}
      tabIndex={0}
      onPointerDown={(e) => {
        active.current = true;
        (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
        set(e.clientX, e.clientY);
        e.stopPropagation();
      }}
      onPointerMove={(e) => active.current && set(e.clientX, e.clientY)}
      onPointerUp={(e) => {
        active.current = false;
        (e.currentTarget as HTMLElement).releasePointerCapture?.(e.pointerId);
        props.onChange({ x: 0, y: 0 });
      }}
      onPointerCancel={() => { active.current = false; props.onChange({ x: 0, y: 0 }); }}
    >
      <i class="sl-stick__ring" />
      <i class="sl-stick__cross" />
      <div
        class={`sl-stick__ball${active.current ? ' is-held' : ''}`}
        style={{ transform: `translate(${props.value.x * R}px, ${props.value.y * R}px)` }}
      />
    </div>
  );
}
