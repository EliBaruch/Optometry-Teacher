import type { JSX } from 'preact';
import { useMemo, useRef } from 'preact/hooks';
import type { Diagnosis, Urgency } from '@core';
import { GRADE_COLOR, cx, useReducedMotion, useStrings } from '@ui-kit';
import { formatCardDate, wingOf } from '../catalog';
import { FRAME_TIERS, frameFor, pickPearl, type OwnedCard } from '../model';
import { cardPalette } from '../palette';
import { S, wingText } from '../strings';
import { useIrisArt } from './art';
import { useHolo } from './holo';
import './card.css';

export interface CardView {
  dxId: string;
  dx: Diagnosis | undefined;
  card: OwnedCard;
  number: number;
  total: number;
}

const ART_PX = { xs: 192, sm: 256, md: 384, lg: 560 } as const;
const URGENCY: Record<Urgency, string> = { routine: '#5eead4', soon: '#38bdf8', urgent: '#fbbf24', emergency: '#f43f5e' };

export function cardLabel(v: CardView, t: typeof S.en = S.en): string {
  const name = v.dx?.name ?? v.dxId;
  return t.cardLabel(name, t.rarity[v.card.rarity], t.frame[frameFor(v.card.shine)]);
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
  const t = useStrings(S);
  const ref = useRef<HTMLDivElement>(null);
  const reduced = useReducedMotion();
  useHolo(ref, { maxTilt: reduced || !tilt ? 0 : size === 'lg' ? 16 : 12, device: device && !reduced });

  const { card, dx } = view;
  const wing = { ...wingOf(dx?.category), ...wingText(t, dx?.category) };
  const frame = frameFor(card.shine);
  const tierIdx = FRAME_TIERS.indexOf(frame);
  const f = card.featured;
  const palette = useMemo(() => cardPalette(f.irisColor, card.rarity, f.seed), [f.irisColor, card.rarity, f.seed]);
  const art = useIrisArt({ seed: f.seed, rarity: card.rarity, palette, accent: wing.color }, ART_PX[size], size === 'md' || size === 'lg');
  const name = dx?.name ?? view.dxId;
  const pearl = pickPearl(dx?.pearls ?? [], f.seed);
  const urgency = dx ? { label: t.urgency[dx.typicalUrgency], color: URGENCY[dx.typicalUrgency] } : undefined;
  const no = view.number ? `${t.noMark} ${num(view.number)}` : `${t.noMark} —`;

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
      class={cx('gc-card', `gc-r-${card.rarity}`, `gc-f-${frame}`, size === 'xs' && 'is-mini', flipped && 'is-flipped', sway && !reduced && 'is-sway', onActivate && 'is-button', klass)}
      style={{ '--wing': wing.color, ...(style as object) }}
      role={onActivate ? 'button' : 'img'}
      tabIndex={onActivate ? 0 : undefined}
      aria-label={study && !flipped ? t.unidentifiedLabel(no) : cardLabel(view, t)}
      onClick={onActivate}
      onKeyDown={onKey}
    >
      <div class="gc-tilt">
        <div class="gc-flip">
          <div class="gc-face gc-face--front" aria-hidden="true">
            <div class="gc-front">
              <div class="gc-head">
                <span>{no}<span style={{ opacity: 0.5 }}> / {num(view.total)}</span></span>
                <span class="gc-head__rar"><i class="gc-gem" />{t.rarity[card.rarity]}</span>
              </div>
              <div class="gc-art" style={{ '--gc-iris': palette[1], '--gc-acc': wing.color }}>
                {art ? <img key={art} src={art} alt="" draggable={false} /> : null}
                {ribbon && <span class="gc-new">{ribbon}</span>}
                {size === 'xs' && <i class="gc-gem gc-mini-gem" />}
              </div>
              <span class="gc-pill"><i />{wing.label}</span>
              {study ? (
                <>
                  <h3 class="gc-name gc-name--quiz">{t.whichDx}</h3>
                  <p class="gc-clue">{dx?.keyFindings[0] ?? t.flipClue}</p>
                </>
              ) : (
                <>
                  <h3 class="gc-name">{name}</h3>
                  <p class="gc-meta">{f.patient}</p>
                </>
              )}
              <div class="gc-foot">
                <span class="gc-pips" title={t.frameWord(t.frame[frame])}>
                  {FRAME_TIERS.map((t, i) => <i key={t} class={i <= tierIdx ? 'is-on' : ''} />)}
                  <span class="gc-frame-name">{t.frame[frame]}</span>
                </span>
                <span class="gc-date">{formatCardDate(f.at, t.months)}</span>
                <span class="gc-grade" style={{ '--gc-grade': GRADE_COLOR[card.bestGrade] }}>{card.bestGrade}</span>
              </div>
            </div>
            <div class="gc-foil" />
            <div class="gc-sparkle" />
            <div class="gc-glare" />
          </div>
          <div class="gc-face gc-face--back" aria-hidden="true">
            <div class="gc-back">
              <div class="gc-back__eyebrow">{no} · {wing.label}</div>
              <h3 class="gc-back__name">{name}</h3>
              <div class="gc-rule"><i /></div>
              <div class="gc-back__body">
                {pearl && (
                  <>
                    <h4>{t.teachingPearl}</h4>
                    <p class="gc-pearl">{pearl}</p>
                  </>
                )}
                {!!dx?.keyFindings.length && (
                  <>
                    <h4>{t.keyFindings}</h4>
                    <ul class="gc-findings">
                      {dx.keyFindings.slice(0, 3).map((k) => <li key={k}>{k}</li>)}
                    </ul>
                  </>
                )}
              </div>
              <div class="gc-back__foot">
                {urgency ? <span class="gc-triage" style={{ '--tri': urgency.color }}>{t.typicalTriage(urgency.label)}</span> : <span />}
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
  const t = useStrings(S);
  const wing = wingText(t, category);
  return (
    <div
      class={cx('gc-card', 'gc-card--ghost', glimpsedName && 'gc-card--glimpsed', klass)}
      style={{ '--wing': wingOf(category).color }}
      role="img"
      aria-label={glimpsedName ? t.ghostLabelNamed(glimpsedName) : t.ghostLabel(wing.label)}
    >
      <div class="gc-tilt">
        <div class="gc-flip">
          <div class="gc-face" aria-hidden="true">
            <div class="gc-ghost">
              <span class="gc-ghost__no">{t.noMark} {num(number)} / {num(total)}</span>
              <EyeGlyph />
              {glimpsedName ? (
                <>
                  <p class="gc-ghost__name">{glimpsedName}</p>
                  <p class="gc-ghost__hint">{t.ghostHint}</p>
                </>
              ) : (
                <>
                  <p class="gc-ghost__name">{t.undiscovered}</p>
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
