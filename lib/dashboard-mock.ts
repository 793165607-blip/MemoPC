import type { DashboardData, DashboardQuery, MessageTotals } from "./dashboard-types";

const DAY = 86_400_000;

function isoDate(value: Date) {
  return value.toISOString().slice(0, 10);
}

function sum(values: number[]) {
  return values.reduce((total, value) => total + value, 0);
}

function rateMetric(denominator: number, expectedRate: number) {
  const numerator = Math.round(denominator * expectedRate);
  return {
    numerator,
    denominator,
    percentage: denominator ? Number((numerator / denominator * 100).toFixed(1)) : 0
  };
}

function mockNewUserMessages(newUsers: number, index: number): MessageTotals {
  const total = newUsers ? newUsers * (3 + index % 5) : 0;
  const image = total ? Math.max(0, Math.round(total * 0.08)) : 0;
  const voice = total ? Math.max(0, Math.round(total * 0.05)) : 0;
  const video = total >= 8 && index % 4 === 0 ? 1 : 0;
  return { total, text: Math.max(0, total - image - voice - video), image, voice, video };
}

function weekStart(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  const offset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - offset);
  return isoDate(date);
}

function shiftDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return isoDate(date);
}

function clampDate(value: string, min: string, max: string) {
  return value < min ? min : value > max ? max : value;
}

function daysBetween(from: string, to: string) {
  return Math.round(
    (Date.parse(`${to}T12:00:00.000Z`) - Date.parse(`${from}T12:00:00.000Z`)) / DAY
  );
}

function buildMockDailyRetention(cohortDate: string, cohortSize: number, observedDays: number) {
  return Array.from({ length: observedDays }, (_, index) => {
    const day = index + 1;
    const expectedRate = Math.max(0.05, 0.46 * Math.exp(-day / 18) + Math.sin(day / 3) * 0.025);
    const metric = rateMetric(cohortSize, expectedRate);
    return { day, date: shiftDate(cohortDate, day), ...metric };
  });
}

