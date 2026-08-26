import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { SustainedUsageTrendPlot } from "./SustainedUsageTrendPlot";

const labels = {
  users: "28 日持续记录用户数",
  rate: "持续记录用户率",
  added: "新增持续用户",
  exited: "退出持续用户",
  hoverHint: "查看每日数据"
};

const points = [
  { date: "2026-08-23", continuousUsers: 1, eligibleUsers: 10, percentage: 10, newContinuousUsers: 1, exitedContinuousUsers: 0 },
  { date: "2026-08-24", continuousUsers: 1, eligibleUsers: 11, percentage: 9.1, newContinuousUsers: 0, exitedContinuousUsers: 0 }
];

describe("SustainedUsageTrendPlot", () => {
  it("支持聚焦后用方向键查看滚动窗口的完整数据", () => {
    render(<SustainedUsageTrendPlot points={points} labels={labels} />);
    const chart = screen.getByRole("img", { name: labels.hoverHint });

    fireEvent.focus(chart);
    expect(chart).toHaveAccessibleName(/2026-08-24.*持续记录用户率 9.1%/);
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(chart).toHaveAccessibleName(/2026-08-23.*新增持续用户 1.*退出持续用户 0/);
  });
});
