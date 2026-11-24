import type { JSX } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { Diagnosis, Urgency } from '@core';
import { GRADE_COLOR, cx, useReducedMotion } from '@ui-kit';
import { formatCardDate, wingOf } from '../catalog';
import { FRAME_LABEL, FRAME_TIERS, frameFor, pickPearl, type OwnedCard } from '../model';
import { cardPalette } from '../palette';
import { RARITY_NAME } from '../store';
import { irisArtUrl } from './art';
import { useHolo } from './holo';
import './card.css';

export interface CardView {
  dxId: string;
  dx: Diagnosis | undefined;
  card: OwnedCard;
  number: number;
  total: number;
}

const ART_PX = { sm: 256, md: 384, lg: 560 } as const;
const URGENCY: Record<Urgency, { label: string; color: string }> = {
  routine: { label: 'Routine', color: '#5eead4' },
  soon: { label: 'Soon', color: '#38bdf8' },
  urgent: { label: 'Urgent', color: '#fbbf24' },
  emergency: { label: 'Emergency', color: '#f43f5e' },
};

export function cardLabel(v: CardView): string {
  const name = v.dx?.name ?? v.dxId;
  return `${name} — ${RARITY_NAME[v.card.rarity]} iris card, ${FRAME_LABEL[frameFor(v.card.shine)]} frame`;
}

export interface IrisCardProps {
  view: CardView;
  size?: keyof typeof ART_PX;
  flipped?: boolean;
  /** Flash-card mode: hide the diagnosis name on the front, show a clue. */
  study?: boolean;
  tilt?: boolean;
  device?: boolean;
  sway?: boolean;
  ribbon?: string;
  onActivate?: () => void;
  class?: string;
  style?: JSX.CSSProperties;
}

const num = (n: number) => String(n).padStart(2, '0');

/** A collected iris card: painted art, holographic foil, frame, flip side with a teaching pearl. */
export function IrisCard({ view, size = 'md', flipped, study, tilt = true, device, sway, ribbon, onActivate, class: klass, style }: IrisCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useHolo(ref, { maxTilt: reduced || !tilt ? 0 : size === 'lg' ? 16 : 12, device: device && !reduced });

  const { card, dx } = view;
  const wing = wingOf(dx?.category);
  const frame = frameFor(card.shine);
  const tierIdx = FRAME_TIERS.indexOf(frame);
  const f = card.featured;
  const palette = useMemo(() => cardPalette(f.irisColor, wing.color, card.rarity), [f.irisColor, wing.color, card.rarity]);
  const art = useMemo(() => irisArtUrl(f.seed, card.rarity, palette, ART_PX[size]), [f.seed, card.rarity, palette, size]);
  const name = dx?.name ?? view.dxId;
  const pearl = pickPearl(dx?.pearls ?? [], f.seed);
  const urgency = dx ? URGENCY[dx.typicalUrgency] : undefined;
  const no = view.number ? `№ ${num(view.number)}` : '№ —';

  const onKey = (e: KeyboardEvent) => {
    if (!onActivate) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onActivate();
    }
  };

  return (
    <div
      ref={ref}
      class={cx('gc-card', `gc-r-${card.rarity}`, `gc-f-${frame}`, flipped && 'is-flipped', sway && !reduced && 'is-sway', onActivate && 'is-button', klass)}
      style={{ '--wing': wing.color, ...(style as object) }}
      role={onActivate ? 'button' : 'img'}
      tabIndex={onActivate ? 0 : undefined}
      aria-label={study && !flipped ? `Unidentified iris card ${no} — flip to reveal` : cardLabel(view)}
      onClick={onActivate}
      onKeyDown={onKey}
    >
      <div class="gc-tilt">
        <div class="gc-flip">
          <div class="gc-face gc-face--front" aria-hidden="true">
            <div class="gc-front">
              <div class="gc-head">
                <span>{no}<span style={{ opacity: 0.5 }}> / {num(view.total)}</span></span>
                <span class="gc-head__rar"><i class="gc-gem" />{RARITY_NAME[card.rarity]}</span>
              </div>
              <div class="gc-art">{art ? <img src={art} alt="" draggable={false} /> : null}</div>
              <span class="gc-pill"><i />{wing.label}</span>
              {study ? (
                <>
                  <h3 class="gc-name gc-name--quiz">Which diagnosis?</h3>
                  <p class="gc-clue">{dx?.keyFindings[0] ?? 'Flip the card to reveal.'}</p>
                </>
              ) : (
                <>
                  <h3 class="gc-name">{name}</h3>
                  <p class="gc-meta"><b>{f.patient}</b> · {formatCardDate(card.firstAt)}</p>
                </>
              )}
              <div class="gc-foot">
                <span class="gc-pips" title={`${FRAME_LABEL[frame]} frame`}>
                  {FRAME_TIERS.map((t, i) => <i key={t} class={i <= tierIdx ? 'is-on' : ''} />)}
                  <span class="gc-frame-name">{FRAME_LABEL[frame]}</span>
                </span>
                <span class="gc-grade" style={{ '--gc-grade': GRADE_COLOR[card.bestGrade] }}>{card.bestGrade}</span>
              </div>
            </div>
            <div class="gc-foil" />
            <div class="gc-sparkle" />
            <div class="gc-glare" />
            {ribbon && <div class="gc-ribbon">{ribbon}</div>}
          </div>
          <div class="gc-face gc-face--back" aria-hidden="true">
            <div class="gc-back">
              <div class="gc-back__eyebrow">{no} · {wing.label}</div>
              <h3 class="gc-back__name">{name}</h3>
              <div class="gc-rule"><i /></div>
              <div class="gc-back__body">
                {pearl && (
                  <>
                    <h4>Teaching pearl</h4>
                    <p class="gc-pearl">{pearl}</p>
                  </>
                )}
                {!!dx?.keyFindings.length && (
                  <>
                    <h4>Key findings</h4>
                    <ul class="gc-findings">
                      {dx.keyFindings.slice(0, 3).map((k) => <li key={k}>{k}</li>)}
                    </ul>
                  </>
                )}
              </div>
              <div class="gc-back__foot">
                {urgency ? <span class="gc-triage" style={{ '--tri': urgency.color }}>Typical triage · {urgency.label}</span> : <span />}
                <span>×{card.copies}</span>
              </div>
            </div>
            <div class="gc-foil" />
            <div class="gc-glare" />
          </div>
        </div>
      </div>
    </div>
  );
}

