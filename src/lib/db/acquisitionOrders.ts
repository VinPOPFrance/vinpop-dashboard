/**
 * Recapitulatif des commandes par canal d acquisition.
 *
 * Les deux onglets de l etape 2 repondent chacun pour leur regie ; il manquait
 * la vue qui les reconcilie : une ligne par commande encaissee, avec ce qui l a
 * amenee. C est le seul endroit ou l on peut verifier, commande par commande,
 * pourquoi une vente n apparait dans aucun tableau publicitaire — et donc si
 * un budget merite d etre juge sur ces chiffres.
 *
 * Le canal se deduit de l URL d arrivee (`orders.landing_site`) et du site
 * referent, jamais d une supposition sur le montant ou la date. Quand l URL ne
 * dit rien, la commande est classee "direct" : c est une absence de preuve,
 * pas une preuve d absence, et le libelle le dit.
 */

import 'server-only';
import { getPool, numberFromPg } from './client';
import { microsToEuros } from './googleAds';
import { dateToSql, type DateRange } from '@/lib/analytics/dateRanges';
import { attributionMethodLabel, metaAdMatchMethodSql, metaAdResolutionSql } from './metaAttribution';
import type {
  AcquisitionChannel,
  AcquisitionOrderRow,
  AcquisitionOrdersResult,
  MetaAttributionMethod,
} from './types';

export const acquisitionChannelLabel: Record<AcquisitionChannel, string> = {
  meta: 'Meta Ads',
  'google-ads': 'Google Ads',
  'google-organic': 'Google naturel',
  referral: 'Site referent',
  direct: 'Direct / inconnu',
};

/**
 * Deduit le canal d une commande a partir des traces laissees dans son URL.
 *
 * L ordre compte : un clic paye Google laisse a la fois un `gclid` et un
 * referent google.com. Tester le paye avant le naturel evite de compter une
 * vente publicitaire comme gratuite. Meta passe apres Google parce qu une URL
 * ne porte jamais les deux, alors qu une commande sans aucun parametre peut
 * avoir un referent Facebook.
 */
function classify(row: {
  gclid: string | null;
  googleCampaignId: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  adId: string | null;
  hasFacebookClickId: boolean;
  fromMetaReferrer: boolean;
  hasShoppingId: boolean;
  referringSite: string | null;
  utmContent: string | null;
  utmCampaign: string | null;
}): AcquisitionChannel {
  const source = row.utmSource ?? '';
  const medium = row.utmMedium ?? '';

  if (row.gclid || row.googleCampaignId || (source.includes('google') && /cpc|ppc|paid/.test(medium))) {
    return 'google-ads';
  }
  if (row.adId || row.hasFacebookClickId || row.fromMetaReferrer || /meta|facebook|^fb$|^ig$|instagram/.test(source)) {
    return 'meta';
  }
  // `srsltid` est le marqueur des fiches produit gratuites de Google Shopping :
  // la commande vient de Google sans qu un euro ait ete depense.
  if (row.hasShoppingId || /google/i.test(row.referringSite ?? '')) return 'google-organic';
  if (row.referringSite) return 'referral';
  // Un utm_content sans source connue reste un lien balise a la main (lien de
  // bio, newsletter) : c est un referent, pas du trafic direct.
  if (row.utmContent || row.utmCampaign) return 'referral';
  return 'direct';
}

