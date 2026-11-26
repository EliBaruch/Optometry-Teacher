import { Modal, useStrings } from '@ui-kit';
import { BASE_ODDS, CARD_RARITIES, FRAME_THRESHOLDS, FRAME_TIERS, FRAME_XP, PERFECT_LEGENDARY_BONUS, ZEBRA_EPIC_BONUS, setReward } from '../model';
import { GALLERY_COLOR, RARITY_HEX } from '../store';
import { S } from '../strings';

const GRADES = [['S', 'S'], ['A', 'A'], ['B', 'B'], ['C', 'C'], ['D', 'D–F']] as const;
const pct = (v: number) => (v ? `${Math.round(v * 100)}%` : '—');

/** Transparent drop odds: how cards, rarities and frames are earned. */
export function OddsModal(props: { open: boolean; onClose: () => void }) {
  const t = useStrings(S);
  const ex = setReward(6);
  return (
    <Modal open={props.open} onClose={props.onClose} size="lg" icon="info" accent={GALLERY_COLOR} eyebrow={t.hubTitle} title={t.oddsTitle}>
      <div class="go">
        <p>
          {t.oddsP1a}<strong>{t.oddsP1b}</strong>{t.oddsP1c}
        </p>
        <h4 class="go-caption" id="gallery-odds-caption">{t.oddsCaption}</h4>
        <table class="go-table" aria-labelledby="gallery-odds-caption">
          <thead>
            <tr>
              <th scope="col">{t.grade}</th>
              {CARD_RARITIES.map((r) => <th key={r} scope="col" style={{ color: RARITY_HEX[r] }}>{t.rarity[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {GRADES.map(([g, label]) => (
              <tr key={g}>
                <th scope="row">{label}</th>
                {CARD_RARITIES.map((r) => <td key={r} class="lm-num">{pct(BASE_ODDS[g][r])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <ul class="go-list">
          <li>{t.perfect(pct(PERFECT_LEGENDARY_BONUS))}</li>
          <li>{t.zebra(pct(ZEBRA_EPIC_BONUS))}</li>
          <li>
            {t.oddsShine}
            {FRAME_TIERS.slice(1).map((f, i) => (
              <span key={f}>{i ? ', ' : ''}{t.oddsFrameAt(t.frame[f], FRAME_THRESHOLDS[f], FRAME_XP[f])}</span>
            ))}
            .
          </li>
          <li>{t.oddsWing(6, ex.xp, ex.coins)}</li>
        </ul>
      </div>
    </Modal>
  );
}
