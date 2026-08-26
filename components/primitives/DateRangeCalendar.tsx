import type { CalendarMonth } from "./date-range-utils";
import { calendarDays, formatCalendarDate, monthLabel } from "./date-range-utils";
import styles from "./DateRangePicker.module.css";

export function DateRangeCalendar({
  month,
  from,
  to,
  min,
  max,
  today,
  weekdays,
  secondary = false,
  onSelect
}: {
  month: CalendarMonth;
  from?: string;
  to?: string;
  min: string;
  max: string;
  today: string;
  weekdays: readonly string[];
  secondary?: boolean;
  onSelect: (date: string) => void;
}) {
  return (
    <section className={`${styles.month} ${secondary ? styles.secondaryMonth : ""}`}>
      <h3>{monthLabel(month)}</h3>
      <div className={styles.weekdays} aria-hidden="true">
        {weekdays.map((weekday) => <span key={weekday}>{weekday}</span>)}
      </div>
      <div className={styles.days} role="grid" aria-label={monthLabel(month)}>
        {calendarDays(month).map((date, index) => {
          if (!date) return <span className={styles.dayPlaceholder} key={`blank-${index}`} />;
          const disabled = date.iso < min || date.iso > max;
          const isStart = date.iso === from;
          const isEnd = date.iso === to;
          const inRange = Boolean(from && to && date.iso >= from && date.iso <= to);
          const selected = isStart || isEnd;
          return (
            <button
              key={date.iso}
              type="button"
              className={[
                styles.day,
                inRange ? styles.dayInRange : "",
                isStart ? styles.dayStart : "",
                isEnd ? styles.dayEnd : "",
                date.iso === today ? styles.dayToday : ""
              ].filter(Boolean).join(" ")}
              disabled={disabled}
              aria-label={formatCalendarDate(date.iso)}
              aria-pressed={selected}
              aria-current={date.iso === today ? "date" : undefined}
              data-calendar-day
              onClick={() => onSelect(date.iso)}
            >
              <time dateTime={date.iso}>{date.day}</time>
            </button>
          );
        })}
      </div>
    </section>
  );
}