/** Eye outline used on silhouettes and the sealed pack. */
export function EyeGlyph(props: { class?: string }) {
  return (
    <svg class={props.class} viewBox="0 0 120 70" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">
      <path d="M4 35 C 28 4, 92 4, 116 35 C 92 66, 28 66, 4 35 Z" />
      <circle cx="60" cy="35" r="19" />
      <circle cx="60" cy="35" r="8" fill="currentColor" opacity="0.5" />
      {Array.from({ length: 16 }, (_, i) => {
        const a = (i / 16) * Math.PI * 2;
        return <line key={i} x1={60 + Math.cos(a) * 10} y1={35 + Math.sin(a) * 10} x2={60 + Math.cos(a) * 17.5} y2={35 + Math.sin(a) * 17.5} stroke-width="1" opacity="0.6" />;
      })}
    </svg>
  );
}

export interface GhostCardProps {
  number: number;
  total: number;
  category?: Diagnosis['category'];
  /** Name shown when the diagnosis was met but missed. */
  glimpsedName?: string;
  class?: string;
}

/** An uncollected slot: a silhouette, optionally named if the player has met it. */
export function GhostCard({ number, total, category, glimpsedName, class: klass }: GhostCardProps) {
  const wing = wingOf(category);
  return (
    <div
      class={cx('gc-card', 'gc-card--ghost', glimpsedName && 'gc-card--glimpsed', klass)}
      style={{ '--wing': wing.color }}
      role="img"
      aria-label={glimpsedName ? `${glimpsedName} — not yet collected` : `Undiscovered ${wing.label} card`}
    >
      <div class="gc-tilt">
        <div class="gc-flip">
          <div class="gc-face" aria-hidden="true">
            <div class="gc-ghost">
              <span class="gc-ghost__no">№ {num(number)} / {num(total)}</span>
              <EyeGlyph />
              {glimpsedName ? (
                <>
                  <p class="gc-ghost__name">{glimpsedName}</p>
                  <p class="gc-ghost__hint">Diagnose it correctly to collect this iris.</p>
                </>
              ) : (
                <>
                  <p class="gc-ghost__name">Undiscovered</p>
                  <p class="gc-ghost__hint">{wing.label}</p>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
