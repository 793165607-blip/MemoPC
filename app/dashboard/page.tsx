import type { Metadata } from "next";
import { DashboardState } from "@/components/dashboard/DashboardState";
import { DashboardView } from "@/components/dashboard/DashboardView";
import { content } from "@/lib/content";
import { loadDashboardData } from "@/lib/dashboard-data";
import type { DashboardQuery } from "@/lib/dashboard-types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: content.dashboard.metadataTitle,
  robots: { index: false, follow: false }
};

export default async function DashboardPage(props: { searchParams?: Promise<DashboardQuery> }) {
  const searchParams = await props.searchParams;
  const query = {
    from: searchParams?.from,
    to: searchParams?.to,
    activityDate: searchParams?.activityDate,
    weekStart: searchParams?.weekStart,
    trendFrom: searchParams?.trendFrom,
    trendTo: searchParams?.trendTo,
    retentionDate: searchParams?.retentionDate
  };
  const result = await loadDashboardData(query);

  if (result.status === "configuration") {
    return <DashboardState type="configuration" detail={result.message} />;
  }
  if (result.status === "error") {
    return <DashboardState type="error" detail={result.message} />;
  }
  return <DashboardView data={result.data} query={query} source={result.source} />;
}
