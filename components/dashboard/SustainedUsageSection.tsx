import { content } from "@/lib/content";
import type { DashboardData } from "@/lib/dashboard-types";
import { MessageBreakdown } from "./MessageBreakdown";
import { MetricCard, formatCount, formatPercentage } from "./MetricCard";
import { SustainedUsageTrendChart } from "./SustainedUsageTrendChart";
import styles from "./dashboard.module.css";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "short", day: "numeric" })
    .format(new Date(`${value}T12:00:00+08:00`));
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function SustainedUsageSection({ usage }: { usage: DashboardData["sustainedUsage"] }) {
  const copy = content.dashboard;
  const observationDays = 28;
  const metricValue = (value: number) => usage.available ? formatCount(value) : "—";
  const averageDailyMessages = usage.continuous28DayUsers > 0
    ? usage.messages.total / usage.continuous28DayUsers / observationDays
    : null;
  const detail = usage.available
    ? `${formatDate(shiftDate(usage.asOfDate, -27))} — ${formatDate(usage.asOfDate)}`
    : copy.sustainedUsageUnavailable;

  return (
    <section className={styles.section} aria-labelledby="sustained-usage-title">
      <div className={styles.sectionHeading}>
        <div>
          <p className={styles.sectionIndex}>01</p>
          <h2 id="sustained-usage-title">{copy.sustainedUsageTitle}</h2>
        </div>
        <p>{copy.sustainedUsageDescription}</p>
      </div>
      <div className={styles.sustainedUsageGrid}>
        <MetricCard
          label={copy.continuous28DayUsers}
          value={metricValue(usage.continuous28DayUsers)}
          detail={detail}
          tone="blue"
        />
        <MetricCard
          label={copy.continuousUserRate}
          value={usage.available ? formatPercentage(usage.continuousUserRate.percentage) : "—"}
          detail={usage.available
            ? `${formatCount(usage.continuousUserRate.numerator)} / ${formatCount(usage.continuousUserRate.denominator)} 人`
            : copy.sustainedUsageUnavailable}
          tone="mint"
        />
        <MetricCard
          label={copy.newContinuousUsers}
          value={metricValue(usage.newContinuousUsers)}
          detail={usage.available ? copy.continuousMovementDetail : copy.sustainedUsageUnavailable}
          tone="gold"
        />
        <MetricCard
          label={copy.exitedContinuousUsers}
          value={metricValue(usage.exitedContinuousUsers)}
          detail={usage.available ? copy.continuousMovementDetail : copy.sustainedUsageUnavailable}
          tone="ink"
        />
      </div>
      <div className={styles.sustainedDepthGrid}>
        <MetricCard
          label={copy.continuousUserMessages}
          value={metricValue(usage.messages.total)}
          detail={usage.available ? copy.continuousUserMessagesDetail : copy.sustainedUsageUnavailable}
          tone="ink"
        >
          {usage.available ? <MessageBreakdown messages={usage.messages} /> : null}
        </MetricCard>
        <MetricCard
          label={copy.averageMessagesPerContinuousUser}
          value={usage.available && averageDailyMessages !== null
            ? `${averageDailyMessages.toFixed(1)} ${copy.dailyMessageUnit}`
            : "—"}
          detail={usage.available
            ? `${formatCount(usage.messages.total)} 条 / ${formatCount(usage.continuous28DayUsers)} 人 / ${observationDays} 天`
            : copy.sustainedUsageUnavailable}
          tone="gold"
        />
      </div>
      <div className={styles.trendPanel}>
        <div className={styles.subsectionHeading}>
          <h3>{copy.sustainedTrendTitle}</h3>
          <p>{copy.sustainedTrendDescription}</p>
        </div>
        <SustainedUsageTrendChart points={usage.available ? usage.dailyTrend : []} />
      </div>
    </section>
  );
}
