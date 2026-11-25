import type { ComponentChildren } from 'preact';
import type { GameServices } from '@core';
import { CountUp, Icon, useRegistry, useSignal, useStrings, type IconName } from '@ui-kit';
import { averageSaveSec, formatDuration } from '../logic';
import { statsSlot } from '../state';
import { S } from '../strings';
import './widgets.css';

function Tile(props: { icon: IconName; label: string; children: ComponentChildren; i: number }) {
  return (
    <div class="cr-record__tile" style={{ '--i': props.i }}>
      <span class="cr-record__tile-icon"><Icon name={props.icon} size={16} /></span>
      <span class="cr-record__value lm-num">{props.children}</span>
      <span class="cr-record__label">{props.label}</span>
    </div>
  );
}

/** profile: the player's emergency record. */
export function RecordWidget({ services }: { services: GameServices }) {
  const tx = useStrings(S);
  const loc = services.locale;
  const s = useSignal(statsSlot(services));
  const dx = useRegistry(services.registries.diagnoses);
  const name = (id: string) => dx.find((d) => d.id === id)?.name ?? id.replace(/-/g, ' ');
  const avg = averageSaveSec(s);
  const rate = s.attempts ? Math.round((s.saved / s.attempts) * 100) : 0;
  const saves = Object.entries(s.savedBy).sort((a, b) => b[1] - a[1]);

  return (
    <section class="cr-record" aria-labelledby="cr-record-title">
      <header class="cr-record__head">
        <span class="cr-record__badge"><Icon name="heart" size={20} /></span>
        <div>
          <span class="cr-record__eyebrow">{tx.codeRed}</span>
          <h3 class="cr-record__title" id="cr-record-title">{tx.recordTitle}</h3>
        </div>
      </header>
      {s.attempts === 0 ? (
        <p class="cr-record__empty">{tx.recordEmpty}</p>
      ) : (
        <>
          <div class="cr-record__grid">
            <Tile icon="heart" label={tx.sightsSaved} i={0}><CountUp value={s.saved} /></Tile>
            <Tile icon="target" label={tx.saveRate} i={1}><CountUp value={rate} suffix="%" /></Tile>
            <Tile icon="clock" label={tx.avgTime} i={2}>{avg === null ? '—' : formatDuration(avg, loc)}</Tile>
            <Tile icon="lightning" label={tx.fastest} i={3}>{s.fastestSaveSec === null ? '—' : formatDuration(s.fastestSaveSec, loc)}</Tile>
            <Tile icon="flame" label={tx.bestRun} i={4}><CountUp value={s.bestRun} /></Tile>
            <Tile icon="crown" label={tx.grandRounds} i={5}><CountUp value={s.grandRoundsTotal} /></Tile>
          </div>
          {s.recent.length > 0 && (
            <div class="cr-record__recent" aria-label={tx.recent}>
              <span class="cr-record__mini">{tx.recentShort}</span>
              {s.recent.map((r, i) => (
                <span key={`${r.at}-${i}`} class={`cr-record__dot cr-record__dot--${r.outcome}`} title={`${tx.outcomeLabel[r.outcome]} · ${formatDuration(r.sec, loc)}`}>
                  <span class="lm-sr-only">{tx.outcomeLabel[r.outcome]}</span>
                </span>
              ))}
            </div>
          )}
          {saves.length > 0 && (
            <ul class="cr-record__saves" aria-label={tx.savedList}>
              {saves.map(([id, n]) => (
                <li key={id}>
                  {name(id)}
                  {n > 1 && <b class="lm-num">×{n}</b>}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  );
}
