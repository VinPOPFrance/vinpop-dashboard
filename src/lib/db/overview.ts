/**
 * Vues transversales : elles croisent plusieurs sources (Shopify, GA4, Meta,
 * base VinPop) et ne peuvent donc appartenir a aucun module de source unique.
 */

import 'server-only';
import { dateFromPg, getPool, numberFromPg, rate } from './client';
import { ga4Bounds } from './ga4';
import { type DislikeCheckRow, type DislikeCheckVerdict, type ProductConversionResult, type ProductConversionRow, type SmartBoxConversionResult, type SmartBoxCustomerRow, type TrackingReadinessResult, type TrackingReadinessTable } from './types';
import { dateToSql, type DateRange } from '@/lib/analytics/dateRanges';

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

type SmartBoxCountRow = {
  taste_kit_customers: string | null;
  smart_box_customers: string | null;
  converted_customers: string | null;
  smart_box_orders: string | null;
  catalogue_products: string | null;
};

type SmartBoxCustomerQueryRow = {
  customer_key: string | null;
  customer_email: string | null;
  taste_kit_order_date: Date | string | null;
  smart_box_order_date: Date | string | null;
  days_to_convert: string | null;
  ratings_count: string | null;
  love_count: string | null;
  like_count: string | null;
  dislike_count: string | null;
};

type DislikeCheckQueryRow = {
  order_id: string | null;
  order_date: Date | string | null;
  customer_key: string | null;
  customer_email: string | null;
  wine_title: string | null;
  product_id: string | null;
  rating_date: Date | string | null;
  verdict: string | null;
};

/**
 * CTE commune a l etape 6 : les lignes de commande, avec le client et le
 * marquage Taste Kit / Smart Box.
 *
 * `ratings.id` porte l identifiant produit Shopify et `ratings.customer_id`
 * l identifiant client Shopify : le rapprochement note / commande se fait donc
 * sans passer par un libelle.
 */
const smartBoxItemsCte = `
  WITH order_items AS (
    SELECT
      orders.id::text AS order_id,
      orders.created_at AS order_date,
      COALESCE(
        NULLIF(orders.customer::jsonb->>'id', ''),
        NULLIF(orders.email::text, '')
      ) AS customer_key,
      NULLIF(orders.email::text, '') AS customer_email,
      line_item->>'title' AS title,
      line_item->>'product_id' AS product_id
    FROM shopify.orders,
      LATERAL jsonb_array_elements(
        CASE
          WHEN jsonb_typeof(orders.line_items::jsonb) = 'array' THEN orders.line_items::jsonb
          ELSE '[]'::jsonb
        END
      ) AS line_item
    WHERE orders.cancelled_at IS NULL
  ),
  flagged_items AS (
    SELECT
      order_items.*,
      (
        title ILIKE '%starter pack%'
        OR title ILIKE '%startup pack%'
        OR title ILIKE '%taste kit%'
        OR title ILIKE '%tasting kit%'
        OR title ILIKE '%calibration kit%'
      ) AS is_taste_kit,
      (
        title ILIKE '%smart box%'
        OR title ILIKE '%smart wine box%'
        OR title ILIKE '%subscription%'
      ) AS is_smart_box
    FROM order_items
  )
`;

/**
 * Etape 6 du funnel : passage du Taste Kit a la Smart Wine Box, et controle
 * zero-Dislike.
 *
 * Le controle zero-Dislike est la raison d etre de cette page. Il ne suffit pas
 * de chercher un vin note "Dislike" dans une commande : dans le modele VinPop
 * le client note precisement les bouteilles qu il vient de recevoir, donc la
 * plupart des correspondances sont normales. La faute, c est d expedier un vin
 * DEJA rejete — la note doit donc etre anterieure a la commande.
 *
 * Trois verdicts sont distingues, jamais confondus :
 *  - `violation`        : note anterieure a la commande. C est l erreur.
 *  - `rated-after-order`: note posterieure. Fonctionnement normal.
 *  - `unknown-date`     : `ratings.created_at` est nul (le cas pour une bonne
 *                         partie des lignes), la chronologie est indecidable.
 *                         Signale a part, jamais compte comme une violation.
 */
