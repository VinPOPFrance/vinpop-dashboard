/**
 * Google Ads : qualite du trafic achete, campagne par campagne.
 *
 * Le tableau des mots-cles dit ce que coute un clic ; il ne dit pas ce que ce
 * clic devient. Un mot-cle a 0,80 EUR le clic qui repart aussitot coute plus
 * cher qu un mot-cle a 2 EUR qui reste : c est exactement le piege que cette
 * lecture doit rendre visible.
 *
 * La contrainte est la maille. Google Ads descend au mot-cle mais ignore ce qui
 * se passe apres le clic ; GA4 sait ce qui se passe apres mais s arrete au nom
 * de campagne. Le rebond et les sessions sont donc affiches par campagne, sans
 * jamais etre repartis entre les mots-cles : une moyenne de campagne recopiee
 * sur chaque mot-cle aurait l air d une mesure alors qu elle n en est pas une.
 *
 * Les ventes, elles, se rattachent au mot-cle exact quand le `gclid` de la
 * commande figure dans `public.click_view`.
 */

import 'server-only';
import { getPool, numberFromPg } from './client';
import { microsToEuros } from './googleAds';
import type { GoogleAdsTrafficResult, GoogleAdsCampaignTrafficRow, GoogleAdsKeywordSalesRow } from './types';
import { dateToGa4, dateToSql, type DateRange } from '@/lib/analytics/dateRanges';

/**
 * Au-dela de ce taux de rebond, le trafic paye est juge non qualifie : la
 * moitie des visites qui repartent sans rien faire est le seuil a partir
 * duquel le probleme vient de la promesse ou de la page, pas du hasard.
 */
const BOUNCE_RATE_ALERT = 55;

/** En dessous de ce nombre de sessions, le taux de rebond n est pas lisible. */
const MINIMUM_SESSIONS_FOR_VERDICT = 10;

function campaignVerdict(
  cost: number,
  sessions: number,
  bounceRate: number | null,
  orders: number,
): { verdict: GoogleAdsCampaignTrafficRow['verdict']; recommendation: string } {
  if (orders > 0) {
    return { verdict: 'converting', recommendation: 'Campagne qui vend : garder et monter le budget par paliers.' };
  }
  if (sessions < MINIMUM_SESSIONS_FOR_VERDICT) {
    return {
      verdict: 'insufficient-sessions',
      recommendation: 'Trop peu de sessions mesurees pour juger la qualite du trafic.',
    };
  }
  if (bounceRate !== null && bounceRate >= BOUNCE_RATE_ALERT) {
    return {
      verdict: 'trap',
      recommendation:
        'Clics peu chers mais visiteurs qui repartent : revoir la promesse de l annonce et la page d arrivee avant de depenser plus.',
    };
  }
  if (cost > 0) {
    return {
      verdict: 'watch',
      recommendation: 'Trafic qui reste sur le site mais n achete pas encore : surveiller le passage au quiz.',
    };
  }
  return { verdict: 'watch', recommendation: 'Aucune depense sur la periode.' };
}

