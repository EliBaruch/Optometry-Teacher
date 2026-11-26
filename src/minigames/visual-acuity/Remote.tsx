/**
 * The projector remote: a glowing line readout, the brass line-selector knob,
 * "Ask to read" / "Chart it" keys and the chart / optotype selectors.
 * Pinhole variant adds the pinhole flip and the improves / NI verdict.
 */
import { Icon, Kbd } from '@ui-kit';
import { levelLabel, type ChartKind, type ChartLine, type Optotype } from './charts';
import { Dial } from './Dial';
import { useLoc, useT } from './strings';
import { levelName, LADDER_MIN } from './session';
import type { PinholeCall } from './report';
import type { Slot } from './scoring';

export type Verdict = PinholeCall;

export interface RemoteProps {
  lines: readonly ChartLine[];
  level: number;
  chart: ChartKind;
  slot: Slot;
  disabled: boolean;
  /** Small reference shown in the readout, e.g. "Unaided 20/200" */
  reference?: string;
  onLevel(level: number): void;
  onAsk(): void;
  onRecord(): void;
  recordDisabled: boolean;
  /** pinhole module only */
  pinhole?: {
    on: boolean;
    verdict: Verdict | null;
    onToggle(): void;
    onVerdict(v: Verdict): void;
  };
}


function Seg<T extends string>(props: { label: string; value: T; items: { id: T; label: string; title?: string }[]; onChange(v: T): void; disabled?: boolean }) {
  return (
    <div class="va-seg" role="radiogroup" aria-label={props.label}>
      {props.items.map((it) => (
        <button
          key={it.id}
          type="button"
          role="radio"
          aria-checked={props.value === it.id}
          title={it.title}
          class={props.value === it.id ? 'is-on' : ''}
          disabled={props.disabled}
          onClick={() => props.value !== it.id && props.onChange(it.id)}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Remote(p: RemoteProps) {
  const t = useT();
  const loc = useLoc();
  const VERDICTS: { id: Verdict; label: string; sub: string }[] = [
    { id: 'improves', label: t.verdicts.improves, sub: t.verdicts.improvesSub },
    { id: 'no-improvement', label: t.verdicts.ni, sub: t.verdicts.niSub },
    { id: 'not-needed', label: t.verdicts.notNeeded, sub: t.verdicts.notNeededSub },
  ];
  const lab = levelLabel(p.lines, p.level);
  const offChart = p.level < 0;
  const line = offChart ? null : p.lines[p.level]!;
  const max = p.lines.length - 1;
  return (
    <div class="va-remote">
      <div class="va-remote__top">
        <div class="va-lcd" aria-live="polite">
          <div class="va-lcd__eyebrow">
            <bdi>{offChart ? t.offChart : p.chart === 'snellen' ? t.snellenLcd : t.etdrsLcd}</bdi>
            {p.reference && <bdi class="va-lcd__ref">{p.reference}</bdi>}
          </div>
          <div class="va-lcd__main"><bdi dir="ltr">{lab.feet}</bdi></div>
          <div class="va-lcd__sub">
            {offChart ? <bdi>{levelName(p.lines, p.level, loc)}</bdi> : <bdi dir="ltr">{lab.metric} <i>·</i> {t.logmarWord} {lab.logmar} <i>·</i> {line!.count}×</bdi>}
          </div>
          <div class="va-lcd__steps">
            <button type="button" class="va-step" aria-label={t.biggerLine} disabled={p.disabled || p.level <= LADDER_MIN} onClick={() => p.onLevel(p.level - 1)}>
              <Icon name="chevron-left" size={15} style={{ transform: 'rotate(90deg)' }} />
            </button>
            <button type="button" class="va-step" aria-label={t.smallerLine} disabled={p.disabled || p.level >= max} onClick={() => p.onLevel(p.level + 1)}>
              <Icon name="chevron-right" size={15} style={{ transform: 'rotate(90deg)' }} />
            </button>
          </div>
        </div>
        <div class="va-remote__dial">
          <Dial value={p.level} min={LADDER_MIN} max={max} label={t.chartLine} valueText={levelName(p.lines, p.level, loc)} onChange={p.onLevel} />
        </div>
      </div>

      {p.pinhole && (
        <div class="va-remote__ph">
          <button type="button" class={`va-flip${p.pinhole.on ? ' is-on' : ''}`} aria-pressed={p.pinhole.on} onClick={p.pinhole.onToggle} disabled={p.disabled} data-testid="va-pinhole">
            <span class="va-flip__disc" aria-hidden="true"><i /><i /><i /><i /><i /><i /><i /></span>
            <span class="va-flip__text">
              <b>{p.pinhole.on ? t.pinholeIn : t.pinholeOut}</b>
              <small>{t.flipOccluder} · <Kbd>P</Kbd></small>
            </span>
          </button>
          <div class="va-verdict" role="radiogroup" aria-label={t.verdictAria(p.slot)}>
            {VERDICTS.map((v) => (
              <button
                key={v.id}
                type="button"
                role="radio"
                aria-checked={p.pinhole!.verdict === v.id}
                class={p.pinhole!.verdict === v.id ? 'is-on' : ''}
                onClick={() => p.pinhole!.onVerdict(v.id)}
                disabled={p.disabled}
                data-testid={`va-verdict-${v.id}`}
              >
                <b>{v.label}</b>
                <small>{v.sub}</small>
              </button>
            ))}
          </div>
        </div>
      )}

      <div class="va-remote__keys">
        <button type="button" class="va-key va-key--ask" onClick={p.onAsk} disabled={p.disabled} data-testid="va-ask">
          <Icon name="eye" size={18} />
          <span>{offChart ? t.testOff : t.ask}</span>
        </button>
        <button type="button" class="va-key va-key--rec" onClick={p.onRecord} disabled={p.disabled || p.recordDisabled} data-testid="va-chart">
          <Icon name="check" size={18} />
          <span>{p.pinhole?.verdict === 'not-needed' ? t.chartPh(p.slot) : <>{t.chartVerb} <b dir="ltr">{lab.feet}</b></>}</span>
        </button>
      </div>

    </div>
  );
}

/** Projector-body controls: chart type, optotype, and the keyboard legend. */
export function ProjectorControls(p: { chart: ChartKind; optotype: Optotype; disabled: boolean; pinhole: boolean; onChart(k: ChartKind): void; onOptotype(o: Optotype): void }) {
  const t = useT();
  const OPTOTYPES: { id: Optotype; label: string; title: string }[] = [
    { id: 'letters', label: 'ABC', title: t.optSloan },
    { id: 'tumbling-e', label: 'E', title: t.optE },
    { id: 'lea', label: 'LEA', title: t.optLea },
  ];
  return (
    <div class="va-pctl">
      <Seg label={t.ctlChart} value={p.chart} disabled={p.disabled} items={[{ id: 'snellen', label: 'Snellen' }, { id: 'etdrs', label: 'ETDRS' }]} onChange={p.onChart} />
      <Seg label={t.ctlOptotype} value={p.optotype} disabled={p.disabled} items={OPTOTYPES} onChange={p.onOptotype} />
      <div class="va-pctl__hint" aria-hidden="true">
        <Kbd>↑</Kbd><Kbd>↓</Kbd> {t.keyLine} · <Kbd>{t.keySpace}</Kbd> {t.keyRead} · <Kbd>Enter</Kbd> {t.keyChart} · {p.pinhole ? <><Kbd>P</Kbd> {t.keyPinhole}</> : <><Kbd>C</Kbd> {t.keyOccluder}</>}
      </div>
    </div>
  );
}
