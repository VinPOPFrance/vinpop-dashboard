/**
 * Meta Ads : depenses, creatives et performances par annonce.
 */

import 'server-only';
import { getPool, numberFromPg, rate, ratio } from './client';
import { type MetaAdsOverviewSummaryResult, type MetaAdsPerformanceResult, type MetaPerformanceRow } from './types';
import { dateToSql, type DateRange } from '@/lib/analytics/dateRanges';

/**
 * Budget minimum pour qu une creative soit jugee, en euros.
 *
 * En dessous, les chiffres ne veulent rien dire : une video a 3 EUR de depense
 * peut afficher 100 % de hook rate sur trois impressions, ou zero vente sans
 * que cela condamne le script. Ce seuil est la definition unique de "creative
 * jugeable" : il pilote a la fois le drapeau `sufficientSpend` de chaque ligne
 * et le filtre par defaut de l etape 2.
 */
export const MINIMUM_SPEND_FOR_REVIEW = 20;

export function metaPerformanceLabel(
  spend: number,
  clicks: number,
  ctrValue: number | null,
  cpcValue: number | null,
  purchases: number | null,
  roasValue: number | null,
): string {
  if ((purchases ?? 0) > 0 && (roasValue ?? 0) >= 1.5) return 'Scale candidate';
  if (spend <= 0 || clicks <= 0 || ctrValue === null || cpcValue === null) return 'Insufficient data';
  if (ctrValue >= 1.5 && cpcValue <= 1) return purchases === null ? 'Attribution missing' : 'Keep testing';
  if (spend >= 25 && ctrValue < 0.8) return 'Weak creative';
  if (ctrValue >= 1) return 'Watch';
  return 'Weak creative';
}

export function metaRecommendedAction(label: string, ctrValue: number | null, cpcValue: number | null, hookRate: number | null): string {
  if (label === 'Scale candidate') return 'Scale carefully if CPA and stock capacity are acceptable.';
  if (label === 'Attribution missing' && (ctrValue ?? 0) >= 1.5 && (cpcValue ?? 99) <= 1) return 'Keep creative, fix attribution.';
  if (label === 'Weak creative') return 'Stop, refresh creative, or test a stronger first 3 seconds.';
  if (hookRate !== null && hookRate >= 20 && (ctrValue ?? 0) < 1) return 'Hook works, improve offer or CTA.';
  if (hookRate !== null && hookRate < 10) return 'Test a stronger first 3 seconds.';
  if (label === 'Watch') return 'Keep testing and compare against checkout friction.';
  return 'Add UTM/meta click tracking before scaling.';
}

export function metaPostClickQuality(
  activeClickRate: number | null,
  costPerAddToCart: number | null,
  purchases: number | null,
): 'Good' | 'Medium' | 'Weak' {
  if ((activeClickRate ?? 0) >= 55 && (costPerAddToCart ?? 999) <= 25 && (purchases ?? 0) >= 2) {
    return 'Good';
  }
  if ((activeClickRate ?? 0) >= 35 && ((costPerAddToCart ?? 999) <= 45 || (purchases ?? 0) >= 1)) {
    return 'Medium';
  }
  return 'Weak';
}

