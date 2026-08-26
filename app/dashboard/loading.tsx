import { content } from "@/lib/content";
import styles from "@/components/dashboard/dashboard.module.css";

export default function DashboardLoading() {
  return (
    <main className={`${styles.dashboard} ${styles.statePage}`} aria-busy="true">
      <section className={styles.loadingCard}>
        <span className={styles.loadingMark} aria-hidden="true" />
        <p>{content.dashboard.loading}</p>
        <div><i /><i /><i /></div>
      </section>
    </main>
  );
}
