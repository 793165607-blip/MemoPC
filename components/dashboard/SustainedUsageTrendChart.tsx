import { content } from "@/lib/content";
import type { DashboardData } from "@/lib/dashboard-types";
import { SustainedUsageTrendPlot } from "@/components/primitives/SustainedUsageTrendPlot";
import { formatPercentage } from "./MetricCard";
import styles from "./dashboard.module.css";

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" })
    .format(new Date(`${value}T12:00:00+08:00`));
}

export function SustainedUsageTrendChart({ points }: { points: DashboardData["sustainedUsage"]["dailyTrend"] }) {
  const copy = content.dashboard;
  if (!points.length) return <div className={styles.emptyChart}>{copy.noData}</div>;
  const recent = points.slice(-14).reverse();

  return (
    <div className={styles.trendBody}>
      <div className={styles.legend} aria-hidden="true">
        <span><i className={styles.legendSustainedUsers} />{copy.continuous28DayUsers}</span>
        <span><i className={styles.legendAddedUsers} />{copy.newContinuousUsers}</span>
        <span><i className={styles.legendExitedUsers} />{copy.exitedContinuousUsers}</span>
      </div>
      <SustainedUsageTrendPlot
        points={points}
        labels={{
          users: copy.continuous28DayUsers,
          rate: copy.continuousUserRate,
          added: copy.newContinuousUsers,
          exited: copy.exitedContinuousUsers,
          hoverHint: copy.hoverHint
        }}
      />
      <div className={styles.chartDates} aria-hidden="true">
        <span>{formatShortDate(points[0].date)}</span>
        <span>{formatShortDate(points[points.length - 1].date)}</span>
      </div>
      <details className={styles.dailyDetails}>
        <summary>{copy.viewDailyDetail}</summary>
        <div className={styles.tableScroll}>
          <table>
            <thead>
              <tr>
                <th scope="col">{copy.date}</th>
                <th scope="col">{copy.continuous28DayUsers}</th>
                <th scope="col">{copy.continuousUserRate}</th>
                <th scope="col">{copy.newContinuousUsers}</th>
                <th scope="col">{copy.exitedContinuousUsers}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{point.date}</th>
                  <td>{point.continuousUsers}</td>
                  <td>{formatPercentage(point.percentage)}</td>
                  <td>+{point.newContinuousUsers}</td>
                  <td>-{point.exitedContinuousUsers}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
