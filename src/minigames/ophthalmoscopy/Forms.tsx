import { useEffect, useRef, useState } from 'preact/hooks';
import type { ComponentChildren } from 'preact';
import type { Eye } from '@core';
import { DiscPreview as DiscCanvas } from './DiscPreview';
import { Button, Icon } from '@ui-kit';
import { useT } from './locale';
import {
  BUCKETS, VITREOUS_CHOICES,
  type DiscCall, type DiscColor, type DiscMargins, type Rim, type VesselBucket, type VesselCall, type VitreousCall,
} from './model';

function Seg<T extends string>({ label, value, options, onChange, testid }: {
  label: string; value: T; options: readonly { id: T; text: string }[]; onChange: (v: T) => void; testid: string;
}) {
  return (
    <div class="oph-seg" role="radiogroup" aria-label={label}>
      <span class="oph-seg__label">{label}</span>
      <div class="oph-seg__opts">
        {options.map((o) => (
          <button key={o.id} type="button" role="radio" aria-checked={value === o.id} class={`oph-chip oph-chip--sm${value === o.id ? ' is-on' : ''}`} onClick={() => onChange(o.id)} data-testid={`${testid}-${o.id}`}>
            {o.text}
          </button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, hint, on, onChange, testid }: { label: string; hint: string; on: boolean; onChange: (v: boolean) => void; testid: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} class={`oph-toggle${on ? ' is-on' : ''}`} onClick={() => onChange(!on)} data-testid={testid}>
      <span class="oph-toggle__box">{on && <Icon name="check" size={13} />}</span>
      <span><strong>{label}</strong><small>{hint}</small></span>
    </button>
  );
}

/** A glass sheet that sits over the stage; Escape cancels. */
export function Sheet({ title, icon, onCancel, onSave, saveLabel, children, testid }: {
  title: string; icon: 'target' | 'eye' | 'info'; onCancel: () => void; onSave: () => void; saveLabel: string; children: ComponentChildren; testid: string;
}) {
  const t = useT();
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    ref.current?.querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
  }, []);
  return (
    <div class="oph-sheet-scrim" onPointerDown={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div
        class="oph-sheet"
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        data-testid={testid}
        onKeyDown={(e) => {
          if (e.key === 'Escape') {
            e.stopPropagation();
            onCancel();
          } else if (e.key === 'Enter' && (e.target as HTMLElement).tagName !== 'BUTTON') {
            e.preventDefault();
            onSave();
          }
        }}
      >
        <header><Icon name={icon} size={18} /><h3>{title}</h3></header>
        <div class="oph-sheet__body">{children}</div>
        <footer>
          <Button variant="ghost" sfx={false} onClick={onCancel}>{t.cancel}</Button>
          <Button variant="primary" sfx={false} onClick={onSave} data-testid={`${testid}-save`}>{saveLabel}</Button>
        </footer>
      </div>
    </div>
  );
}

const DISC_FILL: Record<DiscColor, string> = { 'pink': '#e9936e', 'pale': '#f1dcc4', 'hyperemic': '#e0524a', 'pale-sectoral': '#e4b79a' };

function DiscSketch({ call }: { call: DiscCall }) {
  const w = 60;
  const h = 64;
  const cupH = h * call.cdr;
  const cupW = w * Math.min(0.95, call.cdr * 1.04);
  const shift = call.rim === 'inferior' ? 0.18 : call.rim === 'superior' ? -0.18 : 0;
  const blur = call.margins === 'sharp' ? 0 : call.margins === 'blurred' ? 2.2 : 3.6;
  return (
    <svg viewBox="-50 -50 100 100" class="oph-discprev" aria-hidden="true">
      <defs>
        <filter id="oph-dblur"><feGaussianBlur stdDeviation={blur} /></filter>
        <radialGradient id="oph-bgfund" r="0.8"><stop offset="0" stop-color="#b8431f" /><stop offset="1" stop-color="#6e1d10" /></radialGradient>
      </defs>
      <rect x="-50" y="-50" width="100" height="100" fill="url(#oph-bgfund)" />
      <g filter={blur ? 'url(#oph-dblur)' : undefined}>
        <ellipse rx={w / 2} ry={h / 2} fill={DISC_FILL[call.color]} stroke="rgba(255,255,255,.18)" />
        {call.color === 'pale-sectoral' && <path d={`M0 0 L ${w / 2} -6 A ${w / 2} ${h / 2} 0 0 1 4 ${h / 2} Z`} fill="#f4ece0" opacity=".8" />}
        <ellipse cy={shift * h * 0.5} rx={cupW / 2} ry={cupH / 2} fill="#f6ead7" opacity="0.92" />
      </g>
      <g stroke="#7a1810" stroke-width="2.6" fill="none" stroke-linecap="round" opacity="0.9">
        <path d="M-2 -8 C 6 -22 10 -34 8 -50" /><path d="M-2 6 C 6 20 10 34 8 50" />
      </g>
    </svg>
  );
}

export function DiscForm({ eye, initial, onSave, onCancel, onTick }: { eye: Eye; initial: DiscCall | null; onSave: (c: DiscCall) => void; onCancel: () => void; onTick: (v: number) => void }) {
  const t = useT();
  const [c, setC] = useState<DiscCall>(initial ?? { cdr: 0.4, color: 'pink', margins: 'sharp', rim: 'none' });
  const set = (p: Partial<DiscCall>) => setC((o) => ({ ...o, ...p }));
  const setCdr = (v: number) => {
    const nv = Math.round(Math.max(0.1, Math.min(0.9, v)) * 20) / 20;
    if (nv !== c.cdr) {
      onTick(nv);
      set({ cdr: nv });
    }
  };
  return (
    <Sheet title={t.discTitle} icon="target" onCancel={onCancel} onSave={() => onSave(c)} saveLabel={t.discSave} testid="oph-discform">
      <div class="oph-disc">
        <div class="oph-disc__view" dir="ltr" onWheel={(e) => { e.preventDefault(); setCdr(c.cdr + (e.deltaY < 0 ? 0.05 : -0.05)); }}>
          <DiscCanvas call={c} eye={eye} fallback={() => <DiscSketch call={c} />} />
          <span class="oph-disc__note">{t.discNote}</span>
        </div>
        <div class="oph-disc__ctl">
          <label class="oph-cdr" dir="ltr">
            <span class="oph-seg__label" dir="auto">{t.cdrLabel}</span>
            <strong class="oph-cdr__val" data-testid="oph-cdr-value">{c.cdr.toFixed(2)}</strong>
            <input
              type="range" min="0.1" max="0.9" step="0.05" value={c.cdr} data-autofocus data-testid="oph-cdr"
              aria-label={t.cdrAria}
              onInput={(e) => setCdr(Number((e.target as HTMLInputElement).value))}
            />
            <span class="oph-cdr__scale"><i>0.1</i><i>0.3</i><i>0.5</i><i>0.7</i><i>0.9</i></span>
          </label>
          <Seg<DiscColor> label={t.colour} value={c.color} onChange={(v) => set({ color: v })} testid="oph-color"
            options={(['pink', 'pale', 'hyperemic', 'pale-sectoral'] as const).map((id) => ({ id, text: t.colours[id] }))} />
          <Seg<DiscMargins> label={t.margins} value={c.margins} onChange={(v) => set({ margins: v })} testid="oph-margins"
            options={(['sharp', 'blurred', 'elevated'] as const).map((id) => ({ id, text: t.marginOpts[id] }))} />
          <Seg<Rim> label={t.rimLabel} value={c.rim} onChange={(v) => set({ rim: v })} testid="oph-rim"
            options={(['none', 'inferior', 'superior', 'diffuse'] as const).map((id) => ({ id, text: t.rimOpts[id] }))} />
        </div>
      </div>
    </Sheet>
  );
}

export function VesselForm({ initial, onSave, onCancel }: { initial: VesselCall | null; onSave: (c: VesselCall) => void; onCancel: () => void }) {
  const t = useT();
  const [c, setC] = useState<VesselCall>(initial ?? { bucket: 'normal', nicking: false, copper: false, venous: false, segmentation: false });
  const set = (p: Partial<VesselCall>) => setC((o) => ({ ...o, ...p }));
  return (
    <Sheet title={t.vesselsTitle} icon="eye" onCancel={onCancel} onSave={() => onSave(c)} saveLabel={t.vesselsSave} testid="oph-vesselform">
      <Seg<VesselBucket> label={t.avLabel} value={c.bucket} onChange={(v) => set({ bucket: v })} testid="oph-av"
        options={BUCKETS.map((b) => ({ id: b, text: t.bucket[b] }))} />
      <div class="oph-toggles">
        <Toggle label={t.nicking} hint={t.nickingHint} on={c.nicking} onChange={(v) => set({ nicking: v })} testid="oph-nicking" />
        <Toggle label={t.copper} hint={t.copperHint} on={c.copper} onChange={(v) => set({ copper: v })} testid="oph-copper" />
        <Toggle label={t.venous} hint={t.venousHint} on={c.venous} onChange={(v) => set({ venous: v })} testid="oph-venous" />
        <Toggle label={t.boxcar} hint={t.boxcarHint} on={c.segmentation} onChange={(v) => set({ segmentation: v })} testid="oph-boxcar" />
      </div>
    </Sheet>
  );
}

export function VitreousForm({ initial, onSave, onCancel }: { initial: VitreousCall | null; onSave: (c: VitreousCall) => void; onCancel: () => void }) {
  const t = useT();
  const [c, setC] = useState<VitreousCall>(initial ?? 'clear');
  return (
    <Sheet title={t.vitTitle} icon="info" onCancel={onCancel} onSave={() => onSave(c)} saveLabel={t.vitSave} testid="oph-vitform">
      <Seg<VitreousCall> label={t.vitQ} value={c} onChange={setC} testid="oph-vit"
        options={VITREOUS_CHOICES.map((v) => ({ id: v, text: t.vitreousLabel[v] }))} />
      <p class="oph-sheet__tip">{t.vitTip}</p>
    </Sheet>
  );
}
