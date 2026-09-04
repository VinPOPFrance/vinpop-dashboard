/**
 * Rattachement des commandes Shopify aux creatives Meta.
 *
 * Meta declare ses propres achats dans `ads_insights.actions`, mais ce chiffre
 * est modelise, dedoublonne a sa facon et regulierement absent : il repond a
 * "combien Meta pense avoir vendu", pas a "quelle video a genere une commande
 * reellement encaissee". La seule preuve cote VinPop est l URL d arrivee de la
 * commande (`orders.landing_site`), ou Meta recopie les parametres UTM du clic.
 *
 * Le balisage a change plusieurs fois depuis le lancement : selon la campagne,
 * `utm_content` porte l identifiant de l annonce, son nom exact, ou un slug
 * ecrit a la main. Le rapprochement se fait donc par paliers, du plus sur au
 * moins sur, et chaque commande garde la trace du palier utilise pour que la
 * page puisse afficher ce qui est certain et ce qui est deduit.
 */

import 'server-only';
import { getPool, numberFromPg } from './client';
import type {
  MetaAdSalesRow,
  MetaAttributedOrder,
  MetaAttributionMethod,
  MetaCreativeAttributionResult,
} from './types';

/**
 * Libelle de chaque palier de rapprochement (`MetaAttributionMethod`), du plus
 * sur au moins sur.
 */
export const attributionMethodLabel: Record<MetaAttributionMethod, string> = {
  'ad-id': 'Identifiant Meta present dans l URL de la commande',
  'ad-name': 'Nom exact de l annonce dans utm_content',
  'ad-slug': 'Slug utm_content rapproche du nom de l annonce',
};

/**
 * Une commande est comptee comme venant de Meta sur trois signaux, du plus
 * precis au plus grossier : ses parametres UTM, un identifiant de clic
 * Facebook (`fbclid`) survivant dans l URL, ou un site referent Facebook /
 * Instagram. Le dernier ne dit pas quelle publicite a produit la vente, mais
 * l ignorer ferait disparaitre des commandes Meta du total.
 */
const metaOrdersCte = `
  WITH meta_orders AS (
    SELECT
      id::text AS order_id,
      COALESCE(name, id::text) AS order_name,
      created_at,
      CASE
        WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
        ELSE 0
      END AS revenue,
      lower(replace(substring(landing_site from 'utm_source=([^&]*)'), '%20', ' ')) AS utm_source,
      replace(substring(landing_site from 'utm_id=([^&]*)'), '%20', ' ') AS utm_id,
      replace(substring(landing_site from 'utm_content=([^&]*)'), '%20', ' ') AS utm_content,
      replace(substring(landing_site from 'utm_term=([^&]*)'), '%20', ' ') AS utm_term,
      replace(substring(landing_site from 'utm_campaign=([^&]*)'), '%20', ' ') AS utm_campaign,
      landing_site ILIKE '%fbclid%' AS has_fbclid,
      referring_site ~* '(facebook|instagram|fb\\.me)' AS from_meta_referrer
    FROM public.orders
    WHERE cancelled_at IS NULL
  ),
  resolved AS (
    SELECT
      meta_orders.*,
      -- Palier 1 : un UTM porte l identifiant de l annonce.
      COALESCE(
        (
          SELECT ads.id
          FROM public.ads
          WHERE ads.id IN (meta_orders.utm_content, meta_orders.utm_term, meta_orders.utm_id)
          LIMIT 1
        ),
        -- Palier 2 : utm_content est le nom exact de l annonce.
        (
          SELECT ads.id
          FROM public.ads
          WHERE lower(ads.name) = lower(meta_orders.utm_content)
          LIMIT 1
        ),
        -- Palier 3 : utm_content est un slug. Compare sans ponctuation ni
        -- casse, et seulement s il ne peut correspondre qu a une annonce :
        -- un slug ambigu vaut mieux non attribue qu attribue au hasard.
        (
          SELECT min(ads.id)
          FROM public.ads
          WHERE length(regexp_replace(lower(COALESCE(meta_orders.utm_content, '')), '[^a-z0-9]', '', 'g')) >= 8
            AND regexp_replace(lower(ads.name), '[^a-z0-9]', '', 'g')
                LIKE '%' || regexp_replace(lower(meta_orders.utm_content), '[^a-z0-9]', '', 'g') || '%'
          HAVING count(*) = 1
        )
      ) AS ad_id,
      CASE
        WHEN EXISTS (
          SELECT 1 FROM public.ads
          WHERE ads.id IN (meta_orders.utm_content, meta_orders.utm_term, meta_orders.utm_id)
        ) THEN 'ad-id'
        WHEN EXISTS (
          SELECT 1 FROM public.ads WHERE lower(ads.name) = lower(meta_orders.utm_content)
        ) THEN 'ad-name'
        ELSE 'ad-slug'
      END AS match_method,
      (
        SELECT campaigns.name
        FROM public.campaigns
        WHERE campaigns.id IN (meta_orders.utm_id, meta_orders.utm_campaign)
        LIMIT 1
      ) AS campaign_name,
      (
        SELECT ad_sets.name
        FROM public.ad_sets
        WHERE ad_sets.id IN (meta_orders.utm_term, meta_orders.utm_content)
        LIMIT 1
      ) AS ad_set_name
    FROM meta_orders
    WHERE utm_source IS NOT NULL
       OR utm_content IS NOT NULL
       OR utm_campaign IS NOT NULL
       OR has_fbclid
       OR from_meta_referrer
  )
`;

