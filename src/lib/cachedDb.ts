import { unstable_cache } from 'next/cache';
import {
  getAcquisitionOrders,
  getChurnRisk,
  getFoodPairingIntelligence,
  getGoogleAdsKeywordPerformance,
  getGoogleAdsTrafficQuality,
  getLastAirbyteSync,
  getMetaAdsOverviewSummary,
  getMetaAdsPerformance,
  getMetaCreativeAttribution,
  getProductConversion,
  getQuizFunnel,
  getRatingsIntelligence,
  getShopifyOrdersSummary,
  getSiteExperience,
  getSmartBoxConversion,
  getTrackingReadiness,
} from '@/lib/db';
import type { DateRange, DateRangePeriod } from '@/lib/analytics/dateRanges';
import { timeAsync } from '@/lib/performance';

/**
 * Acces en lecture mis en cache.
 *
 * Regle du projet : une page ne doit jamais importer un getter depuis
 * `@/lib/db` directement. Plusieurs pages lisaient la meme metrique, certaines
 * via le cache et d autres non, ce qui rejouait la meme requete lourde deux ou
 * trois fois par navigation. Chaque getter n a
 * plus qu un seul point d entree cache, defini ici.
 */

const SHORT_REVALIDATE_SECONDS = 60;

/**
 * La fraicheur des donnees change au rythme des synchronisations Airbyte,
 * pas a celui des pages : inutile de la relire chaque minute.
 */
const FRESHNESS_REVALIDATE_SECONDS = 300;

/**
 * Enveloppe un getter sans argument.
 *
 * Chaque appel est mesure (`timeAsync`) et memoise sous une cle stable. Les
 * dix wrappers repetaient auparavant ces quinze lignes a l identique.
 */
function cached<TResult>(
  cacheKey: string,
  label: string,
  run: () => Promise<TResult>,
  rowCount?: (result: TResult) => number | null,
  revalidate: number = SHORT_REVALIDATE_SECONDS,
) {
  return unstable_cache(
    () => timeAsync(`helper:${label}`, run, { category: 'helper', cacheStatus: 'unknown', rowCount }),
    [cacheKey],
    { revalidate },
  );
}

/**
 * Enveloppe un getter qui depend d une periode.
 *
 * `unstable_cache` ne sait memoiser que des arguments serialisables : la plage
 * est donc eclatee en quatre primitives (voir `rangeCacheArgs`) puis
 * reconstruite ici. Deux periodes differentes occupent deux entrees de cache.
 */
function cachedByRange<TResult>(
  cacheKey: string,
  label: string,
  run: (range: DateRange) => Promise<TResult>,
  rowCount?: (result: TResult) => number | null,
) {
  return unstable_cache(
    (period: DateRangePeriod, rangeLabel: string, start: string, end: string) =>
      timeAsync(
        `helper:${label}`,
        () => run({ period, label: rangeLabel, start: new Date(start), end: new Date(end) }),
        { category: 'helper', cacheStatus: 'unknown', rowCount },
      ),
    [cacheKey],
    { revalidate: SHORT_REVALIDATE_SECONDS },
  );
}

/** Eclate une plage de dates en arguments memoisables par `unstable_cache`. */
export function rangeCacheArgs(range: DateRange): [DateRangePeriod, string, string, string] {
  return [range.period, range.label, range.start.toISOString(), range.end.toISOString()];
}

// --------------------------------------------------------------- sans periode

export const getCachedMetaAdsPerformance = cached(
  'meta-ads-performance-v2',
  'getMetaAdsPerformance',
  getMetaAdsPerformance,
  (result) => (result.ok ? result.metrics.daily.length : null),
);

export const getCachedMetaCreativeAttribution = cached(
  'meta-creative-attribution-v3',
  'getMetaCreativeAttribution',
  getMetaCreativeAttribution,
  (result) => (result.ok ? result.metrics.orders.length : null),
);

export const getCachedAcquisitionOrders = cached(
  'acquisition-orders-v2',
  'getAcquisitionOrders',
  getAcquisitionOrders,
  (result) => (result.ok ? result.metrics.orders.length : null),
);

export const getCachedRatingsIntelligence = cached(
  'ratings-intelligence',
  'getRatingsIntelligence',
  getRatingsIntelligence,
  (result) => (result.ok ? result.metrics.customers.length : null),
);

export const getCachedTrackingReadiness = cached('tracking-readiness', 'getTrackingReadiness', getTrackingReadiness);

export const getCachedFoodPairingIntelligence = cached(
  'food-pairing-intelligence',
  'getFoodPairingIntelligence',
  getFoodPairingIntelligence,
);

export const getCachedShopifyOrdersSummary = cached(
  'shopify-orders-summary',
  'getShopifyOrdersSummary',
  getShopifyOrdersSummary,
);

export const getCachedLastAirbyteSync = cached(
  'airbyte-freshness',
  'getLastAirbyteSync',
  getLastAirbyteSync,
  undefined,
  FRESHNESS_REVALIDATE_SECONDS,
);

// --------------------------------------------------------------- avec periode

export const getCachedMetaAdsOverviewSummary = cachedByRange(
  'meta-ads-overview-summary-v2',
  'getMetaAdsOverviewSummary',
  getMetaAdsOverviewSummary,
  (result) => (result.ok ? result.metrics.daily.length : null),
);

export const getCachedSiteExperience = cachedByRange(
  'site-experience',
  'getSiteExperience',
  getSiteExperience,
  (result) => (result.ok ? result.metrics.pages.length : null),
);

export const getCachedGoogleAdsKeywordPerformance = cachedByRange(
  'google-ads-keywords',
  'getGoogleAdsKeywordPerformance',
  getGoogleAdsKeywordPerformance,
  (result) => (result.ok ? result.metrics.keywords.length : null),
);

export const getCachedGoogleAdsTrafficQuality = cachedByRange(
  'google-ads-traffic-quality-v2',
  'getGoogleAdsTrafficQuality',
  getGoogleAdsTrafficQuality,
  (result) => (result.ok ? result.metrics.campaigns.length : null),
);

export const getCachedQuizFunnel = cachedByRange(
  'quiz-funnel',
  'getQuizFunnel',
  getQuizFunnel,
  (result) => (result.ok ? result.metrics.daily.length : null),
);

export const getCachedProductConversion = cachedByRange(
  'product-conversion',
  'getProductConversion',
  getProductConversion,
  (result) => (result.ok ? result.metrics.products.length : null),
);

export const getCachedSmartBoxConversion = cachedByRange(
  'smart-box-conversion',
  'getSmartBoxConversion',
  getSmartBoxConversion,
  (result) => (result.ok ? result.metrics.customers.length : null),
);

export const getCachedChurnRisk = cachedByRange(
  'churn-risk',
  'getChurnRisk',
  getChurnRisk,
  (result) => (result.ok ? result.metrics.customers.length : null),
);
