import { Modal } from '@ui-kit';
import { BASE_ODDS, CARD_RARITIES, FRAME_LABEL, FRAME_THRESHOLDS, FRAME_TIERS, FRAME_XP, PERFECT_LEGENDARY_BONUS, ZEBRA_EPIC_BONUS, setReward } from '../model';
import { GALLERY_COLOR, RARITY_HEX, RARITY_NAME } from '../store';

const GRADES = ['S', 'A', 'B', 'C', 'D'] as const;
const pct = (v: number) => (v ? `${Math.round(v * 100)}%` : '—');

/** Transparent drop odds: how cards, rarities and frames are earned. */
export function OddsModal(props: { open: boolean; onClose: () => void }) {
  const ex = setReward(6);
  return (
    <Modal open={props.open} onClose={props.onClose} size="lg" icon="info" accent={GALLERY_COLOR} eyebrow="Gallery" title="How cards are earned">
      <div class="go">
        <p>
          Only a <strong>correct diagnosis</strong> collects a card — the better your work-up, the rarer the painting. Missing a diagnosis never costs you anything:
          the condition simply appears as a named silhouette you can collect next time.
        </p>
        <table class="go-table">
          <caption>Rarity odds by case grade</caption>
          <thead>
            <tr>
              <th scope="col">Grade</th>
              {CARD_RARITIES.map((r) => <th key={r} scope="col" style={{ color: RARITY_HEX[r] }}>{RARITY_NAME[r]}</th>)}
            </tr>
          </thead>
          <tbody>
            {GRADES.map((g) => (
              <tr key={g}>
                <th scope="row">{g}</th>
                {CARD_RARITIES.map((r) => <td key={r} class="lm-num">{pct(BASE_ODDS[g][r])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
        <ul class="go-list">
          <li>A perfect case (S grade, nothing missed, nothing wasted) adds <strong>+{pct(PERFECT_LEGENDARY_BONUS)}</strong> Legendary.</li>
          <li>Clinically rare conditions add <strong>+{pct(ZEBRA_EPIC_BONUS)}</strong> Epic.</li>
          <li>
            Diagnosing a condition again adds shine (S +3, A +2, other +1) and polishes the frame:{' '}
            {FRAME_TIERS.slice(1).map((t, i) => (
              <span key={t}>{i ? ', ' : ''}{FRAME_LABEL[t]} at {FRAME_THRESHOLDS[t]} (+{FRAME_XP[t]} XP)</span>
            ))}
            .
          </li>
          <li>Completing every card in a wing pays XP and coins — e.g. a 6-card wing gives +{ex.xp} XP and +{ex.coins} coins.</li>
        </ul>
      </div>
    </Modal>
  );
}
