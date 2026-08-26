"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { content } from "@/lib/content";
import { dashboardHref } from "@/lib/dashboard-query";
import type { DashboardQuery, DashboardRangeParam } from "@/lib/dashboard-types";
import { DateRangeCalendar } from "./DateRangeCalendar";
import { addMonths, formatRange, monthFromIso, monthKey } from "./date-range-utils";
import styles from "./DateRangePicker.module.css";

export function DateRangePicker({
  from,
  to,
  minDate,
  maxDate,
  query = {},
  fromParam = "from",
  toParam = "to",
  label,
  selectLabel,
  hint,
  emptyLabel,
  clearLabel,
  preserveScroll = false
}: {
  from?: string;
  to?: string;
  minDate: string;
  maxDate: string;
  query?: DashboardQuery;
  fromParam?: DashboardRangeParam;
  toParam?: DashboardRangeParam;
  label?: string;
  selectLabel?: string;
  hint?: string;
  emptyLabel?: string;
  clearLabel?: string;
  preserveScroll?: boolean;
}) {
  const copy = content.dashboard;
  const router = useRouter();
  const titleId = useId();
  const panelId = `${titleId}-panel`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draftFrom, setDraftFrom] = useState(from);
  const [draftTo, setDraftTo] = useState(to);
  const [visibleMonth, setVisibleMonth] = useState(() => monthFromIso(to || from || maxDate));

  useEffect(() => {
    if (!open) return;
    const closeOnOutsideClick = (event: PointerEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    requestAnimationFrame(() => {
      const selected = panelRef.current?.querySelector<HTMLButtonElement>("[aria-pressed=true]");
      (selected || panelRef.current?.querySelector<HTMLButtonElement>("[data-calendar-day]:not(:disabled)"))?.focus();
    });
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const minMonth = monthFromIso(minDate);
  const maxMonth = monthFromIso(maxDate);
  const previousMonth = addMonths(visibleMonth, -1);

  function selectDate(date: string) {
    if (!draftFrom || draftTo || date < draftFrom) {
      setDraftFrom(date);
      setDraftTo(undefined);
      return;
    }
    setDraftTo(date);
  }

  function toggleOpen() {
    if (!open) {
      setDraftFrom(from);
      setDraftTo(to);
      setVisibleMonth(monthFromIso(to || from || maxDate));
    }
    setOpen((value) => !value);
  }

  function applyRange() {
    if (!draftFrom) return;
    const href = dashboardHref({
      ...query,
      [fromParam]: draftFrom,
      [toParam]: draftTo || draftFrom
    });
    if (preserveScroll) router.push(href, { scroll: false });
    else router.push(href);
    setOpen(false);
  }

  function clearRange() {
    setDraftFrom(undefined);
    setDraftTo(undefined);
    const href = dashboardHref({ ...query, [fromParam]: undefined, [toParam]: undefined });
    if (preserveScroll) router.push(href, { scroll: false });
    else router.push(href);
    setOpen(false);
  }

  return (
    <div className={styles.picker} ref={wrapperRef}>
      <button
        ref={triggerRef}
        type="button"
        className={styles.trigger}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={toggleOpen}
      >
        <span className={styles.calendarIcon} aria-hidden="true"><i /><i /></span>
        <span>
          <small>{label ?? copy.dateRange}</small>
          <strong>{from ? formatRange(from, to) : (emptyLabel ?? copy.selectDateRange)}</strong>
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div id={panelId} className={styles.popover} role="dialog" aria-labelledby={titleId} ref={panelRef}>
          <div className={styles.popoverHeader}>
            <div>
              <p id={titleId}>{selectLabel ?? copy.selectDateRange}</p>
              <span>{hint ?? copy.dateRangeHint}</span>
            </div>
            <div className={styles.monthNavigation}>
              <button
                type="button"
                aria-label={copy.previousMonth}
                disabled={monthKey(visibleMonth) <= monthKey(minMonth)}
                onClick={() => setVisibleMonth(addMonths(visibleMonth, -1))}
              >←</button>
              <button
                type="button"
                aria-label={copy.nextMonth}
                disabled={monthKey(visibleMonth) >= monthKey(maxMonth)}
                onClick={() => setVisibleMonth(addMonths(visibleMonth, 1))}
              >→</button>
            </div>
          </div>

          <div className={styles.months}>
            <DateRangeCalendar
              month={previousMonth}
              from={draftFrom}
              to={draftTo}
              min={minDate}
              max={maxDate}
              today={maxDate}
              weekdays={copy.calendarWeekdays}
              secondary
              onSelect={selectDate}
            />
            <DateRangeCalendar
              month={visibleMonth}
              from={draftFrom}
              to={draftTo}
              min={minDate}
              max={maxDate}
              today={maxDate}
              weekdays={copy.calendarWeekdays}
              onSelect={selectDate}
            />
          </div>

          <footer className={styles.popoverFooter}>
            <div>
              <span>{draftFrom && !draftTo ? copy.selectEndDate : copy.dateRange}</span>
              <strong>{draftFrom ? formatRange(draftFrom, draftTo) : copy.selectDateRange}</strong>
            </div>
            <div>
              <button type="button" className={styles.clearButton} onClick={clearRange}>{clearLabel ?? copy.clearRange}</button>
              <button type="button" className={styles.applyButton} disabled={!draftFrom} onClick={applyRange}>{copy.apply}</button>
            </div>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
