import { content } from "@/lib/content";
import type { DashboardData } from "@/lib/dashboard-types";
import { InteractiveTrendPlot } from "@/components/primitives/InteractiveTrendPlot";
import styles from "./dashboard.module.css";

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" })
    .format(new Date(`${value}T12:00:00+08:00`));
}

export function TrendChart({ points }: { points: DashboardData["dailyTrend"] }) {
  const copy = content.dashboard;
  if (!points.length) return <div className={styles.emptyChart}>{copy.noData}</div>;

  const recent = points.slice(-14).reverse();

  return (
    <div className={styles.trendBody}>
      <div className={styles.legend} aria-hidden="true">
        <span><i className={styles.legendActive} />{copy.activeUsers}</span>
        <span><i className={styles.legendMessages} />{copy.messageVolume}</span>
      </div>
      <InteractiveTrendPlot
        points={points}
        labels={{
          active: copy.activeUsers,
          messages: copy.messageVolume,
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
                <th scope="col">{copy.activeUsers}</th>
                <th scope="col">{copy.messageVolume}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{point.date}</th>
                  <td>{point.activeUsers}</td>
                  <td>{point.messages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