export async function getMetaCreativeAttribution(): Promise<MetaCreativeAttributionResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    // Le total boutique se lit dans la meme requete que les commandes Meta :
    // c est lui qui donne son sens au nombre de ventes rattachees. Neuf ventes
    // sur trente-trois n a rien a voir avec neuf ventes sur dix.
    const [result, shopTotalsResult] = await Promise.all([
      pool.query<Record<string, string | null>>(`
      ${metaOrdersCte}
      SELECT
        order_id,
        order_name,
        created_at::text AS created_at,
        revenue::text AS revenue,
        ad_id,
        (SELECT ads.name FROM public.ads WHERE ads.id = resolved.ad_id) AS ad_name,
        CASE WHEN ad_id IS NULL THEN NULL ELSE match_method END AS match_method,
        utm_source,
        utm_campaign,
        utm_content,
        campaign_name,
        ad_set_name,
        has_fbclid::text AS has_fbclid,
        from_meta_referrer::text AS from_meta_referrer
      FROM resolved
      ORDER BY created_at DESC
    `),
      pool.query<Record<string, string | null>>(`
        SELECT
          COUNT(*)::text AS orders,
          COALESCE(SUM(
            CASE
              WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
              ELSE 0
            END
          ), 0)::text AS revenue
        FROM public.orders
        WHERE cancelled_at IS NULL
      `),
    ]);

    const shopTotals = shopTotalsResult.rows[0];

    const orders: MetaAttributedOrder[] = result.rows.map((row) => ({
      orderId: row.order_id ?? '',
      orderName: row.order_name ?? '',
      createdAt: row.created_at ? row.created_at.slice(0, 10) : null,
      revenue: numberFromPg(row.revenue),
      adId: row.ad_id,
      adName: row.ad_name,
      method: (row.match_method as MetaAttributionMethod | null) ?? null,
      utmSource: row.utm_source,
      utmCampaign: row.utm_campaign,
      utmContent: row.utm_content,
      campaignName: row.campaign_name,
      adSetName: row.ad_set_name,
      hasFacebookClickId: row.has_fbclid === 'true',
      // Le referent seul est le signal le plus faible : il dit "cette commande
      // vient de Facebook ou d Instagram", jamais de quelle publicite.
      signal: row.utm_content || row.utm_source || row.utm_campaign
        ? 'utm'
        : row.has_fbclid === 'true'
          ? 'fbclid'
          : 'referrer',
    }));

    // Une commande sans creative identifiee reste une vente Meta : elle compte
    // dans le total, mais pas dans le classement des creatives. Les separer
    // evite de gonfler une video avec des ventes qui ne lui appartiennent pas.
    const byAd = new Map<string, MetaAdSalesRow>();
    for (const order of orders) {
      if (!order.adId) continue;
      const current = byAd.get(order.adId) ?? {
        adId: order.adId,
        adName: order.adName,
        orders: 0,
        revenue: 0,
        firstOrderDate: order.createdAt,
        lastOrderDate: order.createdAt,
        methods: [],
      };
      current.orders += 1;
      current.revenue += order.revenue;
      if (order.createdAt) {
        if (!current.firstOrderDate || order.createdAt < current.firstOrderDate) current.firstOrderDate = order.createdAt;
        if (!current.lastOrderDate || order.createdAt > current.lastOrderDate) current.lastOrderDate = order.createdAt;
      }
      if (order.method && !current.methods.includes(order.method)) current.methods.push(order.method);
      byAd.set(order.adId, current);
    }

    const unattributed = orders.filter((order) => !order.adId);

    return {
      ok: true,
      metrics: {
        ads: [...byAd.values()].sort((left, right) => right.revenue - left.revenue),
        orders,
        shopOrders: numberFromPg(shopTotals?.orders),
        shopRevenue: numberFromPg(shopTotals?.revenue),
        totalOrders: orders.length,
        totalRevenue: orders.reduce((sum, order) => sum + order.revenue, 0),
        attributedOrders: orders.length - unattributed.length,
        attributedRevenue: orders.reduce((sum, order) => sum + (order.adId ? order.revenue : 0), 0),
        unattributedOrders: unattributed.length,
        unattributedRevenue: unattributed.reduce((sum, order) => sum + order.revenue, 0),
      },
    };
  } catch {
    return { ok: false, reason: 'connection-failed' };
  }
}
