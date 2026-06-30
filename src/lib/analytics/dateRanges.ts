export type DateRangePeriod = 'last_7_days' | 'last_14_days' | 'last_30_days' | 'this_month' | 'last_month';

export type DateRange = {
  period: DateRangePeriod;
  label: string;
  start: Date;
  end: Date;
};

const DAY_MS = 24 * 60 * 60 * 1000;

function startOfDay(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

export function dateToSql(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function dateToGa4(date: Date): string {
  return date.toISOString().slice(0, 10).replaceAll('-', '');
}

export function getDateRange(period: string | null | undefined): DateRange {
  const normalized = (
    period === 'last_14_days' ||
    period === 'last_30_days' ||
    period === 'this_month' ||
    period === 'last_month'
      ? period
      : 'last_7_days'
  ) satisfies DateRangePeriod;
  const today = startOfDay(new Date());

  if (normalized === 'this_month') {
    return {
      period: normalized,
      label: 'This month',
      start: new Date(today.getFullYear(), today.getMonth(), 1),
      end: today,
    };
  }

  if (normalized === 'last_month') {
    const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return {
      period: normalized,
      label: 'Last month',
      start,
      end: new Date(today.getFullYear(), today.getMonth(), 0),
    };
  }

  const days = normalized === 'last_30_days' ? 30 : normalized === 'last_14_days' ? 14 : 7;
  return {
    period: normalized,
    label: `Last ${days} days`,
    start: addDays(today, -(days - 1)),
    end: today,
  };
}

export function getPreviousDateRange(range: DateRange): DateRange {
  const days = Math.max(1, Math.round((startOfDay(range.end).getTime() - startOfDay(range.start).getTime()) / DAY_MS) + 1);
  const previousEnd = addDays(startOfDay(range.start), -1);
  return {
    period: range.period,
    label: `Previous ${days} days`,
    start: addDays(previousEnd, -(days - 1)),
    end: previousEnd,
  };
}

export function getDateRangeFromSearchParams(params: Record<string, string | string[] | undefined>): DateRange {
  const raw = params.period;
  return getDateRange(Array.isArray(raw) ? raw[0] : raw);
}
