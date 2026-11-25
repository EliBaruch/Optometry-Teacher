import { useEffect, useRef } from 'preact/hooks';
import { Icon } from '@ui-kit';
import { TAGS, TAG_GROUPS, type TagKind } from './model';

export type RadialChoice =
  | { type: 'disc' }
  | { type: 'vessels' }
  | { type: 'tag'; kind: TagKind };

interface Item {
  id: string;
  label: string;
  hint?: string;
  tone: string;
  action: () => void;
}

export interface RadialProps {
  /** tap point inside the stage, px */
  x: number;
  y: number;
  stageW: number;
  stageH: number;
  group: string | null;
  nearTag: boolean;
  reducedMotion: boolean;
  onGroup: (id: string | null) => void;
  onChoose: (c: RadialChoice) => void;
  onRemoveNear: () => void;
  onClose: () => void;
}

const TONES: Record<string, string> = {
  disc: '#ffd27a', vessels: '#f87171', macula: '#5eead4', bleeds: '#ef4444', bright: '#fde68a', vascular: '#fb7185', macular: '#c4b5fd', periphery: '#7dd3fc',
};

/** Two-level radial tag wheel anchored on the tapped spot. */
export function Radial({ x, y, stageW, stageH, group, nearTag, reducedMotion, onGroup, onChoose, onRemoveNear, onClose }: RadialProps) {
  const ref = useRef<HTMLDivElement>(null);
  const narrow = stageW < 520;
  const R = narrow ? 92 : 118;
  const halfW = R + (narrow ? 52 : 64);
  const halfH = R + 22;
  const cx = stageW > halfW * 2 ? Math.max(halfW, Math.min(stageW - halfW, x)) : stageW / 2;
  const cy = stageH > halfH * 2 ? Math.max(halfH, Math.min(stageH - halfH, y)) : stageH / 2;

  const root: Item[] = [
    { id: 'disc', label: 'Optic disc', hint: 'Cup-to-disc, colour, margins', tone: TONES.disc!, action: () => onChoose({ type: 'disc' }) },
    ...TAG_GROUPS.slice(0, 2).map((g) => ({ id: g.id, label: g.label, tone: TONES[g.id]!, action: () => onGroup(g.id) })),
    { id: 'vascular', label: 'Vessel lesions', tone: TONES.vascular!, action: () => onGroup('vascular') },
    { id: 'macular', label: 'Macula & pigment', tone: TONES.macular!, action: () => onGroup('macular') },
    { id: 'periphery', label: 'Periphery', tone: TONES.periphery!, action: () => onGroup('periphery') },
    { id: 'macula-ok', label: 'Macula healthy', hint: 'Flat, foveal reflex present', tone: TONES.macula!, action: () => onChoose({ type: 'tag', kind: 'macula-ok' }) },
    { id: 'vessels', label: 'Vessels', hint: 'A:V ratio and signs', tone: TONES.vessels!, action: () => onChoose({ type: 'vessels' }) },
  ];
  const g = TAG_GROUPS.find((t) => t.id === group);
  const items: Item[] = g
    ? g.kinds.map((k) => ({ id: k, label: TAGS[k].label, hint: TAGS[k].hint, tone: TONES[g.id]!, action: () => onChoose({ type: 'tag', kind: k }) }))
    : root;

  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-radial-item]')?.focus({ preventScroll: true });
  }, [group]);

  const onKeyDown = (e: KeyboardEvent) => {
    const btns = [...(ref.current?.querySelectorAll<HTMLElement>('[data-radial-item]') ?? [])];
    const i = btns.indexOf(document.activeElement as HTMLElement);
    if (e.key === 'Escape') {
      e.preventDefault();
      e.stopPropagation();
      group ? onGroup(null) : onClose();
    } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
      e.preventDefault();
      btns[(i + 1) % btns.length]?.focus();
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
      e.preventDefault();
      btns[(i - 1 + btns.length) % btns.length]?.focus();
    } else if (/^[1-9]$/.test(e.key)) {
      const it = items[Number(e.key) - 1];
      if (it) {
        e.preventDefault();
        it.action();
      }
    }
  };

  return (
    <div class="oph-radial-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onClose(); }} data-testid="oph-radial-scrim">
      <div
        ref={ref}
        class={`oph-radial${reducedMotion ? ' is-reduced' : ''}`}
        style={{ left: `${cx}px`, top: `${cy}px` }}
        role="menu"
        aria-label={g ? g.label : 'Tag what you found'}
        onKeyDown={onKeyDown}
      >
        <span class="oph-radial__ring" aria-hidden="true" style={{ width: `${R * 2}px`, height: `${R * 2}px` }} />
        {items.map((it, i) => {
          const a = (-90 + (360 / items.length) * i) * (Math.PI / 180);
          return (
            <button
              key={`${group}-${it.id}`}
              type="button"
              role="menuitem"
              data-radial-item
              data-testid={`oph-radial-${it.id}`}
              class="oph-radial__item"
              style={{ transform: `translate(calc(-50% + ${Math.cos(a) * R}px), calc(-50% + ${Math.sin(a) * R}px))`, '--tone': it.tone, '--i': i } as never}
              title={it.hint}
              onClick={it.action}
            >
              <i aria-hidden="true" />
              <span>{it.label}</span>
            </button>
          );
        })}
        <button
          type="button"
          class="oph-radial__hub"
          aria-label={g ? 'Back' : nearTag ? 'Remove tag here' : 'Cancel'}
          data-testid="oph-radial-hub"
          onClick={() => (g ? onGroup(null) : nearTag ? onRemoveNear() : onClose())}
        >
          <Icon name={g ? 'chevron-left' : nearTag ? 'minus' : 'close'} size={16} />
          {!g && nearTag && <small>Remove</small>}
        </button>
      </div>
    </div>
  );
}
