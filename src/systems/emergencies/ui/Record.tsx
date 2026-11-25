import type { ComponentChildren } from 'preact';
import type { GameServices } from '@core';
import { CountUp, Icon, useRegistry, useSignal, type IconName } from '@ui-kit';
import { averageSaveSec, formatDuration, type Outcome } from '../logic';
import { statsSlot } from '../state';
import './widgets.css';

const OUTCOME_LABEL: Record<Outcome, string> = {
  saved: 'Saved',
  'over-triaged': 'Safe, over-cautious triage',
  'under-triaged': 'Referred too slowly',
  referred: 'Sent on in time, diagnosis missed',
  missed: 'Diagnosis and triage missed',
  timeout: 'Out of time',
};

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
          <span class="cr-record__eyebrow">Code Red</span>
          <h3 class="cr-record__title" id="cr-record-title">Emergency record</h3>
        </div>
      </header>
      {s.attempts === 0 ? (
        <p class="cr-record__empty">No emergencies on your chart yet. When a Code Red patient arrives, every sight you save is logged here.</p>
      ) : (
        <>
          <div class="cr-record__grid">
            <Tile icon="heart" label="Sights saved" i={0}><CountUp value={s.saved} /></Tile>
            <Tile icon="target" label="Save rate" i={1}><CountUp value={rate} suffix="%" /></Tile>
            <Tile icon="clock" label="Avg. time to call" i={2}>{avg === null ? '—' : formatDuration(avg)}</Tile>
            <Tile icon="lightning" label="Fastest save" i={3}>{s.fastestSaveSec === null ? '—' : formatDuration(s.fastestSaveSec)}</Tile>
            <Tile icon="flame" label="Best run" i={4}><CountUp value={s.bestRun} /></Tile>
            <Tile icon="crown" label="Grand Rounds" i={5}><CountUp value={s.grandRoundsTotal} /></Tile>
          </div>
          {s.recent.length > 0 && (
            <div class="cr-record__recent" aria-label="Recent emergencies">
              <span class="cr-record__mini">Recent</span>
              {s.recent.map((r, i) => (
                <span key={`${r.at}-${i}`} class={`cr-record__dot cr-record__dot--${r.outcome}`} title={`${OUTCOME_LABEL[r.outcome]} · ${formatDuration(r.sec)}`}>
                  <span class="lm-sr-only">{OUTCOME_LABEL[r.outcome]}</span>
                </span>
              ))}
            </div>
          )}
          {saves.length > 0 && (
            <ul class="cr-record__saves" aria-label="Emergencies saved">
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
