import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DateScopePicker } from "./DateScopePicker";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("DateScopePicker", () => {
  beforeEach(() => mocks.push.mockReset());

  it("选择观察日时保留其他独立时间条件", () => {
    render(
      <DateScopePicker
        mode="day"
        value="2026-08-24"
        param="activityDate"
        minDate="2026-01-01"
        maxDate="2026-08-24"
        query={{ from: "2026-08-01", to: "2026-08-24", weekStart: "2026-08-17" }}
        label="观察日"
        selectLabel="选择观察日"
        hint="选择某一天"
        clearLabel="回到最新日"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /观察日/ }));
    fireEvent.click(screen.getByRole("button", { name: "2026年8月20日" }));
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/dashboard?from=2026-08-01&to=2026-08-24&activityDate=2026-08-20&weekStart=2026-08-17",
      { scroll: false }
    );
  });

  it("点击任意日期后按其所在周一保存统计周", () => {
    render(
      <DateScopePicker
        mode="week"
        value="2026-08-17"
        param="weekStart"
        minDate="2026-01-01"
        maxDate="2026-08-24"
        query={{ activityDate: "2026-08-24" }}
        label="统计周"
        selectLabel="选择统计周"
        hint="选择一个自然周"
        clearLabel="回到当前周"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /统计周/ }));
    fireEvent.click(screen.getByRole("button", { name: "2026年8月12日" }));
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/dashboard?activityDate=2026-08-24&weekStart=2026-08-10",
      { scroll: false }
    );
  });

  it("选择留存 D0 日期时保留其他筛选并保持滚动位置", () => {
    render(
      <DateScopePicker
        mode="day"
        value="2026-07-20"
        param="retentionDate"
        minDate="2026-01-01"
        maxDate="2026-08-24"
        query={{ activityDate: "2026-08-24", weekStart: "2026-08-17" }}
        label="D0 cohort 日期"
        selectLabel="选择 D0 cohort 日期"
        hint="最晚可选昨天"
        clearLabel="回到最近有数据 cohort"
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /D0 cohort 日期/ }));
    fireEvent.click(screen.getByRole("button", { name: "2026年7月18日" }));
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/dashboard?activityDate=2026-08-24&weekStart=2026-08-17&retentionDate=2026-07-18",
      { scroll: false }
    );
  });
});
