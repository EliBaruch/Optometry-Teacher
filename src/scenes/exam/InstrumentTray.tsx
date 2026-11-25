import { TEST_CATALOG, type MiniGameModule, type MiniGameResult, type TestId } from '@core';
import { GlassPanel, Icon, IconOrText, isIconName, useSfx } from '@ui-kit';
import { testName } from './logic';

export function InstrumentTray(props: {
  instruments: MiniGameModule[];
  done: Partial<Record<TestId, MiniGameResult>>;
  techOk: boolean;
  onOpen: (mg: MiniGameModule) => void;
  onTech: (mg: MiniGameModule, from: HTMLElement) => void;
}) {
  const { instruments, done, techOk, onOpen, onTech } = props;
  const play = useSfx();
  const doneCount = instruments.filter((m) => done[m.id]).length;
  return (
    <GlassPanel
      class="exm-tray"
      title="Instruments"
      eyebrow="Examine the patient"
      icon="eye"
      padding="md"
      actions={<span class="exm-count lm-num" aria-label={`${doneCount} of ${instruments.length} tests done`}>{doneCount}/{instruments.length}</span>}
    >
      {instruments.length === 0 ? (
        <p class="lm-muted">The instrument trolley is empty for now. Questions and your clinical judgement will have to do.</p>
      ) : (
        <ul class="exm-tools" data-testid="exm-tools">
          {instruments.map((mg, i) => {
            const r = done[mg.id];
            const info = TEST_CATALOG[mg.id];
            return (
              <li key={mg.id} class={`exm-tool${r ? ' is-done' : ''}`} style={{ '--i': i }}>
                <button
                  type="button"
                  class="exm-tool__main"
                  onClick={() => onOpen(mg)}
                  onPointerEnter={() => play('hover', { volume: 0.25 })}
                  aria-label={`${r ? 'Repeat' : 'Start'} ${testName(mg.id, mg)}, ${info.minutes} minutes${r ? ', already done' : ''}`}
                >
                  <span class="exm-tool__icon">
                    {isIconName(mg.id) ? <Icon name={mg.id} size={26} /> : <IconOrText icon={mg.icon} size={24} />}
                  </span>
                  <span class="exm-tool__text">
                    <span class="exm-tool__name">{testName(mg.id, mg)}</span>
                    <span class="exm-tool__sub lm-num">
                      {r ? (r.autoRun ? 'By the technician' : 'Charted') : `${info.minutes} min`}
                    </span>
                  </span>
                  {r && (
                    <span class="exm-tool__check" aria-hidden="true">
                      <Icon name="check" size={14} strokeWidth={2.4} />
                    </span>
                  )}
                </button>
                {techOk && !r && (
                  <button
                    type="button"
                    class="exm-tool__tech"
                    title="The technician runs it for you: instant, but only half the skill credit."
                    onClick={(e) => onTech(mg, e.currentTarget as HTMLElement)}
                    aria-label={`Ask the technician to do the ${testName(mg.id, mg)}`}
                  >
                    <Icon name="user" size={13} />
                    <span class="exm-tool__tech-full">Ask the technician</span>
                    <span class="exm-tool__tech-short" aria-hidden="true">Technician</span>
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </GlassPanel>
  );
}
