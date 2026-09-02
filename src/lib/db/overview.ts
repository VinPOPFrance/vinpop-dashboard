/**
 * Vues transversales : elles croisent plusieurs sources (Shopify, GA4, Meta,
 * base VinPop) et ne peuvent donc appartenir a aucun module de source unique.
 */

import 'server-only';
import { getCustomerActivityReadiness } from './admin';
import { getPool, numberFromPg, rate, ratio } from './client';
import { ga4Bounds } from './ga4';
import { getFoodPairingIntelligence, getRatingsConversion, getRatingsIntelligence } from './internal';
import { getMetaAdsPerformance } from './meta';
import { getRepeatCustomerMetrics, getShopifyFunnelBasic, getShopifyOrdersSummary, getShopifyProductsSummary, getStartupPackAnalysis, getStartupPackRetention, getStockMovementSummary } from './shopify';
import { lineItemsBaseCte } from './sql';
import { type AcquisitionEconomicsBasicResult, type BusinessOverviewPeriodTrendsResult, type BusinessOverviewResult, type CopyVersionPerformanceResult, type CopyVersionPeriodInput, type RatingsConversionMetrics, type RepeatCustomerMetrics, type ShopifyFunnelBasicMetrics, type ShopifyOrdersAggregateMetrics, type ShopifyProductsSummaryResult, type StartupPackAnalysisMetrics, type StartupPackRetentionMetrics, type StockMovementSummaryMetrics, type TodayAction, type TodayActionPlanResult, type TrackingReadinessResult, type ProductConversionResult, type ProductConversionRow, type TrackingReadinessTable } from './types';
import { dateToSql, getPreviousDateRange, type DateRange } from '@/lib/analytics/dateRanges';
import { calculateTrend } from '@/lib/analytics/trends';

export type AcquisitionEconomicsBasicRow = {
  users_count: string | null;
  quiz_count: string | null;
  ratings_count: string | null;
  shopify_customers_count: string | null;
  orders_count: string | null;
  paid_orders_count: string | null;
  cancelled_orders_count: string | null;
  abandoned_checkout_count: string | null;
  startup_pack_orders_count: string | null;
  box_orders_count: string | null;
  free_bottle_quantity: string | null;
  product_discount_value: string | null;
  total_revenue: string | null;
  average_order_value: string | null;
};

export const trackingVisitorFields = [
  'visitor_id',
  'first_seen_at',
  'last_seen_at',
  'landing_page',
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'meta_click_id',
  'country',
  'city',
  'region',
  'device',
  'consent_analytics',
  'consent_marketing',
];

export const trackingSessionFields = [
  'session_id',
  'visitor_id',
  'customer_id',
  'started_at',
  'ended_at',
  'page_count',
  'click_count',
  'source',
  'campaign',
  'device',
  'country',
  'city',
  'region',
];

export const trackingEventFields = [
  'event_id',
  'visitor_id',
  'session_id',
  'customer_id',
  'event_name',
  'event_time',
  'page_url',
  'referrer',
  'product_id',
  'order_id',
  'funnel_stage',
];

export type TrackingMetadataRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
};

export type TrackingCountRow = {
  table_name: string;
  row_count: string | null;
  first_date: string | null;
  latest_date: string | null;
};

export function hasColumn(tables: TrackingReadinessTable[], columnNames: string[]) {
  const wanted = new Set(columnNames.map((column) => column.toLowerCase()));
  return tables.some((table) => table.matchedColumns.some((column) => wanted.has(column.toLowerCase())));
}

