import { content } from "@/lib/content";
import type { DashboardData, DashboardDataSource, DashboardQuery, RateMetric } from "@/lib/dashboard-types";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import { DateScopePicker } from "@/components/primitives/DateScopePicker";
import { DashboardFilter } from "./DashboardFilter";
import { DailyRetentionPanel } from "./DailyRetentionPanel";
import { MessageBreakdown } from "./MessageBreakdown";
import { MetricCard, formatCount, formatPercentage } from "./MetricCard";
import { NewUserTrendChart } from "./NewUserTrendChart";
import { SustainedUsageSection } from "./SustainedUsageSection";
import { TrendChart } from "./TrendChart";
import styles from "./dashboard.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(`${value}T12:00:00+08:00`));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false
  }).format(new Date(value));
}

function rateDetail(metric: Pick<RateMetric, "numerator" | "denominator">) {
  return `${formatCount(metric.numerator)}/${formatCount(metric.denominator)} 人`;
}

function formatDateRange(from: string, to: string) {
  return `${formatDate(from)} — ${formatDate(to)}`;
}

export function DashboardView({
  data,
  query,
  source = "live"
}: {
  data: DashboardData;
  query: DashboardQuery;
  source?: DashboardDataSource;
}) {
  const copy = content.dashboard;
  const { totals, kpis, newUserBehavior } = data;
  const sourceLabel = source === "mock" ? copy.mockBadge : source === "snapshot" ? copy.snapshotBadge : null;
  const averageNewUserMessages = totals.newUsers
    ? newUserBehavior.messages.total / totals.newUsers
    : 0;
  const cohortValue = (value: number) => newUserBehavior.available ? formatCount(value) : "—";
  const registeredUsersDelta = totals.registeredUsers - totals.registeredUsersAtStart;
  const registeredUsersValue = data.range.allHistory
    ? formatCount(totals.registeredUsers)
    : `${formatCount(totals.registeredUsersAtStart)} → ${formatCount(totals.registeredUsers)}`;
  const registeredUsersDetail = data.range.allHistory
    ? `${copy.asOf} ${formatDate(data.range.to)}`
    : `${formatDate(data.range.from)}前 → ${formatDate(data.range.to)} · 区间净增 ${formatCount(registeredUsersDelta)}`;
  const weekRange = formatDateRange(kpis.weekStart, kpis.weekEnd);

  return (
    <main className={styles.dashboard}>
      <div className={styles.ambientTop} aria-hidden="true" />
      <div className={styles.ambientBottom} aria-hidden="true" />
      <div className={styles.shell}>
        <header className={styles.header}>
          <div>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <div className={styles.titleRow}>
              <span className={styles.logoMark} aria-hidden="true"><i /><i /><i /></span>
              <h1>{copy.title}</h1>
              {sourceLabel ? (
                <span className={source === "snapshot" ? styles.snapshotBadge : styles.mockBadge}>{sourceLabel}</span>
              ) : null}
            </div>
            <p className={styles.description}>{copy.description}</p>
          </div>
          <dl className={styles.queryMeta}>
            <div>
              <dt>{copy.overviewRange}</dt>
              <dd>{data.range.allHistory ? copy.allHistory : `${formatDate(data.range.from)} — ${formatDate(data.range.to)}`}</dd>
            </div>
            <div>
              <dt>{source === "snapshot" ? copy.snapshotAt : copy.queriedAt}</dt>
              <dd>{formatDateTime(data.queriedAt)} · {copy.timezone}</dd>
            </div>
          </dl>
        </header>

        <SustainedUsageSection usage={data.sustainedUsage} />

        <section className={styles.section} aria-labelledby="new-user-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>02</p>
              <h2 id="new-user-title">{copy.newUserTitle}</h2>
            </div>
            <p>{copy.newUserDescription}</p>
          </div>
          <DashboardFilter query={query} range={data.range} />
          <div className={styles.newUserGrid}>
            <MetricCard label={copy.newUsers} value={formatCount(totals.newUsers)} tone="mint" />
            <MetricCard label={copy.sameDayActivation} value={formatPercentage(kpis.sameDayActivation.percentage)} detail={`${rateDetail(kpis.sameDayActivation)} · 注册当日`} tone="blue" />
            <MetricCard label={copy.sevenDayActivation} value={formatPercentage(kpis.sevenDayActivation.percentage)} detail={`${rateDetail(kpis.sevenDayActivation)} · 已完成观察`} tone="mint" />
            <MetricCard
              label={copy.newUserMessages}
              value={cohortValue(newUserBehavior.messages.total)}
              detail={newUserBehavior.available
                ? `${copy.averageMessagesPerNewUser} ${averageNewUserMessages.toFixed(1)} 条 / 人`
                : copy.cohortDataUnavailable}
              tone="ink"
            >
              {newUserBehavior.available ? <MessageBreakdown messages={newUserBehavior.messages} /> : null}
            </MetricCard>
            <MetricCard label={copy.newUserDailyEchoes} value={cohortValue(newUserBehavior.dailyEchoes)} tone="gold" />
            <MetricCard label={copy.newUserHighlightImages} value={cohortValue(newUserBehavior.highlightMomentImages)} tone="mint" />
          </div>
          <div className={styles.trendPanel}>
            <div className={styles.subsectionHeading}>
              <h3>{copy.behaviorTrendTitle}</h3>
              <p>{copy.behaviorTrendDescription}</p>
            </div>
            <NewUserTrendChart points={newUserBehavior.available ? newUserBehavior.dailyTrend : []} />
          </div>
          <div className={styles.retentionSubsection} aria-labelledby="new-user-retention-title">
            <div className={styles.retentionSubsectionHeading}>
              <h3 id="new-user-retention-title">{copy.retentionTitle}</h3>
              <p>{copy.retentionDescription}</p>
            </div>
            <DailyRetentionPanel retention={data.dailyRetention} query={query} />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="cumulative-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>03</p>
              <h2 id="cumulative-title">{copy.cumulativeTitle}</h2>
            </div>
            <p>{copy.cumulativeDescription}</p>
          </div>
          <div className={styles.cumulativeGrid}>
            <MetricCard label={copy.registeredUsers} value={registeredUsersValue} detail={registeredUsersDetail} tone="blue" />
            <MetricCard label={copy.messages} value={formatCount(totals.messages.total)} tone="ink">
              <MessageBreakdown messages={totals.messages} />
            </MetricCard>
            <MetricCard label={copy.highlightImages} value={formatCount(totals.highlightMomentImages)} tone="gold" />
            <MetricCard label={copy.dailyEchoes} value={formatCount(totals.dailyEchoes)} tone="mint" />
          </div>
        </section>

        <section className={styles.section} aria-labelledby="health-title">
          <div className={styles.sectionHeading}>
            <div>
              <p className={styles.sectionIndex}>04</p>
              <h2 id="health-title">{copy.healthTitle}</h2>
            </div>
            <p>{copy.healthDescription}</p>
          </div>
          <div className={styles.metricGroupHeading}>
            <div className={styles.metricGroupCopy}>
              <h3>{copy.activityGroupTitle}</h3>
              <p>{copy.activityGroupDescription}</p>
            </div>
            <DateScopePicker
              mode="day"
              value={kpis.recordDauDate}
              param="activityDate"
              minDate={data.range.dataStartDate}
              maxDate={data.range.dataThroughDate}
              query={query}
              label={copy.observationDate}
              selectLabel={copy.selectObservationDate}
              hint={copy.observationDateHint}
              clearLabel={copy.latestObservationDate}
            />
          </div>
          <div className={styles.dayGrid}>
            <MetricCard label={copy.recordDau} value={formatCount(kpis.recordDau)} detail={`数据日：${formatDate(kpis.recordDauDate)}`} tone="ink" />
          </div>
          <div className={styles.metricGroupHeading}>
            <div className={styles.metricGroupCopy}>
              <h3>{copy.weeklyGroupTitle}</h3>
              <p>自然周从周一开始；本周尚未结束时，统计到快照截止日。</p>
            </div>
            <DateScopePicker
              mode="week"
              value={kpis.weekStart}
              param="weekStart"
              minDate={data.range.dataStartDate}
              maxDate={data.range.dataThroughDate}
              query={query}
              label={copy.statisticWeek}
              selectLabel={copy.selectStatisticWeek}
              hint={copy.statisticWeekHint}
              clearLabel={copy.latestStatisticWeek}
            />
          </div>
          <div className={styles.weekGrid}>
            <MetricCard label={copy.recordWau} value={formatCount(kpis.recordWau)} detail={`数据周：${weekRange}`} tone="blue" />
            <MetricCard label={copy.weeklyEffectiveUsers} value={formatCount(kpis.weeklyEffectiveUsers)} detail={`数据周：${weekRange}`} tone="mint" />
            <MetricCard
              label={copy.weeklyAverageRecordDays}
              value={`${kpis.weeklyAverageRecordDays.value.toFixed(2)} ${copy.dayUnit}`}
              detail={`${formatCount(kpis.weeklyAverageRecordDays.numerator)} 人天 / ${formatCount(kpis.weeklyAverageRecordDays.denominator)} 人 · ${weekRange}`}
              tone="ink"
            />
          </div>
          <div className={styles.trendPanel}>
            <div className={styles.trendControlBar}>
              <div className={styles.subsectionHeading}>
                <h3>{copy.trendTitle}</h3>
                <p>{copy.trendDescription}</p>
              </div>
              <DateRangePicker
                from={data.trendRange.allHistory ? undefined : data.trendRange.from}
                to={data.trendRange.allHistory ? undefined : data.trendRange.to}
                minDate={data.range.dataStartDate}
                maxDate={data.range.dataThroughDate}
                query={query}
                fromParam="trendFrom"
                toParam="trendTo"
                label={copy.trendRange}
                selectLabel={copy.selectTrendRange}
                hint={copy.trendRangeHint}
                emptyLabel={copy.allTrendHistory}
                clearLabel={copy.clearTrendRange}
                preserveScroll
              />
            </div>
            <TrendChart points={data.dailyTrend} />
          </div>
        </section>

      </div>
    </main>
  );
}
