import { describe, expect, it } from "vitest";
import {
  assertDashboardSnapshot,
  createDashboardFromSnapshot,
  type DashboardSnapshot
} from "./dashboard-snapshot";

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) / 86_400_000
  );
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

function datesBetween(from: string, to: string) {
  return Array.from({ length: daysBetween(from, to) + 1 }, (_, index) => shiftDate(from, index));
}

function retentionPoints(values: Partial<Record<number, number>>, length: number) {
  return Array.from({ length }, (_, index) => ({
    day: index + 1,
    numerator: values[index + 1] ?? 0
  }));
}

function createValidSnapshot(): DashboardSnapshot {
  const dataStartDate = "2026-07-01";
  const throughDate = "2026-08-20";
  const activityByDate = {
    "2026-07-20": {
      registrations: 4,
      activeUsers: 4,
      messages: { total: 4, text: 4, image: 0, voice: 0, video: 0 },
      newUserBehavior: {
        messages: { total: 4, text: 4, image: 0, voice: 0, video: 0 },
        dailyEchoes: 0,
        highlightImages: 0
      },
      recordWau: 4,
      weeklyEffectiveUsers: 0,
      weeklyUserDays: 4
    },
    "2026-07-21": {
      registrations: 5,
      activeUsers: 5,
      messages: { total: 5, text: 5, image: 0, voice: 0, video: 0 },
      newUserBehavior: {
        messages: { total: 5, text: 5, image: 0, voice: 0, video: 0 },
        dailyEchoes: 0,
        highlightImages: 0
      },
      recordWau: 9,
      weeklyEffectiveUsers: 0,
      weeklyUserDays: 9
    },
    "2026-08-18": {
      registrations: 2,
      activeUsers: 1,
      messages: { total: 3, text: 2, image: 1, voice: 0, video: 0 },
      newUserBehavior: {
        messages: { total: 2, text: 1, image: 1, voice: 0, video: 0 },
        dailyEchoes: 1,
        highlightImages: 0
      },
      recordWau: 1,
      weeklyEffectiveUsers: 0,
      weeklyUserDays: 1
    },
    "2026-08-14": {
      registrations: 1,
      activeUsers: 1,
      messages: { total: 1, text: 1, image: 0, voice: 0, video: 0 },
      newUserBehavior: {
        messages: { total: 1, text: 1, image: 0, voice: 0, video: 0 },
        dailyEchoes: 0,
        highlightImages: 0
      },
      recordWau: 1,
      weeklyEffectiveUsers: 0,
      weeklyUserDays: 1
    },
    "2026-08-19": {
      registrations: 1,
      activeUsers: 2,
      messages: { total: 4, text: 2, image: 0, voice: 1, video: 1 },
      newUserBehavior: {
        messages: { total: 3, text: 2, image: 0, voice: 1, video: 0 },
        dailyEchoes: 1,
        highlightImages: 1
      },
      recordWau: 2,
      weeklyEffectiveUsers: 1,
      weeklyUserDays: 3
    },
    "2026-08-20": {
      registrations: 0,
      activeUsers: 1,
      messages: { total: 3, text: 1, image: 1, voice: 1, video: 0 },
      newUserBehavior: {
        messages: { total: 0, text: 0, image: 0, voice: 0, video: 0 },
        dailyEchoes: 0,
        highlightImages: 0
      },
      recordWau: 2,
      weeklyEffectiveUsers: 1,
      weeklyUserDays: 4
    }
  } satisfies Record<string, {
    registrations: number;
    activeUsers: number;
    messages: DashboardSnapshot["daily"][number]["messages"];
    newUserBehavior: DashboardSnapshot["daily"][number]["newUserBehavior"];
    recordWau: number;
    weeklyEffectiveUsers: number;
    weeklyUserDays: number;
  }>;

  let currentWeek = "";
  let recordWau = 0;
  let weeklyEffectiveUsers = 0;
  let weeklyUserDays = 0;
  const daily = datesBetween(dataStartDate, throughDate).map((date) => {
    const weekStart = startOfWeek(date);
    if (weekStart !== currentWeek) {
      currentWeek = weekStart;
      recordWau = 0;
      weeklyEffectiveUsers = 0;
      weeklyUserDays = 0;
    }
    const activity = activityByDate[date as keyof typeof activityByDate];
    if (activity) {
      recordWau = activity.recordWau;
      weeklyEffectiveUsers = activity.weeklyEffectiveUsers;
      weeklyUserDays = activity.weeklyUserDays;
    }
    return {
      date,
      registrations: activity?.registrations ?? 0,
      activeUsers: activity?.activeUsers ?? 0,
      messages: activity?.messages ?? { total: 0, text: 0, image: 0, voice: 0, video: 0 },
      highlightImages: date === "2026-08-18" || date === "2026-08-20" ? 1 : 0,
      dailyEchoes: date === "2026-08-18" || date === "2026-08-20" ? 1 : date === "2026-08-19" ? 2 : 0,
      newUserBehavior: activity?.newUserBehavior ?? {
        messages: { total: 0, text: 0, image: 0, voice: 0, video: 0 },
        dailyEchoes: 0,
        highlightImages: 0
      },
      weekStart,
      recordWau,
      weeklyEffectiveUsers,
      weeklyUserDays
    };
  });

  const sameDayActivatedByDate: Record<string, number> = {
    "2026-07-20": 4,
    "2026-07-21": 5,
    "2026-08-14": 1,
    "2026-08-18": 1,
    "2026-08-19": 1
  };
  const retentionValuesByDate: Record<string, Partial<Record<number, number>>> = {
    "2026-07-20": { 1: 3, 7: 2, 30: 1 },
    "2026-07-21": { 1: 4, 7: 2, 14: 2, 30: 1 },
    "2026-08-18": { 1: 1 },
    "2026-08-19": { 1: 1 }
  };

  const trendStart = shiftDate(dataStartDate, 27);
  const dailyTrend = datesBetween(trendStart, shiftDate(throughDate, -1)).map((date) => {
    if (date === "2026-08-18") {
      return { date, continuousUsers: 1, eligibleUsers: 7, newContinuousUsers: 1, exitedContinuousUsers: 0 };
    }
    if (date === "2026-08-19") {
      return { date, continuousUsers: 2, eligibleUsers: 8, newContinuousUsers: 1, exitedContinuousUsers: 0 };
    }
    return { date, continuousUsers: 0, eligibleUsers: 0, newContinuousUsers: 0, exitedContinuousUsers: 0 };
  });

  return {
    schemaVersion: 4,
    generatedAt: "2026-08-20T13:00:00.000Z",
    timezone: "Asia/Shanghai",
    dataStartDate,
    throughDate,
    daily,
    activationCohorts: [
      { registrationDate: "2026-07-20", sameDayNumerator: 4, sameDayDenominator: 4, sevenDayNumerator: 2, sevenDayDenominator: 4 },
      { registrationDate: "2026-07-21", sameDayNumerator: 5, sameDayDenominator: 5, sevenDayNumerator: 2, sevenDayDenominator: 5 },
      { registrationDate: "2026-08-14", sameDayNumerator: 1, sameDayDenominator: 1, sevenDayNumerator: 0, sevenDayDenominator: 0 },
      { registrationDate: "2026-08-18", sameDayNumerator: 1, sameDayDenominator: 2, sevenDayNumerator: 0, sevenDayDenominator: 0 },
      { registrationDate: "2026-08-19", sameDayNumerator: 1, sameDayDenominator: 1, sevenDayNumerator: 0, sevenDayDenominator: 0 }
    ],
    dailyRetentionCohorts: datesBetween(dataStartDate, shiftDate(throughDate, -1)).map((cohortDate) => ({
      cohortDate,
      denominator: sameDayActivatedByDate[cohortDate] ?? 0,
      points: retentionPoints(
        retentionValuesByDate[cohortDate] ?? {},
        Math.min(30, daysBetween(cohortDate, throughDate))
      )
    })),
    sustainedUsage: {
      asOfDate: "2026-08-19",
      continuous28DayUsers: 2,
      eligibleUsers: 8,
      newContinuousUsers: 1,
      exitedContinuousUsers: 0,
      messages: { total: 24, text: 18, image: 2, voice: 3, video: 1 },
      dailyTrend
    }
  };
}