export async function getTrackingReadiness(): Promise<TrackingReadinessResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const [metadataResult, countsResult] = await Promise.all([
      pool.query<TrackingMetadataRow>(`
        SELECT table_schema, table_name, column_name
        FROM information_schema.columns
        WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
          AND (
            table_name ILIKE ANY ($1)
            OR column_name ILIKE ANY ($1)
          )
        ORDER BY table_schema, table_name, ordinal_position
        LIMIT 1000
      `, [[
        '%google%', '%ga4%', '%analytics%', '%sessions%', '%session%', '%events%', '%event%',
        '%visitor%', '%visitors%', '%pageviews%', '%page_views%', '%clicks%', '%activity%',
        '%utm%', '%meta_click_id%', '%fbp%', '%fbc%', '%gclid%', '%checkout%', '%abandoned%',
      ]]),
      pool.query<TrackingCountRow>(`
        SELECT 'traffic_acquisition_session_source_medium_report' AS table_name, COUNT(*)::text AS row_count, MIN(date)::text AS first_date, MAX(date)::text AS latest_date FROM public.traffic_acquisition_session_source_medium_report
        UNION ALL SELECT 'traffic_acquisition_session_campaign_report', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.traffic_acquisition_session_campaign_report
        UNION ALL SELECT 'traffic_acquisition_session_default_channel_grouping_report', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.traffic_acquisition_session_default_channel_grouping_report
        UNION ALL SELECT 'devices', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.devices
        UNION ALL SELECT 'daily_active_users', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.daily_active_users
        UNION ALL SELECT 'conversions_report', COUNT(*)::text, MIN(date)::text, MAX(date)::text FROM public.conversions_report
        UNION ALL SELECT 'site_events', COUNT(*)::text, MIN(event_time)::text, MAX(event_time)::text FROM public.site_events
        UNION ALL SELECT 'shopify.abandoned_checkouts', COUNT(*)::text, MIN(created_at)::text, MAX(created_at)::text FROM shopify.abandoned_checkouts
        UNION ALL SELECT 'shopify.orders', COUNT(*)::text, MIN(created_at)::text, MAX(created_at)::text FROM shopify.orders
      `),
    ]);

    const countMap = new Map(countsResult.rows.map((row) => [row.table_name, row]));
    const grouped = new Map<string, TrackingReadinessTable>();
    for (const row of metadataResult.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      const current = grouped.get(key) ?? {
        schemaName: row.table_schema,
        tableName: row.table_name,
        rowCount: null,
        firstDate: null,
        latestDate: null,
        matchedColumns: [],
      };
      current.matchedColumns.push(row.column_name);
      const count = countMap.get(row.table_name) ?? countMap.get(`${row.table_schema}.${row.table_name}`);
      if (count) {
        current.rowCount = numberFromPg(count.row_count);
        current.firstDate = count.first_date;
        current.latestDate = count.latest_date;
      }
      grouped.set(key, current);
    }

    const availableTables = Array.from(grouped.values());
    const ga4TablesWithRows = countsResult.rows
      .filter((row) => !row.table_name.startsWith('shopify.') && numberFromPg(row.row_count) > 0)
      .map((row) => row.table_name);
    const abandonedCheckoutRows = numberFromPg(countMap.get('shopify.abandoned_checkouts')?.row_count);
    const hasSessionTracking = hasColumn(availableTables, ['session_id', 'sessionId']) || ga4TablesWithRows.some((table) => table.includes('session'));
    const hasVisitorTracking = hasColumn(availableTables, ['visitor_id', 'client_id', 'user_pseudo_id']);
    const hasEvents = hasColumn(availableTables, ['event_name', 'eventName']);
    const hasLandingPageArrivalTracking = hasColumn(availableTables, ['event_time', 'page_url']) && (hasEvents || hasColumn(availableTables, ['event_name']));
    const hasAttribution = hasColumn(availableTables, ['utm_source', 'utm_campaign', 'meta_click_id', 'fbp', 'fbc', 'gclid']);
    const hasCity = hasColumn(availableTables, ['city', 'region', 'province']);

    return {
      ok: true,
      metrics: {
        ga4Connected: ga4TablesWithRows.length > 0,
        ga4TablesWithRows,
        availableTables,
        missingTables: [
          !hasVisitorTracking ? 'visitors' : '',
          !hasSessionTracking ? 'sessions' : '',
          !hasEvents ? 'events' : '',
          !hasAttribution ? 'attribution / UTM identity table' : '',
        ].filter(Boolean),
        capabilities: [
          {
            label: 'GA4 connection status',
            available: ga4TablesWithRows.length > 0,
            status: ga4TablesWithRows.length > 0 ? 'good' : 'missing',
            evidence: ga4TablesWithRows.length > 0 ? `${ga4TablesWithRows.length} GA4 tables contain rows.` : 'GA4 tables exist but currently have no rows.',
          },
          {
            label: 'Visitor/session tracking status',
            available: hasSessionTracking || hasVisitorTracking,
            status: hasSessionTracking || hasVisitorTracking ? 'warning' : 'missing',
            evidence: hasSessionTracking || hasVisitorTracking ? 'Some visitor/session-like metadata exists.' : 'No dedicated visitor/session table was found.',
            dataNeeded: [...trackingVisitorFields, ...trackingSessionFields],
          },
          {
            label: 'Event tracking status',
            available: hasEvents,
            status: hasEvents ? 'warning' : 'missing',
            evidence: hasEvents ? 'Event-like columns exist.' : 'No event table with event_name/event_time was found.',
            dataNeeded: trackingEventFields,
          },
          {
            label: 'Landing page arrival tracking',
            available: hasLandingPageArrivalTracking,
            status: hasLandingPageArrivalTracking ? 'good' : 'missing',
            evidence: hasLandingPageArrivalTracking ? 'event_time + page_url are available for landing page arrival measurement.' : 'Need an event table with event_time and page_url for landing page arrival analysis.',
            dataNeeded: ['event_name', 'event_time', 'page_url', 'session_id', 'visitor_id'],
          },
          {
            label: 'Meta attribution tracking status',
            available: hasAttribution,
            status: hasAttribution ? 'warning' : 'missing',
            evidence: hasAttribution ? 'Attribution-like columns exist in synced tables.' : 'No reliable UTM/meta click identity columns were found.',
            dataNeeded: ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'meta_click_id', 'fbp', 'fbc', 'gclid'],
          },
          {
            label: 'Shopify abandoned checkout status',
            available: abandonedCheckoutRows > 0,
            status: abandonedCheckoutRows > 0 ? 'good' : 'missing',
            evidence: `${abandonedCheckoutRows} abandoned checkout rows found.`,
          },
          {
            label: 'Daily sessions possible',
            available: ga4TablesWithRows.some((table) => table.includes('session')),
            status: ga4TablesWithRows.some((table) => table.includes('session')) ? 'good' : 'missing',
            evidence: 'Requires GA4/session rows with a date column.',
          },
          {
            label: 'Pages per session possible',
            available: hasColumn(availableTables, ['screenPageViews', 'page_count', 'pageviews']),
            status: hasColumn(availableTables, ['screenPageViews', 'page_count', 'pageviews']) ? 'warning' : 'missing',
            evidence: 'Requires page views or page_count by session.',
          },
          {
            label: 'Clicks per session possible',
            available: hasColumn(availableTables, ['click_count', 'clicks']),
            status: hasColumn(availableTables, ['click_count', 'clicks']) ? 'warning' : 'missing',
            evidence: 'Requires click_count or click events by session.',
          },
          {
            label: 'Sessions before order possible',
            available: hasSessionTracking && hasAttribution,
            status: hasSessionTracking && hasAttribution ? 'warning' : 'missing',
            evidence: 'Requires session/customer/order identity join.',
          },
          {
            label: 'Customer last activity possible',
            available: hasColumn(availableTables, ['last_seen_at', 'last_activity_at', 'event_time']),
            status: hasColumn(availableTables, ['last_seen_at', 'last_activity_at', 'event_time']) ? 'warning' : 'missing',
            evidence: 'Requires a tracked customer or visitor timestamp.',
          },
          {
            label: 'City/suburb buyer geography possible',
            available: hasCity,
            status: hasCity ? 'good' : 'missing',
            evidence: hasCity ? 'City/region fields exist in Shopify or tracking metadata.' : 'No city/region fields found.',
          },
        ],
        requiredVisitorFields: trackingVisitorFields,
        requiredSessionFields: trackingSessionFields,
        requiredEventFields: trackingEventFields,
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Tracking readiness failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getTodayActionPlan(): Promise<TodayActionPlanResult> {
  const [repeatResult, startupResult, ratingsResult, ratingsIntelligenceResult, foodResult, stockResult, funnelResult, metaResult, activityResult, trackingResult] =
    await Promise.all([
      getRepeatCustomerMetrics(),
      getStartupPackRetention(),
      getRatingsConversion(),
      getRatingsIntelligence(),
      getFoodPairingIntelligence(),
      getStockMovementSummary(),
      getShopifyFunnelBasic(),
      getMetaAdsPerformance(),
      getCustomerActivityReadiness(),
      getTrackingReadiness(),
    ]);

  const firstFailure = [repeatResult, startupResult, ratingsResult, ratingsIntelligenceResult, foodResult, stockResult, funnelResult, metaResult, activityResult, trackingResult].find(
    (result) => !result.ok,
  );
  if (firstFailure && !firstFailure.ok) return firstFailure;

  const repeat = repeatResult.ok ? repeatResult.metrics : null;
  const startup = startupResult.ok ? startupResult.metrics : null;
  const ratings = ratingsResult.ok ? ratingsResult.metrics : null;
  const ratingsIntelligence = ratingsIntelligenceResult.ok ? ratingsIntelligenceResult.metrics : null;
  const food = foodResult.ok ? foodResult.metrics : null;
  const stock = stockResult.ok ? stockResult.metrics : null;
  const funnel = funnelResult.ok ? funnelResult.metrics : null;
  const meta = metaResult.ok ? metaResult.metrics : null;
  const activity = activityResult.ok ? activityResult.metrics : null;
  const tracking = trackingResult.ok ? trackingResult.metrics : null;
  const actions: TodayAction[] = [];
  const stageCustomers = ratingsIntelligence?.customers ?? [];
  const needsRatingCustomers = stageCustomers.filter((customer) => customer.funnelStage === 'Needs to Rate Wines');
  const readyForSmartBoxCustomers = stageCustomers.filter((customer) => customer.funnelStage === 'Ready for Smart Box');

  if (!tracking?.ga4Connected) {
    actions.push({
      priority: 'High',
      businessProblem: 'GA4 data is not connected to usable dashboard tables.',
      whyItMatters: 'Without GA4 rows, traffic, sessions, pages per session and acquisition direction are missing.',
      suggestedAction: 'Connect GA4 data to dashboard by fixing Airbyte GA4 streams or adding BigQuery/Data API ingestion.',
      relatedPage: '/tracking-readiness',
      metricEvidence: 'GA4 reporting tables have no usable rows.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Tracking implementation',
      objectionToAddress: 'We cannot know if ads drive qualified traffic.',
      businessImpact: 'Unlocks traffic trends and acquisition diagnosis.',
    });
  }

  const quizEventsAvailable = Boolean(
    tracking?.availableTables.some((table) =>
      table.matchedColumns.some((column) => column.toLowerCase() === 'event_name' || column.toLowerCase() === 'eventname'),
    ),
  );
  if (!quizEventsAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Quiz started/completed events are not trackable yet.',
      whyItMatters: 'The dashboard cannot tell whether ads drive quiz engagement or where visitors drop out.',
      suggestedAction: 'Implement quiz_started and quiz_completed tracking in GA4, Meta, and PostgreSQL.',
      relatedPage: '/tracking-readiness',
      metricEvidence: 'No event tracking table with event_name was detected.',
      stageAffected: 'Quiz Started',
      recommendedEmail: 'Not applicable',
      recommendedOffer: 'Tracking setup',
      objectionToAddress: 'Quiz engagement is currently invisible.',
      businessImpact: 'Unlocks quiz funnel and ad optimization signals.',
    });
  }

  if (!meta?.attributionAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Meta attribution is missing before scaling ads.',
      whyItMatters: 'Spend, CTR, and CPC exist, but true CAC/ROAS require campaign-to-order attribution.',
      suggestedAction: 'Implement UTM, Meta click id, visitor/session tracking, and order attribution.',
      relatedPage: '/attribution-readiness',
      metricEvidence: meta?.attributionNote ?? 'Meta attribution unavailable.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Attribution readiness',
      objectionToAddress: 'Good CPC may still produce poor sales.',
      businessImpact: 'Prevents scaling ads without sales proof.',
    });
  }

  const metaAdsWithEnoughSpend = meta?.ads.filter((ad) => ad.spend >= 15) ?? [];
  const weakMetaAds = metaAdsWithEnoughSpend.filter((ad) => (ad.ctr ?? 0) < 1);
  const strongMetaAds = metaAdsWithEnoughSpend.filter((ad) => (ad.ctr ?? 0) >= 2 && (ad.cpc ?? 99) <= 0.5);
  const hookRateUnavailable = meta ? meta.ads.every((ad) => ad.hookRate === null) : false;

  if (weakMetaAds.length > 0) {
    actions.push({
      priority: 'High',
      businessProblem: 'Some Meta creatives have enough spend and weak CTR.',
      whyItMatters: 'Spend above €15 with CTR below 1% is a useful signal that the hook or creative is not pulling attention.',
      suggestedAction: 'Pause or refresh weak creatives.',
      relatedPage: '/meta',
      metricEvidence: `${weakMetaAds.length} ads have spend >= €15 and CTR < 1%.`,
      stageAffected: 'Visitor',
      recommendedOffer: 'Creative refresh',
      objectionToAddress: 'The first impression is not strong enough.',
      businessImpact: 'Stops budget leaking into weak hooks.',
    });
  }

  if (strongMetaAds.length > 0) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Some Meta creatives have strong click signals.',
      whyItMatters: 'CTR >= 2% with CPC <= €0.50 suggests the creative is worth testing further, even before true ROAS is available.',
      suggestedAction: 'Test increasing budget on strongest creatives, but do not scale based only on clicks.',
      relatedPage: '/meta',
      metricEvidence: `${strongMetaAds.length} ads have spend >= €15, CTR >= 2%, and CPC <= €0.50.`,
      stageAffected: 'Visitor',
      recommendedOffer: 'Controlled budget test',
      objectionToAddress: 'Clicks are not yet proven customers.',
      businessImpact: 'Finds promising creatives while keeping attribution risk visible.',
    });
  }

  if (!meta?.attributionAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Meta clicks cannot yet be tied to Shopify customers.',
      whyItMatters: 'Good CTR and CPC are creative signals, not proof of profitable sales.',
      suggestedAction: 'Do not scale based only on Meta clicks; implement attribution first.',
      relatedPage: '/attribution-readiness',
      metricEvidence: 'True Shopify CAC/ROAS unavailable.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Attribution setup',
      objectionToAddress: 'A good ad can still send low-converting traffic.',
      businessImpact: 'Keeps scaling decisions honest.',
    });
  }

  if (hookRateUnavailable) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Hook rate is unavailable for Meta creatives.',
      whyItMatters: 'Without 3-second video views, video plays, or thruplays, the dashboard cannot separate weak hooks from weak CTAs.',
      suggestedAction: 'Configure video view metrics / hook tracking.',
      relatedPage: '/meta',
      metricEvidence: 'No hook-rate proxy found in Meta action metrics.',
      stageAffected: 'Visitor',
      recommendedOffer: 'Creative diagnostics',
      objectionToAddress: 'We cannot tell whether people stop watching or stop clicking.',
      businessImpact: 'Improves creative testing decisions.',
    });
  }

  if (needsRatingCustomers.length > 0) {
    actions.push({
      priority: 'High',
      businessProblem: 'Customers need to rate wines before the Smart Box can improve.',
      whyItMatters: 'Customers bought more bottles than they rated, so the recommendation engine has missing preference data.',
      suggestedAction: 'Send rating reminder email to customers with unrated bottles.',
      relatedPage: '/sales-funnel?stage=needs-to-rate-wines',
      metricEvidence: `${needsRatingCustomers.length} customers in Needs to Rate Wines.`,
      stageAffected: 'Needs to Rate Wines',
      customersAffected: needsRatingCustomers.length,
      recommendedEmail: 'Rate your bottles so we can build your Smart Box.',
      recommendedOffer: 'Smart Box readiness',
      objectionToAddress: 'Rating feels like work.',
      businessImpact: 'More ratings increase Smart Box conversion readiness.',
    });
  }

  if (readyForSmartBoxCustomers.length > 0) {
    actions.push({
      priority: 'High',
      businessProblem: 'Customers are ready for Smart Box but need a clear next offer.',
      whyItMatters: 'These customers have enough ratings to justify a personalized box follow-up.',
      suggestedAction: 'Send Smart Box ready email.',
      relatedPage: '/sales-funnel?stage=ready-for-smart-box',
      metricEvidence: `${readyForSmartBoxCustomers.length} customers in Ready for Smart Box.`,
      stageAffected: 'Ready for Smart Box',
      customersAffected: readyForSmartBoxCustomers.length,
      recommendedEmail: 'Your taste profile is ready for a Smart Box.',
      recommendedOffer: 'Smart Box',
      objectionToAddress: 'Will the next box be better than the kit?',
      businessImpact: 'This is the cleanest conversion segment for the next offer.',
    });
  }

  if (needsRatingCustomers.length > 0 || readyForSmartBoxCustomers.length > 0) {
    const targetStage = readyForSmartBoxCustomers.length > 0 ? 'Ready for Smart Box' : 'Needs to Rate Wines';
    const targetCount = readyForSmartBoxCustomers.length > 0 ? readyForSmartBoxCustomers.length : needsRatingCustomers.length;
    actions.push({
      priority: 'Medium',
      businessProblem: 'Funnel stages have contactable customers.',
      whyItMatters: 'The highest leverage daily action is often contacting a concrete segment instead of reading more dashboards.',
      suggestedAction: 'Click a Sales Funnel stage and contact customers in that segment.',
      relatedPage: `/sales-funnel?stage=${encodeURIComponent(targetStage)}`,
      metricEvidence: `${targetCount} customers in ${targetStage}.`,
      stageAffected: targetStage,
      customersAffected: targetCount,
      recommendedEmail: targetStage === 'Ready for Smart Box' ? 'Your taste profile is ready for a Smart Box.' : 'Rate your bottles so we can build your Smart Box.',
      recommendedOffer: targetStage === 'Ready for Smart Box' ? 'Smart Box' : 'Rating reminder',
      objectionToAddress: targetStage === 'Ready for Smart Box' ? 'Will the next box be better?' : 'Rating feels like work.',
      businessImpact: 'Turns funnel diagnosis into customer contact.',
    });
  }

  if ((repeat?.reorderRate ?? 100) < 20) {
    actions.push({
      priority: 'Critical',
      businessProblem: 'First-time customers are not reordering.',
      whyItMatters: 'Revenue depends too much on acquisition if later orders do not appear.',
      suggestedAction: 'Create a follow-up campaign for first-time customers and Startup Pack buyers.',
      relatedPage: '/repeat-customers',
      metricEvidence: `Reorder rate: ${repeat?.reorderRate?.toFixed(1) ?? '0'}%`,
      stageAffected: 'Repeat Buyer',
      recommendedEmail: 'Make your next wine box easier.',
      recommendedOffer: 'Repeat order / subscription starter',
      objectionToAddress: 'I only wanted to try it once.',
      businessImpact: 'Repeat orders reduce dependence on paid acquisition.',
    });
  }

  if ((startup?.startupPackReorderRate ?? 100) < 20) {
    actions.push({
      priority: 'High',
      businessProblem: 'Startup Pack customers are not converting to later orders.',
      whyItMatters: 'Startup Pack stock cost only pays back if customers continue into Smart Box or repeat orders.',
      suggestedAction: 'Send Smart Box offer to Startup Pack customers after ratings are completed.',
      relatedPage: '/startup-pack-retention',
      metricEvidence: `Startup Pack reorder rate: ${startup?.startupPackReorderRate?.toFixed(1) ?? '0'}%`,
    });
  }

  if (ratings && ratings.totalUsers > 0 && ratings.usersWithRatings / ratings.totalUsers < 0.5) {
    actions.push({
      priority: 'High',
      businessProblem: 'Ratings engagement is too low.',
      whyItMatters: 'Ratings power Smart Wine Box recommendations and segmentation.',
      suggestedAction: 'Improve post-delivery rating emails.',
      relatedPage: '/ratings-conversion',
      metricEvidence: `${ratings.usersWithRatings} of ${ratings.totalUsers} users have rated.`,
    });
  }

  if (ratingsIntelligence && !ratingsIntelligence.wineLevelAnalysisAvailable) {
    actions.push({
      priority: 'High',
      businessProblem: 'Wine-level ratings cannot be measured yet.',
      whyItMatters: 'Smart Box recommendations need wine-level Love/Like/Dislike performance.',
      suggestedAction: 'Add wine_id to ratings so Smart Box recommendations can be measured by wine.',
      relatedPage: '/ratings',
      metricEvidence: ratingsIntelligence.wineLevelUnavailableReason ?? 'Wine-level rating key missing.',
    });
  }

  if (ratingsIntelligence && (ratingsIntelligence.positiveRatingRate ?? 0) >= 99 && ratingsIntelligence.totalRatings > 0) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Ratings are almost entirely positive.',
      whyItMatters: 'A 100% positive rating signal can mean customers love the wines, or that Dislike is not being captured clearly.',
      suggestedAction: 'Audit the rating UI and make sure Love, Like and Dislike are all easy to submit.',
      relatedPage: '/ratings',
      metricEvidence: `Positive rating rate: ${ratingsIntelligence.positiveRatingRate?.toFixed(1) ?? '100'}%.`,
    });
  }

  if (funnel && funnel.abandonedCheckoutCount > funnel.orderCount) {
    actions.push({
      priority: 'High',
      businessProblem: 'Abandoned checkouts exceed completed orders.',
      whyItMatters: 'Checkout friction can waste paid traffic and quiz demand.',
      suggestedAction: 'Investigate abandoned checkout emails and payment friction.',
      relatedPage: '/acquisition-economics-basic',
      metricEvidence: `${funnel.abandonedCheckoutCount} abandoned checkouts vs ${funnel.orderCount} orders.`,
    });
  }

  if ((stock?.freeQuantityPercentage ?? 0) > 20) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Free stock movement is material.',
      whyItMatters: 'Discounted pack bottles move inventory before repeat revenue is proven.',
      suggestedAction: 'Monitor acquisition stock cost and make sure Startup Pack leads convert.',
      relatedPage: '/stock-movement-summary',
      metricEvidence: `Free quantity share: ${stock?.freeQuantityPercentage?.toFixed(1) ?? '0'}%`,
    });
  }

  if (food && food.pairingCoverageRate === 0) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Food pairing coverage is missing.',
      whyItMatters: 'Pairing tags can improve product positioning and Smart Box explanations.',
      suggestedAction: 'Populate food pairing tags for wines so Smart Box explanations are stronger.',
      relatedPage: '/food-pairing-intelligence',
      metricEvidence: food.coverageGapReason ?? 'Pairing coverage is 0%.',
    });
  }

  if (meta && meta.totalSpend > 0 && !meta.attributionAvailable) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Meta spend is not reliably attributed to Shopify orders.',
      whyItMatters: 'CAC and ROAS cannot be trusted without click/order attribution.',
      suggestedAction: 'Set up UTM/meta click tracking and Shopify order attribution.',
      relatedPage: '/meta',
      metricEvidence: `Meta spend detected: €${meta.totalSpend.toFixed(2)}.`,
      stageAffected: 'Visitor',
      recommendedEmail: 'Not applicable until attribution exists.',
      recommendedOffer: 'Tracking fix',
      objectionToAddress: 'CAC is unknown.',
      businessImpact: 'Prevents scaling spend without knowing CAC or ROAS.',
    });
  }

  if (activity && !activity.hasTrackingTables) {
    actions.push({
      priority: 'Medium',
      businessProblem: 'Customer activity tracking is missing.',
      whyItMatters: 'Sales prediction needs sessions, events, and visit recency before purchase.',
      suggestedAction: 'Implement visitor/session/event tracking before trying to predict sales.',
      relatedPage: '/customer-activity-readiness',
      metricEvidence: 'No visitor/session/event tables found.',
    });
  }

  return { ok: true, metrics: { topActions: actions.slice(0, 5), allActions: actions } };
}

