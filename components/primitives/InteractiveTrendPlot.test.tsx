import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { InteractiveTrendPlot } from "./InteractiveTrendPlot";

const labels = { active: "记录用户", messages: "消息", hoverHint: "查看每日数据" };
const points = [
  { date: "2026-08-22", registrations: 1, activeUsers: 3, messages: 9 },
  { date: "2026-08-23", registrations: 2, activeUsers: 4, messages: 12 },
  { date: "2026-08-24", registrations: 0, activeUsers: 6, messages: 18 }
];

describe("InteractiveTrendPlot", () => {
  it("支持聚焦后用方向键逐日查看数据", () => {
    render(<InteractiveTrendPlot points={points} labels={labels} />);
    const chart = screen.getByRole("img", { name: labels.hoverHint });

    fireEvent.focus(chart);
    expect(chart).toHaveAccessibleName(/2026-08-24/);
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(chart).toHaveAccessibleName(/2026-08-23.*记录用户 4.*消息 12/);
  });
});
