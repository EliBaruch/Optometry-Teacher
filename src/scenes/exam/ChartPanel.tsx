import { TEST_CATALOG, type MiniGameResult, type RevealedFinding, type TestId } from '@core';
import { Badge, GlassPanel, Icon, isIconName, useLocale, useStrings, type IconName } from '@ui-kit';
import { S } from './strings';
import { chartKey, chartSummary, groupChart, testName } from './logic';

const FLAG_ICON: Record<RevealedFinding['flag'], IconName> = { normal: 'check', abnormal: 'warning', critical: 'alert' };

export function ChartPanel(props: {
  chart: readonly RevealedFinding[];
  testsDone: Partial<Record<TestId, MiniGameResult>>;
  fresh: ReadonlySet<string>;
  pulse: number;
}) {
  const { chart, testsDone, fresh, pulse } = props;
  const t = useStrings(S);
  const locale = useLocale();
  const flagWord = { normal: t.flagNormal, abnormal: t.flagAbnormal, critical: t.flagCritical };
  const groups = groupChart(chart, testsDone);
  const sum = chartSummary(chart);
  return (
    <GlassPanel
      class="exm-chart"
      title={t.chartTitle}
      eyebrow={t.chartEyebrow}
      icon="chart"
      padding="md"
      actions={
        <span class="exm-chart__sum">
          {sum.critical > 0 && <Badge tone="critical" size="sm" icon="alert">{sum.critical}</Badge>}
          {sum.abnormal > 0 && <Badge tone="abnormal" size="sm" icon="warning">{sum.abnormal}</Badge>}
        </span>
      }
    >
      <span key={pulse} class={`exm-chart__anchor${pulse ? ' is-pulsing' : ''}`} data-fly-target="chart" aria-hidden="true" />
      {groups.length === 0 ? (
        <div class="exm-chart__empty">
          <Icon name="eye" size={34} />
          <p>{t.chartBlank}</p>
          <p class="lm-muted">{t.chartBlankHint}</p>
        </div>
      ) : (
        <div class="exm-chart__groups" aria-live="polite">
          {groups.map((g) => (
            <section key={g.testId} class="exm-cg" aria-label={testName(g.testId, undefined, locale)}>
              <h3 class="exm-cg__title">
                {isIconName(g.testId) && <Icon name={g.testId} size={15} />}
                <span>{TEST_CATALOG[g.testId] ? testName(g.testId, undefined, locale) : g.testId}</span>
                {g.result.autoRun && <span class="exm-cg__tag">{t.technicianTag}</span>}
              </h3>
              <ul class="exm-rows">
                {g.rows.map((r) => (
                  <li key={chartKey(r)} class={`exm-row exm-row--${r.flag}${fresh.has(chartKey(r)) ? ' is-fresh' : ''}`}>
                    <span class="exm-row__flag" role="img" aria-label={flagWord[r.flag]}>
                      <Icon name={FLAG_ICON[r.flag]} size={14} strokeWidth={2.2} />
                    </span>
                    <span class="exm-row__label" dir="auto">{r.label}</span>
                    <span class="exm-row__value lm-num" dir="auto">{r.value}</span>
                    {r.eye && <span class={`exm-eye exm-eye--${r.eye}`} dir="ltr">{r.eye}</span>}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </GlassPanel>
  );
}
