/**
 * Google Analytics 4 : acquisition, comportement sur le site, pages
 * d atterrissage et conversions.
 */

import 'server-only';
import { getPool, numberFromPg, quoteIdentifier, rate } from './client';
import { type AcquisitionTrafficDimensionRow, type AcquisitionTrafficResult, type Ga4OverviewTrendsResult, type LandingPageArrivalDay, type LandingPageArrivalHour, type LandingPageArrivalResult, type SiteBehaviorResult, type SiteExperiencePage, type SiteExperienceResult, type SiteExperienceSource } from './types';
import { dateToGa4, dateToSql, getPreviousDateRange, type DateRange } from '@/lib/analytics/dateRanges';
import { calculateTrend } from '@/lib/analytics/trends';

export async function getGa4OverviewTrends(range: DateRange): Promise<Ga4OverviewTrendsResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const previousRange = getPreviousDateRange(range);
  const current = ga4Bounds(range);
  const previous = ga4Bounds(previousRange);

  try {
    const pool = getPool(databaseUrl);
    const [currentSummaryResult, previousSummaryResult, currentConversionsResult, previousConversionsResult, dailyResult, topSourceResult] = await Promise.all([
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          '0'::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          '0'::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4SeriesRow>(`
        WITH traffic AS (
          SELECT
            date,
            COALESCE(SUM(sessions), 0) AS sessions,
            COALESCE(SUM("totalUsers"), 0) AS users,
            COALESCE(SUM("engagedSessions"), 0) AS engaged_sessions,
            COALESCE(SUM("eventCount"), 0) AS event_count
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        ),
        devices AS (
          SELECT date, COALESCE(SUM("screenPageViews"), 0) AS page_views
          FROM public.devices
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        )
        SELECT
          traffic.date AS date,
          COALESCE(traffic.sessions, 0)::text AS sessions,
          COALESCE(traffic.users, 0)::text AS users,
          COALESCE(traffic.engaged_sessions, 0)::text AS engaged_sessions,
          COALESCE(traffic.event_count, 0)::text AS event_count,
          COALESCE(devices.page_views, 0)::text AS page_views,
          '0'::text AS conversions
        FROM traffic
        LEFT JOIN devices ON devices.date = traffic.date
        ORDER BY traffic.date
      `, [current.start, current.end]),
      pool.query<{ source_medium: string | null; sessions: string | null }>(`
        SELECT
          CONCAT(COALESCE("sessionSource", 'unknown'), ' / ', COALESCE("sessionMedium", 'unknown')) AS source_medium,
          COALESCE(SUM(sessions), 0)::text AS sessions
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
        GROUP BY source_medium
        ORDER BY SUM(sessions) DESC
        LIMIT 1
      `, [current.start, current.end]),
    ]);

    const currentSummary = currentSummaryResult.rows[0];
    const previousSummary = previousSummaryResult.rows[0];
    const currentSessions = numberFromPg(currentSummary?.sessions);
    const previousSessions = numberFromPg(previousSummary?.sessions);
    const currentUsers = numberFromPg(currentSummary?.users);
    const previousUsers = numberFromPg(previousSummary?.users);
    const currentEngagedSessions = numberFromPg(currentSummary?.engaged_sessions);
    const previousEngagedSessions = numberFromPg(previousSummary?.engaged_sessions);
    const currentEventCount = numberFromPg(currentSummary?.event_count);
    const previousEventCount = numberFromPg(previousSummary?.event_count);
    const currentPageViews = numberFromPg(currentSummary?.page_views);
    const previousPageViews = numberFromPg(previousSummary?.page_views);
    const currentConversions = numberFromPg(currentConversionsResult.rows[0]?.conversions);
    const previousConversions = numberFromPg(previousConversionsResult.rows[0]?.conversions);
    const currentEngagementRate = rate(currentEngagedSessions, currentSessions) ?? 0;
    const previousEngagementRate = rate(previousEngagedSessions, previousSessions) ?? 0;
    const currentEventsPerSession = rate(currentEventCount, currentSessions) ?? 0;
    const previousEventsPerSession = rate(previousEventCount, previousSessions) ?? 0;

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        dataAvailable: currentSessions > 0 || currentUsers > 0 || currentPageViews > 0,
        sessions: calculateTrend('sessions', currentSessions, previousSessions),
        users: calculateTrend('users', currentUsers, previousUsers),
        engagedSessions: calculateTrend('engaged_sessions', currentEngagedSessions, previousEngagedSessions),
        pageViews: calculateTrend('page_views', currentPageViews, previousPageViews),
        engagementRate: calculateTrend('engagement_rate', currentEngagementRate, previousEngagementRate),
        eventsPerSession: calculateTrend('events_per_session', currentEventsPerSession, previousEventsPerSession),
        conversions: calculateTrend('conversions', currentConversions, previousConversions),
        topSourceMedium: topSourceResult.rows[0]?.source_medium || null,
        daily: dailyResult.rows.map((row) => ({
          date: row.date,
          sessions: numberFromPg(row.sessions),
          users: numberFromPg(row.users),
          pageViews: numberFromPg(row.page_views),
        })),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('GA4 overview trends failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export type Ga4SummaryRow = {
  sessions: string | null;
  users: string | null;
  engaged_sessions: string | null;
  event_count: string | null;
  page_views: string | null;
  engagement_duration: string | null;
  revenue: string | null;
};

export type Ga4ConversionRow = {
  conversions: string | null;
};

export type Ga4SeriesRow = {
  date: string;
  sessions: string | null;
  users: string | null;
  engaged_sessions: string | null;
  event_count: string | null;
  page_views: string | null;
  conversions: string | null;
};

export type Ga4DimensionRow = {
  name: string | null;
  sessions: string | null;
  users: string | null;
  conversions: string | null;
  previous_sessions: string | null;
};

export function ga4Bounds(range: DateRange) {
  return {
    start: dateToGa4(range.start),
    end: dateToGa4(range.end),
  };
}

export function mapGa4Dimension(row: Ga4DimensionRow): AcquisitionTrafficDimensionRow {
  const sessions = numberFromPg(row.sessions);
  const conversions = numberFromPg(row.conversions);

  return {
    name: row.name || 'Unknown',
    sessions,
    users: numberFromPg(row.users),
    conversions,
    conversionRate: rate(conversions, sessions),
    trend: calculateTrend('sessions', sessions, numberFromPg(row.previous_sessions)),
  };
}

export async function getAcquisitionTraffic(range: DateRange): Promise<AcquisitionTrafficResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const previousRange = getPreviousDateRange(range);
  const current = ga4Bounds(range);
  const previous = ga4Bounds(previousRange);

  try {
    const pool = getPool(databaseUrl);
    const [
      tablesResult,
      currentSummaryResult,
      previousSummaryResult,
      currentConversionResult,
      previousConversionResult,
      seriesResult,
      sourcesResult,
      channelsResult,
      campaignsResult,
      devicesResult,
      citiesResult,
      regionsResult,
      countriesResult,
    ] = await Promise.all([
      pool.query<{ table_name: string; row_count: string }>(`
        SELECT table_name, row_count::text
        FROM (
          SELECT 'traffic_acquisition_session_source_medium_report' AS table_name, COUNT(*) AS row_count FROM public.traffic_acquisition_session_source_medium_report
          UNION ALL SELECT 'traffic_acquisition_session_campaign_report', COUNT(*) FROM public.traffic_acquisition_session_campaign_report
          UNION ALL SELECT 'traffic_acquisition_session_default_channel_grouping_report', COUNT(*) FROM public.traffic_acquisition_session_default_channel_grouping_report
          UNION ALL SELECT 'traffic_acquisition_session_medium_report', COUNT(*) FROM public.traffic_acquisition_session_medium_report
          UNION ALL SELECT 'traffic_acquisition_session_source_platform_report', COUNT(*) FROM public.traffic_acquisition_session_source_platform_report
          UNION ALL SELECT 'traffic_acquisition_session_source_report', COUNT(*) FROM public.traffic_acquisition_session_source_report
          UNION ALL SELECT 'devices', COUNT(*) FROM public.devices
          UNION ALL SELECT 'daily_active_users', COUNT(*) FROM public.daily_active_users
          UNION ALL SELECT 'conversions_report', COUNT(*) FROM public.conversions_report
          UNION ALL SELECT 'demographic_city_report', COUNT(*) FROM public.demographic_city_report
          UNION ALL SELECT 'demographic_region_report', COUNT(*) FROM public.demographic_region_report
          UNION ALL SELECT 'demographic_country_report', COUNT(*) FROM public.demographic_country_report
        ) tables
      `),
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          COALESCE(SUM("totalRevenue"), 0)::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4SummaryRow>(`
        SELECT
          COALESCE(SUM(sessions), 0)::text AS sessions,
          COALESCE(SUM("totalUsers"), 0)::text AS users,
          COALESCE(SUM("engagedSessions"), 0)::text AS engaged_sessions,
          COALESCE(SUM("eventCount"), 0)::text AS event_count,
          (SELECT COALESCE(SUM("screenPageViews"), 0)::text FROM public.devices WHERE date BETWEEN $1 AND $2) AS page_views,
          COALESCE(SUM("userEngagementDuration"), 0)::text AS engagement_duration,
          COALESCE(SUM("totalRevenue"), 0)::text AS revenue
        FROM public.traffic_acquisition_session_source_medium_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [current.start, current.end]),
      pool.query<Ga4ConversionRow>(`
        SELECT COALESCE(SUM("totalUsers"), 0)::text AS conversions
        FROM public.conversions_report
        WHERE date BETWEEN $1 AND $2
      `, [previous.start, previous.end]),
      pool.query<Ga4SeriesRow>(`
        WITH traffic AS (
          SELECT
            date,
            COALESCE(SUM(sessions), 0) AS sessions,
            COALESCE(SUM("totalUsers"), 0) AS users,
            COALESCE(SUM("engagedSessions"), 0) AS engaged_sessions,
            COALESCE(SUM("eventCount"), 0) AS event_count
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        ),
        devices AS (
          SELECT date, COALESCE(SUM("screenPageViews"), 0) AS page_views
          FROM public.devices
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        ),
        conversions AS (
          SELECT date, COALESCE(SUM("totalUsers"), 0) AS conversions
          FROM public.conversions_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY date
        )
        SELECT
          COALESCE(traffic.date, conversions.date) AS date,
          COALESCE(traffic.sessions, 0)::text AS sessions,
          COALESCE(traffic.users, 0)::text AS users,
          COALESCE(traffic.engaged_sessions, 0)::text AS engaged_sessions,
          COALESCE(traffic.event_count, 0)::text AS event_count,
          COALESCE(devices.page_views, 0)::text AS page_views,
          COALESCE(conversions.conversions, 0)::text AS conversions
        FROM traffic
        FULL OUTER JOIN conversions ON conversions.date = traffic.date
        LEFT JOIN devices ON devices.date = COALESCE(traffic.date, conversions.date)
        ORDER BY date
      `, [current.start, current.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT
            CONCAT(COALESCE("sessionSource", 'unknown'), ' / ', COALESCE("sessionMedium", 'unknown')) AS name,
            COALESCE(SUM(sessions), 0) AS sessions,
            COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT
            CONCAT(COALESCE("sessionSource", 'unknown'), ' / ', COALESCE("sessionMedium", 'unknown')) AS name,
            COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 25
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE("sessionDefaultChannelGrouping", 'Unknown') AS name, COALESCE(SUM(sessions), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.traffic_acquisition_session_default_channel_grouping_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE("sessionDefaultChannelGrouping", 'Unknown') AS name, COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.traffic_acquisition_session_default_channel_grouping_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE("sessionCampaignName", 'Unknown campaign') AS name, COALESCE(SUM(sessions), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.traffic_acquisition_session_campaign_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE("sessionCampaignName", 'Unknown campaign') AS name, COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.traffic_acquisition_session_campaign_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE("deviceCategory", 'Unknown device') AS name, COALESCE(SUM(sessions), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.devices
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE("deviceCategory", 'Unknown device') AS name, COALESCE(SUM(sessions), 0) AS previous_sessions
          FROM public.devices
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE(city, 'Unknown city') AS name, COALESCE(SUM("engagedSessions"), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.demographic_city_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE(city, 'Unknown city') AS name, COALESCE(SUM("engagedSessions"), 0) AS previous_sessions
          FROM public.demographic_city_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE(region, 'Unknown region') AS name, COALESCE(SUM("engagedSessions"), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.demographic_region_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE(region, 'Unknown region') AS name, COALESCE(SUM("engagedSessions"), 0) AS previous_sessions
          FROM public.demographic_region_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
      pool.query<Ga4DimensionRow>(`
        WITH current_rows AS (
          SELECT COALESCE(country, 'Unknown country') AS name, COALESCE(SUM("engagedSessions"), 0) AS sessions, COALESCE(SUM("totalUsers"), 0) AS users
          FROM public.demographic_country_report
          WHERE date BETWEEN $1 AND $2
          GROUP BY name
        ),
        previous_rows AS (
          SELECT COALESCE(country, 'Unknown country') AS name, COALESCE(SUM("engagedSessions"), 0) AS previous_sessions
          FROM public.demographic_country_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY name
        )
        SELECT current_rows.name, current_rows.sessions::text, current_rows.users::text, '0'::text AS conversions, COALESCE(previous_rows.previous_sessions, 0)::text AS previous_sessions
        FROM current_rows
        LEFT JOIN previous_rows ON previous_rows.name = current_rows.name
        ORDER BY current_rows.sessions DESC
        LIMIT 20
      `, [current.start, current.end, previous.start, previous.end]),
    ]);

    const currentSummary = currentSummaryResult.rows[0];
    const previousSummary = previousSummaryResult.rows[0];
    const currentConversions = numberFromPg(currentConversionResult.rows[0]?.conversions);
    const previousConversions = numberFromPg(previousConversionResult.rows[0]?.conversions);
    const currentSessions = numberFromPg(currentSummary?.sessions);
    const previousSessions = numberFromPg(previousSummary?.sessions);
    const currentUsers = numberFromPg(currentSummary?.users);
    const previousUsers = numberFromPg(previousSummary?.users);
    const currentEngagedSessions = numberFromPg(currentSummary?.engaged_sessions);
    const previousEngagedSessions = numberFromPg(previousSummary?.engaged_sessions);
    const currentEventCount = numberFromPg(currentSummary?.event_count);
    const previousEventCount = numberFromPg(previousSummary?.event_count);
    const currentPageViews = numberFromPg(currentSummary?.page_views);
    const previousPageViews = numberFromPg(previousSummary?.page_views);
    const currentDuration = numberFromPg(currentSummary?.engagement_duration);
    const previousDuration = numberFromPg(previousSummary?.engagement_duration);
    const currentRevenue = numberFromPg(currentSummary?.revenue);
    const previousRevenue = numberFromPg(previousSummary?.revenue);
    const currentEngagementRate = rate(currentEngagedSessions, currentSessions) ?? 0;
    const previousEngagementRate = rate(previousEngagedSessions, previousSessions) ?? 0;
    const currentEventsPerSession = rate(currentEventCount, currentSessions) ?? 0;
    const previousEventsPerSession = rate(previousEventCount, previousSessions) ?? 0;
    const currentAverageDuration = rate(currentDuration, currentSessions) ?? 0;
    const previousAverageDuration = rate(previousDuration, previousSessions) ?? 0;
    const tablesWithRows = tablesResult.rows.filter((row) => numberFromPg(row.row_count) > 0).map((row) => row.table_name);
    const dataAvailable = tablesWithRows.length > 0 && (currentSessions > 0 || currentUsers > 0 || currentConversions > 0);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        sessions: calculateTrend('sessions', currentSessions, previousSessions),
        users: calculateTrend('users', currentUsers, previousUsers),
        engagedSessions: calculateTrend('engaged_sessions', currentEngagedSessions, previousEngagedSessions),
        engagementRate: calculateTrend('engagement_rate', currentEngagementRate, previousEngagementRate),
        eventsPerSession: calculateTrend('events_per_session', currentEventsPerSession, previousEventsPerSession),
        pageViews: calculateTrend('page_views', currentPageViews, previousPageViews),
        averageEngagementDuration: calculateTrend('average_engagement_duration', currentAverageDuration, previousAverageDuration),
        conversions: calculateTrend('conversions', currentConversions, previousConversions),
        conversionRate: calculateTrend('conversion_rate', rate(currentConversions, currentSessions) ?? 0, rate(previousConversions, previousSessions) ?? 0),
        revenue: calculateTrend('revenue', currentRevenue, previousRevenue),
        tablesPresent: tablesResult.rows.map((row) => row.table_name),
        tablesWithRows,
        dataAvailable,
        series: seriesResult.rows.map((row) => ({
          date: row.date,
          sessions: numberFromPg(row.sessions),
          users: numberFromPg(row.users),
          engagedSessions: numberFromPg(row.engaged_sessions),
          eventCount: numberFromPg(row.event_count),
          pageViews: numberFromPg(row.page_views),
          conversions: numberFromPg(row.conversions),
        })),
        sources: sourcesResult.rows.map(mapGa4Dimension),
        channels: channelsResult.rows.map(mapGa4Dimension),
        campaigns: campaignsResult.rows.map(mapGa4Dimension),
        devices: devicesResult.rows.map(mapGa4Dimension),
        cities: citiesResult.rows.map(mapGa4Dimension),
        regions: regionsResult.rows.map(mapGa4Dimension),
        countries: countriesResult.rows.map(mapGa4Dimension),
        insights: dataAvailable
          ? [
              currentSessions > previousSessions ? 'Traffic is growing vs the previous period.' : 'Traffic is flat or down vs the previous period.',
              currentEngagementRate >= 50 ? 'Engagement looks healthy.' : 'Engagement may need attention.',
              sourcesResult.rows.some((row) => String(row.name ?? '').toLowerCase().includes('facebook') || String(row.name ?? '').toLowerCase().includes('instagram') || String(row.name ?? '').toLowerCase().includes('meta')) ? 'Meta traffic is visible in GA4.' : 'Meta traffic is not clearly visible in GA4 source/medium.',
              campaignsResult.rows.some((row) => row.name && row.name !== 'Unknown campaign') ? 'Campaign data is available.' : 'Campaign naming is missing or mostly unknown.',
            ]
          : [
              'GA4 tables exist in PostgreSQL, but they currently contain no usable rows for dashboard metrics.',
              'Check the Airbyte GA4 sync, selected property, date range, and report configuration.',
            ],
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Acquisition traffic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export type DailyBehaviorRow = {
  date: string;
  visitors: string | null;
  sessions: string | null;
  page_views: string | null;
  orders: string | null;
  abandoned_checkouts: string | null;
  quizzes: string | null;
  ratings: string | null;
};

export type LandingPageArrivalDayRow = {
  date: string;
  arrivals: string | null;
  unique_sessions: string | null;
  unique_visitors: string | null;
};

export type LandingPageArrivalHourRow = {
  hour: string | null;
  arrivals: string | null;
  unique_sessions: string | null;
};

export type LandingIntentConversionDailyRow = {
  date: string;
  total_sessions: string | null;
  high_intent_sessions: string | null;
};

export type DailyPurchaseRow = {
  date: string;
  purchase_users: string | null;
};

export type SourceMediumIntentRow = {
  date: string;
  source_medium: string | null;
  sessions: string | null;
  event_count: string | null;
};

export type ClickCountCandidateColumnRow = {
  table_name: string;
  column_name: string;
  data_type: string;
};

export type TableColumnRow = {
  column_name: string;
  data_type: string;
};

export async function getSiteBehavior(range: DateRange): Promise<SiteBehaviorResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const current = {
      sqlStart: dateToSql(range.start),
      sqlEnd: dateToSql(range.end),
      gaStart: dateToGa4(range.start),
      gaEnd: dateToGa4(range.end),
    };
    const [ga4CountResult, seriesResult] = await Promise.all([
      pool.query<{ row_count: string | null }>(`
        SELECT COUNT(*)::text AS row_count
        FROM public.traffic_acquisition_session_source_medium_report
      `),
      pool.query<DailyBehaviorRow>(`
        WITH dates AS (
          SELECT generate_series($1::date, $2::date, interval '1 day')::date AS date
        ),
        ga4 AS (
          SELECT to_date(date, 'YYYYMMDD') AS date, SUM("totalUsers") AS visitors, SUM(sessions) AS sessions, NULL::numeric AS page_views
          FROM public.traffic_acquisition_session_source_medium_report
          WHERE date BETWEEN $3 AND $4
          GROUP BY 1
        ),
        orders AS (
          SELECT created_at::date AS date, COUNT(*) AS orders
          FROM shopify.orders
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        ),
        checkouts AS (
          SELECT created_at::date AS date, COUNT(*) AS abandoned_checkouts
          FROM shopify.abandoned_checkouts
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        ),
        quizzes AS (
          SELECT created_at::date AS date, COUNT(*) AS quizzes
          FROM public.quizz
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        ),
        ratings AS (
          SELECT created_at::date AS date, COUNT(*) AS ratings
          FROM public.ratings
          WHERE created_at::date BETWEEN $1::date AND $2::date
          GROUP BY 1
        )
        SELECT
          dates.date::text AS date,
          COALESCE(ga4.visitors, 0)::text AS visitors,
          COALESCE(ga4.sessions, 0)::text AS sessions,
          COALESCE(ga4.page_views, 0)::text AS page_views,
          COALESCE(orders.orders, 0)::text AS orders,
          COALESCE(checkouts.abandoned_checkouts, 0)::text AS abandoned_checkouts,
          COALESCE(quizzes.quizzes, 0)::text AS quizzes,
          COALESCE(ratings.ratings, 0)::text AS ratings
        FROM dates
        LEFT JOIN ga4 ON ga4.date = dates.date
        LEFT JOIN orders ON orders.date = dates.date
        LEFT JOIN checkouts ON checkouts.date = dates.date
        LEFT JOIN quizzes ON quizzes.date = dates.date
        LEFT JOIN ratings ON ratings.date = dates.date
        ORDER BY dates.date
      `, [current.sqlStart, current.sqlEnd, current.gaStart, current.gaEnd]),
    ]);

    const hasGa4Rows = numberFromPg(ga4CountResult.rows[0]?.row_count) > 0;
    const series = seriesResult.rows.map((row) => ({
      date: row.date,
      visitors: hasGa4Rows ? numberFromPg(row.visitors) : null,
      sessions: hasGa4Rows ? numberFromPg(row.sessions) : null,
      pageViews: hasGa4Rows && numberFromPg(row.page_views) > 0 ? numberFromPg(row.page_views) : null,
      orders: numberFromPg(row.orders),
      abandonedCheckouts: numberFromPg(row.abandoned_checkouts),
      quizzes: numberFromPg(row.quizzes),
      ratings: numberFromPg(row.ratings),
    }));
    const totalOrders = series.reduce((sum, row) => sum + row.orders, 0);
    const totalAbandonedCheckouts = series.reduce((sum, row) => sum + row.abandonedCheckouts, 0);
    const totalRatings = series.reduce((sum, row) => sum + row.ratings, 0);
    const totalQuizzes = series.reduce((sum, row) => sum + row.quizzes, 0);
    const totalSessions = series.reduce((sum, row) => sum + (row.sessions ?? 0), 0);
    const insights = [
      hasGa4Rows ? 'GA4 session rows are available for behavior trends.' : 'Session/event tracking is unavailable or empty; implement tracking to see stay/leave behavior.',
      totalAbandonedCheckouts > totalOrders ? 'Abandoned checkouts exceed completed orders. Checkout friction needs attention.' : 'Completed orders are not below abandoned checkouts for this period.',
      totalOrders > 0 && totalRatings / totalOrders < 1 ? 'Ratings look low compared with orders. Post-delivery rating reminders may need work.' : 'Ratings are visible for this period.',
    ];

    return {
      ok: true,
      metrics: {
        hasSessionData: hasGa4Rows && totalSessions > 0,
        hasGa4Rows,
        visitorsPerDayAvailable: hasGa4Rows,
        sessionsPerDayAvailable: hasGa4Rows,
        pageViewsPerDayAvailable: false,
        clicksPerSessionAvailable: false,
        pagesPerSessionAvailable: false,
        averageSessionDurationAvailable: false,
        totalOrders,
        totalAbandonedCheckouts,
        totalQuizzes,
        totalRatings,
        checkoutAbandonmentRate: rate(totalAbandonedCheckouts, totalAbandonedCheckouts + totalOrders),
        purchaseConversionRate: rate(totalOrders, totalSessions),
        series,
        insights,
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Site behavior failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getLandingPageArrivals(range: DateRange): Promise<LandingPageArrivalResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const engagementRowCountResult = await pool.query<{ row_count: string }>(`
      SELECT COUNT(*)::text AS row_count
      FROM public.engagement_horaire
    `);

    const canUseEngagementHoraire = numberFromPg(engagementRowCountResult.rows[0]?.row_count) > 0;

    const dailyResult = canUseEngagementHoraire
      ? await pool.query<LandingPageArrivalDayRow>(`
          SELECT
            to_date(date, 'YYYYMMDD')::text AS date,
            COALESCE(SUM(sessions), 0)::text AS arrivals,
            COALESCE(SUM(sessions), 0)::text AS unique_sessions,
            COALESCE(SUM(COALESCE("activeUsers", 0)), 0)::text AS unique_visitors
          FROM public.engagement_horaire
          WHERE to_date(date, 'YYYYMMDD') >= $1::date
            AND to_date(date, 'YYYYMMDD') < ($2::date + interval '1 day')
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)])
      : await pool.query<LandingPageArrivalDayRow>(`
          SELECT
            (event_time AT TIME ZONE 'Europe/Amsterdam')::date::text AS date,
            COUNT(*)::text AS arrivals,
            COUNT(DISTINCT session_id)::text AS unique_sessions,
            COUNT(DISTINCT visitor_id)::text AS unique_visitors
          FROM public.site_events
          WHERE event_name IN ('vinpop_page_view', 'vinpop_landing_page_view')
            AND event_time >= $1::date
            AND event_time < ($2::date + interval '1 day')
            AND page_url IS NOT NULL
            AND (
              page_url ILIKE 'https://vinpop.nl%'
              OR page_url ILIKE 'https://www.vinpop.nl%'
              OR page_url = '/'
            )
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)]);

    const hourlyResult = canUseEngagementHoraire
      ? await pool.query<LandingPageArrivalHourRow>(`
          SELECT
            COALESCE(NULLIF(hour, ''), '0')::int::text AS hour,
            COALESCE(SUM(sessions), 0)::text AS arrivals,
            COALESCE(SUM(sessions), 0)::text AS unique_sessions
          FROM public.engagement_horaire
          WHERE to_date(date, 'YYYYMMDD') >= $1::date
            AND to_date(date, 'YYYYMMDD') < ($2::date + interval '1 day')
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)])
      : await pool.query<LandingPageArrivalHourRow>(`
          SELECT
            EXTRACT(HOUR FROM event_time AT TIME ZONE 'Europe/Amsterdam')::int::text AS hour,
            COUNT(*)::text AS arrivals,
            COUNT(DISTINCT session_id)::text AS unique_sessions
          FROM public.site_events
          WHERE event_name IN ('vinpop_page_view', 'vinpop_landing_page_view')
            AND event_time >= $1::date
            AND event_time < ($2::date + interval '1 day')
            AND page_url IS NOT NULL
            AND (
              page_url ILIKE 'https://vinpop.nl%'
              OR page_url ILIKE 'https://www.vinpop.nl%'
              OR page_url = '/'
            )
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)]);

    const clickCountColumnsResult = await pool.query<ClickCountCandidateColumnRow>(`
      SELECT table_name, column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_name IN ('click_count', 'session_id', 'event_time', 'created_at', 'session_start', 'date')
    `);

    const columnsByTable = new Map<string, Record<string, string>>();
    for (const row of clickCountColumnsResult.rows) {
      const current = columnsByTable.get(row.table_name) ?? {};
      current[row.column_name] = row.data_type;
      columnsByTable.set(row.table_name, current);
    }

    let clickCountSourceTable: string | null = null;
    let clickCountDateExpr: string | null = null;

    for (const [tableName, cols] of columnsByTable.entries()) {
      if (!cols.click_count || !cols.session_id) continue;

      if (cols.event_time) {
        clickCountSourceTable = tableName;
        clickCountDateExpr = `${quoteIdentifier('event_time')}::date`;
        break;
      }
      if (cols.created_at) {
        clickCountSourceTable = tableName;
        clickCountDateExpr = `${quoteIdentifier('created_at')}::date`;
        break;
      }
      if (cols.session_start) {
        clickCountSourceTable = tableName;
        clickCountDateExpr = `${quoteIdentifier('session_start')}::date`;
        break;
      }
      if (cols.date) {
        clickCountSourceTable = tableName;
        clickCountDateExpr = cols.date.includes('character')
          ? `to_date(${quoteIdentifier('date')}, 'YYYYMMDD')`
          : `${quoteIdentifier('date')}::date`;
        break;
      }
    }

    const intentConversionResult = clickCountSourceTable && clickCountDateExpr
      ? await pool.query<LandingIntentConversionDailyRow>(`
          SELECT
            ${clickCountDateExpr}::text AS date,
            COUNT(DISTINCT ${quoteIdentifier('session_id')})::text AS total_sessions,
            COUNT(DISTINCT CASE WHEN COALESCE(${quoteIdentifier('click_count')}, 0) > 3 THEN ${quoteIdentifier('session_id')} ELSE NULL END)::text AS high_intent_sessions
          FROM public.${quoteIdentifier(clickCountSourceTable)}
          WHERE ${clickCountDateExpr} >= $1::date
            AND ${clickCountDateExpr} < ($2::date + interval '1 day')
          GROUP BY 1
          ORDER BY 1
        `, [dateToSql(range.start), dateToSql(range.end)])
      : canUseEngagementHoraire
        ? await pool.query<LandingIntentConversionDailyRow>(`
            WITH hourly AS (
              SELECT
                to_date(date, 'YYYYMMDD')::date AS date,
                COALESCE(sessions, 0)::numeric AS sessions,
                COALESCE("eventCount", 0)::numeric AS event_count
              FROM public.engagement_horaire
              WHERE to_date(date, 'YYYYMMDD') >= $1::date
                AND to_date(date, 'YYYYMMDD') < ($2::date + interval '1 day')
            )
            SELECT
              date::text AS date,
              COALESCE(SUM(sessions), 0)::text AS total_sessions,
              COALESCE(
                SUM(
                  CASE
                    WHEN sessions > 0 AND (event_count / NULLIF(sessions, 0)) > 3
                    THEN sessions
                    ELSE 0
                  END
                ),
                0
              )::text AS high_intent_sessions
            FROM hourly
            GROUP BY date
            ORDER BY date
          `, [dateToSql(range.start), dateToSql(range.end)])
        : null;

    const purchasesResult = await pool.query<DailyPurchaseRow>(`
      SELECT
        to_date(date, 'YYYYMMDD')::text AS date,
        COALESCE(SUM("totalUsers"), 0)::text AS purchase_users
      FROM public.conversions_report
      WHERE date BETWEEN $1 AND $2
        AND LOWER(COALESCE("eventName", '')) = 'purchase'
      GROUP BY 1
      ORDER BY 1
    `, [dateToGa4(range.start), dateToGa4(range.end)]);

    const sourceMediumIntentResult = await pool.query<SourceMediumIntentRow>(`
      SELECT
        date,
        CONCAT(COALESCE("sessionSource", 'unknown'), ' / ', COALESCE("sessionMedium", 'unknown')) AS source_medium,
        COALESCE(SUM(sessions), 0)::text AS sessions,
        COALESCE(SUM("eventCount"), 0)::text AS event_count
      FROM public.traffic_acquisition_session_source_medium_report
      WHERE date BETWEEN $1 AND $2
      GROUP BY date, source_medium
      ORDER BY date, sessions DESC
    `, [dateToGa4(range.start), dateToGa4(range.end)]);

    const daily = dailyResult.rows.map((row) => ({
      date: row.date,
      arrivals: numberFromPg(row.arrivals),
      uniqueSessions: numberFromPg(row.unique_sessions),
      uniqueVisitors: numberFromPg(row.unique_visitors),
    }));
    const byHour = hourlyResult.rows.map((row) => ({
      hour: row.hour ? Number(row.hour) : 0,
      arrivals: numberFromPg(row.arrivals),
      uniqueSessions: numberFromPg(row.unique_sessions),
    })).sort((a, b) => a.hour - b.hour);

    const topDay = daily.reduce<LandingPageArrivalDay | null>((best, current) => {
      if (!best || current.arrivals > best.arrivals) return current;
      return best;
    }, null);
    const topHour = byHour.reduce<LandingPageArrivalHour | null>((best, current) => {
      if (!best || current.arrivals > best.arrivals) return current;
      return best;
    }, null);

    const purchaseByDate = new Map<string, number>(
      purchasesResult.rows.map((row) => [row.date, numberFromPg(row.purchase_users)]),
    );

    const intentDaily = (intentConversionResult?.rows ?? []).map((row) => ({
      date: row.date,
      totalSessions: numberFromPg(row.total_sessions),
      highIntentSessions: numberFromPg(row.high_intent_sessions),
      purchaseUsers: purchaseByDate.get(row.date) ?? 0,
    }));

    const totalSessions = intentDaily.reduce((sum, row) => sum + row.totalSessions, 0);
    const highIntentSessions = intentDaily.reduce((sum, row) => sum + row.highIntentSessions, 0);
    const purchaseUsers = intentDaily.reduce((sum, row) => sum + row.purchaseUsers, 0);

    const weekdayLabels = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const weekdayAccumulator = new Map<number, { sessions: number; highIntentSessions: number; purchaseUsers: number }>();
    for (const row of intentDaily) {
      const weekdayIndex = new Date(`${row.date}T00:00:00Z`).getUTCDay();
      const current = weekdayAccumulator.get(weekdayIndex) ?? { sessions: 0, highIntentSessions: 0, purchaseUsers: 0 };
      current.sessions += row.totalSessions;
      current.highIntentSessions += row.highIntentSessions;
      current.purchaseUsers += row.purchaseUsers;
      weekdayAccumulator.set(weekdayIndex, current);
    }
    const byWeekday = Array.from(weekdayAccumulator.entries())
      .map(([weekdayIndex, values]) => ({
        weekday: weekdayLabels[weekdayIndex] ?? 'Unknown',
        weekdayIndex,
        sessions: values.sessions,
        highIntentSessions: values.highIntentSessions,
        purchaseUsers: values.purchaseUsers,
        conversionRateHighIntent: rate(values.purchaseUsers, values.highIntentSessions),
      }))
      .sort((a, b) => a.weekdayIndex - b.weekdayIndex);

    const highIntentByDate = new Map<string, number>();
    for (const row of sourceMediumIntentResult.rows) {
      const events = numberFromPg(row.event_count);
      const sessions = numberFromPg(row.sessions);
      const interactionsPerSession = sessions > 0 ? events / sessions : 0;
      const high = interactionsPerSession > 3 ? sessions : 0;
      highIntentByDate.set(row.date, (highIntentByDate.get(row.date) ?? 0) + high);
    }

    const sourceAccumulator = new Map<string, { sessions: number; highIntentSessions: number; purchaseUsersEstimated: number }>();
    for (const row of sourceMediumIntentResult.rows) {
      const sourceMedium = row.source_medium || 'unknown / unknown';
      const sessions = numberFromPg(row.sessions);
      const events = numberFromPg(row.event_count);
      const interactionsPerSession = sessions > 0 ? events / sessions : 0;
      const sourceHighIntentSessions = interactionsPerSession > 3 ? sessions : 0;
      const dayTotalHighIntent = highIntentByDate.get(row.date) ?? 0;
      const dayPurchases = purchaseByDate.get(row.date) ?? 0;
      const purchaseUsersEstimated = dayTotalHighIntent > 0
        ? dayPurchases * (sourceHighIntentSessions / dayTotalHighIntent)
        : 0;

      const current = sourceAccumulator.get(sourceMedium) ?? { sessions: 0, highIntentSessions: 0, purchaseUsersEstimated: 0 };
      current.sessions += sessions;
      current.highIntentSessions += sourceHighIntentSessions;
      current.purchaseUsersEstimated += purchaseUsersEstimated;
      sourceAccumulator.set(sourceMedium, current);
    }

    const bySourceMedium = Array.from(sourceAccumulator.entries())
      .map(([sourceMedium, values]) => ({
        sourceMedium,
        sessions: values.sessions,
        highIntentSessions: values.highIntentSessions,
        purchaseUsersEstimated: values.purchaseUsersEstimated,
        conversionRateHighIntentEstimated: rate(values.purchaseUsersEstimated, values.highIntentSessions),
      }))
      .sort((a, b) => b.highIntentSessions - a.highIntentSessions)
      .slice(0, 20);

    const sortedIntentDaily = [...intentDaily].sort((a, b) => a.date.localeCompare(b.date));
    const splitIndex = Math.ceil(sortedIntentDaily.length / 2);
    const beforeRows = sortedIntentDaily.slice(0, splitIndex);
    const afterRows = sortedIntentDaily.slice(splitIndex);
    const summarizePeriod = (rows: typeof sortedIntentDaily) => {
      const sessions = rows.reduce((sum, row) => sum + row.totalSessions, 0);
      const highSessions = rows.reduce((sum, row) => sum + row.highIntentSessions, 0);
      const purchases = rows.reduce((sum, row) => sum + row.purchaseUsers, 0);
      return {
        sessions,
        highSessions,
        conversionRateHighIntent: rate(purchases, highSessions),
      };
    };
    const beforeSummary = summarizePeriod(beforeRows);
    const afterSummary = summarizePeriod(afterRows);
    const beforeAfter = sortedIntentDaily.length >= 2
      ? {
          beforeLabel: beforeRows.length
            ? `${beforeRows[0].date} to ${beforeRows[beforeRows.length - 1].date}`
            : 'Before',
          afterLabel: afterRows.length
            ? `${afterRows[0].date} to ${afterRows[afterRows.length - 1].date}`
            : 'After',
          beforeSessions: beforeSummary.sessions,
          afterSessions: afterSummary.sessions,
          beforeHighIntentSessions: beforeSummary.highSessions,
          afterHighIntentSessions: afterSummary.highSessions,
          beforeConversionRateHighIntent: beforeSummary.conversionRateHighIntent,
          afterConversionRateHighIntent: afterSummary.conversionRateHighIntent,
          deltaConversionRateHighIntent:
            beforeSummary.conversionRateHighIntent !== null && afterSummary.conversionRateHighIntent !== null
              ? afterSummary.conversionRateHighIntent - beforeSummary.conversionRateHighIntent
              : null,
        }
      : null;

    return {
      ok: true,
      metrics: {
        totalArrivals: daily.reduce((sum, row) => sum + row.arrivals, 0),
        totalUniqueSessions: daily.reduce((sum, row) => sum + row.uniqueSessions, 0),
        totalUniqueVisitors: daily.reduce((sum, row) => sum + row.uniqueVisitors, 0),
        daily,
        byHour,
        topDay,
        topHour,
        highIntentConversion: {
          available: Boolean(intentConversionResult),
          method: clickCountSourceTable ? 'true_click_count' : 'engagement_proxy',
          methodLabel: clickCountSourceTable
            ? 'True >3 clicks/session from session tracking table'
            : 'Proxy from interactions/session >3',
          sourceTable: clickCountSourceTable,
          thresholdInteractionsPerSession: 3,
          totalSessions,
          highIntentSessions,
          highIntentSessionShare: rate(highIntentSessions, totalSessions),
          purchaseUsers,
          conversionRateAllSessions: rate(purchaseUsers, totalSessions),
          conversionRateHighIntentSessions: rate(purchaseUsers, highIntentSessions),
          daily: sortedIntentDaily.map((row) => ({
            date: row.date,
            sessions: row.totalSessions,
            highIntentSessions: row.highIntentSessions,
            purchaseUsers: row.purchaseUsers,
            conversionRateHighIntent: rate(row.purchaseUsers, row.highIntentSessions),
          })),
          beforeAfter,
          byWeekday,
          bySourceMedium,
        },
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Landing page arrival analytics failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

/** Au-dela de ce taux de rebond, une source de trafic est signalee. */
const BOUNCE_ALERT_THRESHOLD = 60;

/**
 * Sous ce nombre de secondes d engagement par vue, une page est signalee.
 * Une page traversee sans lecture tourne autour de 1 a 3 secondes.
 */
const ENGAGEMENT_ALERT_SECONDS = 5;

/** Une source trop petite n a pas de taux de rebond interpretable. */
const MINIMUM_SESSIONS_FOR_BOUNCE = 5;

type TrafficSourceBounceRow = {
  session_source: string | null;
  session_medium: string | null;
  sessions: string | null;
  bounce_rate: string | null;
  screen_page_views: string | null;
  average_session_duration: string | null;
};

type PagePathRow = {
  page_path: string | null;
  screen_page_views: string | null;
  total_users: string | null;
  new_users: string | null;
  engagement_seconds_per_view: string | null;
  events_per_view: string | null;
};

/**
 * Etape 1 du funnel : experience et rebond sur le site.
 *
 * Deux mailles, deux tables, deux niveaux de certitude :
 *
 *  - `public.traffic_sources` porte un vrai `bounceRate` GA4, par couple
 *    source/medium. C est de la donnee GA4 native, pas un calcul maison.
 *  - `public.pages_path_report` ne contient ni sessions ni engagedSessions :
 *    GA4 n expose pas de taux de rebond par page dans cet entrepot. On y lit
 *    donc l engagement par vue, qui repond a la meme question ("la page
 *    est-elle lue ou traversee ?") sans se faire passer pour un rebond.
 */
export async function getSiteExperience(range: DateRange): Promise<SiteExperienceResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  const { start, end } = ga4Bounds(range);

  try {
    const pool = getPool(databaseUrl);

    const [sourcesResult, pagesResult] = await Promise.all([
      // Le taux de rebond global doit etre pondere par les sessions : faire une
      // moyenne des taux journaliers donnerait autant de poids a un jour a
      // 2 sessions qu a un jour a 200.
      pool.query<TrafficSourceBounceRow>(
        `SELECT
           "sessionSource" AS session_source,
           "sessionMedium" AS session_medium,
           SUM(sessions::numeric)::text AS sessions,
           (SUM("bounceRate"::numeric * sessions::numeric)
             / NULLIF(SUM(sessions::numeric), 0) * 100)::text AS bounce_rate,
           SUM("screenPageViews"::numeric)::text AS screen_page_views,
           (SUM("averageSessionDuration"::numeric * sessions::numeric)
             / NULLIF(SUM(sessions::numeric), 0))::text AS average_session_duration
         FROM public.traffic_sources
         WHERE date BETWEEN $1 AND $2
         GROUP BY 1, 2
         HAVING SUM(sessions::numeric) > 0
         ORDER BY SUM(sessions::numeric) DESC`,
        [start, end],
      ),
      pool.query<PagePathRow>(
        `SELECT
           "pagePath" AS page_path,
           SUM("screenPageViews"::numeric)::text AS screen_page_views,
           SUM("totalUsers"::numeric)::text AS total_users,
           SUM("newUsers"::numeric)::text AS new_users,
           (SUM("userEngagementDuration"::numeric)
             / NULLIF(SUM("screenPageViews"::numeric), 0))::text AS engagement_seconds_per_view,
           (SUM("eventCount"::numeric)
             / NULLIF(SUM("screenPageViews"::numeric), 0))::text AS events_per_view
         FROM public.pages_path_report
         WHERE date BETWEEN $1 AND $2
         GROUP BY 1
         HAVING SUM("screenPageViews"::numeric) > 0
         ORDER BY SUM("screenPageViews"::numeric) DESC
         LIMIT 100`,
        [start, end],
      ),
    ]);

    const sources: SiteExperienceSource[] = sourcesResult.rows.map((row) => {
      const sessions = numberFromPg(row.sessions);
      return {
        sourceMedium: `${row.session_source || '(non defini)'} / ${row.session_medium || '(non defini)'}`,
        sessions,
        // Sous le seuil de volume, le taux est trop bruite pour etre affiche.
        bounceRate: sessions >= MINIMUM_SESSIONS_FOR_BOUNCE ? numberFromPg(row.bounce_rate) : null,
        screenPageViews: numberFromPg(row.screen_page_views),
        averageSessionDuration: row.average_session_duration ? numberFromPg(row.average_session_duration) : null,
      };
    });

    const totalSessions = sources.reduce((sum, source) => sum + source.sessions, 0);
    const totalPageViews = sources.reduce((sum, source) => sum + source.screenPageViews, 0);

    // Rebond global : reponderation sur l ensemble des sources, y compris celles
    // trop petites pour etre affichees individuellement.
    const weightedBounce = sourcesResult.rows.reduce((sum, row) => {
      return sum + numberFromPg(row.bounce_rate) * numberFromPg(row.sessions);
    }, 0);
    const weightedDuration = sourcesResult.rows.reduce((sum, row) => {
      return sum + numberFromPg(row.average_session_duration) * numberFromPg(row.sessions);
    }, 0);

    const pages: SiteExperiencePage[] = pagesResult.rows.map((row) => {
      const engagementSecondsPerView = row.engagement_seconds_per_view
        ? numberFromPg(row.engagement_seconds_per_view)
        : null;

      return {
        pagePath: row.page_path || '(inconnu)',
        screenPageViews: numberFromPg(row.screen_page_views),
        totalUsers: numberFromPg(row.total_users),
        newUsers: numberFromPg(row.new_users),
        engagementSecondsPerView,
        eventsPerView: row.events_per_view ? numberFromPg(row.events_per_view) : null,
        lowEngagement:
          engagementSecondsPerView !== null && engagementSecondsPerView < ENGAGEMENT_ALERT_SECONDS,
      };
    });

    const highBounceSources = sources
      .filter((source) => source.bounceRate !== null && source.bounceRate > BOUNCE_ALERT_THRESHOLD)
      .sort((a, b) => b.sessions - a.sessions);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        dataAvailable: totalSessions > 0,
        totalSessions,
        bounceRate: totalSessions > 0 ? weightedBounce / totalSessions : null,
        bounceAlertThreshold: BOUNCE_ALERT_THRESHOLD,
        totalPageViews,
        averageSessionDuration: totalSessions > 0 ? weightedDuration / totalSessions : null,
        sources,
        highBounceSources,
        pages,
        engagementAlertThresholdSeconds: ENGAGEMENT_ALERT_SECONDS,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Site experience lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
