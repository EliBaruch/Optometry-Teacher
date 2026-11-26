import { useMemo, useState } from 'preact/hooks';
import type { Diagnosis } from '@core';
import { Button, GlassPanel, Icon, IconButton, Modal, useLocale, useSfx, useStrings } from '@ui-kit';
import { S } from './strings';
import { CATEGORY_INFO, MAX_SUSPECTS, prettifyId, searchDiagnoses } from './logic';

/** The player's working differential: up to four pinned suspects, reorderable. Pure notes — never auto-marked. */
export function Suspects(props: {
  pinned: readonly string[];
  diagnoses: readonly Diagnosis[];
  onPin: (id: string) => void;
  onUnpin: (id: string) => void;
  onMove: (index: number, dir: -1 | 1) => void;
}) {
  const { pinned, diagnoses, onPin, onUnpin, onMove } = props;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const play = useSfx();
  const t = useStrings(S);
  const locale = useLocale();
  const byId = useMemo(() => new Map(diagnoses.map((d) => [d.id, d])), [diagnoses]);
  const results = useMemo(() => searchDiagnoses(diagnoses, query, locale).slice(0, 80), [diagnoses, query, locale]);
  const full = pinned.length >= MAX_SUSPECTS;

  return (
    <>
      <GlassPanel
        class="exm-suspects"
        title={t.suspectsTitle}
        eyebrow={<><span class="exm-no">04</span>{t.suspectsEyebrow}</>}
        icon="target"
        padding="md"
        actions={<span class="exm-count lm-num">{pinned.length}/{MAX_SUSPECTS}</span>}
      >
        {pinned.length === 0 ? (
          <p class="exm-suspects__empty lm-muted">{t.suspectsEmpty}</p>
        ) : (
          <ol class="exm-pins">
            {pinned.map((id, i) => {
              const d = byId.get(id);
              const cat = d ? CATEGORY_INFO[d.category] : undefined;
              const name = d?.name ?? prettifyId(id);
              return (
                <li key={id} class="exm-pin">
                  <span class="exm-pin__n lm-num">{i + 1}</span>
                  {cat && <Icon name={cat.icon} size={15} class="exm-pin__ico" />}
                  <span class="exm-pin__name">{name}</span>
                  <span class="exm-pin__btns">
                    <IconButton icon="chevron-left" label={t.moveUp(name)} size="sm" variant="ghost" disabled={i === 0} class="exm-rot-up" onClick={() => onMove(i, -1)} sfx="select" />
                    <IconButton icon="chevron-right" label={t.moveDown(name)} size="sm" variant="ghost" disabled={i === pinned.length - 1} class="exm-rot-down" onClick={() => onMove(i, 1)} sfx="select" />
                    <IconButton icon="close" label={t.unpin(name)} size="sm" variant="ghost" onClick={() => onUnpin(id)} sfx="back" />
                  </span>
                </li>
              );
            })}
          </ol>
        )}
        <Button
          class="exm-suspects__add"
          variant="glass"
          size="sm"
          icon="plus"
          disabled={full}
          onClick={() => {
            setQuery('');
            setOpen(true);
          }}
          block
        >
          {full ? t.pinFull : t.pinAdd}
        </Button>
      </GlassPanel>
      {/* Outside the panel: its backdrop-filter would otherwise trap the fixed-position dialog. */}
      <Modal open={open} onClose={() => setOpen(false)} size="md" title={t.pinAdd} eyebrow={t.pickEyebrow} icon="target" initialFocus=".exm-search">
          <div class="exm-picker">
            <input
              class="exm-search"
              type="search"
              placeholder={t.searchPlaceholder}
              aria-label={t.searchAria}
              value={query}
              onInput={(e) => setQuery((e.currentTarget as HTMLInputElement).value)}
            />
            <ul class="exm-picker__list" aria-label={t.conditionsAria}>
              {results.map((d) => {
                const isPinned = pinned.includes(d.id);
                const cat = CATEGORY_INFO[d.category];
                return (
                  <li key={d.id}>
                    <button
                      type="button"
                      class={`exm-opt${isPinned ? ' is-pinned' : ''}`}
                      disabled={isPinned}
                      onClick={() => {
                        onPin(d.id);
                        play('pop');
                        if (pinned.length + 1 >= MAX_SUSPECTS) setOpen(false);
                      }}
                    >
                      <Icon name={cat.icon} size={16} />
                      <span class="exm-opt__name">{d.name}</span>
                      <span class="exm-opt__cat">{isPinned ? t.pinned : t.category[d.category]}</span>
                    </button>
                  </li>
                );
              })}
              {results.length === 0 && <li class="lm-muted exm-picker__none">{t.noMatch}</li>}
            </ul>
          </div>
        </Modal>
    </>
  );
}
