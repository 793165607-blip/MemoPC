import { content } from "@/lib/content";
import styles from "./dashboard.module.css";

export function DashboardState({ type, detail }: { type: "configuration" | "error"; detail?: string }) {
  const copy = content.dashboard;
  const title = type === "configuration" ? copy.configurationTitle : copy.retryTitle;
  const body = type === "configuration" ? copy.configurationBody : copy.retryBody;

  return (
    <main className={`${styles.dashboard} ${styles.statePage}`}>
      <section className={styles.stateCard} role="status">
        <span className={styles.stateMark} aria-hidden="true" />
        <p className={styles.eyebrow}>{copy.eyebrow}</p>
        <h1>{title}</h1>
        <p>{body}</p>
        {detail ? <code>{detail}</code> : null}
      </section>
    </main>
  );
}
