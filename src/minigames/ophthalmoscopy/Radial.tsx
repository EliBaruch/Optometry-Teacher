import { useEffect, useRef } from 'preact/hooks';
import { Icon } from '@ui-kit';
import { TAG_GROUPS, type TagKind } from './model';
import { useLocale, useT } from './locale';
import { clampCentre, layoutPetals, petalSpec } from './radialLayout';

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
  disc: '#e08a00', vessels: '#f87171', macula: '#10b981', bleeds: '#ef4444', bright: '#d9a400', vascular: '#fb7185', macular: '#8b5cf6', periphery: '#0ea5e9',
};

/** Two-level radial tag wheel anchored on the tapped spot. */
export function Radial({ x, y, stageW, stageH, group, nearTag, reducedMotion, onGroup, onChoose, onRemoveNear, onClose }: RadialProps) {
  const t = useT();
  const rtl = useLocale() === 'he';
  const ref = useRef<HTMLDivElement>(null);
  const root: Item[] = [
    { id: 'disc', label: t.radialDisc, hint: t.radialDiscHint, tone: TONES.disc!, action: () => onChoose({ type: 'disc' }) },
    ...TAG_GROUPS.slice(0, 2).map((g) => ({ id: g.id, label: t.groups[g.id] ?? g.label, tone: TONES[g.id]!, action: () => onGroup(g.id) })),
    { id: 'vascular', label: t.groups.vascular!, tone: TONES.vascular!, action: () => onGroup('vascular') },
    { id: 'macular', label: t.groups.macular!, tone: TONES.macular!, action: () => onGroup('macular') },
    { id: 'periphery', label: t.groups.periphery!, tone: TONES.periphery!, action: () => onGroup('periphery') },
    { id: 'macula-ok', label: t.radialMaculaOk, hint: t.radialMaculaOkHint, tone: TONES.macula!, action: () => onChoose({ type: 'tag', kind: 'macula-ok' }) },
    { id: 'vessels', label: t.radialVessels, hint: t.radialVesselsHint, tone: TONES.vessels!, action: () => onChoose({ type: 'vessels' }) },
  ];
  const g = TAG_GROUPS.find((t) => t.id === group);
  const items: Item[] = g
    ? g.kinds.map((k) => ({ id: k, label: t.tags[k].label, hint: t.tags[k].hint, tone: TONES[g.id]!, action: () => onChoose({ type: 'tag', kind: k }) }))
    : root;

  const spec = petalSpec(stageW);
  const lay = layoutPetals(items.length, spec, stageH - 16);
  const cx = clampCentre(x, lay.halfW, stageW);
  const cy = clampCentre(y, lay.halfH, stageH);
  const shifted = Math.hypot(cx - x, cy - y) > 16;

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
        dir="ltr"
        class={`oph-radial${reducedMotion ? ' is-reduced' : ''}`}
        style={{ left: `${cx}px`, top: `${cy}px` }}
        role="menu"
        aria-label={g ? (t.groups[g.id] ?? g.label) : t.radialAria}
        onKeyDown={onKeyDown}
      >
        <span class="oph-radial__halo" aria-hidden="true" style={{ width: `${lay.halfW * 2}px`, height: `${lay.halfH * 2 + 40}px` }} />
        <svg class="oph-radial__spokes" aria-hidden="true" width="1" height="1" style={{ overflow: 'visible' }}>
          {items.map((it, i) => {
            const p = lay.pos[i]!;
            return <line key={`${group}-${it.id}`} x1="0" y1="0" x2={p.x} y2={p.y} stroke={it.tone} stroke-opacity="0.38" stroke-width="1.2" stroke-dasharray="3 4" />;
          })}
          {shifted && <line x1="0" y1="0" x2={x - cx} y2={y - cy} stroke="#2257f0" stroke-opacity="0.8" stroke-width="1.5" />}
        </svg>
        {shifted && <span class="oph-radial__tap" aria-hidden="true" style={{ left: `${x - cx}px`, top: `${y - cy}px` }} />}
        {items.map((it, i) => {
          const p = lay.pos[i]!;
          return (
            <button
              key={`${group}-${it.id}`}
              type="button"
              role="menuitem"
              data-radial-item
              data-testid={`oph-radial-${it.id}`}
              class="oph-radial__item"
              dir={rtl ? 'rtl' : 'ltr'}
              style={{ transform: `translate(calc(-50% + ${p.x.toFixed(1)}px), calc(-50% + ${p.y.toFixed(1)}px))`, width: `${spec.w}px`, height: `${spec.h}px`, '--tone': it.tone, '--i': i } as never}
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
          aria-label={g ? t.back : nearTag ? t.removeHere : t.cancel}
          data-testid="oph-radial-hub"
          onClick={() => (g ? onGroup(null) : nearTag ? onRemoveNear() : onClose())}
        >
          <Icon name={g ? 'chevron-left' : nearTag ? 'minus' : 'close'} size={16} />
          {!g && nearTag && <small>{t.remove}</small>}
        </button>
      </div>
    </div>
  );
}