export async function getAcquisitionEconomicsBasic(): Promise<AcquisitionEconomicsBasicResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const [result, repeatResult, startupRetentionResult, ratingsConversionResult] =
      await Promise.all([
        getPool(databaseUrl).query<AcquisitionEconomicsBasicRow>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id FROM enriched_items WHERE is_startup_pack
      ),
      box_orders AS (
        SELECT DISTINCT order_id FROM enriched_items WHERE is_box
      ),
      movement AS (
        SELECT
          COALESCE(SUM(free_quantity), 0)::text AS free_bottle_quantity,
          COALESCE(SUM(discount_value), 0)::text AS product_discount_value
        FROM enriched_items
      )
      SELECT
        (SELECT COUNT(*) FROM public.users)::text AS users_count,
        (SELECT COUNT(*) FROM public.quizz)::text AS quiz_count,
        (SELECT COUNT(*) FROM public.ratings)::text AS ratings_count,
        (SELECT COUNT(*) FROM shopify.customers)::text AS shopify_customers_count,
        (SELECT COUNT(*) FROM shopify.orders)::text AS orders_count,
        (
          SELECT COUNT(*)
          FROM shopify.orders
          WHERE lower(coalesce(financial_status::text, '')) = 'paid'
        )::text AS paid_orders_count,
        (SELECT COUNT(*) FROM shopify.orders WHERE cancelled_at IS NOT NULL)::text AS cancelled_orders_count,
        (SELECT COUNT(*) FROM shopify.abandoned_checkouts)::text AS abandoned_checkout_count,
        (SELECT COUNT(*) FROM startup_orders)::text AS startup_pack_orders_count,
        (SELECT COUNT(*) FROM box_orders)::text AS box_orders_count,
        movement.free_bottle_quantity,
        movement.product_discount_value,
        (
          SELECT COALESCE(
            SUM(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )
          FROM shopify.orders
        )::text AS total_revenue,
        (
          SELECT COALESCE(
            AVG(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )
          FROM shopify.orders
        )::text AS average_order_value
      FROM movement
    `),
        getRepeatCustomerMetrics(),
        getStartupPackRetention(),
        getRatingsConversion(),
      ]);

    if (!repeatResult.ok) {
      return repeatResult;
    }

    if (!startupRetentionResult.ok) {
      return startupRetentionResult;
    }

    if (!ratingsConversionResult.ok) {
      return ratingsConversionResult;
    }

    const row = result.rows[0];
    const usersCount = numberFromPg(row?.users_count);
    const quizCount = numberFromPg(row?.quiz_count);
    const ratingsCount = numberFromPg(row?.ratings_count);
    const ordersCount = numberFromPg(row?.orders_count);
    const abandonedCheckoutCount = numberFromPg(row?.abandoned_checkout_count);
    const startupPackOrdersCount = numberFromPg(row?.startup_pack_orders_count);
    const boxOrdersCount = numberFromPg(row?.box_orders_count);
    const freeBottleQuantity = numberFromPg(row?.free_bottle_quantity);
    const potentialIssues: string[] = [];

    if (quizCount > 0 && ordersCount / quizCount < 0.2) {
      potentialIssues.push('Quiz-to-order conversion may need attention.');
    }

    if (abandonedCheckoutCount > ordersCount) {
      potentialIssues.push('Abandoned checkouts exceed completed orders.');
    }

    if (freeBottleQuantity > 0 && startupPackOrdersCount === 0) {
      potentialIssues.push('Free stock movement detected outside Startup Pack logic.');
    }

    if (usersCount > 0 && ratingsCount / usersCount < 1) {
      potentialIssues.push('Most users have not rated at least one wine yet.');
    }

    if (boxOrdersCount === 0 && ratingsCount > 0) {
      potentialIssues.push('Rated users may not yet be converting to Smart Box.');
    }

    if ((repeatResult.metrics.reorderRate ?? 100) < 20) {
      potentialIssues.push('Acquisition economics may depend too much on first orders.');
    }

    if ((startupRetentionResult.metrics.startupPackReorderRate ?? 100) < 20) {
      potentialIssues.push('Startup Pack acquisition may not be converting yet.');
    }

    return {
      ok: true,
      metrics: {
        usersCount,
        quizCount,
        ratingsCount,
        shopifyCustomersCount:
          row?.shopify_customers_count === null ? null : numberFromPg(row?.shopify_customers_count),
        ordersCount,
        paidOrdersCount: numberFromPg(row?.paid_orders_count),
        cancelledOrdersCount: numberFromPg(row?.cancelled_orders_count),
        abandonedCheckoutCount,
        startupPackOrdersCount,
        boxOrdersCount,
        freeBottleQuantity,
        productDiscountValue: numberFromPg(row?.product_discount_value),
        totalRevenue: numberFromPg(row?.total_revenue),
        averageOrderValue: numberFromPg(row?.average_order_value),
        ratingsPerUser: ratio(ratingsCount, usersCount),
        ratingsPerOrder: ratio(ratingsCount, ordersCount),
        quizToOrderRatio: ratio(ordersCount, quizCount),
        abandonedCheckoutToOrderRatio: ratio(abandonedCheckoutCount, ordersCount),
        repeatCustomers: repeatResult.metrics.repeatCustomers,
        reorderRate: repeatResult.metrics.reorderRate,
        laterOrderRevenue: repeatResult.metrics.laterOrderRevenue,
        repeatRevenueShare: repeatResult.metrics.repeatRevenueShare,
        startupPackReorderRate: startupRetentionResult.metrics.startupPackReorderRate,
        usersWithRatings: ratingsConversionResult.metrics.usersWithRatings,
        usersWithThreePlusRatings: ratingsConversionResult.metrics.usersWithThreePlusRatings,
        ratingsEngagementRate: rate(ratingsConversionResult.metrics.usersWithRatings, usersCount),
        potentialIssues:
          potentialIssues.length > 0 ? potentialIssues : ['No major acquisition issue detected.'],
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Acquisition economics basic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export type OverviewPeriodRow = {
  revenue: string | null;
  orders: string | null;
  paid_orders: string | null;
};

export async function getBusinessOverviewPeriodTrends(range: DateRange): Promise<BusinessOverviewPeriodTrendsResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const previousRange = getPreviousDateRange(range);
  const currentStart = dateToSql(range.start);
  const currentEnd = dateToSql(range.end);
  const previousStart = dateToSql(previousRange.start);
  const previousEnd = dateToSql(previousRange.end);
  const currentGa4 = ga4Bounds(range);
  const previousGa4 = ga4Bounds(previousRange);

  try {
    const pool = getPool(databaseUrl);
    const [currentOrdersResult, previousOrdersResult, currentMetaResult, previousMetaResult, currentGa4Result, previousGa4Result] =
      await Promise.all([
        pool.query<OverviewPeriodRow>(`
          SELECT
            COALESCE(SUM(total_price), 0)::text AS revenue,
            COUNT(*)::text AS orders,
            COUNT(*) FILTER (WHERE lower(coalesce(financial_status, '')) = 'paid')::text AS paid_orders
          FROM shopify.orders
          WHERE created_at::date BETWEEN $1::date AND $2::date
        `, [currentStart, currentEnd]),
        pool.query<OverviewPeriodRow>(`
          SELECT
            COALESCE(SUM(total_price), 0)::text AS revenue,
            COUNT(*)::text AS orders,
            COUNT(*) FILTER (WHERE lower(coalesce(financial_status, '')) = 'paid')::text AS paid_orders
          FROM shopify.orders
          WHERE created_at::date BETWEEN $1::date AND $2::date
        `, [previousStart, previousEnd]),
        pool.query<{ spend: string | null }>(`
          SELECT COALESCE(SUM(spend), 0)::text AS spend
          FROM public.ads_insights
          WHERE date_start BETWEEN $1 AND $2
        `, [currentStart, currentEnd]),
        pool.query<{ spend: string | null }>(`
          SELECT COALESCE(SUM(spend), 0)::text AS spend
          FROM public.ads_insights
          WHERE date_start BETWEEN $1 AND $2
        `, [previousStart, previousEnd]),
        pool.query<{ sessions: string | null }>(`
          SELECT COALESCE(SUM(sessions), 0)::text AS sessions
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
        `, [currentGa4.start, currentGa4.end]),
        pool.query<{ sessions: string | null }>(`
          SELECT COALESCE(SUM(sessions), 0)::text AS sessions
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
        `, [previousGa4.start, previousGa4.end]),
      ]);
    const currentOrders = currentOrdersResult.rows[0];
    const previousOrders = previousOrdersResult.rows[0];
    const currentRevenue = numberFromPg(currentOrders?.revenue);
    const previousRevenue = numberFromPg(previousOrders?.revenue);
    const currentOrderCount = numberFromPg(currentOrders?.orders);
    const previousOrderCount = numberFromPg(previousOrders?.orders);

    return {
      ok: true,
      metrics: {
        revenue: calculateTrend('revenue', currentRevenue, previousRevenue),
        orders: calculateTrend('orders', currentOrderCount, previousOrderCount),
        paidOrders: calculateTrend('paid_orders', numberFromPg(currentOrders?.paid_orders), numberFromPg(previousOrders?.paid_orders)),
        averageOrderValue: calculateTrend('average_order_value', ratio(currentRevenue, currentOrderCount) ?? 0, ratio(previousRevenue, previousOrderCount) ?? 0),
        metaSpend: calculateTrend('meta_spend', numberFromPg(currentMetaResult.rows[0]?.spend), numberFromPg(previousMetaResult.rows[0]?.spend)),
        ga4Sessions: calculateTrend('sessions', numberFromPg(currentGa4Result.rows[0]?.sessions), numberFromPg(previousGa4Result.rows[0]?.sessions)),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Business overview period trends failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getBusinessOverview(): Promise<BusinessOverviewResult> {
  const [
    ordersResult,
    productsResult,
    funnelResult,
    startupPackResult,
    stockMovementResult,
    repeatResult,
    startupRetentionResult,
    ratingsResult,
  ] = await Promise.all([
      getShopifyOrdersSummary(),
      getShopifyProductsSummary(),
      getShopifyFunnelBasic(),
      getStartupPackAnalysis(),
      getStockMovementSummary(),
      getRepeatCustomerMetrics(),
      getStartupPackRetention(),
      getRatingsConversion(),
    ]);

  const orders = ordersResult.ok
    ? ordersResult.metrics
    : ({
        totalRevenue: 0,
        totalOrders: 0,
        averageOrderValue: 0,
        paidOrders: 0,
        cancelledOrders: 0,
        fulfilledOrders: 0,
        unfulfilledOrders: 0,
        totalLineItemsCount: null,
        averageLineItemsPerOrder: null,
        lineItemsCountWorked: false,
        firstOrderDate: null,
        latestOrderDate: null,
      } as ShopifyOrdersAggregateMetrics);

  const products = productsResult.ok
    ? productsResult
    : ({
        ok: true,
        products: [],
        totalQuantitySold: 0,
        totalProductDiscounts: 0,
        freeQuantityEstimate: 0,
        discountFieldsDetected: [],
      } as Extract<ShopifyProductsSummaryResult, { ok: true }>);

  const funnel = funnelResult.ok
    ? funnelResult.metrics
    : ({
        abandonedCheckoutCount: 0,
        orderCount: 0,
        paidOrderCount: 0,
        cancelledOrderCount: 0,
        fulfilledOrderCount: 0,
        unfulfilledOrderCount: 0,
        abandonmentToOrderRatio: null,
        paidOrderRate: null,
        cancelledOrderRate: null,
        fulfilledOrderRate: null,
        totalRevenue: 0,
        averageOrderValue: 0,
      } as ShopifyFunnelBasicMetrics);

  const startupPack = startupPackResult.ok
    ? startupPackResult.metrics
    : ({
        startupPackOrderCount: 0,
        startupPackLineItemsSold: 0,
        startupPackGrossRevenue: 0,
        startupPackNetRevenue: 0,
        averageStartupPackNetRevenuePerOrder: null,
        freeBottleLineItemCount: 0,
        freeBottleQuantity: 0,
        freeBottleGrossValue: 0,
        freeBottleDiscountValue: 0,
        paidItemsNetRevenueInStartupPackOrders: 0,
        averageFreeBottlesPerStartupPackOrder: null,
        topFreeWinesByQuantity: [],
        topFreeWinesByGrossValue: [],
        topPaidPackProducts: [],
      } as StartupPackAnalysisMetrics);

  const stockMovement = stockMovementResult.ok
    ? stockMovementResult.metrics
    : ({
        totalQuantityMoved: 0,
        totalPaidQuantity: 0,
        totalFreeQuantity: 0,
        freeQuantityPercentage: null,
        totalGrossProductValue: 0,
        totalDiscountValue: 0,
        totalNetProductRevenue: 0,
        products: [],
      } as StockMovementSummaryMetrics);

  const repeat = repeatResult.ok
    ? repeatResult.metrics
    : ({
        orderingCustomers: 0,
        oneTimeCustomers: 0,
        repeatCustomers: 0,
        reorderRate: null,
        customersWithExactlyTwoOrders: 0,
        customersWithThreePlusOrders: 0,
        totalNonCancelledOrders: 0,
        averageOrdersPerOrderingCustomer: null,
        firstOrderRevenue: 0,
        laterOrderRevenue: 0,
        totalNonCancelledRevenue: 0,
        repeatRevenueShare: null,
        averageFirstOrderValue: null,
        averageLaterOrderValue: null,
        firstOrderDate: null,
        latestOrderDate: null,
        distribution: [],
        potentialIssues: [],
      } as RepeatCustomerMetrics);

  const startupRetention = startupRetentionResult.ok
    ? startupRetentionResult.metrics
    : ({
        startupPackCustomers: 0,
        startupPackOrders: 0,
        startupPackCustomersWithLaterOrder: 0,
        startupPackReorderRate: null,
        startupPackFirstOrderRevenue: 0,
        startupPackLaterOrderRevenue: 0,
        averageLaterOrdersPerStartupPackCustomer: null,
        smartBoxLaterOrdersAfterStartupPack: 0,
        customersWithStartupPackOnly: 0,
        customersWithStartupPackAndLaterOrder: 0,
        customersWithStartupPackAndSmartBox: 0,
        averageFreeBottlesPerStartupPackOrder: null,
        cohorts: [],
        potentialIssues: [],
      } as StartupPackRetentionMetrics);

  const ratings = ratingsResult.ok
    ? ratingsResult.metrics
    : ({
        totalUsers: 0,
        usersWithRatings: 0,
        usersWithThreePlusRatings: 0,
        totalRatings: 0,
        averageRatingsPerUser: null,
        orderingCustomers: 0,
        repeatCustomers: 0,
        ratedOrderingCustomers: null,
        ratedRepeatCustomers: null,
        ratedReorderRate: null,
        unratedReorderRate: null,
        ratedVsUnratedReorderRateDifference: null,
        matchingAvailable: false,
        matchingUnavailableReason: null,
        buckets: [],
        potentialIssues: [],
      } as RatingsConversionMetrics);

  const potentialIssues: string[] = [];

  if ((funnel.cancelledOrderRate ?? 0) > 10) {
    potentialIssues.push('Cancelled orders may be high.');
  }

  if (funnel.abandonedCheckoutCount > funnel.orderCount) {
    potentialIssues.push('Abandoned checkouts exceed completed orders.');
  }

  if ((funnel.paidOrderRate ?? 100) < 90) {
    potentialIssues.push('Paid order rate may need attention.');
  }

  if (products.freeQuantityEstimate > 0) {
    potentialIssues.push(
      'Some products were included for free via discounts. Stock movement may exceed paid product sales.',
    );
  }

  const averageFreeBottles = startupPack.averageFreeBottlesPerStartupPackOrder;
  if (
    startupPack.startupPackOrderCount > 0 &&
    (averageFreeBottles === null || averageFreeBottles < 3 || averageFreeBottles > 4)
  ) {
    potentialIssues.push('Average free bottles per Startup Pack is outside the expected 3 to 4 range.');
  }

  if ((stockMovement.freeQuantityPercentage ?? 0) > 50) {
    potentialIssues.push(
      'A large share of stock movement is discounted/free. Check acquisition economics.',
    );
  }

  if ((repeat.reorderRate ?? 100) < 20) {
    potentialIssues.push('Reorder rate is low. Startup Pack acquisition may not yet be converting into repeat orders.');
  }

  if ((startupRetention.startupPackReorderRate ?? 100) < 20) {
    potentialIssues.push('Startup Pack customers are not yet reordering enough.');
  }

  if (ratings.totalUsers > 0 && ratings.usersWithRatings / ratings.totalUsers < 0.5) {
    potentialIssues.push('Most users have not rated wines yet.');
  }

  return {
    ok: true,
    metrics: {
      totalRevenue: orders.totalRevenue,
      totalOrders: orders.totalOrders,
      averageOrderValue: orders.averageOrderValue,
      paidOrders: orders.paidOrders,
      cancelledOrders: orders.cancelledOrders,
      abandonedCheckoutCount: funnel.abandonedCheckoutCount,
      topProducts: products.products.slice(0, 5),
      totalQuantitySold: products.totalQuantitySold,
      totalProductDiscounts: products.totalProductDiscounts,
      freeQuantityEstimate: products.freeQuantityEstimate,
      totalLineItems: orders.totalLineItemsCount,
      startupPackOrders: startupPack.startupPackOrderCount,
      averageFreeBottlesPerStartupPackOrder:
        startupPack.averageFreeBottlesPerStartupPackOrder,
      paidQuantityEstimate: stockMovement.totalPaidQuantity,
      freeQuantityPercentage: stockMovement.freeQuantityPercentage,
      repeatCustomers: repeat.repeatCustomers,
      reorderRate: repeat.reorderRate,
      oneTimeCustomers: repeat.oneTimeCustomers,
      laterOrderRevenue: repeat.laterOrderRevenue,
      repeatRevenueShare: repeat.repeatRevenueShare,
      startupPackReorderRate: startupRetention.startupPackReorderRate,
      usersWithRatings: ratings.usersWithRatings,
      ratingsPerUser: ratings.averageRatingsPerUser,
      potentialIssues:
        potentialIssues.length > 0 ? potentialIssues : ['No major Shopify issue detected.'],
    },
  };
}

export type CopyVersionEventRow = {
  id: string;
  quiz_sessions: string;
  quiz_started: string;
  quiz_completed: string;
  email_submitted: string;
};

export type CopyVersionOrderRow = {
  id: string;
  orders: string;
  revenue: string;
};

export type CopyVersionCoverageRow = {
  first_event_at: string | null;
  last_event_at: string | null;
  first_order_at: string | null;
  last_order_at: string | null;
  last_order_sync_at: string | null;
};

export async function getCopyVersionPerformance(
  periods: CopyVersionPeriodInput[],
): Promise<CopyVersionPerformanceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  if (periods.length === 0) {
    return {
      ok: true,
      metrics: {
        periods: [],
        firstEventAt: null,
        lastEventAt: null,
        firstOrderAt: null,
        lastOrderAt: null,
        lastOrderSyncAt: null,
      },
    };
  }

  const ids = periods.map((period) => period.id);
  const starts = periods.map((period) => period.start);
  const ends = periods.map((period) => period.end);

  try {
    const pool = getPool(databaseUrl);

    const [eventsResult, ordersResult, coverageResult] = await Promise.all([
      pool.query<CopyVersionEventRow>(
        `
          WITH periods AS (
            SELECT id, start_date, end_date
            FROM unnest($1::text[], $2::date[], $3::date[]) AS t(id, start_date, end_date)
          )
          SELECT
            p.id AS id,
            COUNT(DISTINCT e.session_id)::text AS quiz_sessions,
            COUNT(*) FILTER (WHERE e.event_name = 'vinpop_quiz_started')::text AS quiz_started,
            COUNT(*) FILTER (WHERE e.event_name = 'vinpop_quiz_completed')::text AS quiz_completed,
            COUNT(*) FILTER (WHERE e.event_name = 'vinpop_email_submitted')::text AS email_submitted
          FROM periods p
          LEFT JOIN public.site_events e
            ON e.event_time >= p.start_date
           AND (p.end_date IS NULL OR e.event_time < p.end_date)
          GROUP BY p.id
        `,
        [ids, starts, ends],
      ),
      pool.query<CopyVersionOrderRow>(
        `
          WITH periods AS (
            SELECT id, start_date, end_date
            FROM unnest($1::text[], $2::date[], $3::date[]) AS t(id, start_date, end_date)
          )
          SELECT
            p.id AS id,
            COUNT(o.created_at)::text AS orders,
            COALESCE(SUM(o.total_price), 0)::text AS revenue
          FROM periods p
          LEFT JOIN shopify.orders o
            ON o.created_at >= p.start_date
           AND (p.end_date IS NULL OR o.created_at < p.end_date)
           AND o.cancelled_at IS NULL
          GROUP BY p.id
        `,
        [ids, starts, ends],
      ),
      pool.query<CopyVersionCoverageRow>(
        `
          SELECT
            (SELECT MIN(event_time) FROM public.site_events)::text AS first_event_at,
            (SELECT MAX(event_time) FROM public.site_events)::text AS last_event_at,
            (SELECT MIN(created_at) FROM shopify.orders)::text AS first_order_at,
            (SELECT MAX(created_at) FROM shopify.orders)::text AS last_order_at,
            (SELECT MAX(_airbyte_extracted_at) FROM shopify.orders)::text AS last_order_sync_at
        `,
      ),
    ]);

    const ordersById = new Map(ordersResult.rows.map((row) => [row.id, row]));
    const eventsById = new Map(eventsResult.rows.map((row) => [row.id, row]));

    const coverage = coverageResult.rows[0] ?? {
      first_event_at: null,
      last_event_at: null,
      first_order_at: null,
      last_order_at: null,
      last_order_sync_at: null,
    };

    return {
      ok: true,
      metrics: {
        periods: periods.map((period) => {
          const events = eventsById.get(period.id);
          const orders = ordersById.get(period.id);

          return {
            id: period.id,
            quizSessions: numberFromPg(events?.quiz_sessions),
            quizStarted: numberFromPg(events?.quiz_started),
            quizCompleted: numberFromPg(events?.quiz_completed),
            emailSubmitted: numberFromPg(events?.email_submitted),
            orders: numberFromPg(orders?.orders),
            revenue: numberFromPg(orders?.revenue),
          };
        }),
        firstEventAt: coverage.first_event_at,
        lastEventAt: coverage.last_event_at,
        firstOrderAt: coverage.first_order_at,
        lastOrderAt: coverage.last_order_at,
        lastOrderSyncAt: coverage.last_order_sync_at,
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Copy version performance failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

/**
 * Vues minimales pour qu une fiche produit soit jugee.
 *
 * Sous ce volume, un taux de conversion nul ne veut rien dire : trois visiteurs
 * qui n achetent pas, c est du hasard, pas un probleme de fiche.
 */
const PRODUCT_UNDERPERFORMING_VIEWS = 50;

/** Taux de conversion sous lequel une fiche a fort trafic est signalee. */
const PRODUCT_UNDERPERFORMING_CVR = 1.5;

type ProductItemRow = {
  product_id: string | null;
  item_name: string | null;
  product_handle: string | null;
  items_viewed: string | null;
  items_added_to_cart: string | null;
  items_purchased: string | null;
  item_revenue: string | null;
  shopify_quantity_sold: string | null;
};

/**
 * Etape 4 du funnel : conversion des fiches produit.
 *
 * Croise deux sources sur l identifiant produit Shopify :
 *
 *  - GA4 (`ecommerce_purchases_item_id_report`) porte les trois etapes de
 *    l entonnoir produit : vues, ajouts au panier, achats. Son `itemId` est de
 *    la forme `shopify_ZZ_{productId}_{variantId}`, ce qui permet de remonter
 *    au produit Shopify sans rapprochement par libelle.
 *  - Shopify (`shopify.products`) fournit le titre et le `handle`, donc l URL
 *    reelle de la fiche — indispensable pour ouvrir la bonne heatmap Clarity.
 *
 * Le taux de conversion affiche vient entierement de GA4 : les trois volumes
 * sont mesures par le meme outil sur la meme fenetre, le quotient est donc
 * coherent. Les quantites vendues cote Shopify sont exposees a part, comme
 * controle : leur synchronisation Airbyte n a pas le meme rythme que GA4, et
 * diviser des achats Shopify par des vues GA4 melangerait deux fenetres.
 */
export async function getProductConversion(range: DateRange): Promise<ProductConversionResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  const { start, end } = ga4Bounds(range);

  try {
    const pool = getPool(databaseUrl);

    const result = await pool.query<ProductItemRow>(
      `WITH ga4_items AS (
         SELECT
           -- itemId = shopify_ZZ_{productId}_{variantId} : on isole le produit.
           split_part("itemId", '_', 3) AS product_id,
           SUM("itemsViewed"::numeric) AS items_viewed,
           SUM("itemsAddedToCart"::numeric) AS items_added_to_cart,
           SUM("itemsPurchased"::numeric) AS items_purchased,
           SUM("itemRevenue"::numeric) AS item_revenue
         FROM public.ecommerce_purchases_item_id_report
         WHERE date BETWEEN $1 AND $2
         GROUP BY 1
         HAVING SUM("itemsViewed"::numeric) > 0
       ),
       shopify_products AS (
         SELECT id::text AS product_id, title, handle
         FROM shopify.products
       ),
       shopify_sales AS (
         SELECT
           line_item->>'product_id' AS product_id,
           SUM(COALESCE(NULLIF(line_item->>'quantity', '')::numeric, 0)) AS quantity_sold
         FROM shopify.orders,
           LATERAL jsonb_array_elements(
             CASE
               WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
               ELSE '[]'::jsonb
             END
           ) AS line_item
         WHERE cancelled_at IS NULL
           AND created_at::date BETWEEN $3::date AND $4::date
         GROUP BY 1
       )
       SELECT
         ga4_items.product_id,
         shopify_products.title AS item_name,
         shopify_products.handle AS product_handle,
         ga4_items.items_viewed::text AS items_viewed,
         ga4_items.items_added_to_cart::text AS items_added_to_cart,
         ga4_items.items_purchased::text AS items_purchased,
         ga4_items.item_revenue::text AS item_revenue,
         shopify_sales.quantity_sold::text AS shopify_quantity_sold
       FROM ga4_items
       LEFT JOIN shopify_products ON shopify_products.product_id = ga4_items.product_id
       LEFT JOIN shopify_sales ON shopify_sales.product_id = ga4_items.product_id
       ORDER BY ga4_items.items_viewed DESC
       LIMIT 200`,
      [start, end, dateToSql(range.start), dateToSql(range.end)],
    );

    const products: ProductConversionRow[] = result.rows.map((row) => {
      const itemsViewed = numberFromPg(row.items_viewed);
      const itemsAddedToCart = numberFromPg(row.items_added_to_cart);
      const itemsPurchased = numberFromPg(row.items_purchased);
      const purchaseToViewRate = rate(itemsPurchased, itemsViewed);

      return {
        productId: row.product_id || '',
        itemName: row.item_name || `Produit ${row.product_id ?? 'inconnu'}`,
        // Sans handle, pas d URL de fiche : le lien Clarity sera masque.
        pagePath: row.product_handle ? `/products/${row.product_handle}` : null,
        itemsViewed,
        itemsAddedToCart,
        itemsPurchased,
        itemRevenue: numberFromPg(row.item_revenue),
        shopifyQuantitySold: row.shopify_quantity_sold ? numberFromPg(row.shopify_quantity_sold) : null,
        cartToViewRate: rate(itemsAddedToCart, itemsViewed),
        purchaseToViewRate,
        // Fort trafic mais conversion en berne : c est cette fiche qui merite une
        // heatmap, pas celle qui n a que trois visiteurs.
        underperforming:
          itemsViewed >= PRODUCT_UNDERPERFORMING_VIEWS &&
          (purchaseToViewRate === null || purchaseToViewRate < PRODUCT_UNDERPERFORMING_CVR),
      };
    });

    const totalViews = products.reduce((sum, row) => sum + row.itemsViewed, 0);
    const totalAddedToCart = products.reduce((sum, row) => sum + row.itemsAddedToCart, 0);
    const totalPurchased = products.reduce((sum, row) => sum + row.itemsPurchased, 0);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        dataAvailable: products.length > 0,
        totalViews,
        totalAddedToCart,
        totalPurchased,
        totalRevenue: products.reduce((sum, row) => sum + row.itemRevenue, 0),
        averageConversionRate: rate(totalPurchased, totalViews),
        averageCartToViewRate: rate(totalAddedToCart, totalViews),
        underperformingViewsThreshold: PRODUCT_UNDERPERFORMING_VIEWS,
        underperformingConversionThreshold: PRODUCT_UNDERPERFORMING_CVR,
        products,
        underperformingProducts: products
          .filter((row) => row.underperforming)
          .sort((a, b) => b.itemsViewed - a.itemsViewed),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Product conversion lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