export async function getGoogleAdsTrafficQuality(range: DateRange): Promise<GoogleAdsTrafficResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const start = dateToSql(range.start);
  const end = dateToSql(range.end);
  const ga4Start = dateToGa4(range.start);
  const ga4End = dateToGa4(range.end);

  try {
    const pool = getPool(databaseUrl);
    const [campaignCostResult, ga4Result, keywordSalesResult, coverageResult] = await Promise.all([
      // Cout et clics par campagne, reconstruits depuis les mots-cles : c est la
      // seule table dont les montants sont surs, `public.campaign` etant une
      // photographie quotidienne de la configuration, pas des depenses.
      pool.query<Record<string, string | null>>(
        `SELECT
           keyword_view.campaign_id::text AS campaign_id,
           MIN(campaign.campaign_name) AS campaign_name,
           SUM(keyword_view.metrics_cost_micros)::text AS cost_micros,
           SUM(keyword_view.metrics_clicks)::text AS clicks,
           SUM(keyword_view.metrics_impressions)::text AS impressions,
           SUM(keyword_view.metrics_conversions)::text AS conversions,
           COUNT(DISTINCT keyword_view.ad_group_criterion_keyword_text)::text AS keywords
         FROM public.keyword_view
         LEFT JOIN (
           SELECT DISTINCT ON (campaign_id) campaign_id, campaign_name
           FROM public.campaign
           ORDER BY campaign_id, segments_date DESC
         ) AS campaign ON campaign.campaign_id = keyword_view.campaign_id
         WHERE keyword_view.segments_date BETWEEN $1::date AND $2::date
           AND keyword_view.ad_group_criterion_negative IS NOT TRUE
         GROUP BY 1
         -- Une campagne arretee laisse des lignes a zero pendant des semaines :
         -- les afficher remplirait le tableau de campagnes qui ne tournent plus.
         HAVING SUM(keyword_view.metrics_impressions) > 0 OR SUM(keyword_view.metrics_cost_micros) > 0
         ORDER BY SUM(keyword_view.metrics_cost_micros) DESC`,
        [start, end],
      ),
      // Ce que GA4 a vu de ces memes campagnes. `engagementRate` est le
      // complement du rebond dans GA4 : une session engagee est une session qui
      // n a pas rebondi.
      pool.query<Record<string, string | null>>(
        `SELECT
           "sessionCampaignName" AS campaign_name,
           SUM(sessions)::text AS sessions,
           SUM("engagedSessions")::text AS engaged_sessions,
           SUM("totalRevenue")::text AS revenue
         FROM public.traffic_acquisition_session_campaign_report
         WHERE date BETWEEN $1 AND $2
         GROUP BY 1`,
        [ga4Start, ga4End],
      ),
      // Ventes rattachees au mot-cle exact, via le gclid de la commande.
      pool.query<Record<string, string | null>>(
        `WITH paid_clicks AS (
           SELECT
             substring(orders.landing_site from 'gclid=([^&]*)') AS gclid,
             CASE
               WHEN orders.total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN orders.total_price::text::numeric
               ELSE 0
             END AS revenue
           FROM public.orders
           WHERE orders.cancelled_at IS NULL
             AND orders.landing_site ILIKE '%gclid=%'
             AND orders.created_at::date BETWEEN $1::date AND $2::date
         )
         SELECT
           click_view.click_view_keyword_info_text AS keyword,
           click_view.campaign_name,
           COUNT(*)::text AS orders,
           SUM(paid_clicks.revenue)::text AS revenue
         FROM paid_clicks
         JOIN public.click_view ON click_view.click_view_gclid = paid_clicks.gclid
         GROUP BY 1, 2`,
        [start, end],
      ),
      // Jusqu ou vont reellement les sources.
      //
      // La date a retenir est celle de la derniere depense, pas celle de la
      // derniere ligne : Google continue d envoyer une ligne par mot-cle et par
      // jour longtemps apres l arret d une campagne, avec des zeros partout.
      // Lire MAX(segments_date) ferait croire que la campagne tourne encore.
      pool.query<Record<string, string | null>>(
        `SELECT
           (
             SELECT MAX(segments_date)::text
             FROM public.keyword_view
             WHERE metrics_cost_micros > 0
           ) AS last_google_ads_day,
           (SELECT MAX(segments_date)::text FROM public.click_view) AS last_click_view_day,
           (
             SELECT MAX(date)
             FROM public.traffic_sources
             WHERE lower("sessionSource") = 'google'
               AND lower("sessionMedium") IN ('cpc', 'ppc', 'paid')
               AND sessions > 0
           ) AS last_paid_session_day`,
      ),
    ]);

    const ga4ByCampaign = new Map(
      ga4Result.rows.map((row) => [
        (row.campaign_name ?? '').trim().toLowerCase(),
        {
          sessions: numberFromPg(row.sessions),
          engagedSessions: numberFromPg(row.engaged_sessions),
          revenue: numberFromPg(row.revenue),
        },
      ]),
    );

    const keywordSales: GoogleAdsKeywordSalesRow[] = keywordSalesResult.rows.map((row) => ({
      keyword: row.keyword ?? '(mot-cle inconnu)',
      campaignName: row.campaign_name ?? '(campagne inconnue)',
      orders: numberFromPg(row.orders),
      revenue: numberFromPg(row.revenue),
    }));

    const salesByCampaign = new Map<string, { orders: number; revenue: number }>();
    for (const sale of keywordSales) {
      const key = sale.campaignName.trim().toLowerCase();
      const current = salesByCampaign.get(key) ?? { orders: 0, revenue: 0 };
      salesByCampaign.set(key, {
        orders: current.orders + sale.orders,
        revenue: current.revenue + sale.revenue,
      });
    }

    const campaigns: GoogleAdsCampaignTrafficRow[] = campaignCostResult.rows.map((row) => {
      const campaignName = row.campaign_name ?? '(campagne inconnue)';
      const key = campaignName.trim().toLowerCase();
      const ga4 = ga4ByCampaign.get(key) ?? null;
      const sales = salesByCampaign.get(key) ?? { orders: 0, revenue: 0 };

      const cost = microsToEuros(row.cost_micros);
      const clicks = numberFromPg(row.clicks);
      const sessions = ga4?.sessions ?? 0;
      const bounceRate =
        ga4 && ga4.sessions > 0 ? ((ga4.sessions - ga4.engagedSessions) / ga4.sessions) * 100 : null;
      const { verdict, recommendation } = campaignVerdict(cost, sessions, bounceRate, sales.orders);

      return {
        campaignId: row.campaign_id ?? '',
        campaignName,
        keywords: numberFromPg(row.keywords),
        impressions: numberFromPg(row.impressions),
        clicks,
        cost,
        costPerClick: clicks > 0 ? cost / clicks : null,
        sessions: ga4 ? ga4.sessions : null,
        // Le rapport sessions / clics dit combien de clics payes ont vraiment
        // charge le site. Au-dessus de 1, GA4 compte des sessions que Google
        // Ads n a pas facturees (retours directs, autres sources) : la valeur
        // est affichee telle quelle plutot que plafonnee, un ecart etant lui
        // aussi une information.
        sessionsPerClick: ga4 && clicks > 0 ? ga4.sessions / clicks : null,
        costPerSession: ga4 && ga4.sessions > 0 ? cost / ga4.sessions : null,
        bounceRate,
        ga4Revenue: ga4 ? ga4.revenue : null,
        orders: sales.orders,
        revenue: sales.revenue,
        costPerOrder: sales.orders > 0 ? cost / sales.orders : null,
        verdict,
        recommendation,
      };
    });

    const coverage = coverageResult.rows[0];
    const lastPaidSessionDay = coverage?.last_paid_session_day ?? null;

    return {
      ok: true,
      metrics: {
        campaigns,
        keywordSales,
        lastGoogleAdsDay: coverage?.last_google_ads_day ?? null,
        lastClickViewDay: coverage?.last_click_view_day ?? null,
        // GA4 renvoie ses dates en AAAAMMJJ : remises au format ISO pour etre
        // comparables aux autres dates du dashboard.
        lastPaidSessionDay: lastPaidSessionDay
          ? `${lastPaidSessionDay.slice(0, 4)}-${lastPaidSessionDay.slice(4, 6)}-${lastPaidSessionDay.slice(6, 8)}`
          : null,
        bounceRateAlertThreshold: BOUNCE_RATE_ALERT,
        minimumSessionsForVerdict: MINIMUM_SESSIONS_FOR_VERDICT,
      },
    };
  } catch {
    return { ok: false, reason: 'connection-failed' };
  }
}
