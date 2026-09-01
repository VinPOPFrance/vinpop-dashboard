/**
 * Google Ads.
 *
 * Cette source est presente dans la base depuis le debut (Airbyte alimente
 * `public.campaign`, `public.ad_group`, `public.keyword_view` et
 * `public.click_view`) mais n avait jamais ete exploitee par le dashboard.
 * Les requetes de l etape 2 du funnel arrivent au Lot 4 ; ce module pose la
 * conversion de couts et l inventaire des tables disponibles.
 */

import 'server-only';
import { getPool, numberFromPg } from './client';
import type { GoogleAdsKeywordResult, GoogleAdsKeywordRow, GoogleAdsKeywordVerdict } from './types';
import { dateToGa4, dateToSql, type DateRange } from '@/lib/analytics/dateRanges';

/**
 * Tables Google Ads disponibles, avec ce qu on peut en tirer.
 *
 * Sert de reference pour le Lot 4 : les colonnes de couts sont toutes en
 * micro-unites et les volumes sont deja agreges par `segments_date`.
 */
export const GOOGLE_ADS_TABLES = {
  /** Depense, impressions, clics et conversions par campagne et par jour. */
  campaign: 'public.campaign',
  /** Meme granularite, au niveau du groupe d annonces. */
  adGroup: 'public.ad_group',
  /** Performance par mot-cle : la base du croisement CPLPV / taux de rebond. */
  keywordView: 'public.keyword_view',
  /** Un clic par ligne, avec le gclid : permet de rapprocher clics et sessions GA4. */
  clickView: 'public.click_view',
  /** Performance Shopping, si des campagnes Shopping sont actives. */
  shoppingPerformance: 'public.shopping_performance_view',
} as const;

/**
 * Convertit un cout Google Ads en euros.
 *
 * L API Google Ads exprime tous les montants en micro-unites de la devise du
 * compte : 1 000 000 micros = 1 EUR. Oublier cette division fait apparaitre des
 * budgets un million de fois trop grands, d ou cette conversion unique et
 * partagee plutot qu une division recopiee dans chaque requete.
 */
export function microsToEuros(micros: number | string | null | undefined): number {
  if (micros === null || micros === undefined) {
    return 0;
  }

  const parsed = typeof micros === 'number' ? micros : Number(micros);
  return Number.isFinite(parsed) ? parsed / 1_000_000 : 0;
}

/**
 * En dessous de ce nombre de clics, un mot-cle n a pas assez d historique pour
 * qu on puisse conclure quoi que ce soit sur sa qualite.
 */
const MINIMUM_CLICKS_FOR_VERDICT = 5;

type KeywordRow = {
  keyword: string | null;
  match_type: string | null;
  campaign_name: string | null;
  impressions: string | null;
  clicks: string | null;
  cost_micros: string | null;
  conversions: string | null;
  ctr: string | null;
  quality_score: string | null;
};

type PaidSearchBounceRow = {
  sessions: string | null;
  bounce_rate: string | null;
};

/**
 * Verdict porte sur un mot-cle.
 *
 * L entrepot ne contient pas de taux de rebond par mot-cle (GA4 n expose le
 * rebond qu au niveau source/medium). Le signal equivalent, et disponible, est
 * le mot-cle qui consomme des clics sans jamais produire de conversion : c est
 * la definition operationnelle du trafic non qualifie retenue ici.
 */
function keywordVerdict(clicks: number, conversions: number): {
  verdict: GoogleAdsKeywordVerdict;
  recommendation: string;
} {
  if (conversions > 0) {
    return { verdict: 'converting', recommendation: 'Convertit : garder et monter les encheres' };
  }

  if (clicks < MINIMUM_CLICKS_FOR_VERDICT) {
    return {
      verdict: 'insufficient-clicks',
      recommendation: `Moins de ${MINIMUM_CLICKS_FOR_VERDICT} clics : laisser tourner avant de juger`,
    };
  }

  if (clicks >= MINIMUM_CLICKS_FOR_VERDICT * 2) {
    return { verdict: 'trap', recommendation: 'Budget consomme sans conversion : exclure ou refondre la landing' };
  }

  return { verdict: 'watch', recommendation: 'Aucune conversion pour l instant : a surveiller' };
}

/**
 * Etape 2 du funnel, volet Google Ads : economie par mot-cle.
 *
 * Tous les couts de l API Google Ads sont en micro-unites : `cost_micros` est
 * systematiquement divise par 1 000 000 (voir `microsToEuros`).
 *
 * Le taux de rebond renvoye est celui du canal google / cpc mesure par GA4. Il
 * est volontairement expose comme une valeur de canal et non de mot-cle :
 * `traffic_sources` s arrete a la maille source/medium, et pretendre descendre
 * au mot-cle serait une invention.
 */
