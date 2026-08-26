import Link from "next/link";
import { content } from "@/lib/content";
import { shiftIsoDate } from "@/lib/dashboard-data";
import { dashboardHref } from "@/lib/dashboard-query";
import type { DashboardData, DashboardQuery } from "@/lib/dashboard-types";
import { DateRangePicker } from "@/components/primitives/DateRangePicker";
import styles from "./dashboard.module.css";

function presetHref(query: DashboardQuery, from?: string, to?: string) {
  return dashboardHref({ ...query, from, to });
}

export function DashboardFilter({
  query,
  range
}: {
  query: DashboardQuery;
  range: DashboardData["range"];
}) {
  const copy = content.dashboard;
  const throughDate = range.dataThroughDate;
  const clampStart = (value: string) => value < range.dataStartDate ? range.dataStartDate : value;
  const monthStart = clampStart(`${throughDate.slice(0, 7)}-01`);
  const presets = [
    { label: copy.allHistory, from: undefined, to: undefined },
    { label: copy.last7Days, from: clampStart(shiftIsoDate(throughDate, -6)), to: throughDate },
    { label: copy.last30Days, from: clampStart(shiftIsoDate(throughDate, -29)), to: throughDate },
    { label: copy.thisMonth, from: monthStart, to: throughDate }
  ];

  return (
    <section className={styles.filterBar} aria-label={copy.customRange}>
      <nav className={styles.presetNav} aria-label={copy.rangeLabel}>
        {presets.map((preset) => {
          const active = preset.from === undefined
            ? range.allHistory
            : !range.allHistory && range.from === preset.from && range.to === preset.to;
          return (
            <Link
              key={preset.label}
              className={`${styles.presetLink} ${active ? styles.presetLinkActive : ""}`}
              href={presetHref(query, preset.from, preset.to)}
              scroll={false}
              aria-current={active ? "page" : undefined}
            >
              {preset.label}
            </Link>
          );
        })}
      </nav>

      <DateRangePicker
        from={range.from}
        to={range.to}
        minDate={range.dataStartDate}
        maxDate={throughDate}
        query={query}
        label={copy.overviewRange}
        preserveScroll
      />
    </section>
  );
}