export async function getMetaAdsOverviewSummary(range: DateRange): Promise<MetaAdsOverviewSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const start = dateToSql(range.start);
  const end = dateToSql(range.end);

  try {
    const pool = getPool(databaseUrl);
    const [summaryResult, dailyResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(SUM(spend), 0)::text AS total_spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value
        FROM public.ads_insights
        WHERE date_start BETWEEN $1 AND $2
      `, [start, end]),
      pool.query<Record<string, string | null>>(`
        SELECT
          date_start::text AS date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(clicks), 0)::text AS clicks
        FROM public.ads_insights
        WHERE date_start BETWEEN $1 AND $2
        GROUP BY date_start
        ORDER BY date_start
      `, [start, end]),
    ]);

    const summary = summaryResult.rows[0];
    const totalSpend = numberFromPg(summary?.total_spend);
    const impressions = numberFromPg(summary?.impressions);
    const clicks = numberFromPg(summary?.clicks);
    const purchases = numberFromPg(summary?.purchases);
    const purchaseValue = numberFromPg(summary?.purchase_value);

    return {
      ok: true,
      metrics: {
        totalSpend,
        clicks,
        ctr: rate(clicks, impressions),
        cpc: ratio(totalSpend, clicks),
        attributionAvailable: purchases > 0 || purchaseValue > 0,
        attributionNote:
          purchases > 0 || purchaseValue > 0
            ? 'Meta platform attribution fields are available. True Shopify CAC/ROAS attribution still requires session/order joining.'
            : 'Meta spend and clicks are available, but purchase attribution fields are missing for this period.',
        daily: dailyResult.rows.map((row) => ({
          date: row.date || '',
          spend: numberFromPg(row.spend),
          clicks: numberFromPg(row.clicks),
        })),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Meta ads overview summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getMetaAdsPerformance(): Promise<MetaAdsPerformanceResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const objectiveCandidates = ['objective', 'effective_objective', 'campaign_objective', 'marketing_objective', 'outcome'];
    const campaignObjectiveColumnResult = await pool.query<{ column_name: string }>(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'campaigns'
        AND column_name = ANY($1::text[])
    `, [objectiveCandidates]);
    const availableObjectiveColumns = new Set(campaignObjectiveColumnResult.rows.map((row) => row.column_name));
    const selectedObjectiveColumn = objectiveCandidates.find((column) => availableObjectiveColumns.has(column)) ?? null;
    const campaignObjectiveSql = selectedObjectiveColumn
      ? `MAX(campaigns.${selectedObjectiveColumn})::text`
      : 'NULL::text';

    const [summaryResult, dailyResult, campaignsResult, adSetsResult, adsResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(SUM(spend), 0)::text AS total_spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_add_to_cart'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS add_to_cart,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COUNT(DISTINCT campaign_id)::text AS campaigns_count,
          COUNT(DISTINCT adset_id)::text AS ad_sets_count,
          COUNT(DISTINCT ad_id)::text AS ads_count,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date
        FROM public.ads_insights
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          date_start::text AS date,
          COALESCE(ads_insights.campaign_id, '') AS campaign_id,
          COALESCE(ads_insights.adset_id, '') AS adset_id,
          COALESCE(ads_insights.ad_id, '') AS ad_id,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'add_to_cart'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_add_to_cart'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS add_to_cart,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value
          ,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events
        FROM public.ads_insights
        GROUP BY date_start, ads_insights.campaign_id, ads_insights.adset_id, ads_insights.ad_id
        ORDER BY date_start
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(ads_insights.campaign_id, '') AS id,
          ${campaignObjectiveSql} AS campaign_objective,
          COALESCE(MAX(campaign_name), 'Unknown campaign') AS name,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(inline_link_clicks), 0)::text AS inline_link_clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COALESCE(MAX(campaigns.effective_status), MAX(campaigns.status), 'Unknown') AS status
        FROM public.ads_insights
        LEFT JOIN public.campaigns ON campaigns.id = ads_insights.campaign_id
        GROUP BY ads_insights.campaign_id
        ORDER BY SUM(spend) DESC NULLS LAST
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(ads_insights.adset_id, '') AS id,
          COALESCE(ads_insights.campaign_id, '') AS campaign_id,
          ${campaignObjectiveSql} AS campaign_objective,
          COALESCE(MAX(adset_name), 'Unknown ad set') AS name,
          COALESCE(MAX(campaign_name), 'Unknown campaign') AS parent_name,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(inline_link_clicks), 0)::text AS inline_link_clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COALESCE(MAX(ad_sets.effective_status), 'Unknown') AS status
        FROM public.ads_insights
        LEFT JOIN public.ad_sets ON ad_sets.id = ads_insights.adset_id
        LEFT JOIN public.campaigns ON campaigns.id = ads_insights.campaign_id
        GROUP BY ads_insights.adset_id, ads_insights.campaign_id
        ORDER BY SUM(spend) DESC NULLS LAST
      `),
      pool.query<Record<string, string | null>>(`
        SELECT
          COALESCE(ads_insights.ad_id, '') AS id,
          COALESCE(ads_insights.adset_id, '') AS adset_id,
          COALESCE(ads_insights.campaign_id, '') AS campaign_id,
          ${campaignObjectiveSql} AS campaign_objective,
          COALESCE(MAX(ad_name), 'Unknown ad') AS name,
          COALESCE(MAX(ads.name), MAX(ad_name), 'Unknown creative') AS creative_label,
          COALESCE(MAX(adset_name), 'Unknown ad set') AS parent_name,
          COALESCE(MAX(campaign_name), 'Unknown campaign') AS campaign_name,
          MIN(date_start)::text AS first_date,
          MAX(date_stop)::text AS latest_date,
          COALESCE(SUM(spend), 0)::text AS spend,
          COALESCE(SUM(impressions), 0)::text AS impressions,
          COALESCE(SUM(clicks), 0)::text AS clicks,
          COALESCE(SUM(inline_link_clicks), 0)::text AS inline_link_clicks,
          COALESCE(SUM(reach), 0)::text AS reach,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_landing_page_view'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page_viewed'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'landing_page'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS landing_page_views,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchases,
          COALESCE(SUM(
            COALESCE(
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'omni_purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'purchase'
                LIMIT 1
              ),
              (
                SELECT NULLIF(elem->>'value', '')::numeric
                FROM jsonb_array_elements(COALESCE(action_values, '[]'::jsonb)) elem
                WHERE elem->>'action_type' = 'offsite_conversion.fb_pixel_purchase'
                LIMIT 1
              ),
              0
            )
          ), 0)::text AS purchase_value,
          COALESCE(SUM(
            COALESCE((
              SELECT SUM(NULLIF(elem->>'value', '')::numeric)
              FROM jsonb_array_elements(COALESCE(actions, '[]'::jsonb)) elem
              WHERE elem->>'action_type' IN ('video_view', 'video_play', 'video_3_sec_watched_actions', 'thruplay')
            ), 0)
          ), 0)::text AS hook_events,
          COALESCE(MAX(ads.effective_status), MAX(ads.status), 'Unknown') AS status
        FROM public.ads_insights
        LEFT JOIN public.ads ON ads.id = ads_insights.ad_id
        LEFT JOIN public.campaigns ON campaigns.id = ads_insights.campaign_id
        GROUP BY ads_insights.ad_id, ads_insights.adset_id, ads_insights.campaign_id
        ORDER BY SUM(spend) DESC NULLS LAST
      `),
    ]);
    const toRow = (row: Record<string, string | null>): MetaPerformanceRow => {
      const spend = numberFromPg(row.spend);
      const impressions = numberFromPg(row.impressions);
      const clicks = numberFromPg(row.clicks);
      const reach = numberFromPg(row.reach);
      const landingPageViewsRaw = numberFromPg(row.landing_page_views);
      const landingPageViews = landingPageViewsRaw > 0 ? landingPageViewsRaw : null;
      const addToCartRaw = numberFromPg(row.add_to_cart);
      const addToCart = addToCartRaw > 0 ? addToCartRaw : null;
      const purchasesRaw = numberFromPg(row.purchases);
      const purchaseValueRaw = numberFromPg(row.purchase_value);
      const purchases = purchasesRaw > 0 ? purchasesRaw : null;
      const purchaseValue = purchaseValueRaw > 0 ? purchaseValueRaw : null;
      const hookEvents = numberFromPg(row.hook_events);
      const videoPlays = hookEvents > 0 ? hookEvents : null;
      const activeClickRate = landingPageViews === null ? null : rate(landingPageViews, clicks);
      const costPerAddToCart = addToCart === null ? null : ratio(spend, addToCart);
      const ctrValue = rate(clicks, impressions);
      const cpcValue = ratio(spend, clicks);
      const cpmValue = impressions === 0 ? null : (spend / impressions) * 1000;
      const hookRate = hookEvents > 0 ? rate(hookEvents, impressions) : null;
      const roasValue = purchaseValue === null || spend === 0 ? null : purchaseValue / spend;
      const performanceLabel = metaPerformanceLabel(spend, clicks, ctrValue, cpcValue, purchases, roasValue);
      return {
        id: row.id || row.name || 'unknown',
        parentId: row.adset_id || row.campaign_id || '',
        campaignId: row.campaign_id || row.id || '',
        adSetId: row.adset_id || '',
        campaignObjective: row.campaign_objective || null,
        name: row.name || 'Unknown',
        parentName: row.parent_name || row.campaign_name || '',
        campaignName: row.campaign_name || row.parent_name || row.name || 'Unknown',
        creativeLabel: row.creative_label || row.name || 'Unknown creative',
        firstDate: row.first_date || null,
        latestDate: row.latest_date || null,
        spend,
        impressions,
        clicks,
        reach,
        frequency: ratio(impressions, reach),
        ctr: ctrValue,
        cpc: cpcValue,
        cpm: cpmValue,
        landingPageViews,
        activeClickRate,
        videoPlays,
        videoPlayToLandingRate: landingPageViews === null || videoPlays === null ? null : rate(landingPageViews, videoPlays),
        costPerLandingPageView: landingPageViews === null ? null : ratio(spend, landingPageViews),
        addToCart,
        costPerAddToCart,
        hookRate,
        hookMetric: hookRate === null ? 'Unavailable' : 'Video action proxy / impressions',
        purchases,
        purchaseValue,
        cpa: purchases === null ? null : ratio(spend, purchases),
        roas: roasValue,
        postClickQuality: metaPostClickQuality(activeClickRate, costPerAddToCart, purchases),
        status: row.status || 'Unknown',
        performanceLabel,
        recommendedAction: metaRecommendedAction(performanceLabel, ctrValue, cpcValue, hookRate),
        sufficientSpend: spend > MINIMUM_SPEND_FOR_REVIEW,
      };
    };
    const summary = summaryResult.rows[0];
    const totalSpend = numberFromPg(summary?.total_spend);
    const impressions = numberFromPg(summary?.impressions);
    const clicks = numberFromPg(summary?.clicks);
    const purchasesRaw = numberFromPg(summary?.purchases);
    const purchaseValueRaw = numberFromPg(summary?.purchase_value);
    const purchases = purchasesRaw > 0 ? purchasesRaw : null;
    const purchaseValue = purchaseValueRaw > 0 ? purchaseValueRaw : null;
    const hookEvents = numberFromPg(summary?.hook_events);
    const daily = dailyResult.rows.map((row) => {
      const spend = numberFromPg(row.spend);
      const impressionsValue = numberFromPg(row.impressions);
      const clicksValue = numberFromPg(row.clicks);
      const landingPageViewsValueRaw = numberFromPg(row.landing_page_views);
      const landingPageViewsValue = landingPageViewsValueRaw > 0 ? landingPageViewsValueRaw : null;
      const addToCartValueRaw = numberFromPg(row.add_to_cart);
      const addToCartValue = addToCartValueRaw > 0 ? addToCartValueRaw : null;
      const videoPlaysRaw = numberFromPg(row.hook_events);
      const videoPlaysValue = videoPlaysRaw > 0 ? videoPlaysRaw : null;
      const purchasesValue = numberFromPg(row.purchases);
      const purchaseValue = numberFromPg(row.purchase_value);
      const purchasesOrNull = purchasesValue > 0 ? purchasesValue : null;

      return {
        date: row.date || '',
        campaignId: row.campaign_id || '',
        adSetId: row.adset_id || '',
        adId: row.ad_id || '',
        spend,
        impressions: impressionsValue,
        clicks: clicksValue,
        landingPageViews: landingPageViewsValue,
        activeClickRate: landingPageViewsValue === null ? null : rate(landingPageViewsValue, clicksValue),
        videoPlays: videoPlaysValue,
        videoPlayToLandingRate: landingPageViewsValue === null || videoPlaysValue === null ? null : rate(landingPageViewsValue, videoPlaysValue),
        costPerLandingPageView: landingPageViewsValue === null ? null : ratio(spend, landingPageViewsValue),
        addToCart: addToCartValue,
        costPerAddToCart: addToCartValue === null ? null : ratio(spend, addToCartValue),
        ctr: rate(clicksValue, impressionsValue),
        cpc: ratio(spend, clicksValue),
        cpm: impressionsValue === 0 ? null : (spend / impressionsValue) * 1000,
        purchases: purchasesOrNull,
        cpa: purchasesOrNull === null ? null : ratio(spend, purchasesOrNull),
        roas: purchaseValue > 0 && spend > 0 ? purchaseValue / spend : null,
      };
    });

    return {
      ok: true,
      metrics: {
        totalSpend,
        impressions,
        clicks,
        firstDate: summary?.first_date || null,
        latestDate: summary?.latest_date || null,
        ctr: rate(clicks, impressions),
        cpc: ratio(totalSpend, clicks),
        cpm: impressions === 0 ? null : (totalSpend / impressions) * 1000,
        hookRate: hookEvents > 0 ? rate(hookEvents, impressions) : null,
        hookMetric: hookEvents > 0 ? 'Video action proxy / impressions' : 'Unavailable',
        campaignsCount: numberFromPg(summary?.campaigns_count),
        adSetsCount: numberFromPg(summary?.ad_sets_count),
        adsCount: numberFromPg(summary?.ads_count),
        purchases,
        purchaseValue,
        cpa: purchases === null ? null : ratio(totalSpend, purchases),
        roas: purchaseValue === null || totalSpend === 0 ? null : purchaseValue / totalSpend,
        attributionAvailable: purchases !== null || purchaseValue !== null,
        attributionNote: purchases !== null || purchaseValue !== null
          ? 'Meta platform purchase/action values are available. Shopify server-side order attribution is still separate until UTM/meta click tracking is joined to orders.'
          : 'Meta spend/click metrics are available, but purchases, CAC, and ROAS are unavailable until Meta action values or Shopify attribution are reliable.',
        daily,
        campaigns: campaignsResult.rows.map(toRow),
        adSets: adSetsResult.rows.map(toRow),
        ads: adsResult.rows.map(toRow),
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Meta ads performance failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