export function createDashboardMock(query: DashboardQuery = {}): DashboardData {
  const end = new Date("2026-08-24T12:00:00.000Z");
  const start = new Date("2026-01-01T12:00:00.000Z");
  const allTrend: DashboardData["dailyTrend"] = [];

  for (let time = start.getTime(), index = 0; time <= end.getTime(); time += DAY, index += 1) {
    const wave = Math.sin(index / 8) * 2.2;
    const activeUsers = Math.max(0, Math.round(3 + index / 55 + wave));
    allTrend.push({
      date: isoDate(new Date(time)),
      registrations: index % 9 === 0 ? 2 : index % 4 === 0 ? 1 : 0,
      activeUsers,
      messages: Math.max(0, Math.round(activeUsers * (4 + (index % 5))))
    });
  }

  const allFrom = isoDate(start);
  const allTo = isoDate(end);
  const from = query.from && query.from > allFrom ? query.from : allFrom;
  const to = query.to && query.to < allTo ? query.to : allTo;
  const activityDate = clampDate(query.activityDate ?? allTo, allFrom, allTo);
  const activityPoint = allTrend.find((point) => point.date === activityDate);
  const selectedWeekStart = clampDate(
    weekStart(query.weekStart ?? allTo),
    weekStart(allFrom),
    weekStart(allTo)
  );
  const selectedWeekEnd = [shiftDate(selectedWeekStart, 6), allTo].sort()[0];
  const weeklyPoint = allTrend.filter(
    (point) => point.date >= selectedWeekStart && point.date <= selectedWeekEnd
  ).at(-1);
  const trendFrom = clampDate(query.trendFrom ?? allFrom, allFrom, allTo);
  const trendTo = clampDate(query.trendTo ?? allTo, allFrom, allTo);
  const latestSelectableRetentionDate = shiftDate(allTo, -1);
  const latestRetentionDateWithUsers = allTrend
    .filter((point) => point.date <= latestSelectableRetentionDate && point.registrations > 0)
    .at(-1)?.date ?? latestSelectableRetentionDate;
  const retentionDate = clampDate(
    query.retentionDate ?? latestRetentionDateWithUsers,
    allFrom,
    latestSelectableRetentionDate
  );
  if (trendFrom > trendTo) throw new Error("趋势开始日期不能晚于结束日期");
  const selectedDaily = allTrend.filter((point) => point.date >= from && point.date <= to);
  const dailyTrend = allTrend.filter((point) => point.date >= trendFrom && point.date <= trendTo);
  const retentionRegistrations = allTrend.find((point) => point.date === retentionDate)?.registrations ?? 0;
  const retentionCohortSize = retentionRegistrations ? Math.max(1, Math.round(retentionRegistrations * 0.66)) : 0;
  const observedRetentionDays = Math.max(0, Math.min(30, daysBetween(retentionDate, allTo)));
  const dailyRetentionPoints = buildMockDailyRetention(retentionDate, retentionCohortSize, observedRetentionDays);
  const allMessages = sum(allTrend.map((point) => point.messages));
  const selectedMessages = sum(selectedDaily.map((point) => point.messages));
  const messagesTotal = Math.round(13_089 * (selectedMessages / Math.max(allMessages, 1)));
  const messagesText = Math.round(messagesTotal * 0.904);
  const messagesImage = Math.round(messagesTotal * 0.047);
  const messagesVoice = Math.round(messagesTotal * 0.037);
  const messagesVideo = Math.max(0, messagesTotal - messagesText - messagesImage - messagesVoice);
  const newUsers = sum(selectedDaily.map((point) => point.registrations));
  const registrationsBeforeRange = sum(allTrend.filter((point) => point.date < from).map((point) => point.registrations));
  const lifetimeRegistrations = sum(allTrend.filter((point) => point.date <= to).map((point) => point.registrations));
  const recordDau = activityPoint?.activeUsers ?? 0;
  const activityRecordWau = Math.max(recordDau, Math.round(recordDau * 2.8));
  const weeklyDau = weeklyPoint?.activeUsers ?? 0;
  const recordWau = Math.max(weeklyDau, Math.round(weeklyDau * 2.8));
  const userDays = Math.round(recordWau * 2.33);
  const ratio = selectedDaily.length / allTrend.length;
  const newUserDailyTrend = selectedDaily.map((point, index) => ({
    date: point.date,
    newUsers: point.registrations,
    messages: mockNewUserMessages(point.registrations, index),
    dailyEchoes: point.registrations && index % 3 !== 0 ? 1 : 0,
    highlightMomentImages: point.registrations && index % 11 === 0 ? 1 : 0
  }));
  const newUserMessageTotals = {
    total: sum(newUserDailyTrend.map((point) => point.messages.total)),
    text: sum(newUserDailyTrend.map((point) => point.messages.text)),
    image: sum(newUserDailyTrend.map((point) => point.messages.image)),
    voice: sum(newUserDailyTrend.map((point) => point.messages.voice)),
    video: sum(newUserDailyTrend.map((point) => point.messages.video))
  };
  const sustainedAsOfDate = shiftDate(allTo, -1);
  const sustainedDailyTrend = allTrend
    .filter((point) => point.date >= shiftDate(allFrom, 27) && point.date <= sustainedAsOfDate)
    .map((point, index) => {
      const eligibleUsers = 18 + Math.floor(index / 24);
      const continuousUsers = Math.max(2, Math.round(eligibleUsers * (0.24 + Math.sin(index / 17) * 0.04)));
      const previous = index > 0
        ? Math.max(2, Math.round((18 + Math.floor((index - 1) / 24)) * (0.24 + Math.sin((index - 1) / 17) * 0.04)))
        : continuousUsers;
      const newContinuousUsers = Math.max(0, continuousUsers - previous) + (index % 19 === 0 ? 1 : 0);
      const exitedContinuousUsers = Math.max(0, previous - continuousUsers) + (index % 23 === 0 ? 1 : 0);
      return {
        date: point.date,
        continuousUsers,
        eligibleUsers,
        percentage: Number(((continuousUsers * 100) / eligibleUsers).toFixed(1)),
        newContinuousUsers,
        exitedContinuousUsers
      };
    });
  const sustainedCurrent = sustainedDailyTrend.at(-1) ?? {
    continuousUsers: 0,
    eligibleUsers: 0,
    percentage: 0,
    newContinuousUsers: 0,
    exitedContinuousUsers: 0
  };

  return {
    range: {
      from,
      to,
      allHistory: !query.from && !query.to,
      dataStartDate: allFrom,
      dataThroughDate: allTo,
      timezone: "Asia/Shanghai"
    },
    trendRange: {
      from: trendFrom,
      to: trendTo,
      allHistory: !query.trendFrom && !query.trendTo
    },
    dailyRetention: {
      cohortDate: retentionDate,
      cohortSize: retentionCohortSize,
      minDate: allFrom,
      maxDate: latestSelectableRetentionDate,
      points: dailyRetentionPoints
    },
    sustainedUsage: {
      available: true,
      asOfDate: sustainedAsOfDate,
      continuous28DayUsers: sustainedCurrent.continuousUsers,
      continuousUserRate: {
        numerator: sustainedCurrent.continuousUsers,
        denominator: sustainedCurrent.eligibleUsers,
        percentage: sustainedCurrent.percentage
      },
      newContinuousUsers: sustainedCurrent.newContinuousUsers,
      exitedContinuousUsers: sustainedCurrent.exitedContinuousUsers,
      messages: { total: 486, text: 421, image: 28, voice: 31, video: 6 },
      dailyTrend: sustainedDailyTrend
    },
    totals: {
      registeredUsersAtStart: 150 + registrationsBeforeRange,
      registeredUsers: 150 + lifetimeRegistrations,
      newUsers,
      messages: {
        total: messagesTotal,
        text: messagesText,
        image: messagesImage,
        voice: messagesVoice,
        video: messagesVideo
      },
      highlightMomentImages: Math.round(18 * ratio),
      dailyEchoes: Math.round(164 * ratio)
    },
    newUserBehavior: {
      available: true,
      messages: newUserMessageTotals,
      dailyEchoes: sum(newUserDailyTrend.map((point) => point.dailyEchoes)),
      highlightMomentImages: sum(newUserDailyTrend.map((point) => point.highlightMomentImages)),
      dailyTrend: newUserDailyTrend
    },
    kpis: {
      sameDayActivation: rateMetric(newUsers, 0.449),
      sevenDayActivation: rateMetric(newUsers, 0.325),
      recordDau,
      recordDauDate: activityDate,
      recordDauWeekStart: weekStart(activityDate),
      recordDauWeekEnd: activityDate,
      recordWau,
      weeklyEffectiveUsers: Math.round(recordWau / 2),
      dauWau: { numerator: recordDau, denominator: activityRecordWau, percentage: activityRecordWau ? Number((recordDau / activityRecordWau * 100).toFixed(1)) : 0 },
      weeklyAverageRecordDays: { numerator: userDays, denominator: recordWau, value: recordWau ? Number((userDays / recordWau).toFixed(2)) : 0 },
      weekStart: selectedWeekStart,
      weekEnd: selectedWeekEnd
    },
    dailyTrend,
    queriedAt: "2026-08-24T13:58:00Z"
  };
}
