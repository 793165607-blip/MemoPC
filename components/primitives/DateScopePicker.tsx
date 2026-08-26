"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { content } from "@/lib/content";
import { dashboardHref } from "@/lib/dashboard-query";
import type { DashboardQuery } from "@/lib/dashboard-types";
import { DateRangeCalendar } from "./DateRangeCalendar";
import {
  addMonths,
  formatCalendarDate,
  formatRange,
  monthFromIso,
  monthKey,
  shiftCalendarDate,
  startOfIsoWeek
} from "./date-range-utils";
import styles from "./DateRangePicker.module.css";

type ScopeMode = "day" | "week";

export function DateScopePicker({
  mode,
  value,
  param,
  minDate,
  maxDate,
  query,
  label,
  selectLabel,
  hint,
  clearLabel
}: {
  mode: ScopeMode;
  value: string;
  param: "activityDate" | "weekStart" | "retentionDate";
  minDate: string;
  maxDate: string;
  query: DashboardQuery;
  label: string;
  selectLabel: string;
  hint: string;
  clearLabel: string;
}) {
  const copy = content.dashboard;
  const router = useRouter();
  const titleId = useId();
  const panelId = `${titleId}-panel`;
  const wrapperRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [draftValue, setDraftValue] = useState(value);
  const [visibleMonth, setVisibleMonth] = useState(() => monthFromIso(value));

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
      (panelRef.current?.querySelector<HTMLButtonElement>("[aria-pressed=true]")
        || panelRef.current?.querySelector<HTMLButtonElement>("[data-calendar-day]:not(:disabled)"))?.focus();
    });
    return () => {
      document.removeEventListener("pointerdown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [open]);

  const selectedFrom = mode === "week" ? startOfIsoWeek(draftValue) : draftValue;
  const selectedTo = mode === "week"
    ? [shiftCalendarDate(selectedFrom, 6), maxDate].sort()[0]
    : draftValue;
  const previousMonth = addMonths(visibleMonth, -1);
  const minMonth = monthFromIso(minDate);
  const maxMonth = monthFromIso(maxDate);

  function selectDate(date: string) {
    setDraftValue(mode === "week" ? startOfIsoWeek(date) : date);
  }

  function toggleOpen() {
    if (!open) {
      setDraftValue(value);
      setVisibleMonth(monthFromIso(value));
    }
    setOpen((current) => !current);
  }

  function applyValue() {
    router.push(dashboardHref({ ...query, [param]: draftValue }), { scroll: false });
    setOpen(false);
  }

  function clearValue() {
    router.push(dashboardHref({ ...query, [param]: undefined }), { scroll: false });
    setOpen(false);
  }

  const displayedValue = mode === "week"
    ? formatRange(startOfIsoWeek(value), [shiftCalendarDate(startOfIsoWeek(value), 6), maxDate].sort()[0])
    : formatCalendarDate(value);

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
          <small>{label}</small>
          <strong>{displayedValue}</strong>
        </span>
        <span className={styles.chevron} aria-hidden="true">⌄</span>
      </button>

      {open ? (
        <div id={panelId} className={styles.popover} role="dialog" aria-labelledby={titleId} ref={panelRef}>
          <div className={styles.popoverHeader}>
            <div>
              <p id={titleId}>{selectLabel}</p>
              <span>{hint}</span>
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
              from={selectedFrom}
              to={selectedTo}
              min={minDate}
              max={maxDate}
              today={maxDate}
              weekdays={copy.calendarWeekdays}
              secondary
              onSelect={selectDate}
            />
            <DateRangeCalendar
              month={visibleMonth}
              from={selectedFrom}
              to={selectedTo}
              min={minDate}
              max={maxDate}
              today={maxDate}
              weekdays={copy.calendarWeekdays}
              onSelect={selectDate}
            />
          </div>

          <footer className={styles.popoverFooter}>
            <div>
              <span>{label}</span>
              <strong>{mode === "week" ? formatRange(selectedFrom, selectedTo) : formatCalendarDate(draftValue)}</strong>
            </div>
            <div>
              <button type="button" className={styles.clearButton} onClick={clearValue}>{clearLabel}</button>
              <button type="button" className={styles.applyButton} onClick={applyValue}>{copy.apply}</button>
            </div>
          </footer>
        </div>
      ) : null}
    </div>
  );
}
