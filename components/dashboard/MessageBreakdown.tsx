import { content } from "@/lib/content";
import type { MessageTotals } from "@/lib/dashboard-types";
import { formatCount } from "./MetricCard";
import styles from "./dashboard.module.css";

export function MessageBreakdown({ messages }: { messages: MessageTotals }) {
  const copy = content.dashboard;
  const max = Math.max(messages.text, messages.image, messages.voice, messages.video, 1);

  return (
    <div className={styles.messageBreakdown}>
      {([
        [copy.messageTypes.text, messages.text],
        [copy.messageTypes.image, messages.image],
        [copy.messageTypes.voice, messages.voice],
        [copy.messageTypes.video, messages.video]
      ] as const).map(([label, value]) => (
        <div key={label}>
          <span>{label}</span>
          <progress value={value} max={max} aria-label={`${label} ${formatCount(value)}`} />
          <strong>{formatCount(value)}</strong>
        </div>
      ))}
    </div>
  );
}
