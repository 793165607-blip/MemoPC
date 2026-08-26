import { readFile } from "node:fs/promises";
import path from "node:path";
import type {
  AverageMetric,
  DailyRetentionPoint,
  DashboardData,
  DashboardQuery,
  MessageTotals,
  RateMetric
} from "./dashboard-types";

type SnapshotDailyPoint = {
  date: string;
  registrations: number;
  activeUsers: number;
  messages: {
    total: number;
    text: number;
    image: number;
    voice: number;
    video: number;
  };
  highlightImages: number;
  dailyEchoes: number;
  newUserBehavior: {
    messages: MessageTotals;
    dailyEchoes: number;
    highlightImages: number;
  };
  weekStart: string;
  recordWau: number;
  weeklyEffectiveUsers: number;
  weeklyUserDays: number;
};

type ActivationCohort = {
  registrationDate: string;
  sameDayNumerator: number;
  sameDayDenominator: number;
  sevenDayNumerator: number;
  sevenDayDenominator: number;
};

type DailyRetentionCohort = {
  cohortDate: string;
  denominator: number;
  points: Array<{
    day: number;
    numerator: number;
  }>;
};

export type DashboardSnapshot = {
  schemaVersion: 4;
  generatedAt: string;
  timezone: "Asia/Shanghai";
  dataStartDate: string;
  throughDate: string;
  daily: SnapshotDailyPoint[];
  activationCohorts: ActivationCohort[];
  dailyRetentionCohorts: DailyRetentionCohort[];
  sustainedUsage: {
    asOfDate: string;
    continuous28DayUsers: number;
    eligibleUsers: number;
    newContinuousUsers: number;
    exitedContinuousUsers: number;
    messages: MessageTotals;
    dailyTrend: Array<{
      date: string;
      continuousUsers: number;
      eligibleUsers: number;
      newContinuousUsers: number;
      exitedContinuousUsers: number;
    }>;
  };
};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function isIsoDate(value: unknown): value is string {
  if (typeof value !== "string" || !ISO_DATE.test(value)) return false;
  const date = new Date(`${value}T12:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function fail(path: string, message: string): never {
  throw new Error(`${path}: ${message}`);
}

function assertRecord(value: unknown, path: string): asserts value is Record<string, unknown> {
  if (!isRecord(value)) fail(path, "必须是对象");
}

function assertArray(value: unknown, path: string): asserts value is unknown[] {
  if (!Array.isArray(value)) fail(path, "必须是数组");
}

function assertDate(value: unknown, path: string): asserts value is string {
  if (!isIsoDate(value)) fail(path, "必须是有效的 YYYY-MM-DD 日期");
}

function assertNonNegativeInteger(value: unknown, path: string): asserts value is number {
  if (!Number.isInteger(value) || (value as number) < 0) fail(path, "必须是非负整数");
}

function assertMessages(value: unknown, path: string): asserts value is MessageTotals {
  assertRecord(value, path);
  const keys = ["total", "text", "image", "voice", "video"] as const;
  keys.forEach((key) => assertNonNegativeInteger(value[key], `${path}.${key}`));
  if (
    (value.total as number)
    !== (value.text as number) + (value.image as number) + (value.voice as number) + (value.video as number)
  ) {
    fail(path, "total 必须等于文字、图片、语音和视频之和");
  }
}

function assertStrictDate(value: unknown, expected: string, path: string) {
  assertDate(value, path);
  if (value !== expected) fail(path, `日期序列必须连续且有序，预期 ${expected}`);
}

export function assertDashboardSnapshot(value: unknown): asserts value is DashboardSnapshot {
  assertRecord(value, "snapshot");
  if (value.schemaVersion !== 4) fail("snapshot.schemaVersion", "仅支持版本 4");
  if (value.timezone !== "Asia/Shanghai") fail("snapshot.timezone", "必须是 Asia/Shanghai");
  assertDate(value.dataStartDate, "snapshot.dataStartDate");
  assertDate(value.throughDate, "snapshot.throughDate");
  const dataStartDate = value.dataStartDate;
  const throughDate = value.throughDate;
  if (dataStartDate > throughDate) fail("snapshot", "dataStartDate 不能晚于 throughDate");
  if (daysBetween(dataStartDate, throughDate) > 3650) fail("snapshot", "数据跨度不能超过 10 年");
  if (typeof value.generatedAt !== "string" || Number.isNaN(Date.parse(value.generatedAt))) {
    fail("snapshot.generatedAt", "必须是有效时间");
  }

  assertArray(value.daily, "snapshot.daily");
  const expectedDailyLength = daysBetween(dataStartDate, throughDate) + 1;
  if (value.daily.length !== expectedDailyLength) {
    fail("snapshot.daily", `必须完整覆盖 ${expectedDailyLength} 个自然日`);
  }

  let previousDaily: Record<string, unknown> | undefined;
  value.daily.forEach((entry, index) => {
    const path = `snapshot.daily[${index}]`;
    assertRecord(entry, path);
    assertStrictDate(entry.date, shiftDate(dataStartDate, index), `${path}.date`);
    ["registrations", "activeUsers", "highlightImages", "dailyEchoes", "recordWau", "weeklyEffectiveUsers", "weeklyUserDays"]
      .forEach((key) => assertNonNegativeInteger(entry[key], `${path}.${key}`));
    assertMessages(entry.messages, `${path}.messages`);
    assertRecord(entry.newUserBehavior, `${path}.newUserBehavior`);
    assertMessages(entry.newUserBehavior.messages, `${path}.newUserBehavior.messages`);
    assertNonNegativeInteger(entry.newUserBehavior.dailyEchoes, `${path}.newUserBehavior.dailyEchoes`);
    assertNonNegativeInteger(entry.newUserBehavior.highlightImages, `${path}.newUserBehavior.highlightImages`);
    assertDate(entry.weekStart, `${path}.weekStart`);
    const expectedWeekStart = startOfWeek(entry.date as string);
    if (entry.weekStart !== expectedWeekStart) fail(`${path}.weekStart`, `预期 ${expectedWeekStart}`);
    if ((entry.messages as MessageTotals).total < (entry.activeUsers as number)) {
      fail(path, "消息数不能小于记录活跃用户数");
    }
    if ((entry.recordWau as number) < (entry.activeUsers as number)) {
      fail(path, "当周 WAU 不能小于当日 DAU");
    }
    if ((entry.weeklyEffectiveUsers as number) > (entry.recordWau as number)) {
      fail(path, "当周有效记录用户数不能大于当周 WAU");
    }
    if ((entry.weeklyUserDays as number) < (entry.recordWau as number)) {
      fail(path, "当周用户人天不能小于当周 WAU");
    }
    const weekDayCount = daysBetween(entry.weekStart as string, entry.date as string) + 1;
    if ((entry.weeklyUserDays as number) > (entry.recordWau as number) * weekDayCount) {
      fail(path, "当周用户人天超过自然周可达到的上限");
    }
    if (previousDaily?.weekStart === entry.weekStart) {
      ["recordWau", "weeklyEffectiveUsers", "weeklyUserDays"].forEach((key) => {
        if ((entry[key] as number) < (previousDaily?.[key] as number)) fail(`${path}.${key}`, "同一周内不能下降");
      });
    }
    previousDaily = entry;
  });

  assertArray(value.activationCohorts, "snapshot.activationCohorts");
  const latestCompletedDate = shiftDate(throughDate, -1);
  const registrationsByDate = new Map(
    value.daily.map((entry) => [(entry as Record<string, unknown>).date as string, (entry as Record<string, unknown>).registrations as number])
  );
  const sameDayActivatedByDate = new Map<string, number>();
  let previousActivationDate: string | undefined;
  value.activationCohorts.forEach((entry, index) => {
    const path = `snapshot.activationCohorts[${index}]`;
    assertRecord(entry, path);
    assertDate(entry.registrationDate, `${path}.registrationDate`);
    if (entry.registrationDate < dataStartDate || entry.registrationDate > latestCompletedDate) {
      fail(`${path}.registrationDate`, "必须落在已经结束的完整自然日范围内");
    }
    if (previousActivationDate && entry.registrationDate <= previousActivationDate) {
      fail(`${path}.registrationDate`, "日期必须唯一且严格递增");
    }
    ["sameDayNumerator", "sameDayDenominator", "sevenDayNumerator", "sevenDayDenominator"]
      .forEach((key) => assertNonNegativeInteger(entry[key], `${path}.${key}`));
    if ((entry.sameDayNumerator as number) > (entry.sameDayDenominator as number)) fail(path, "当日激活分子不能大于分母");
    if ((entry.sevenDayNumerator as number) > (entry.sevenDayDenominator as number)) fail(path, "7 日激活分子不能大于分母");
    if ((entry.sevenDayDenominator as number) > (entry.sameDayDenominator as number)) fail(path, "7 日观察分母不能大于注册用户数");
    const registrationCount = registrationsByDate.get(entry.registrationDate as string) ?? 0;
    if (entry.sameDayDenominator !== registrationCount) fail(path, "当日激活分母必须等于当天注册用户数");
    const fullyObserved = entry.registrationDate <= shiftDate(throughDate, -7);
    const expectedSevenDayDenominator = fullyObserved ? entry.sameDayDenominator : 0;
    if (entry.sevenDayDenominator !== expectedSevenDayDenominator) fail(path, "7 日激活观察分母与日期成熟度不一致");
    sameDayActivatedByDate.set(entry.registrationDate as string, entry.sameDayNumerator as number);
    previousActivationDate = entry.registrationDate as string;
  });
  value.daily.forEach((entry, index) => {
    const row = entry as Record<string, unknown>;
    if (
      row.date !== throughDate
      && (row.registrations as number) > 0
      && !sameDayActivatedByDate.has(row.date as string)
    ) {
      fail(`snapshot.daily[${index}].registrations`, "存在注册用户但缺少对应激活 cohort");
    }
  });

  assertArray(value.dailyRetentionCohorts, "snapshot.dailyRetentionCohorts");
  const expectedRetentionLength = Math.max(0, expectedDailyLength - 1);
  if (value.dailyRetentionCohorts.length !== expectedRetentionLength) {
    fail("snapshot.dailyRetentionCohorts", `必须覆盖 throughDate 之前的 ${expectedRetentionLength} 个 cohort 日期`);
  }
  value.dailyRetentionCohorts.forEach((entry, index) => {
    const path = `snapshot.dailyRetentionCohorts[${index}]`;
    assertRecord(entry, path);
    const expectedCohortDate = shiftDate(dataStartDate, index);
    assertStrictDate(entry.cohortDate, expectedCohortDate, `${path}.cohortDate`);
    assertNonNegativeInteger(entry.denominator, `${path}.denominator`);
    const expectedDenominator = sameDayActivatedByDate.get(expectedCohortDate) ?? 0;
    if (entry.denominator !== expectedDenominator) fail(path, "留存分母必须等于对应 D0 的当日激活用户数");
    assertArray(entry.points, `${path}.points`);
    const observedDays = Math.max(0, Math.min(30, daysBetween(expectedCohortDate, throughDate)));
    if (entry.points.length !== observedDays) fail(`${path}.points`, `必须连续覆盖 D1–D${observedDays}`);
    entry.points.forEach((point, pointIndex) => {
      const pointPath = `${path}.points[${pointIndex}]`;
      assertRecord(point, pointPath);
      assertNonNegativeInteger(point.day, `${pointPath}.day`);
      assertNonNegativeInteger(point.numerator, `${pointPath}.numerator`);
      if (point.day !== pointIndex + 1) fail(`${pointPath}.day`, "留存天数必须从 D1 连续递增");
      if ((point.numerator as number) > (entry.denominator as number)) fail(pointPath, "留存分子不能大于 cohort 分母");
    });
  });

  assertRecord(value.sustainedUsage, "snapshot.sustainedUsage");
  const sustainedUsage = value.sustainedUsage;
  assertDate(sustainedUsage.asOfDate, "snapshot.sustainedUsage.asOfDate");
  const expectedAsOfDate = shiftDate(throughDate, -1);
  if (sustainedUsage.asOfDate !== expectedAsOfDate) {
    fail("snapshot.sustainedUsage.asOfDate", `必须是最后一个完整自然日 ${expectedAsOfDate}`);
  }
  ["continuous28DayUsers", "eligibleUsers", "newContinuousUsers", "exitedContinuousUsers"]
    .forEach((key) => assertNonNegativeInteger(sustainedUsage[key], `snapshot.sustainedUsage.${key}`));
  if ((sustainedUsage.continuous28DayUsers as number) > (sustainedUsage.eligibleUsers as number)) {
    fail("snapshot.sustainedUsage", "持续用户数不能大于符合观察资格的用户数");
  }
  assertMessages(sustainedUsage.messages, "snapshot.sustainedUsage.messages");
  assertArray(sustainedUsage.dailyTrend, "snapshot.sustainedUsage.dailyTrend");
  const trendStart = shiftDate(dataStartDate, 27);
  const expectedTrendLength = trendStart <= expectedAsOfDate
    ? daysBetween(trendStart, expectedAsOfDate) + 1
    : 0;
  if (sustainedUsage.dailyTrend.length !== expectedTrendLength) {
    fail("snapshot.sustainedUsage.dailyTrend", `必须连续覆盖 ${expectedTrendLength} 个 28 日滚动窗口`);
  }
  let previousContinuousUsers = 0;
  sustainedUsage.dailyTrend.forEach((entry, index) => {
    const path = `snapshot.sustainedUsage.dailyTrend[${index}]`;
    assertRecord(entry, path);
    assertStrictDate(entry.date, shiftDate(trendStart, index), `${path}.date`);
    ["continuousUsers", "eligibleUsers", "newContinuousUsers", "exitedContinuousUsers"]
      .forEach((key) => assertNonNegativeInteger(entry[key], `${path}.${key}`));
    if ((entry.continuousUsers as number) > (entry.eligibleUsers as number)) fail(path, "持续用户数不能大于符合观察资格的用户数");
    if (index === 0 && entry.exitedContinuousUsers !== 0) {
      fail(path, "首个可计算窗口不能有退出持续用户");
    }
    if (index > 0) {
      if ((entry.exitedContinuousUsers as number) > previousContinuousUsers) {
        fail(path, "退出持续用户不能大于前一日持续用户数");
      }
      const expectedContinuousUsers = previousContinuousUsers
        + (entry.newContinuousUsers as number)
        - (entry.exitedContinuousUsers as number);
      if (entry.continuousUsers !== expectedContinuousUsers) {
        fail(path, "持续用户数必须等于前一日持续用户数 + 新增 - 退出");
      }
    }
    previousContinuousUsers = entry.continuousUsers as number;
  });
  const currentTrend = sustainedUsage.dailyTrend.at(-1) as Record<string, unknown> | undefined;
  if (currentTrend) {
    const comparisons = [
      ["date", "asOfDate"],
      ["continuousUsers", "continuous28DayUsers"],
      ["eligibleUsers", "eligibleUsers"],
      ["newContinuousUsers", "newContinuousUsers"],
      ["exitedContinuousUsers", "exitedContinuousUsers"]
    ] as const;
    comparisons.forEach(([trendKey, currentKey]) => {
      if (currentTrend[trendKey] !== sustainedUsage[currentKey]) {
        fail("snapshot.sustainedUsage", `${currentKey} 必须与滚动趋势最后一天一致`);
      }
    });
  } else if (
    sustainedUsage.continuous28DayUsers !== 0
    || sustainedUsage.eligibleUsers !== 0
    || sustainedUsage.newContinuousUsers !== 0
    || sustainedUsage.exitedContinuousUsers !== 0
    || (sustainedUsage.messages as MessageTotals).total !== 0
  ) {
    fail("snapshot.sustainedUsage", "无可用 28 日窗口时持续使用指标必须为 0");
  }
  if (sustainedUsage.continuous28DayUsers === 0 && (sustainedUsage.messages as MessageTotals).total !== 0) {
    fail("snapshot.sustainedUsage.messages", "没有持续用户时消息数必须为 0");
  }
}

function cleanDate(value?: string) {
  return isIsoDate(value) ? value : undefined;
}

function startOfWeek(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

function clampDate(value: string, min: string, max: string) {
  return value < min ? min : value > max ? max : value;
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) / 86_400_000
  );
}

function rate(numerator: number, denominator: number): RateMetric {
  return {
    numerator,
    denominator,
    percentage: denominator <= 0 ? 0 : Number(((numerator * 100) / denominator).toFixed(1))
  };
}

function average(numerator: number, denominator: number): AverageMetric {
  return {
    numerator,
    denominator,
    value: denominator <= 0 ? 0 : Number((numerator / denominator).toFixed(2))
  };
}

function sumBy<T>(rows: T[], select: (row: T) => number) {
  return rows.reduce((total, row) => total + select(row), 0);
}

function buildDailyRetentionPoints(
  cohort: DailyRetentionCohort | undefined,
  throughDate: string
): DailyRetentionPoint[] {
  if (!cohort) return [];
  const observedDays = Math.max(0, Math.min(30, daysBetween(cohort.cohortDate, throughDate)));
  return cohort.points
    .filter((point) => Number.isInteger(point.day) && point.day >= 1 && point.day <= observedDays)
    .sort((a, b) => a.day - b.day)
    .map((point) => ({
      day: point.day,
      date: shiftDate(cohort.cohortDate, point.day),
      ...rate(point.numerator, cohort.denominator)
    }));
}

function newUserMessages(row: SnapshotDailyPoint) {
  return row.newUserBehavior.messages;
}

export function createDashboardFromSnapshot(snapshot: DashboardSnapshot, query: DashboardQuery): DashboardData {
  assertDashboardSnapshot(snapshot);
  const requestedFrom = cleanDate(query.from);
  const requestedTo = cleanDate(query.to);
  const from = requestedFrom
    ? clampDate(requestedFrom, snapshot.dataStartDate, snapshot.throughDate)
    : snapshot.dataStartDate;
  const to = requestedTo
    ? clampDate(requestedTo, snapshot.dataStartDate, snapshot.throughDate)
    : snapshot.throughDate;
  const requestedActivityDate = cleanDate(query.activityDate);
  const activityDate = requestedActivityDate
    ? clampDate(requestedActivityDate, snapshot.dataStartDate, snapshot.throughDate)
    : snapshot.throughDate;
  const earliestWeekStart = startOfWeek(snapshot.dataStartDate);
  const latestWeekStart = startOfWeek(snapshot.throughDate);
  const requestedWeekStart = cleanDate(query.weekStart);
  const weekStart = requestedWeekStart
    ? clampDate(startOfWeek(requestedWeekStart), earliestWeekStart, latestWeekStart)
    : latestWeekStart;
  const weekEnd = [shiftDate(weekStart, 6), snapshot.throughDate].sort()[0];
  const requestedTrendFrom = cleanDate(query.trendFrom);
  const requestedTrendTo = cleanDate(query.trendTo);
  const trendFrom = requestedTrendFrom
    ? clampDate(requestedTrendFrom, snapshot.dataStartDate, snapshot.throughDate)
    : snapshot.dataStartDate;
  const trendTo = requestedTrendTo
    ? clampDate(requestedTrendTo, snapshot.dataStartDate, snapshot.throughDate)
    : snapshot.throughDate;
  const latestSelectableRetentionDate = shiftDate(snapshot.throughDate, -1);
  const retentionMinDate = snapshot.dataStartDate < latestSelectableRetentionDate
    ? snapshot.dataStartDate
    : latestSelectableRetentionDate;
  const latestCohortWithUsers = snapshot.dailyRetentionCohorts
    .filter((cohort) => cohort.cohortDate <= latestSelectableRetentionDate && cohort.denominator > 0)
    .at(-1)?.cohortDate;
  const requestedRetentionDate = cleanDate(query.retentionDate);
  const retentionDate = requestedRetentionDate
    ? clampDate(requestedRetentionDate, retentionMinDate, latestSelectableRetentionDate)
    : latestCohortWithUsers ?? latestSelectableRetentionDate;

  if (from > to) throw new Error("开始日期不能晚于快照截止日期");
  if (trendFrom > trendTo) throw new Error("趋势开始日期不能晚于结束日期");
  if (daysBetween(from, to) > 3650) throw new Error("单次查询区间不能超过 10 年");

  const selectedDaily = snapshot.daily.filter((row) => row.date >= from && row.date <= to);
  const selectedTrendDaily = snapshot.daily.filter((row) => row.date >= trendFrom && row.date <= trendTo);
  const selectedCohorts = snapshot.activationCohorts.filter(
    (row) => row.registrationDate >= from && row.registrationDate <= to
  );
  const selectedRetentionCohort = snapshot.dailyRetentionCohorts.find(
    (cohort) => cohort.cohortDate === retentionDate
  );
  const dailyRetentionPoints = buildDailyRetentionPoints(selectedRetentionCohort, snapshot.throughDate);
  const activityAnchor = snapshot.daily.find((row) => row.date === activityDate);
  const weeklyAnchor = snapshot.daily.filter(
    (row) => row.weekStart === weekStart && row.date <= weekEnd
  ).at(-1);

  const sameDayNumerator = sumBy(selectedCohorts, (row) => row.sameDayNumerator);
  const sameDayDenominator = sumBy(selectedCohorts, (row) => row.sameDayDenominator);
  const sevenDayNumerator = sumBy(selectedCohorts, (row) => row.sevenDayNumerator);
  const sevenDayDenominator = sumBy(selectedCohorts, (row) => row.sevenDayDenominator);
  const recordDau = activityAnchor?.activeUsers ?? 0;
  const recordWau = weeklyAnchor?.recordWau ?? 0;
  const cohortMessages = {
    total: sumBy(selectedDaily, (row) => newUserMessages(row).total),
    text: sumBy(selectedDaily, (row) => newUserMessages(row).text),
    image: sumBy(selectedDaily, (row) => newUserMessages(row).image),
    voice: sumBy(selectedDaily, (row) => newUserMessages(row).voice),
    video: sumBy(selectedDaily, (row) => newUserMessages(row).video)
  };
  const continuous28DayUsers = snapshot.sustainedUsage.continuous28DayUsers;
  const eligibleUsers = snapshot.sustainedUsage.eligibleUsers;

  return {
    range: {
      from,
      to,
      allHistory: from === snapshot.dataStartDate && to === snapshot.throughDate,
      dataStartDate: snapshot.dataStartDate,
      dataThroughDate: snapshot.throughDate,
      timezone: snapshot.timezone
    },
    trendRange: {
      from: trendFrom,
      to: trendTo,
      allHistory: trendFrom === snapshot.dataStartDate && trendTo === snapshot.throughDate
    },
    dailyRetention: {
      cohortDate: retentionDate,
      cohortSize: selectedRetentionCohort?.denominator ?? 0,
      minDate: retentionMinDate,
      maxDate: latestSelectableRetentionDate,
      points: dailyRetentionPoints
    },
    sustainedUsage: {
      available: true,
      asOfDate: snapshot.sustainedUsage.asOfDate,
      continuous28DayUsers,
      continuousUserRate: rate(continuous28DayUsers, eligibleUsers),
      newContinuousUsers: snapshot.sustainedUsage.newContinuousUsers,
      exitedContinuousUsers: snapshot.sustainedUsage.exitedContinuousUsers,
      messages: snapshot.sustainedUsage.messages,
      dailyTrend: snapshot.sustainedUsage.dailyTrend.map((point) => ({
        ...point,
        percentage: rate(point.continuousUsers, point.eligibleUsers).percentage
      }))
    },
    totals: {
      registeredUsersAtStart: sumBy(snapshot.daily.filter((row) => row.date < from), (row) => row.registrations),
      registeredUsers: sumBy(snapshot.daily.filter((row) => row.date <= to), (row) => row.registrations),
      newUsers: sumBy(selectedDaily, (row) => row.registrations),
      messages: {
        total: sumBy(selectedDaily, (row) => row.messages.total),
        text: sumBy(selectedDaily, (row) => row.messages.text),
        image: sumBy(selectedDaily, (row) => row.messages.image),
        voice: sumBy(selectedDaily, (row) => row.messages.voice),
        video: sumBy(selectedDaily, (row) => row.messages.video)
      },
      highlightMomentImages: sumBy(selectedDaily, (row) => row.highlightImages),
      dailyEchoes: sumBy(selectedDaily, (row) => row.dailyEchoes)
    },
    newUserBehavior: {
      available: true,
      messages: cohortMessages,
      dailyEchoes: sumBy(selectedDaily, (row) => row.newUserBehavior.dailyEchoes),
      highlightMomentImages: sumBy(selectedDaily, (row) => row.newUserBehavior.highlightImages),
      dailyTrend: selectedDaily.map((row) => ({
        date: row.date,
        newUsers: row.registrations,
        messages: newUserMessages(row),
        dailyEchoes: row.newUserBehavior.dailyEchoes,
        highlightMomentImages: row.newUserBehavior.highlightImages
      }))
    },
    kpis: {
      sameDayActivation: rate(sameDayNumerator, sameDayDenominator),
      sevenDayActivation: rate(sevenDayNumerator, sevenDayDenominator),
      recordDau,
      recordDauDate: activityDate,
      recordDauWeekStart: activityAnchor?.weekStart ?? startOfWeek(activityDate),
      recordDauWeekEnd: activityDate,
      recordWau,
      weeklyEffectiveUsers: weeklyAnchor?.weeklyEffectiveUsers ?? 0,
      dauWau: rate(recordDau, activityAnchor?.recordWau ?? 0),
      weeklyAverageRecordDays: average(weeklyAnchor?.weeklyUserDays ?? 0, recordWau),
      weekStart,
      weekEnd
    },
    dailyTrend: selectedTrendDaily.map((row) => ({
      date: row.date,
      registrations: row.registrations,
      activeUsers: row.activeUsers,
      messages: row.messages.total
    })),
    queriedAt: snapshot.generatedAt
  };
}

export async function loadDashboardSnapshot(query: DashboardQuery) {
  const configuredPath = process.env.DASHBOARD_SNAPSHOT_PATH?.trim()
    || ".dashboard-data/production-snapshot.json";
  const snapshotPath = path.isAbsolute(configuredPath)
    ? configuredPath
    : path.join(process.cwd(), configuredPath);
  const raw = await readFile(snapshotPath, "utf8");
  const snapshot: unknown = JSON.parse(raw);
  assertDashboardSnapshot(snapshot);
  return createDashboardFromSnapshot(snapshot, query);
}
