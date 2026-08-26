import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { NewUserTrendPlot } from "./NewUserTrendPlot";

const labels = {
  newUsers: "新用户",
  messages: "D0 消息",
  dailyEchoes: "D0 日回响",
  highlightImages: "D0 此刻",
  hoverHint: "查看每日数据"
};

const points = [
  {
    date: "2026-08-23",
    newUsers: 2,
    messages: { total: 6, text: 4, image: 1, voice: 1, video: 0 },
    dailyEchoes: 1,
    highlightMomentImages: 0
  },
  {
    date: "2026-08-24",
    newUsers: 1,
    messages: { total: 4, text: 3, image: 0, voice: 0, video: 1 },
    dailyEchoes: 1,
    highlightMomentImages: 1
  }
];

describe("NewUserTrendPlot", () => {
  it("支持聚焦后逐日查看新用户 D0 行为", () => {
    render(<NewUserTrendPlot points={points} labels={labels} />);
    const chart = screen.getByRole("img", { name: labels.hoverHint });

    fireEvent.focus(chart);
    expect(chart).toHaveAccessibleName(/2026-08-24.*新用户 1.*D0 消息 4.*D0 日回响 1.*D0 此刻 1/);
    fireEvent.keyDown(chart, { key: "ArrowLeft" });
    expect(chart).toHaveAccessibleName(/2026-08-23.*新用户 2.*D0 消息 6/);
  });
});
