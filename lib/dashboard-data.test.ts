import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { loadDashboardData, shanghaiToday, shiftIsoDate } from "./dashboard-data";
import { createDashboardMock } from "./dashboard-mock";
import type { DashboardSnapshot } from "./dashboard-snapshot";

const dashboardEnvironment = [
  "DASHBOARD_USE_SNAPSHOT",
  "DASHBOARD_USE_MOCK",
  "MEMO_API_BASE_URL",
  "MEMO_DASHBOARD_KEY",
  "MEMO_DASHBOARD_TOKEN"
] as const;
const originalEnvironment = Object.fromEntries(
  dashboardEnvironment.map((key) => [key, process.env[key]])
) as Record<(typeof dashboardEnvironment)[number], string | undefined>;

function emptySnapshot(): DashboardSnapshot {
  return {
    schemaVersion: 4,
    generatedAt: "2026-08-20T13:00:00.000Z",
    timezone: "Asia/Shanghai",
    dataStartDate: "2026-08-20",
    throughDate: "2026-08-20",
    daily: [{
      date: "2026-08-20",
      registrations: 0,
      activeUsers: 0,
      messages: { total: 0, text: 0, image: 0, voice: 0, video: 0 },
      highlightImages: 0,
      dailyEchoes: 0,
      newUserBehavior: {
        messages: { total: 0, text: 0, image: 0, voice: 0, video: 0 },
        dailyEchoes: 0,
        highlightImages: 0
      },
      weekStart: "2026-08-17",
      recordWau: 0,
      weeklyEffectiveUsers: 0,
      weeklyUserDays: 0
    }],
    activationCohorts: [],
    dailyRetentionCohorts: [],
    sustainedUsage: {
      asOfDate: "2026-08-19",
      continuous28DayUsers: 0,
      eligibleUsers: 0,
      newContinuousUsers: 0,
      exitedContinuousUsers: 0,
      messages: { total: 0, text: 0, image: 0, voice: 0, video: 0 },
      dailyTrend: []
    }
  };
}

beforeEach(() => {
  dashboardEnvironment.forEach((key) => delete process.env[key]);
});

afterEach(() => {
  dashboardEnvironment.forEach((key) => {
    const original = originalEnvironment[key];
    if (original === undefined) delete process.env[key];
    else process.env[key] = original;
  });
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
});

describe("dashboard date helpers", () => {
  it("以上海自然日作为筛选边界", () => {
    expect(shanghaiToday(new Date("2026-08-23T16:30:00.000Z"))).toBe("2026-08-24");
  });

  it("跨月偏移日期时保持 ISO 日期格式", () => {
    expect(shiftIsoDate("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("本地示例数据会随所选日期范围同步过滤", () => {
    const data = createDashboardMock({ from: "2026-08-18", to: "2026-08-22" });
    expect(data.range).toMatchObject({ from: "2026-08-18", to: "2026-08-22", allHistory: false });
    expect(data.dailyTrend.length).toBeGreaterThan(5);
    expect(data.totals.newUsers).toBeGreaterThanOrEqual(0);
    expect(data.totals.registeredUsers - data.totals.registeredUsersAtStart).toBe(data.totals.newUsers);
  });

  it("本地示例数据分别响应观察日、统计周、趋势和留存 D0 日期", () => {
    const data = createDashboardMock({
      from: "2026-08-20",
      to: "2026-08-22",
      activityDate: "2026-08-18",
      weekStart: "2026-08-10",
      trendFrom: "2026-08-01",
      trendTo: "2026-08-07",
      retentionDate: "2026-07-20"
    });

    expect(data.kpis.recordDauDate).toBe("2026-08-18");
    expect(data.kpis.weekStart).toBe("2026-08-10");
    expect(data.kpis.weekEnd).toBe("2026-08-16");
    expect(data.dailyTrend).toHaveLength(7);
    expect(data.trendRange).toMatchObject({ from: "2026-08-01", to: "2026-08-07", allHistory: false });
    expect(data.dailyRetention.cohortDate).toBe("2026-07-20");
    expect(data.dailyRetention.points).toHaveLength(30);
    expect(data.dailyRetention.points.map((point) => point.day)).toEqual(Array.from({ length: 30 }, (_, index) => index + 1));
  });

  it("live 模式只请求全量 v4 快照，再在 Next 端按 query 构造看板", async () => {
    process.env.MEMO_API_BASE_URL = "https://memo.example.com/";
    process.env.MEMO_DASHBOARD_KEY = "test-key";
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ resCode: 200, resMsg: "success", resBody: emptySnapshot() })
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await loadDashboardData({ from: "2027-01-01", to: "2027-01-31" });

    expect(result.status).toBe("ready");
    if (result.status !== "ready") throw new Error("预期 live 数据加载成功");
    expect(result.source).toBe("live");
    expect(result.data.range).toMatchObject({ from: "2026-08-20", to: "2026-08-20" });
    const requestedUrl = new URL(String(fetchMock.mock.calls[0][0]));
    expect(requestedUrl.pathname).toBe("/ops/dashboard/overview");
    expect(requestedUrl.search).toBe("");
  });

  it.each([
    ["旧协议", { resCode: 200, resMsg: "success", resBody: { range: {}, totals: {} } }],
    ["畸形 v4 payload", (() => {
      const snapshot = emptySnapshot() as unknown as { daily: Array<Record<string, unknown>> };
      delete snapshot.daily[0].newUserBehavior;
      return { resCode: 200, resMsg: "success", resBody: snapshot };
    })()],
    ["后端业务错误", { resCode: 500, resMsg: "sensitive database detail", resBody: null }]
  ])("live 模式拒绝%s并只返回固定错误码", async (_, payload) => {
    process.env.MEMO_API_BASE_URL = "https://memo.example.com";
    process.env.MEMO_DASHBOARD_KEY = "test-key";
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({ ok: true, json: async () => payload }));

    await expect(loadDashboardData({})).resolves.toEqual({
      status: "error",
      message: "DASHBOARD_DATA_UNAVAILABLE"
    });
  });

  it.each(["DASHBOARD_USE_MOCK", "DASHBOARD_USE_SNAPSHOT"])(
    "生产环境拒绝 %s，防止线上误读本地数据",
    async (localDataFlag) => {
      vi.stubEnv("NODE_ENV", "production");
      process.env[localDataFlag] = "true";

      await expect(loadDashboardData({})).resolves.toEqual({
        status: "configuration",
        message: "DASHBOARD_DATA_UNAVAILABLE"
      });
    }
  );
});
