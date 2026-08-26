import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { DateRangePicker } from "./DateRangePicker";

const mocks = vi.hoisted(() => ({ push: vi.fn() }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: mocks.push }) }));

describe("DateRangePicker", () => {
  beforeEach(() => mocks.push.mockReset());

  it("通过双月日历选择并应用日期区间", () => {
    render(<DateRangePicker from="2026-08-18" to="2026-08-24" minDate="2026-01-01" maxDate="2026-08-24" />);

    fireEvent.click(screen.getByRole("button", { name: /日期范围/ }));
    expect(screen.getByRole("dialog", { name: "选择日期范围" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2026年7月" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "2026年8月" })).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "2026年8月20日" }));
    fireEvent.click(screen.getByRole("button", { name: "2026年8月22日" }));
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    expect(mocks.push).toHaveBeenCalledWith("/dashboard?from=2026-08-20&to=2026-08-22");
  });

  it("趋势日期使用独立参数、保留其他筛选并保持滚动位置", () => {
    render(
      <DateRangePicker
        from="2026-07-01"
        to="2026-07-31"
        minDate="2026-01-01"
        maxDate="2026-08-24"
        query={{ from: "2026-08-01", to: "2026-08-24", activityDate: "2026-08-20" }}
        fromParam="trendFrom"
        toParam="trendTo"
        label="趋势日期"
        selectLabel="选择趋势日期"
        preserveScroll
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /趋势日期/ }));
    fireEvent.click(screen.getByRole("button", { name: "下一个月" }));
    fireEvent.click(screen.getByRole("button", { name: "2026年8月10日" }));
    fireEvent.click(screen.getByRole("button", { name: "2026年8月18日" }));
    fireEvent.click(screen.getByRole("button", { name: "应用筛选" }));

    expect(mocks.push).toHaveBeenCalledWith(
      "/dashboard?from=2026-08-01&to=2026-08-24&activityDate=2026-08-20&trendFrom=2026-08-10&trendTo=2026-08-18",
      { scroll: false }
    );
  });
});
