export type RateMetric = {
  numerator: number;
  denominator: number;
  percentage: number;
};

export type AverageMetric = {
  numerator: number;
  denominator: number;
  value: number;
};

export type MessageTotals = {
  total: number;
  text: number;
  image: number;
  voice: number;
  video: number;
};

export type NewUserDailyTrendPoint = {
  date: string;
  newUsers: number;
  messages: MessageTotals;
  dailyEchoes: number;
  highlightMomentImages: number;
};

export type DailyRetentionPoint = {
  day: number;
  date: string;
  numerator: number;
  denominator: number;
  percentage: number;
};

export type SustainedUsageTrendPoint = {
  date: string;
  continuousUsers: number;
  eligibleUsers: number;
  percentage: number;
  newContinuousUsers: number;
  exitedContinuousUsers: number;
};

export type DashboardData = {
  range: {
    from: string;
    to: string;
    allHistory: boolean;
    dataStartDate: string;
    dataThroughDate: string;
    timezone: string;
  };
  trendRange: {
    from: string;
    to: string;
    allHistory: boolean;
  };
  dailyRetention: {
    cohortDate: string;
    cohortSize: number;
    minDate: string;
    maxDate: string;
    points: DailyRetentionPoint[];
  };
  sustainedUsage: {
    available: boolean;
    asOfDate: string;
    continuous28DayUsers: number;
    continuousUserRate: RateMetric;
    newContinuousUsers: number;
    exitedContinuousUsers: number;
    messages: MessageTotals;
    dailyTrend: SustainedUsageTrendPoint[];
  };
  totals: {
    registeredUsersAtStart: number;
    registeredUsers: number;
    newUsers: number;
    messages: MessageTotals;
    highlightMomentImages: number;
    dailyEchoes: number;
  };
  newUserBehavior: {
    available: boolean;
    messages: MessageTotals;
    dailyEchoes: number;
    highlightMomentImages: number;
    dailyTrend: NewUserDailyTrendPoint[];
  };
  kpis: {
    sameDayActivation: RateMetric;
    sevenDayActivation: RateMetric;
    recordDau: number;
    recordDauDate: string;
    recordDauWeekStart: string;
    recordDauWeekEnd: string;
    recordWau: number;
    weeklyEffectiveUsers: number;
    dauWau: RateMetric;
    weeklyAverageRecordDays: AverageMetric;
    weekStart: string;
    weekEnd: string;
  };
  dailyTrend: Array<{
    date: string;
    registrations: number;
    activeUsers: number;
    messages: number;
  }>;
  queriedAt: string;
};

export type DashboardQuery = {
  from?: string;
  to?: string;
  activityDate?: string;
  weekStart?: string;
  trendFrom?: string;
  trendTo?: string;
  retentionDate?: string;
};

export type DashboardRangeParam =
  | "from"
  | "to"
  | "trendFrom"
  | "trendTo";

export type DashboardDataSource = "mock" | "snapshot" | "live";

export type DashboardLoadResult =
  | { status: "ready"; data: DashboardData; source: DashboardDataSource }
  | { status: "configuration"; message?: string }
  | { status: "error"; message?: string };