/** Nom de domaine seul : une URL complete de referent est illisible en tableau. */
function hostOf(url: string | null): string | null {
  if (!url) return null;
  const match = url.match(/^https?:\/\/([^/?#]+)/i);
  return match ? match[1].replace(/^www\./, '') : url;
}

export async function getAcquisitionOrders(range: DateRange): Promise<AcquisitionOrdersResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  const start = dateToSql(range.start);
  const end = dateToSql(range.end);

  try {
    const pool = getPool(databaseUrl);
    const [result, spendResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
      WITH base AS (
        SELECT
          id::text AS order_id,
          COALESCE(name, id::text) AS order_name,
          created_at,
          cancelled_at,
          lower(COALESCE(financial_status::text, '')) AS financial_status,
          CASE
            WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
            ELSE 0
          END AS revenue,
          lower(replace(substring(landing_site from 'utm_source=([^&]*)'), '%20', ' ')) AS utm_source,
          lower(replace(substring(landing_site from 'utm_medium=([^&]*)'), '%20', ' ')) AS utm_medium,
          replace(substring(landing_site from 'utm_id=([^&]*)'), '%20', ' ') AS utm_id,
          replace(substring(landing_site from 'utm_content=([^&]*)'), '%20', ' ') AS utm_content,
          replace(substring(landing_site from 'utm_term=([^&]*)'), '%20', ' ') AS utm_term,
          replace(substring(landing_site from 'utm_campaign=([^&]*)'), '%20', ' ') AS utm_campaign,
          substring(landing_site from 'gclid=([^&]*)') AS gclid,
          substring(landing_site from 'gad_campaignid=([^&]*)') AS google_campaign_id,
          landing_site ILIKE '%srsltid%' AS has_shopping_id,
          landing_site ILIKE '%fbclid%' AS has_fbclid,
          referring_site ~* '(facebook|instagram|fb\\.me)' AS from_meta_referrer,
          NULLIF(referring_site, '') AS referring_site,
          split_part(COALESCE(NULLIF(landing_site, ''), '/'), '?', 1) AS landing_path
        FROM public.orders
        WHERE created_at::date BETWEEN $1::date AND $2::date
      )
      SELECT
        base.order_id,
        base.order_name,
        base.created_at::text AS created_at,
        base.revenue::text AS revenue,
        base.financial_status,
        (base.cancelled_at IS NOT NULL)::text AS cancelled,
        base.utm_source,
        base.utm_medium,
        base.utm_content,
        base.utm_campaign,
        base.gclid,
        base.google_campaign_id,
        base.has_shopping_id::text AS has_shopping_id,
        base.has_fbclid::text AS has_fbclid,
        base.from_meta_referrer::text AS from_meta_referrer,
        base.referring_site,
        base.landing_path,
        ${metaAdResolutionSql('base')} AS ad_id,
        ${metaAdMatchMethodSql('base')} AS match_method,
        (
          SELECT ads.name FROM public.ads
          WHERE ads.id = ${metaAdResolutionSql('base')}
        ) AS ad_name,
        (
          SELECT campaigns.name
          FROM public.campaigns
          WHERE campaigns.id IN (base.utm_id, base.utm_campaign)
          LIMIT 1
        ) AS meta_campaign_name,
        -- public.campaign porte une ligne par campagne et par jour : la reduire
        -- a un libelle par campagne avant de la lire, sinon le sous-select
        -- renvoie autant de lignes que de jours.
        (
          SELECT campaign_name
          FROM (
            SELECT DISTINCT ON (campaign_id) campaign_id, campaign_name
            FROM public.campaign
            ORDER BY campaign_id, segments_date DESC
          ) AS google_campaign
          WHERE google_campaign.campaign_id::text = base.google_campaign_id
        ) AS google_campaign_name,
        -- Le mot-cle exact du clic paye, quand Google l a remonte : c est la
        -- seule facon de relier une vente a une requete precise.
        (
          SELECT click_view.click_view_keyword_info_text
          FROM public.click_view
          WHERE click_view.click_view_gclid = base.gclid
          LIMIT 1
        ) AS google_keyword
      FROM base
      ORDER BY base.created_at DESC
    `, [start, end]),
      // Les deux budgets publicitaires, sur toute leur duree de vie.
      //
      // C est le denominateur du cout d acquisition reel : une vente "directe"
      // n arrive pas de nulle part, la personne a vu une publicite avant de
      // revenir par elle-meme. Rapporter la depense totale aux ventes totales
      // est la seule facon de savoir ce que coute vraiment un client, meme si
      // ce chiffre ne dit pas quelle regie l a apporte.
      pool.query<Record<string, string | null>>(`
        SELECT
          (
            SELECT COALESCE(SUM(spend), 0)::text
            FROM public.ads_insights
            WHERE date_start BETWEEN $1::date AND $2::date
          ) AS meta_spend,
          (
            SELECT MIN(date_start)::text
            FROM public.ads_insights
            WHERE spend > 0 AND date_start BETWEEN $1::date AND $2::date
          ) AS meta_first_day,
          (
            SELECT MAX(date_stop)::text
            FROM public.ads_insights
            WHERE spend > 0 AND date_start BETWEEN $1::date AND $2::date
          ) AS meta_last_day,
          (
            SELECT COALESCE(SUM(metrics_cost_micros), 0)::text
            FROM public.keyword_view
            WHERE ad_group_criterion_negative IS NOT TRUE
              AND segments_date BETWEEN $1::date AND $2::date
          ) AS google_cost_micros,
          (
            SELECT MIN(segments_date)::text
            FROM public.keyword_view
            WHERE metrics_cost_micros > 0 AND segments_date BETWEEN $1::date AND $2::date
          ) AS google_first_day,
          (
            SELECT MAX(segments_date)::text
            FROM public.keyword_view
            WHERE metrics_cost_micros > 0 AND segments_date BETWEEN $1::date AND $2::date
          ) AS google_last_day
      `, [start, end]),
    ]);

    const spendRow = spendResult.rows[0];

    const orders: AcquisitionOrderRow[] = result.rows.map((row) => {
      const adId = row.ad_id;
      const channel = classify({
        gclid: row.gclid,
        googleCampaignId: row.google_campaign_id,
        utmSource: row.utm_source,
        utmMedium: row.utm_medium,
        adId,
        hasFacebookClickId: row.has_fbclid === 'true',
        fromMetaReferrer: row.from_meta_referrer === 'true',
        hasShoppingId: row.has_shopping_id === 'true',
        referringSite: row.referring_site,
        utmContent: row.utm_content,
        utmCampaign: row.utm_campaign,
      });

      // Ce que la commande permet d affirmer, du plus precis au plus vague.
      const detail =
        channel === 'google-ads'
          ? row.google_keyword ?? row.google_campaign_name ?? 'Campagne Google inconnue'
          : channel === 'meta'
            ? row.ad_name ?? row.meta_campaign_name ?? row.utm_content ?? 'Creative inconnue'
            : channel === 'google-organic'
              ? 'Recherche Google (non payante)'
              : channel === 'referral'
                ? hostOf(row.referring_site) ?? row.utm_campaign ?? row.utm_content ?? 'Lien externe'
                : 'Aucun parametre dans l URL';

      const evidence =
        channel === 'google-ads'
          ? row.google_keyword
            ? 'gclid retrouve dans les clics Google Ads'
            : row.gclid
              ? 'gclid present, mot-cle absent des clics remontes'
              : 'Identifiant de campagne Google dans l URL'
          : channel === 'meta'
            ? adId
              ? attributionMethodLabel[(row.match_method ?? 'ad-id') as MetaAttributionMethod]
              : // L ordre suit la force du signal : un utm_content, meme
                // inexploitable, en dit plus qu un fbclid, qui en dit plus
                // qu un simple referent.
                row.utm_content
                ? `utm_content "${row.utm_content}" ne correspond a aucune annonce`
                : row.has_fbclid === 'true'
                  ? 'Identifiant de clic Facebook, sans UTM exploitable'
                  : row.from_meta_referrer === 'true'
                    ? 'Site referent Facebook / Instagram'
                    : 'Parametres UTM Meta sans creative reconnue'
            : channel === 'google-organic'
              ? row.has_shopping_id === 'true'
                ? 'Fiche produit gratuite Google Shopping (srsltid)'
                : 'Referent google.com'
              : channel === 'referral'
                ? `Referent ${hostOf(row.referring_site) ?? 'externe'}`
                : 'Ni UTM, ni identifiant de clic, ni referent';

      return {
        orderId: row.order_id ?? '',
        orderName: row.order_name ?? '',
        createdAt: row.created_at ? row.created_at.slice(0, 10) : null,
        revenue: numberFromPg(row.revenue),
        paid: row.financial_status === 'paid',
        cancelled: row.cancelled === 'true',
        channel,
        detail,
        evidence,
        adId: channel === 'meta' ? adId : null,
        keyword: channel === 'google-ads' ? row.google_keyword : null,
        landingPath: row.landing_path,
      };
    });

    return {
      ok: true,
      metrics: {
        orders,
        spend: {
          meta: numberFromPg(spendRow?.meta_spend),
          metaFirstDay: spendRow?.meta_first_day ?? null,
          metaLastDay: spendRow?.meta_last_day ?? null,
          google: microsToEuros(spendRow?.google_cost_micros),
          googleFirstDay: spendRow?.google_first_day ?? null,
          googleLastDay: spendRow?.google_last_day ?? null,
        },
      },
    };
  } catch {
    return { ok: false, reason: 'connection-failed' };
  }
}
