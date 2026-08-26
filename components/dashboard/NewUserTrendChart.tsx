import { content } from "@/lib/content";
import type { DashboardData } from "@/lib/dashboard-types";
import { NewUserTrendPlot } from "@/components/primitives/NewUserTrendPlot";
import styles from "./dashboard.module.css";

function formatShortDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { month: "numeric", day: "numeric" })
    .format(new Date(`${value}T12:00:00+08:00`));
}

/* Chart contract: daily D0 cohort behavior; line panel compares count-scale events,
   message bars use a separate zero-based scale; exact values remain available by hover and table. */
export function NewUserTrendChart({ points }: { points: DashboardData["newUserBehavior"]["dailyTrend"] }) {
  const copy = content.dashboard;
  if (!points.length) return <div className={styles.emptyChart}>{copy.noData}</div>;

  const recent = points.slice(-14).reverse();

  return (
    <div className={styles.trendBody}>
      <div className={styles.legend} aria-hidden="true">
        <span><i className={styles.legendNewUsers} />{copy.newUsers}</span>
        <span><i className={styles.legendNewUserMessages} />{copy.newUserMessages}</span>
        <span><i className={styles.legendNewUserEchoes} />{copy.newUserDailyEchoes}</span>
        <span><i className={styles.legendNewUserHighlights} />{copy.newUserHighlightImages}</span>
      </div>
      <NewUserTrendPlot
        points={points}
        labels={{
          newUsers: copy.newUsers,
          messages: copy.newUserMessages,
          dailyEchoes: copy.newUserDailyEchoes,
          highlightImages: copy.newUserHighlightImages,
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
                <th scope="col">{copy.newUsers}</th>
                <th scope="col">{copy.newUserMessages}</th>
                <th scope="col">{copy.messageTypes.text}</th>
                <th scope="col">{copy.messageTypes.image}</th>
                <th scope="col">{copy.messageTypes.voice}</th>
                <th scope="col">{copy.messageTypes.video}</th>
                <th scope="col">{copy.newUserDailyEchoes}</th>
                <th scope="col">{copy.newUserHighlightImages}</th>
              </tr>
            </thead>
            <tbody>
              {recent.map((point) => (
                <tr key={point.date}>
                  <th scope="row">{point.date}</th>
                  <td>{point.newUsers}</td>
                  <td>{point.messages.total}</td>
                  <td>{point.messages.text}</td>
                  <td>{point.messages.image}</td>
                  <td>{point.messages.voice}</td>
                  <td>{point.messages.video}</td>
                  <td>{point.dailyEchoes}</td>
                  <td>{point.highlightMomentImages}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </div>
  );
}
