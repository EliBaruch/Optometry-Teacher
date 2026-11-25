import { useState } from 'preact/hooks';
import { playSingleCase, type GameServices } from '@core';
import { Badge, Button, Icon, useInterval, useReducedMotion, useRegistry, useSignal, useStrings } from '@ui-kit';
import { AvatarBust } from '@render';
import {
  clip, formatClock, formatRotation, grandRoundsBonus, grandRoundsCase, grandRoundsClaimed, msUntilNextWeek, weekKey,
} from '../logic';
import { statsSlot } from '../state';
import { S } from '../strings';
import './widgets.css';

/** The best possible Grand Rounds bonus (a flawless work-up) — shown as "up to". */
const MAX_BONUS = grandRoundsBonus(1);

function StarChart() {
  const pts: [number, number][] = [[30, 40], [80, 22], [140, 52], [200, 30], [262, 64], [320, 36], [372, 70]];
  return (
    <svg class="cr-grand__chart" viewBox="0 0 400 120" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <circle cx="330" cy="60" r="86" fill="none" stroke="#ffd27a" stroke-opacity=".12" />
      <circle cx="330" cy="60" r="58" fill="none" stroke="#ef4444" stroke-opacity=".16" stroke-dasharray="2 5" />
      <circle cx="330" cy="60" r="30" fill="none" stroke="#ffd27a" stroke-opacity=".1" />
      <polyline points={pts.map((p) => p.join(',')).join(' ')} fill="none" stroke="#ffd27a" stroke-opacity=".14" stroke-width=".7" />
      {pts.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 3 === 0 ? 2.2 : 1.4} fill={i % 3 === 0 ? '#ffd27a' : '#f6efe4'} opacity=".7" class="cr-grand__star" style={{ '--i': i }} />
      ))}
    </svg>
  );
}

/** hub-banner: this week's featured emergency, the same for everyone. */
export function GrandRoundsBanner({ services }: { services: GameServices }) {
  const tx = useStrings(S);
  const cases = useRegistry(services.registries.cases);
  const stats = useSignal(statsSlot(services));
  const reduced = useReducedMotion();
  const [now, setNow] = useState(() => services.clock.now());
  useInterval(() => setNow(services.clock.now()), 30000);

  const kase = grandRoundsCase(cases, now);
  if (!kase) return null;
  const week = weekKey(now);
  const claimed = grandRoundsClaimed(stats, week);
  const p = kase.patient;
  const weekNo = week.split('-W')[1];
  // The exam's own arrival klaxon plays on start; the button's 'select' sfx is the only hub sound.
  const open = () => playSingleCase(services, kase.id);

  return (
    <section class={`cr-grand${claimed ? ' is-claimed' : ''}${reduced ? ' is-still' : ''}`} aria-labelledby="cr-grand-title">
      <div class="cr-grand__glow" aria-hidden="true" />
      <StarChart />
      <div class="cr-grand__portrait">
        <AvatarBust spec={p.avatar} age={p.age} sex={p.sex} size={92} ring={claimed ? '#5eead4' : '#ef4444'} expression={claimed ? 'relieved' : 'worried'} label={p.name} />
        <span class="cr-grand__week lm-num" aria-hidden="true">{tx.week(weekNo!)}</span>
      </div>
      <div class="cr-grand__body">
        <div class="cr-grand__eyebrow">
          <Icon name="crown" size={14} />
          {tx.grandRounds}
          {!claimed && <Badge tone="critical" pulse size="sm">{tx.live}</Badge>}
          {claimed && <Badge tone="good" icon="check" size="sm">{tx.presented}</Badge>}
        </div>
        <h3 class="cr-grand__title" id="cr-grand-title">
          {p.name}, <span class="lm-num">{p.age}</span>
          {p.occupation && <span class="cr-grand__job"><span class="cr-grand__sep"> · </span>{p.occupation}</span>}
        </h3>
        <blockquote class="cr-grand__quote">“{clip(kase.chiefComplaint, 132)}”</blockquote>
        <div class="cr-grand__meta">
          <span class="cr-grand__pill cr-grand__pill--red">
            <Icon name="clock" size={13} /> <span class="lm-num">{formatClock(kase.emergency?.timeLimitSec ?? 0)}</span> {tx.clockWord}
          </span>
          <span class="cr-grand__pill" aria-label={tx.difficulty(kase.difficulty)}>
            {Array.from({ length: 5 }, (_, i) => (
              <span key={i} class={`cr-grand__pip${i < kase.difficulty ? ' is-on' : ''}`} aria-hidden="true" />
            ))}
          </span>
          <span class="cr-grand__pill cr-grand__pill--gold">
            {claimed ? tx.bonusClaimed : <>{tx.bonusUpTo}<b class="lm-num" dir="ltr">+{MAX_BONUS.coins} ✦ · +{MAX_BONUS.xp} XP</b></>}
          </span>
          <span class="cr-grand__rotate">{tx.newCaseIn}<span class="lm-num">{formatRotation(msUntilNextWeek(now), services.locale)}</span></span>
        </div>
      </div>
      <div class="cr-grand__cta">
        <Button variant={claimed ? 'glass' : 'danger'} size="lg" icon={claimed ? 'refresh' : 'play'} sfx="select" onClick={open}>
          {claimed ? tx.replay : tx.take}
        </Button>
      </div>
    </section>
  );
}
