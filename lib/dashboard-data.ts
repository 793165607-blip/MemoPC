import { createDashboardMock } from "./dashboard-mock";
import { createDashboardFromSnapshot, loadDashboardSnapshot, type DashboardSnapshot } from "./dashboard-snapshot";
import type { DashboardLoadResult, DashboardQuery } from "./dashboard-types";

type ApiResponse<T> = {
  resCode: number;
  resMsg: string;
  resBody: T | null;
};

const DATA_ERROR_CODE = "DASHBOARD_DATA_UNAVAILABLE";
const FETCH_TIMEOUT_MS = 10_000;

export async function loadDashboardData(query: DashboardQuery): Promise<DashboardLoadResult> {
  const usesLocalData = process.env.DASHBOARD_USE_SNAPSHOT === "true"
    || process.env.DASHBOARD_USE_MOCK === "true";
  if (process.env.NODE_ENV === "production" && usesLocalData) {
    return { status: "configuration", message: DATA_ERROR_CODE };
  }

  if (process.env.DASHBOARD_USE_SNAPSHOT === "true") {
    try {
      return { status: "ready", data: await loadDashboardSnapshot(query), source: "snapshot" };
    } catch {
      return {
        status: "error",
        message: DATA_ERROR_CODE
      };
    }
  }

  if (process.env.DASHBOARD_USE_MOCK === "true") {
    return { status: "ready", data: createDashboardMock(query), source: "mock" };
  }

  const baseUrl = process.env.MEMO_API_BASE_URL?.replace(/\/$/, "");
  const dashboardKey = process.env.MEMO_DASHBOARD_KEY;
  if (!baseUrl || !dashboardKey) return { status: "configuration" };

  const url = new URL(`${baseUrl}/ops/dashboard/overview`);

  const headers: Record<string, string> = { "X-Dashboard-Key": dashboardKey };
  if (process.env.MEMO_DASHBOARD_TOKEN) {
    headers.Authorization = `Bearer ${process.env.MEMO_DASHBOARD_TOKEN}`;
  }

  try {
    const response = await fetch(url, {
      headers,
      cache: "no-store",
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
    });
    const payload = (await response.json()) as ApiResponse<unknown>;
    if (!response.ok || payload.resCode !== 200 || !payload.resBody) {
      return { status: "error", message: DATA_ERROR_CODE };
    }
    const snapshot = payload.resBody as DashboardSnapshot;
    return { status: "ready", data: createDashboardFromSnapshot(snapshot, query), source: "live" };
  } catch {
    return { status: "error", message: DATA_ERROR_CODE };
  }
}

export function shanghaiToday(now = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(now);
}

export function shiftIsoDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}
