import { useEffect, useRef, useState } from 'preact/hooks';
import { Badge, Button, GRADE_COLOR, IconButton, Modal, ProgressBar, useSfx } from '@ui-kit';
import { formatCardDate, wingOf } from '../catalog';
import { FRAME_LABEL, frameFor, nextFrame } from '../model';
import { RARITY_HEX, RARITY_NAME, type CollectionStore } from '../store';
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
      if (e.key === 'ArrowRight') { e.preventDefault(); go(1); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); go(-1); }
      else if (e.key === 'f' || e.key === 'F') { e.preventDefault(); flip(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (!shown) return null;
  const { card, dx } = shown;
  const wing = wingOf(dx?.category);
  const frame = frameFor(card.shine);
  const next = nextFrame(card.shine);
  const hidden = study && !flipped;
  const title = hidden ? `Flash card № ${String(shown.number).padStart(2, '0')}` : dx?.name ?? shown.dxId;

  return (
    <Modal
      open={!!view}
      onClose={onClose}
      size="xl"
      flush
      accent={RARITY_HEX[card.rarity]}
      eyebrow={`${wing.wing} · № ${String(shown.number).padStart(2, '0')} of ${shown.total}`}
      title={title}
      class="gi-modal"
    >
      <div class="gi">
        <div class="gi-stage" style={{ '--c': RARITY_HEX[card.rarity] }}>
          <div class="gi-spot" aria-hidden="true" />
          <IrisCard key={shown.dxId} view={shown} size="lg" flipped={flipped} study={study} device sway={!flipped} onActivate={flip} class="gi-card" />
          <div class="gi-controls">
            <IconButton icon="chevron-left" label="Previous card (←)" onClick={() => go(-1)} disabled={list.length < 2} sfx={false} />
            <Button size="sm" icon="refresh" onClick={flip} sfx={false}>{flipped ? 'Show front' : hidden ? 'Reveal' : 'Flip'} <kbd class="gi-kbd">F</kbd></Button>
            <IconButton icon="chevron-right" label="Next card (→)" onClick={() => go(1)} disabled={list.length < 2} sfx={false} />
          </div>
        </div>
        <aside class="gi-info">
          <div class="gi-badges">
            <Badge color={RARITY_HEX[card.rarity]} icon="gem">{RARITY_NAME[card.rarity]}</Badge>
            <Badge color={frame === 'prismatic' ? '#ffb3e6' : frame === 'gold' ? '#ffd27a' : frame === 'silver' ? '#dfe6f2' : '#e0a26c'} variant="outline">{FRAME_LABEL[frame]} frame</Badge>
            <Badge color={GRADE_COLOR[card.bestGrade]} variant="outline">Best grade {card.bestGrade}</Badge>
          </div>

          <div class="gi-block">
            {next ? (
              <ProgressBar
                value={card.shine - next.from}
                max={next.to - next.from}
                label={`Polish to ${FRAME_LABEL[next.tier]}`}
                valueText={`${card.shine} / ${next.to} shine`}
                accent={next.tier === 'gold' ? '#ffd27a' : next.tier === 'silver' ? '#dfe6f2' : '#ffb3e6'}
                size="sm"
                shimmer
              />
            ) : (
              <p class="gi-note gi-note--gold">Fully polished — a prismatic masterpiece.</p>
            )}
            <p class="gi-note">Diagnose this condition again to add shine: S grade +3, A +2, any other correct call +1.</p>
          </div>

          {hidden ? (
            <div class="gi-block gi-quiz">
              <h4>Flash-card prompt</h4>
              <ul>{dx?.keyFindings.slice(0, 3).map((k) => <li key={k}>{k}</li>)}</ul>
              <p class="gi-note">Name the diagnosis in your head, then reveal the card.</p>
            </div>
          ) : (
            <div class="gi-block">
              <h4>About this condition</h4>
              <p class="gi-summary">{dx?.summary}</p>
              {dx?.reference && (
                <a class="gi-ref" href={dx.reference} target="_blank" rel="noopener noreferrer">Read the clinical reference ↗</a>
              )}
            </div>
          )}

          <div class="gi-block">
            <h4>Patients who left this iris · ×{card.copies}</h4>
            <ul class="gi-history">
              {card.history.map((h, i) => (
                <li key={`${i}:${h.caseId}:${h.at}`} class={h === card.featured || (h.caseId === card.featured.caseId && h.at === card.featured.at) ? 'is-featured' : ''}>
                  <i class="gi-history__gem" style={{ '--c': RARITY_HEX[h.rarity] }} title={RARITY_NAME[h.rarity]} />
                  <span class="gi-history__name">{h.patient}</span>
                  <span class="gi-history__grade" style={{ color: GRADE_COLOR[h.grade] }}>{h.grade}</span>
                  <span class="gi-history__date">{formatCardDate(h.at)}</span>
                </li>
              ))}
            </ul>
          </div>
        </aside>
      </div>
    </Modal>
  );
}
