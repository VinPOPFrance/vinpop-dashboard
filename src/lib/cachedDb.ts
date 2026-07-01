import { unstable_cache } from 'next/cache';
import { getBusinessOverview, getBusinessOverviewPeriodTrends, getCustomerIntelligence, getMetaAdsPerformance, getRatingsIntelligence, getSiteBehavior, getTodayActionPlan } from '@/lib/db';
import type { DateRange, DateRangePeriod } from '@/lib/analytics/dateRanges';

const SHORT_REVALIDATE_SECONDS = 60;

export const getCachedBusinessOverview = unstable_cache(
  () => getBusinessOverview(),
  ['business-overview'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedTodayActionPlan = unstable_cache(
  () => getTodayActionPlan(),
  ['today-action-plan'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedCustomerIntelligence = unstable_cache(
  () => getCustomerIntelligence(),
  ['customer-intelligence'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedMetaAdsPerformance = unstable_cache(
  () => getMetaAdsPerformance(),
  ['meta-ads-performance'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedRatingsIntelligence = unstable_cache(
  () => getRatingsIntelligence(),
  ['ratings-intelligence'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedBusinessOverviewPeriodTrends = unstable_cache(
  (period: DateRangePeriod, label: string, start: string, end: string) =>
    getBusinessOverviewPeriodTrends({
      period,
      label,
      start: new Date(start),
      end: new Date(end),
    }),
  ['business-overview-period-trends'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedSiteBehavior = unstable_cache(
  (period: DateRangePeriod, label: string, start: string, end: string) =>
    getSiteBehavior({
      period,
      label,
      start: new Date(start),
      end: new Date(end),
    }),
  ['site-behavior'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export function rangeCacheArgs(range: DateRange): [DateRangePeriod, string, string, string] {
  return [range.period, range.label, range.start.toISOString(), range.end.toISOString()];
}
