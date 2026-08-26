import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { createDashboardMock } from "@/lib/dashboard-mock";
import { content } from "@/lib/content";
import { DashboardView } from "./DashboardView";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));

describe("DashboardView", () => {
  it("默认以历史全部日期呈现累计数据和产品健康指标", () => {
    const data = createDashboardMock();
    const dailyAverage = data.sustainedUsage.messages.total
      / data.sustainedUsage.continuous28DayUsers
      / 28;
    render(<DashboardView data={data} query={{}} source="mock" />);

    expect(screen.getByRole("heading", { level: 1, name: content.dashboard.title })).toBeInTheDocument();
    expect(screen.getAllByText(content.dashboard.allHistory).length).toBeGreaterThan(0);
    expect(screen.getByText(content.dashboard.registeredUsers)).toBeInTheDocument();
    expect(screen.getAllByText(content.dashboard.newUsers).length).toBeGreaterThan(0);
    expect(screen.getByText(content.dashboard.messages)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.highlightImages)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.dailyEchoes)).toBeInTheDocument();
    expect(screen.getAllByText(content.dashboard.continuous28DayUsers).length).toBeGreaterThan(0);
    expect(screen.getAllByText(content.dashboard.continuousUserRate).length).toBeGreaterThan(0);
    expect(screen.getAllByText(content.dashboard.newContinuousUsers).length).toBeGreaterThan(0);
    expect(screen.getAllByText(content.dashboard.exitedContinuousUsers).length).toBeGreaterThan(0);
    expect(screen.getByText(content.dashboard.continuousUserMessages)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.averageMessagesPerContinuousUser)).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: content.dashboard.sustainedTrendTitle })).toBeInTheDocument();
    expect(screen.getByText(`${dailyAverage.toFixed(1)} 条 / 人 / 天`)).toBeInTheDocument();
    expect(screen.getByText(
      `${data.sustainedUsage.messages.total.toLocaleString("zh-CN")} 条 / ${data.sustainedUsage.continuous28DayUsers.toLocaleString("zh-CN")} 人 / 28 天`
    )).toBeInTheDocument();
  });

  it("累计消息按文字、图片、语音、视频拆分", () => {
    render(<DashboardView data={createDashboardMock()} query={{}} />);

    Object.values(content.dashboard.messageTypes).forEach((label) => {
      expect(screen.getAllByText(label).length).toBeGreaterThan(0);
    });
  });

  it("把持续使用放在 01，新用户与留存放在 02，其他模块顺延", () => {
    const query = { retentionDate: "2026-07-20" };
    render(<DashboardView data={createDashboardMock(query)} query={query} />);

    expect(screen.getByRole("heading", { level: 2, name: content.dashboard.sustainedUsageTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: content.dashboard.newUserTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: content.dashboard.cumulativeTitle })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 2, name: content.dashboard.healthTitle })).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 2, name: content.dashboard.retentionTitle })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: content.dashboard.retentionTitle })).toBeInTheDocument();
    expect(screen.getAllByText(content.dashboard.newUserMessages).length).toBeGreaterThan(0);
    expect(screen.getByText(content.dashboard.behaviorTrendTitle)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.sevenDayActivation)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.activityGroupTitle)).toBeInTheDocument();
    expect(screen.getByText(content.dashboard.weeklyGroupTitle)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^观察日 / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^统计周 / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^趋势日期范围 / })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /^D0 cohort 日期 / })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 4, name: "D1–D30 每日留存" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "D1 至 D30 留存明细" }).children).toHaveLength(30);
    expect(screen.getAllByText("D30").length).toBeGreaterThan(0);
    expect(screen.queryByText("W4 留存率")).not.toBeInTheDocument();
  });

  it("把新用户与累计日期筛选放在新用户模块内", () => {
    render(<DashboardView data={createDashboardMock()} query={{}} />);

    const newUserSection = screen.getByRole("region", { name: content.dashboard.newUserTitle });
    const rangeFilter = screen.getByRole("region", { name: content.dashboard.customRange });

    expect(newUserSection).toContainElement(rangeFilter);
    expect(screen.getByRole("button", { name: /新用户与累计区间 2026年1月1日 — 2026年8月24日/ })).toBeInTheDocument();
  });

  it("日期控件展示实际生效区间，预设相对数据截止日而不是浏览器今天或越界 URL", () => {
    const data = createDashboardMock({ from: "2026-08-24", to: "2026-08-24" });
    render(<DashboardView data={data} query={{ from: "2027-01-01", to: "2027-01-31" }} />);

    expect(screen.getByRole("button", { name: /新用户与累计区间 2026年8月24日/ })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /2027年/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: content.dashboard.last7Days })).toHaveAttribute(
      "href",
      "/dashboard?from=2026-08-18&to=2026-08-24"
    );
  });

  it("记录活跃保留当日、当周与趋势，但不再展示 DAU / WAU", () => {
    render(<DashboardView data={createDashboardMock()} query={{}} />);

    expect(screen.getByRole("heading", { level: 3, name: content.dashboard.recordDau })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: content.dashboard.recordWau })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: content.dashboard.trendTitle })).toBeInTheDocument();
    expect(screen.queryByText("当日 DAU / 所在周 WAU")).not.toBeInTheDocument();
  });

  it("近期 cohort 只展示已经发生的留存天数", () => {
    const query = { retentionDate: "2026-08-23" };
    render(<DashboardView data={createDashboardMock(query)} query={query} />);

    expect(screen.getByRole("list", { name: "D1 至 D1 留存明细" }).children).toHaveLength(1);
    expect(screen.getAllByText("D1").length).toBeGreaterThan(0);
    expect(screen.queryByText("D2")).not.toBeInTheDocument();
    expect(screen.getByText(/后续 D2–D30 尚未发生/)).toBeInTheDocument();
  });

  it("筛选区间后累计注册展示区间前后值与净增", () => {
    const data = createDashboardMock({ from: "2026-08-01", to: "2026-08-24" });
    render(<DashboardView data={data} query={{ from: "2026-08-01", to: "2026-08-24" }} />);

    expect(screen.getByText(`${data.totals.registeredUsersAtStart.toLocaleString("zh-CN")} → ${data.totals.registeredUsers.toLocaleString("zh-CN")}`)).toBeInTheDocument();
    expect(screen.getAllByText(/区间净增/).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { level: 3, name: content.dashboard.recordDau })).toBeInTheDocument();
    expect(screen.getByRole("heading", { level: 3, name: content.dashboard.recordWau })).toBeInTheDocument();
    expect(screen.getAllByText(/数据周：/).length).toBeGreaterThan(0);
  });

  it("不再展示已移除的 AI 成功率和日回响打开率", () => {
    render(<DashboardView data={createDashboardMock()} query={{}} />);

    expect(screen.queryByText("AI 生成成功率")).not.toBeInTheDocument();
    expect(screen.queryByText("日回响打开率")).not.toBeInTheDocument();
  });

  it("每个指标卡都提供可聚焦的口径提示，并移除底部口径说明", () => {
    render(<DashboardView data={createDashboardMock()} query={{}} />);

    Object.entries(content.dashboard.metricDefinitions).forEach(([label, definition]) => {
      expect(screen.getByRole("button", { name: `${label}口径：${definition}` })).toBeInTheDocument();
    });
    expect(screen.getAllByRole("tooltip")).toHaveLength(
      Object.keys(content.dashboard.metricDefinitions).length
    );
    expect(screen.queryByRole("heading", { level: 2, name: "口径说明" })).not.toBeInTheDocument();
  });
});
