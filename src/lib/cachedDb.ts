import { unstable_cache } from 'next/cache';
import { getAcquisitionTraffic, getBusinessOverview, getBusinessOverviewPeriodTrends, getCustomerIntelligence, getGa4OverviewTrends, getMetaAdsOverviewSummary, getMetaAdsPerformance, getRatingsIntelligence, getSiteBehavior, getTodayActionPlan } from '@/lib/db';
import type { DateRange, DateRangePeriod } from '@/lib/analytics/dateRanges';
import { timeAsync } from '@/lib/performance';

const SHORT_REVALIDATE_SECONDS = 60;

export const getCachedBusinessOverview = unstable_cache(
  () =>
    timeAsync('helper:getBusinessOverview', () => getBusinessOverview(), {
      category: 'helper',
      cacheStatus: 'unknown',
    }),
  ['business-overview'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedTodayActionPlan = unstable_cache(
  () =>
    timeAsync('helper:getTodayActionPlan', () => getTodayActionPlan(), {
      category: 'helper',
      cacheStatus: 'unknown',
      rowCount: (result) => (result.ok ? result.metrics.topActions.length : null),
    }),
  ['today-action-plan'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedCustomerIntelligence = unstable_cache(
  () =>
    timeAsync('helper:getCustomerIntelligence', () => getCustomerIntelligence(), {
      category: 'helper',
      cacheStatus: 'unknown',
      rowCount: (result) => (result.ok ? result.metrics.customers.length : null),
    }),
  ['customer-intelligence-v2'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedMetaAdsPerformance = unstable_cache(
  () =>
    timeAsync('helper:getMetaAdsPerformance', () => getMetaAdsPerformance(), {
      category: 'helper',
      cacheStatus: 'unknown',
      rowCount: (result) => (result.ok ? result.metrics.daily.length : null),
    }),
  ['meta-ads-performance'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedMetaAdsOverviewSummary = unstable_cache(
  (period: DateRangePeriod, label: string, start: string, end: string) =>
    timeAsync(
      'helper:getMetaAdsOverviewSummary',
      () =>
        getMetaAdsOverviewSummary({
          period,
          label,
          start: new Date(start),
          end: new Date(end),
        }),
      {
        category: 'helper',
        cacheStatus: 'unknown',
        rowCount: (result) => (result.ok ? result.metrics.daily.length : null),
      },
    ),
  ['meta-ads-overview-summary'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedRatingsIntelligence = unstable_cache(
  () =>
    timeAsync('helper:getRatingsIntelligence', () => getRatingsIntelligence(), {
      category: 'helper',
      cacheStatus: 'unknown',
      rowCount: (result) => (result.ok ? result.metrics.customers.length : null),
    }),
  ['ratings-intelligence'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedBusinessOverviewPeriodTrends = unstable_cache(
  (period: DateRangePeriod, label: string, start: string, end: string) =>
    timeAsync(
      'helper:getBusinessOverviewPeriodTrends',
      () =>
        getBusinessOverviewPeriodTrends({
          period,
          label,
          start: new Date(start),
          end: new Date(end),
        }),
      {
        category: 'helper',
        cacheStatus: 'unknown',
      },
    ),
  ['business-overview-period-trends'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedSiteBehavior = unstable_cache(
  (period: DateRangePeriod, label: string, start: string, end: string) =>
    timeAsync(
      'helper:getSiteBehavior',
      () =>
        getSiteBehavior({
          period,
          label,
          start: new Date(start),
          end: new Date(end),
        }),
      {
        category: 'helper',
        cacheStatus: 'unknown',
        rowCount: (result) => (result.ok ? result.metrics.series.length : null),
      },
    ),
  ['site-behavior'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedGa4OverviewTrends = unstable_cache(
  (period: DateRangePeriod, label: string, start: string, end: string) =>
    timeAsync(
      'helper:getGa4OverviewTrends',
      () =>
        getGa4OverviewTrends({
          period,
          label,
          start: new Date(start),
          end: new Date(end),
        }),
      {
        category: 'helper',
        cacheStatus: 'unknown',
        rowCount: (result) => (result.ok ? result.metrics.daily.length : null),
      },
    ),
  ['ga4-overview-trends'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export const getCachedAcquisitionTraffic = unstable_cache(
  (period: DateRangePeriod, label: string, start: string, end: string) =>
    timeAsync(
      'helper:getAcquisitionTraffic',
      () =>
        getAcquisitionTraffic({
          period,
          label,
          start: new Date(start),
          end: new Date(end),
        }),
      {
        category: 'helper',
        cacheStatus: 'unknown',
        rowCount: (result) => (result.ok ? result.metrics.series.length : null),
      },
    ),
  ['acquisition-traffic'],
  { revalidate: SHORT_REVALIDATE_SECONDS },
);

export function rangeCacheArgs(range: DateRange): [DateRangePeriod, string, string, string] {
  return [range.period, range.label, range.start.toISOString(), range.end.toISOString()];
}