export async function getGoogleAdsKeywordPerformance(range: DateRange): Promise<GoogleAdsKeywordResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);

    const [keywordsResult, bounceResult] = await Promise.all([
      pool.query<KeywordRow>(
        `SELECT
           keyword_view.ad_group_criterion_keyword_text AS keyword,
           keyword_view.ad_group_criterion_keyword_match_type AS match_type,
           MIN(campaign.campaign_name) AS campaign_name,
           SUM(keyword_view.metrics_impressions)::text AS impressions,
           SUM(keyword_view.metrics_clicks)::text AS clicks,
           SUM(keyword_view.metrics_cost_micros)::text AS cost_micros,
           SUM(keyword_view.metrics_conversions)::text AS conversions,
           (SUM(keyword_view.metrics_clicks)::numeric
             / NULLIF(SUM(keyword_view.metrics_impressions), 0) * 100)::text AS ctr,
           AVG(keyword_view.metrics_historical_quality_score)::text AS quality_score
         FROM public.keyword_view
         -- public.campaign porte une ligne par campagne ET par jour/heure/reseau.
         -- Joindre la table telle quelle multiplierait chaque ligne de mots-cles
         -- par le nombre de jours de la campagne : on reduit d abord la table a
         -- un libelle par campagne, en gardant le nom le plus recent.
         LEFT JOIN (
           SELECT DISTINCT ON (campaign_id) campaign_id, campaign_name
           FROM public.campaign
           ORDER BY campaign_id, segments_date DESC
         ) AS campaign
           ON campaign.campaign_id = keyword_view.campaign_id
         WHERE keyword_view.segments_date BETWEEN $1::date AND $2::date
           AND keyword_view.ad_group_criterion_negative IS NOT TRUE
         GROUP BY 1, 2
         HAVING SUM(keyword_view.metrics_impressions) > 0
         ORDER BY SUM(keyword_view.metrics_cost_micros) DESC`,
        [dateToSql(range.start), dateToSql(range.end)],
      ),
      // Rebond GA4 du trafic Google Ads, toutes requetes confondues.
      pool.query<PaidSearchBounceRow>(
        `SELECT
           SUM(sessions::numeric)::text AS sessions,
           (SUM("bounceRate"::numeric * sessions::numeric)
             / NULLIF(SUM(sessions::numeric), 0) * 100)::text AS bounce_rate
         FROM public.traffic_sources
         WHERE date BETWEEN $1 AND $2
           AND lower("sessionSource") = 'google'
           AND lower("sessionMedium") IN ('cpc', 'ppc', 'paid')`,
        [dateToGa4(range.start), dateToGa4(range.end)],
      ),
    ]);

    const keywords: GoogleAdsKeywordRow[] = keywordsResult.rows.map((row) => {
      const clicks = numberFromPg(row.clicks);
      const conversions = numberFromPg(row.conversions);
      const cost = microsToEuros(row.cost_micros);
      const { verdict, recommendation } = keywordVerdict(clicks, conversions);

      return {
        keyword: row.keyword || '(mot-cle inconnu)',
        matchType: row.match_type || '(inconnu)',
        campaignName: row.campaign_name || '(campagne inconnue)',
        impressions: numberFromPg(row.impressions),
        clicks,
        cost,
        costPerClick: clicks > 0 ? cost / clicks : null,
        ctr: row.ctr ? numberFromPg(row.ctr) : null,
        conversions,
        costPerConversion: conversions > 0 ? cost / conversions : null,
        qualityScore: row.quality_score ? numberFromPg(row.quality_score) : null,
        verdict,
        recommendation,
      };
    });

    const totalCost = keywords.reduce((sum, row) => sum + row.cost, 0);
    const totalClicks = keywords.reduce((sum, row) => sum + row.clicks, 0);
    const totalImpressions = keywords.reduce((sum, row) => sum + row.impressions, 0);
    const totalConversions = keywords.reduce((sum, row) => sum + row.conversions, 0);

    const trapKeywords = keywords
      .filter((row) => row.verdict === 'trap')
      .sort((a, b) => b.cost - a.cost);

    const bounceRow = bounceResult.rows[0];
    const paidSearchSessions = numberFromPg(bounceRow?.sessions);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        dataAvailable: keywords.length > 0,
        totalCost,
        totalClicks,
        totalImpressions,
        totalConversions,
        averageCostPerClick: totalClicks > 0 ? totalCost / totalClicks : null,
        averageCtr: totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : null,
        costPerConversion: totalConversions > 0 ? totalCost / totalConversions : null,
        paidSearchBounceRate: paidSearchSessions > 0 ? numberFromPg(bounceRow?.bounce_rate) : null,
        paidSearchSessions,
        minimumClicksForVerdict: MINIMUM_CLICKS_FOR_VERDICT,
        keywords,
        trapKeywords,
        wastedCost: trapKeywords.reduce((sum, row) => sum + row.cost, 0),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Google Ads keyword performance failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
