import { content } from "@/lib/content";
import styles from "./dashboard.module.css";

type MetricCardProps = {
  label: string;
  value: string;
  detail?: string;
  eyebrow?: string;
  tone?: "blue" | "mint" | "gold" | "ink";
  children?: React.ReactNode;
};

export function MetricCard({
  label,
  value,
  detail,
  eyebrow,
  tone = "blue",
  children
}: MetricCardProps) {
  const definition = (content.dashboard.metricDefinitions as Record<string, string>)[label];

  return (
    <article className={`${styles.metricCard} ${styles[`metricCard_${tone}`]}`}>
      <div className={styles.metricTopline}>
        <div className={styles.metricTitle}>
          <h3>{label}</h3>
          {definition ? (
            <span className={styles.metricInfo}>
              <button
                type="button"
                className={styles.metricInfoButton}
                aria-label={`${label}口径：${definition}`}
              >
                <svg viewBox="0 0 16 16" aria-hidden="true">
                  <circle cx="8" cy="8" r="6.25" />
                  <path d="M8 7.1v4M8 4.8h.01" />
                </svg>
              </button>
              <span className={styles.metricTooltip} role="tooltip">{definition}</span>
            </span>
          ) : null}
        </div>
        {eyebrow ? <span>{eyebrow}</span> : null}
      </div>
      <p className={styles.metricValue}>{value}</p>
      {detail ? <p className={styles.metricDetail}>{detail}</p> : null}
      {children}
    </article>
  );
}

export function formatCount(value: number) {
  return new Intl.NumberFormat("zh-CN").format(value);
}

export function formatPercentage(value: number) {
  return `${new Intl.NumberFormat("zh-CN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1
  }).format(value)}%`;
}