function cloneSnapshot() {
  return structuredClone(createValidSnapshot());
}

describe("dashboard production snapshot", () => {
  it("从完整 v4 聚合快照构建默认全历史看板，并默认选择最近有数据的留存 cohort", () => {
    const data = createDashboardFromSnapshot(createValidSnapshot(), {});

    expect(data.range).toMatchObject({ from: "2026-07-01", to: "2026-08-20", allHistory: true });
    expect(data.trendRange).toMatchObject({ from: "2026-07-01", to: "2026-08-20", allHistory: true });
    expect(data.totals.registeredUsersAtStart).toBe(0);
    expect(data.totals.registeredUsers).toBe(13);
    expect(data.totals.messages).toEqual({ total: 20, text: 15, image: 2, voice: 2, video: 1 });
    expect(data.sustainedUsage).toMatchObject({
      available: true,
      asOfDate: "2026-08-19",
      continuous28DayUsers: 2,
      continuousUserRate: { numerator: 2, denominator: 8, percentage: 25 },
      newContinuousUsers: 1,
      exitedContinuousUsers: 0,
      messages: { total: 24, text: 18, image: 2, voice: 3, video: 1 }
    });
    expect(data.sustainedUsage.dailyTrend).toHaveLength(23);
    expect(data.sustainedUsage.dailyTrend.at(-1)).toEqual({
      date: "2026-08-19",
      continuousUsers: 2,
      eligibleUsers: 8,
      percentage: 25,
      newContinuousUsers: 1,
      exitedContinuousUsers: 0
    });
    expect(data.kpis.recordDau).toBe(1);
    expect(data.kpis.recordWau).toBe(2);
    expect(data.kpis.weeklyAverageRecordDays.value).toBe(2);
    expect(data.kpis.sameDayActivation.percentage).toBe(92.3);
    expect(data.dailyRetention).toMatchObject({
      cohortDate: "2026-08-19",
      cohortSize: 1,
      minDate: "2026-07-01",
      maxDate: "2026-08-19"
    });
    expect(data.dailyRetention.points).toHaveLength(1);
    expect(data.dailyRetention.points[0]).toMatchObject({ day: 1, date: "2026-08-20", numerator: 1, denominator: 1, percentage: 100 });
    expect(data.newUserBehavior.messages).toEqual({ total: 15, text: 13, image: 1, voice: 1, video: 0 });
  });

  it("页面顶部日期只更新新用户、累计和激活指标，不影响独立留存日期", () => {
    const data = createDashboardFromSnapshot(createValidSnapshot(), { from: "2026-08-19", to: "2026-08-20" });

    expect(data.range.allHistory).toBe(false);
    expect(data.totals.registeredUsersAtStart).toBe(12);
    expect(data.totals.registeredUsers).toBe(13);
    expect(data.totals.newUsers).toBe(1);
    expect(data.totals.messages.total).toBe(7);
    expect(data.dailyRetention.cohortDate).toBe("2026-08-19");
    expect(data.kpis.sameDayActivation).toMatchObject({ numerator: 1, denominator: 1, percentage: 100 });
  });

  it("观察日、统计周、趋势和留存 D0 日期彼此独立", () => {
    const data = createDashboardFromSnapshot(createValidSnapshot(), {
      from: "2026-08-19",
      to: "2026-08-19",
      activityDate: "2026-08-18",
      weekStart: "2026-08-17",
      trendFrom: "2026-08-19",
      trendTo: "2026-08-20",
      retentionDate: "2026-07-20"
    });

    expect(data.range).toMatchObject({ from: "2026-08-19", to: "2026-08-19" });
    expect(data.kpis.recordDauDate).toBe("2026-08-18");
    expect(data.kpis.recordDau).toBe(1);
    expect(data.kpis.weekStart).toBe("2026-08-17");
    expect(data.dailyTrend).toHaveLength(2);
    expect(data.dailyRetention.cohortDate).toBe("2026-07-20");
    expect(data.dailyRetention.cohortSize).toBe(4);
    expect(data.dailyRetention.points[0]).toMatchObject({ day: 1, numerator: 3, denominator: 4, percentage: 75 });
    expect(data.dailyRetention.points[29]).toMatchObject({ day: 30, numerator: 1, denominator: 4, percentage: 25 });
  });

  it("允许选择到昨天，并只返回已经发生的 D1–Dn", () => {
    const yesterday = createDashboardFromSnapshot(createValidSnapshot(), { retentionDate: "2026-08-19" });
    const twoDaysAgo = createDashboardFromSnapshot(createValidSnapshot(), { retentionDate: "2026-08-18" });

    expect(yesterday.dailyRetention.maxDate).toBe("2026-08-19");
    expect(yesterday.dailyRetention.points.map((point) => point.day)).toEqual([1]);
    expect(twoDaysAgo.dailyRetention.points.map((point) => point.day)).toEqual([1, 2]);
  });

  it("不会把今天或未来日期开放为 D0 cohort", () => {
    const data = createDashboardFromSnapshot(createValidSnapshot(), { retentionDate: "2026-08-24" });

    expect(data.dailyRetention.cohortDate).toBe("2026-08-19");
    expect(data.dailyRetention.maxDate).toBe("2026-08-19");
  });

  it("将超出快照边界的 URL 日期统一钳制为实际数据范围", () => {
    const future = createDashboardFromSnapshot(createValidSnapshot(), { from: "2027-01-01", to: "2027-01-31" });
    const past = createDashboardFromSnapshot(createValidSnapshot(), { from: "2025-01-01", to: "2025-01-31" });

    expect(future.range).toMatchObject({ from: "2026-08-20", to: "2026-08-20", allHistory: false });
    expect(past.range).toMatchObject({ from: "2026-07-01", to: "2026-07-01", allHistory: false });
    expect(future.kpis.recordDauDate).toBe("2026-08-20");
  });

  it("7 日激活只纳入 D0–D6 都已经结束的注册日，并允许今天的注册等待结算", () => {
    const incompleteSevenDay = cloneSnapshot();
    const boundaryCohort = incompleteSevenDay.activationCohorts.find(
      (cohort) => cohort.registrationDate === "2026-08-14"
    )!;
    boundaryCohort.sevenDayDenominator = 1;
    expect(() => assertDashboardSnapshot(incompleteSevenDay)).toThrow(/7 日激活观察分母与日期成熟度不一致/);

    const todayPending = cloneSnapshot();
    todayPending.daily.at(-1)!.registrations = 1;
    expect(() => assertDashboardSnapshot(todayPending)).not.toThrow();
  });

  it.each([
    ["负数", (value: unknown) => { (value as DashboardSnapshot).daily[0].registrations = -1; }, /非负整数/],
    ["消息模态合计不等", (value: unknown) => { (value as DashboardSnapshot).daily[0].messages.total = 1; }, /total 必须等于/],
    ["日期缺口", (value: unknown) => { (value as DashboardSnapshot).daily[1].date = "2026-07-03"; }, /日期序列必须连续/],
    ["留存点不连续", (value: unknown) => { (value as DashboardSnapshot).dailyRetentionCohorts[0].points[0].day = 2; }, /留存天数必须从 D1/],
    ["留存分子越界", (value: unknown) => { (value as DashboardSnapshot).dailyRetentionCohorts[19].points[0].numerator = 5; }, /留存分子不能大于/],
    ["持续趋势前后不守恒", (value: unknown) => { (value as DashboardSnapshot).sustainedUsage.dailyTrend.at(-1)!.newContinuousUsers = 0; }, /前一日持续用户数 \+ 新增 - 退出/],
    ["持续趋势与当前值不一致", (value: unknown) => { (value as DashboardSnapshot).sustainedUsage.continuous28DayUsers = 1; }, /必须与滚动趋势最后一天一致/]
  ])("拒绝畸形 v4 payload：%s", (_, mutate, expected) => {
    const value: unknown = cloneSnapshot();
    mutate(value);
    expect(() => assertDashboardSnapshot(value)).toThrow(expected);
  });

  it("拒绝只有部分日期带 newUserBehavior 的快照，不能静默补 0", () => {
    const value = cloneSnapshot() as unknown as { daily: Array<Record<string, unknown>> };
    delete value.daily[0].newUserBehavior;

    expect(() => assertDashboardSnapshot(value)).toThrow(/snapshot\.daily\[0\]\.newUserBehavior/);
  });
});
