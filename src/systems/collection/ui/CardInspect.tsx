import { useEffect, useRef, useState } from 'preact/hooks';
import { isRtl } from '@core';
import { Badge, Button, GRADE_COLOR, IconButton, Modal, ProgressBar, useSfx, useStrings, useLocale } from '@ui-kit';
import { formatCardDate } from '../catalog';
import { frameFor, nextFrame } from '../model';
import { RARITY_HEX, type CollectionStore } from '../store';
import { S, wingText } from '../strings';
import { IrisCard, type CardView } from './IrisCard';

export interface CardInspectProps {
  store: CollectionStore;
  list: CardView[];
  current: string | null;
  study: boolean;
  onNavigate: (dx: string) => void;
  onClose: () => void;
}

/** Full-size card on a velvet stage: 3D tilt, flip (F), browse (← →), the card's story. */
export function CardInspect({ store, list, current, study, onNavigate, onClose }: CardInspectProps) {
  const play = useSfx();
  const t = useStrings(S);
  const rtl = isRtl(useLocale());
  const idx = list.findIndex((v) => v.dxId === current);
  const view = idx >= 0 ? list[idx] : undefined;
  const [flipped, setFlipped] = useState(false);
  const last = useRef<CardView | undefined>(view);
  if (view) last.current = view;
  const shown = view ?? last.current; // keep content during the exit animation

  useEffect(() => {
    setFlipped(false);
    if (current) store.markSeen(current);
  }, [current]);

  const go = (d: number) => {
    if (!list.length || idx < 0) return;
    const next = list[(idx + d + list.length) % list.length]!;
    play('select');
    onNavigate(next.dxId);
  };
  const flip = () => {
    play('whoosh', { volume: 0.6, pitch: flipped ? 0.9 : 1.1 });
    setFlipped((f) => !f);
  };

  useEffect(() => {
    if (!current) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t && /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName)) return;
      if (e.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) { e.preventDefault(); go(1); }
      else if (e.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) { e.preventDefault(); go(-1); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); flip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!shown) return null;
  const { card, dx } = shown;
  const wing = wingText(t, dx?.category);
  const frame = frameFor(card.shine);
  const next = nextFrame(card.shine);
  const hidden = study && !flipped;
  const title = hidden ? t.flashCard(String(shown.number).padStart(2, '0')) : dx?.name ?? shown.dxId;

  return (
    <Modal
      open={!!view}
      onClose={onClose}
      size="xl"
      flush
      accent={RARITY_HEX[card.rarity]}
      eyebrow={t.eyebrow(wing.wing, String(shown.number).padStart(2, '0'), shown.total)}
      title={title}
      class="gi-modal"
    >
      <div class="gi">
        <div class="gi-stage" style={{ '--c': RARITY_HEX[card.rarity] }}>
          <div class="gi-spot" aria-hidden="true" />
          <IrisCard key={shown.dxId} view={shown} size="lg" flipped={flipped} study={study} device sway={!flipped} onActivate={flip} class="gi-card" />
          <div class="gi-controls">
            <IconButton icon="chevron-left" label={t.prev} onClick={() => go(-1)} disabled={list.length < 2} sfx={false} />
            <Button size="sm" icon="refresh" onClick={flip} sfx={false}>{flipped ? t.showFront : hidden ? t.reveal : t.flip} <kbd class="gi-kbd">F</kbd></Button>
            <IconButton icon="chevron-right" label={t.next} onClick={() => go(1)} disabled={list.length < 2} sfx={false} />
          </div>
        </div>
        <aside class="gi-info">
          <div class="gi-badges">
            <Badge color={RARITY_HEX[card.rarity]} icon="gem">{t.rarity[card.rarity]}</Badge>
            <Badge color={frame === 'prismatic' ? '#ffb3e6' : frame === 'gold' ? '#ffd27a' : frame === 'silver' ? '#dfe6f2' : '#e0a26c'} variant="outline">{t.frameBadge(t.frame[frame])}</Badge>
            <Badge color={GRADE_COLOR[card.bestGrade]} variant="outline">{t.bestGrade(card.bestGrade)}</Badge>
          </div>

          <div class="gi-block">
            {next ? (
              <ProgressBar
                value={card.shine - next.from}
                max={next.to - next.from}
                label={t.polishTo(t.frame[next.tier])}
                valueText={t.shineOf(card.shine, next.to)}
                accent={next.tier === 'gold' ? '#ffd27a' : next.tier === 'silver' ? '#dfe6f2' : '#ffb3e6'}
                size="sm"
                shimmer
              />
            ) : (
              <p class="gi-note gi-note--gold">{t.fullyPolished}</p>
            )}
            <p class="gi-note">{t.shineNote}</p>
          </div>

          {hidden ? (
            <div class="gi-block gi-quiz">
              <h4>{t.flashPrompt}</h4>
              <ul>{dx?.keyFindings.slice(0, 3).map((k) => <li key={k}>{k}</li>)}</ul>
              <p class="gi-note">{t.flashNote}</p>
            </div>
          ) : (
            <div class="gi-block">
              <h4>{t.aboutTitle}</h4>
              <p class="gi-summary">{dx?.summary}</p>
              {dx?.reference && (
                <a class="gi-ref" href={dx.reference} target="_blank" rel="noopener noreferrer">{t.readRef}</a>
              )}
            </div>
          )}

          <div class="gi-block">
            <h4>{t.patientsLeft(card.copies)}</h4>
            <ul class="gi-history">
              {card.history.map((h, i) => (
                <li key={`${i}:${h.caseId}:${h.at}`} class={h === card.featured || (h.caseId === card.featured.caseId && h.at === card.featured.at) ? 'is-featured' : ''}>
                  <i class="gi-history__gem" style={{ '--c': RARITY_HEX[h.rarity] }} title={t.rarity[h.rarity]} />
                  <span class="gi-history__name">{h.patient}</span>
                  <span class="gi-history__grade" style={{ color: GRADE_COLOR[h.grade] }}>{h.grade}</span>
                  <span class="gi-history__date">{formatCardDate(h.at, t.months)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
