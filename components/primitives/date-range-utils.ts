export type CalendarMonth = { year: number; month: number };

export function monthFromIso(value: string): CalendarMonth {
  const [year, month] = value.split("-").map(Number);
  return { year, month: month - 1 };
}

export function addMonths(value: CalendarMonth, amount: number): CalendarMonth {
  const date = new Date(Date.UTC(value.year, value.month + amount, 1));
  return { year: date.getUTCFullYear(), month: date.getUTCMonth() };
}

export function monthKey(value: CalendarMonth) {
  return value.year * 12 + value.month;
}

export function monthLabel(value: CalendarMonth) {
  return `${value.year}年${value.month + 1}月`;
}

export function calendarDays(value: CalendarMonth) {
  const firstWeekday = (new Date(Date.UTC(value.year, value.month, 1)).getUTCDay() + 6) % 7;
  const total = new Date(Date.UTC(value.year, value.month + 1, 0)).getUTCDate();
  return [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: total }, (_, index) => {
      const day = index + 1;
      const iso = `${value.year}-${String(value.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      return { day, iso };
    })
  ];
}

export function formatCalendarDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", { year: "numeric", month: "long", day: "numeric" })
    .format(new Date(`${value}T12:00:00+08:00`));
}

export function formatRange(from?: string, to?: string) {
  if (!from) return "";
  if (!to || from === to) return formatCalendarDate(from);
  return `${formatCalendarDate(from)} — ${formatCalendarDate(to)}`;
}

export function shiftCalendarDate(value: string, days: number) {
  const date = new Date(`${value}T12:00:00.000Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

export function startOfIsoWeek(value: string) {
  const date = new Date(`${value}T12:00:00.000Z`);
  const mondayOffset = (date.getUTCDay() + 6) % 7;
  date.setUTCDate(date.getUTCDate() - mondayOffset);
  return date.toISOString().slice(0, 10);
}
