import { DateScopePicker } from "@/components/primitives/DateScopePicker";
import type { DashboardData, DashboardQuery } from "@/lib/dashboard-types";
import { DailyRetentionTrend } from "./DailyRetentionTrend";
import styles from "./dashboard.module.css";

function formatDate(value: string, includeYear = false) {
  return new Intl.DateTimeFormat("zh-CN", {
    ...(includeYear ? { year: "numeric" as const } : {}),
    month: "numeric",
    day: "numeric"
  }).format(new Date(`${value}T12:00:00+08:00`));
}

export function DailyRetentionPanel({
  retention,
  query
}: {
  retention: DashboardData["dailyRetention"];
  query: DashboardQuery;
}) {
  const milestoneDays = new Set([1, 7, 14, 30]);
  const lastObservedDay = retention.points.at(-1)?.day ?? 0;
  const nextObservedDay = lastObservedDay + 1;
  const observedDayLabel = lastObservedDay === 1 ? "D1" : `D1–D${lastObservedDay}`;
  const observationRange = retention.points.length
    ? `${formatDate(retention.points[0].date)} — ${formatDate(retention.points.at(-1)?.date ?? retention.cohortDate)}`
    : "—";
  const observationNote = lastObservedDay < 30
    ? `已观察 ${lastObservedDay}/30 天；后续 D${nextObservedDay}–D30 尚未发生，不显示为 0`
    : "已完整观察 30 天；各天独立计算，不做累计";

  return (
    <article className={styles.dailyRetentionPanel} aria-labelledby="daily-retention-panel-title">
      <header className={styles.dailyRetentionHeader}>
        <div className={styles.dailyRetentionCopy}>
          <span>单日新用户 cohort</span>
          <h4 id="daily-retention-panel-title">D1–D30 每日留存</h4>
          <p>选择一个注册日；分母为当天注册且完成首次有效记录的用户。D1–D30 分别观察同一批用户在之后每个北京时间自然日是否再次记录。</p>
        </div>
        <DateScopePicker
          mode="day"
          value={retention.cohortDate}
          param="retentionDate"
          minDate={retention.minDate}
          maxDate={retention.maxDate}
          query={query}
          label="D0 cohort 日期"
          selectLabel="选择 D0 cohort 日期"
          hint="最晚可选昨天；只展示已经发生的 D1–Dn，尚未走到的天数不显示。"
          clearLabel="回到最近有数据 cohort"
        />
      </header>

      <div className={styles.dailyRetentionSummary}>
        <div>
          <span>D0 日期</span>
          <strong>{formatDate(retention.cohortDate, true)}</strong>
        </div>
        <div>
          <span>D0 激活用户</span>
          <strong>{retention.cohortSize.toLocaleString("zh-CN")} 人</strong>
        </div>
        <div>
          <span>观察进度</span>
          <strong>{lastObservedDay ? `${observedDayLabel} · ${observationRange}` : "尚未到 D1"}</strong>
        </div>
      </div>

      {retention.cohortSize > 0 && retention.points.length > 0 ? (
        <>
          <div className={styles.dailyRetentionTrendBlock}>
            <div>
              <strong>这批用户在 {observedDayLabel} 回来了多少</strong>
              <span>{observationNote}；最新一天统计截至快照时点</span>
            </div>
            <DailyRetentionTrend points={retention.points} />
          </div>

          <div className={styles.dailyRetentionDetailHeader}>
            <strong>{observedDayLabel} 逐日明细</strong>
            <span>每格均为当天回来记录人数 ÷ D0 激活用户数</span>
          </div>
          <ol className={styles.dailyRetentionGrid} aria-label={`D1 至 D${lastObservedDay} 留存明细`}>
            {retention.points.map((point) => (
              <li key={point.day} className={milestoneDays.has(point.day) ? styles.dailyRetentionMilestone : undefined}>
                <div>
                  <strong>D{point.day}</strong>
                  <span>{formatDate(point.date)}</span>
                </div>
                <b>{point.percentage.toFixed(1)}%</b>
                <small>{point.numerator}/{point.denominator} 人</small>
              </li>
            ))}
          </ol>
        </>
      ) : (
        <div className={styles.dailyRetentionEmpty} role="status">
          <strong>{retention.cohortSize > 0 ? "这批用户还没有走到 D1" : "这一天没有可观察的新用户 cohort"}</strong>
          <span>{retention.cohortSize > 0 ? "后续留存会从 D1 开始逐日出现。" : "当天没有注册且完成首次有效记录的用户，可以换一个日期查看。"}</span>
        </div>
      )}
    </article>
  );
}