export async function getSmartBoxConversion(range: DateRange): Promise<SmartBoxConversionResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);

    const [countsResult, customersResult, dislikeResult] = await Promise.all([
      pool.query<SmartBoxCountRow>(
        `${smartBoxItemsCte},
         customer_flags AS (
           SELECT
             customer_key,
             BOOL_OR(is_taste_kit) AS bought_taste_kit,
             BOOL_OR(is_smart_box) AS bought_smart_box,
             MIN(order_date) FILTER (WHERE is_taste_kit) AS taste_kit_date,
             MIN(order_date) FILTER (WHERE is_smart_box) AS smart_box_date
           FROM flagged_items
           WHERE customer_key IS NOT NULL
           GROUP BY customer_key
         )
         SELECT
           COUNT(*) FILTER (WHERE bought_taste_kit)::text AS taste_kit_customers,
           COUNT(*) FILTER (WHERE bought_smart_box)::text AS smart_box_customers,
           -- La conversion suppose l ordre chronologique : Taste Kit d abord.
           COUNT(*) FILTER (
             WHERE bought_taste_kit AND bought_smart_box AND smart_box_date >= taste_kit_date
           )::text AS converted_customers,
           (SELECT COUNT(DISTINCT order_id) FROM flagged_items WHERE is_smart_box)::text AS smart_box_orders,
           (
             SELECT COUNT(*)
             FROM shopify.products
             WHERE title ILIKE '%smart box%' OR title ILIKE '%smart wine box%'
           )::text AS catalogue_products
         FROM customer_flags`,
      ),
      pool.query<SmartBoxCustomerQueryRow>(
        `${smartBoxItemsCte},
         customer_flags AS (
           SELECT
             customer_key,
             MIN(customer_email) AS customer_email,
             MIN(order_date) FILTER (WHERE is_taste_kit) AS taste_kit_date,
             MIN(order_date) FILTER (WHERE is_smart_box) AS smart_box_date
           FROM flagged_items
           WHERE customer_key IS NOT NULL
           GROUP BY customer_key
         ),
         customer_ratings AS (
           SELECT
             customer_id,
             COUNT(*) AS ratings_count,
             COUNT(*) FILTER (WHERE rating = 3) AS love_count,
             COUNT(*) FILTER (WHERE rating = 2) AS like_count,
             COUNT(*) FILTER (WHERE rating = 1) AS dislike_count
           FROM public.ratings
           GROUP BY customer_id
         )
         SELECT
           customer_flags.customer_key,
           customer_flags.customer_email,
           customer_flags.taste_kit_date AS taste_kit_order_date,
           customer_flags.smart_box_date AS smart_box_order_date,
           EXTRACT(DAY FROM customer_flags.smart_box_date - customer_flags.taste_kit_date)::text AS days_to_convert,
           COALESCE(customer_ratings.ratings_count, 0)::text AS ratings_count,
           COALESCE(customer_ratings.love_count, 0)::text AS love_count,
           COALESCE(customer_ratings.like_count, 0)::text AS like_count,
           COALESCE(customer_ratings.dislike_count, 0)::text AS dislike_count
         FROM customer_flags
         LEFT JOIN customer_ratings ON customer_ratings.customer_id = customer_flags.customer_key
         WHERE customer_flags.smart_box_date IS NOT NULL
         ORDER BY customer_flags.smart_box_date DESC
         LIMIT 200`,
      ),
      pool.query<DislikeCheckQueryRow>(
        `${smartBoxItemsCte}
         SELECT DISTINCT
           flagged_items.order_id,
           flagged_items.order_date,
           flagged_items.customer_key,
           COALESCE(flagged_items.customer_email, users.email) AS customer_email,
           flagged_items.title AS wine_title,
           flagged_items.product_id,
           ratings.created_at AS rating_date,
           CASE
             WHEN ratings.created_at IS NULL THEN 'unknown-date'
             WHEN ratings.created_at < flagged_items.order_date THEN 'violation'
             ELSE 'rated-after-order'
           END AS verdict
         FROM flagged_items
         JOIN public.ratings
           ON ratings.customer_id = flagged_items.customer_key
          AND ratings.id = flagged_items.product_id
         LEFT JOIN public.users ON users.id = flagged_items.customer_key
         WHERE ratings.rating = 1
         ORDER BY flagged_items.order_date DESC`,
      ),
    ]);

    const counts = countsResult.rows[0];
    const tasteKitCustomers = numberFromPg(counts?.taste_kit_customers);
    const convertedCustomers = numberFromPg(counts?.converted_customers);

    const customers: SmartBoxCustomerRow[] = customersResult.rows.map((row) => {
      const ratingsCount = numberFromPg(row.ratings_count);
      const loveCount = numberFromPg(row.love_count);
      const likeCount = numberFromPg(row.like_count);

      return {
        customerKey: row.customer_key ?? '',
        customerEmail: row.customer_email,
        tasteKitOrderDate: dateFromPg(row.taste_kit_order_date),
        smartBoxOrderDate: dateFromPg(row.smart_box_order_date),
        daysToConvert: row.days_to_convert ? numberFromPg(row.days_to_convert) : null,
        ratingsCount,
        loveCount,
        likeCount,
        dislikeCount: numberFromPg(row.dislike_count),
        positiveRate: rate(loveCount + likeCount, ratingsCount),
      };
    });

    const dislikeRows: DislikeCheckRow[] = dislikeResult.rows.map((row) => ({
      orderId: row.order_id ?? '',
      orderDate: dateFromPg(row.order_date),
      customerKey: row.customer_key ?? '',
      customerEmail: row.customer_email,
      wineTitle: row.wine_title ?? '(vin inconnu)',
      productId: row.product_id ?? '',
      ratingDate: dateFromPg(row.rating_date),
      verdict: (row.verdict as DislikeCheckVerdict) ?? 'unknown-date',
    }));

    const daysToConvert = customers
      .map((customer) => customer.daysToConvert)
      .filter((value): value is number => value !== null)
      .sort((a, b) => a - b);

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        tasteKitCustomers,
        smartBoxCustomers: numberFromPg(counts?.smart_box_customers),
        convertedCustomers,
        conversionRate: rate(convertedCustomers, tasteKitCustomers),
        medianDaysToConvert: daysToConvert.length
          ? daysToConvert[Math.floor(daysToConvert.length / 2)]
          : null,
        smartBoxProductsInCatalogue: numberFromPg(counts?.catalogue_products),
        smartBoxOrders: numberFromPg(counts?.smart_box_orders),
        dislikeChecksPerformed: dislikeRows.length,
        dislikeViolations: dislikeRows.filter((row) => row.verdict === 'violation'),
        dislikeUnknownDate: dislikeRows.filter((row) => row.verdict === 'unknown-date'),
        customers,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Smart box conversion lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
