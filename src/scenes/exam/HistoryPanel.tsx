import { useEffect, useRef } from 'preact/hooks';
import { GlassPanel, Icon, useReducedMotion, useSfx } from '@ui-kit';
import type { HistoryGroup } from './logic';

export type LogEntry = { kind: 'qa'; id: string; q: string; a: string } | { kind: 'hint'; id: string; text: string };

export function HistoryPanel(props: {
  groups: HistoryGroup[];
  asked: readonly string[];
  log: readonly LogEntry[];
  patientName: string;
  onAsk: (id: string) => void;
}) {
  const { groups, asked, log, patientName, onAsk } = props;
  const total = groups.reduce((n, g) => n + g.questions.length, 0);
  const play = useSfx();
  const reduced = useReducedMotion();
  const logRef = useRef<HTMLOListElement>(null);
  useEffect(() => {
    const el = logRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduced ? 'auto' : 'smooth' });
  }, [log.length]);
  const first = patientName.split(' ')[0];

  return (
    <GlassPanel
      class="exm-history"
      title="History"
      eyebrow="Talk to the patient"
      icon="book"
      padding="md"
      actions={<span class="exm-count lm-num" aria-label={`${asked.length} of ${total} questions asked`}>{asked.length}/{total}</span>}
    >
      <div class="exm-history__groups">
        {groups.map((g) => (
          <div class="exm-qgroup" key={g.category} role="group" aria-label={g.label}>
            <h3 class="exm-qgroup__title">{g.label}</h3>
            <div class="exm-qgroup__chips">
              {g.questions.map((q) => {
                const done = asked.includes(q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    class={`exm-q${done ? ' is-asked' : ''}`}
                    aria-disabled={done}
                    aria-label={done ? `${q.q} (already asked)` : q.q}
                    onClick={() => (done ? play('error', { volume: 0.2 }) : onAsk(q.id))}
                  >
                    {done && <Icon name="check" size={13} />}
                    <span>{q.q}</span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
        {groups.length === 0 && <p class="lm-muted">This patient has nothing more to tell you.</p>}
      </div>
      <div class="exm-log" role="log" aria-live="polite" aria-label="Conversation">
        <h3 class="exm-qgroup__title">Conversation</h3>
        {log.length === 0 ? (
          <p class="exm-log__empty lm-muted">Choose a question above. The answer comes in {first}'s own words.</p>
        ) : (
          <ol ref={logRef} class="exm-log__list">
            {log.map((e) =>
              e.kind === 'hint' ? (
                <li key={e.id} class="exm-msg exm-msg--hint">
                  <Icon name="sparkle" size={14} />
                  <span>{e.text}</span>
                </li>
              ) : (
                <li key={e.id} class="exm-msg-pair">
                  <p class="exm-msg exm-msg--you">{e.q}</p>
                  <p class="exm-msg exm-msg--them"><b>{first}</b>{e.a}</p>
                </li>
              ),
            )}
          </ol>
        )}
      </div>
    </GlassPanel>
  );
}
