import type { DashboardQuery } from "./dashboard-types";

const QUERY_KEYS = [
  "from",
  "to",
  "activityDate",
  "weekStart",
  "trendFrom",
  "trendTo",
  "retentionDate"
] as const satisfies readonly (keyof DashboardQuery)[];

export function dashboardHref(query: DashboardQuery) {
  const params = new URLSearchParams();
  QUERY_KEYS.forEach((key) => {
    const value = query[key];
    if (value) params.set(key, value);
  });
  const suffix = params.toString();
  return suffix ? `/dashboard?${suffix}` : "/dashboard";
}
