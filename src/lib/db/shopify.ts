/**
 * Donnees Shopify : commandes, produits, stock, coffrets et geographie.
 */

import 'server-only';
import { dateFromPg, getPool, getValueType, numberFromPg, rate, ratio } from './client';
import { customerOrdersAfterLineItemsCtes, customerOrdersCte, lineItemsBaseCte } from './sql';
import { type GeoInsightCityRow, type GeoInsightsResult, type OrderBucket, type ProductRepeatSignal, type ProductRepeatSignalsResult, type RepeatCustomerMetricsResult, type ShopifyFunnelBasicResult, type ShopifyLineItemSafeField, type ShopifyLineItemSample, type ShopifyLineItemsSampleResult, type ShopifyOrdersSummaryResult, type ShopifyProductSummary, type ShopifyProductsSummaryResult, type StartupPackAnalysisResult, type StartupPackProductRow, type StartupPackRetentionCohort, type StartupPackRetentionResult, type StockMovementProduct, type StockMovementSummaryResult } from './types';

export type ShopifyOrderLineItemsSampleRow = {
  id: string | number;
  created_at: Date | string | null;
  line_items: unknown;
};

export type ShopifyOrdersAggregateMetricsRow = {
  total_orders: string;
  paid_orders: string;
  cancelled_orders: string;
  fulfilled_orders: string;
  unfulfilled_orders: string;
  total_revenue: string | null;
  subtotal_revenue: string | null;
  total_tax: string | null;
  average_order_value: string | null;
  first_order_date: Date | string | null;
  latest_order_date: Date | string | null;
};

export type ShopifyOrdersLineItemsAggregateRow = {
  total_line_items_count: string | null;
  average_line_items_per_order: string | null;
};

export type ShopifyProductSummaryRow = {
  product_id: string | null;
  variant_id: string | null;
  product_name: string | null;
  sku: string | null;
  vendor: string | null;
  total_quantity_sold: string | null;
  gross_revenue: string | null;
  total_discount: string | null;
  net_revenue: string | null;
  average_discount_per_unit: string | null;
  discount_rate_percentage: string | null;
  free_quantity_estimate: string | null;
  paid_quantity_estimate: string | null;
  order_count: string;
  average_net_item_price: string | null;
};

export type ShopifyProductSummaryTotalRow = {
  total_quantity_sold: string | null;
  total_product_discounts: string | null;
  free_quantity_estimate: string | null;
};

export type ShopifyLineItemFieldRow = {
  field_name: string;
};

export type ShopifyFunnelBasicRow = {
  abandoned_checkout_count: string;
  order_count: string;
  paid_order_count: string;
  cancelled_order_count: string;
  fulfilled_order_count: string;
  unfulfilled_order_count: string;
  total_revenue: string | null;
  average_order_value: string | null;
};

export type StartupPackMetricsRow = {
  startup_pack_order_count: string | null;
  startup_pack_line_items_sold: string | null;
  startup_pack_gross_revenue: string | null;
  startup_pack_net_revenue: string | null;
  average_startup_pack_net_revenue_per_order: string | null;
  free_bottle_line_item_count: string | null;
  free_bottle_quantity: string | null;
  free_bottle_gross_value: string | null;
  free_bottle_discount_value: string | null;
  paid_items_net_revenue_in_startup_pack_orders: string | null;
  average_free_bottles_per_startup_pack_order: string | null;
};

export type StartupPackProductRowResult = {
  product_name: string | null;
  vendor: string | null;
  quantity: string | null;
  gross_value: string | null;
  discount_value: string | null;
  net_revenue: string | null;
  order_count: string | null;
};

export type StockMovementProductRow = {
  product_name: string | null;
  vendor: string | null;
  sku: string | null;
  total_quantity_moved: string | null;
  paid_quantity: string | null;
  free_quantity: string | null;
  free_quantity_percentage: string | null;
  gross_value: string | null;
  discount_value: string | null;
  net_revenue: string | null;
  average_net_revenue_per_unit: string | null;
  order_count: string | null;
};

export type StockMovementGlobalRow = {
  total_quantity_moved: string | null;
  total_paid_quantity: string | null;
  total_free_quantity: string | null;
  free_quantity_percentage: string | null;
  total_gross_product_value: string | null;
  total_discount_value: string | null;
  total_net_product_revenue: string | null;
};

export type RepeatCustomerMetricsRow = {
  ordering_customers: string | null;
  one_time_customers: string | null;
  repeat_customers: string | null;
  customers_with_exactly_two_orders: string | null;
  customers_with_three_plus_orders: string | null;
  total_non_cancelled_orders: string | null;
  first_order_revenue: string | null;
  later_order_revenue: string | null;
  total_non_cancelled_revenue: string | null;
  first_order_date: Date | string | null;
  latest_order_date: Date | string | null;
};

export type OrderBucketRow = {
  bucket: string;
  customer_count: string | null;
  customer_share: string | null;
  order_count: string | null;
  revenue: string | null;
  revenue_share: string | null;
};

export type StartupPackRetentionMetricsRow = {
  startup_pack_customers: string | null;
  startup_pack_orders: string | null;
  startup_pack_customers_with_later_order: string | null;
  startup_pack_first_order_revenue: string | null;
  startup_pack_later_order_revenue: string | null;
  average_later_orders_per_startup_pack_customer: string | null;
  smart_box_later_orders_after_startup_pack: string | null;
  customers_with_startup_pack_only: string | null;
  customers_with_startup_pack_and_later_order: string | null;
  customers_with_startup_pack_and_smart_box: string | null;
};

export type StartupPackRetentionCohortRow = {
  cohort: string;
  customer_count: string | null;
  orders: string | null;
  revenue: string | null;
  later_revenue: string | null;
  share_of_ordering_customers: string | null;
};

export type ProductRepeatSignalRow = {
  product_name: string | null;
  vendor: string | null;
  sku: string | null;
  total_quantity_moved: string | null;
  paid_quantity: string | null;
  free_quantity: string | null;
  gross_revenue: string | null;
  discount: string | null;
  net_revenue: string | null;
  first_order_quantity: string | null;
  later_order_quantity: string | null;
  first_order_revenue: string | null;
  later_order_revenue: string | null;
  repeat_revenue_share: string | null;
  orders_containing_product: string | null;
  repeat_customer_orders_containing_product: string | null;
};

export function parseLineItems(value: unknown): { value: unknown; parseError: boolean } {
  if (typeof value !== 'string') {
    return { value, parseError: false };
  }

  try {
    return { value: JSON.parse(value), parseError: false };
  } catch {
    return { value: null, parseError: true };
  }
}

export const shopifyLineItemSafeFields: ShopifyLineItemSafeField[] = [
  'product_id',
  'variant_id',
  'title',
  'name',
  'sku',
  'quantity',
  'price',
  'vendor',
  'product_exists',
  'grams',
  'taxable',
];

export function sanitizeLineItem(lineItem: unknown): ShopifyLineItemSample {
  if (typeof lineItem !== 'object' || lineItem === null || Array.isArray(lineItem)) {
    return {};
  }

  const source = lineItem as Record<string, unknown>;
  const safeLineItem: ShopifyLineItemSample = {};

  for (const field of shopifyLineItemSafeFields) {
    const value = source[field];

    if (
      typeof value === 'string' ||
      typeof value === 'number' ||
      typeof value === 'boolean' ||
      value === null
    ) {
      safeLineItem[field] = value;
    }
  }

  return safeLineItem;
}

export function mapProductSummaryRow(row: ShopifyProductSummaryRow): ShopifyProductSummary {
  return {
    productId: row.product_id || 'Unknown product ID',
    variantId: row.variant_id || 'Unknown variant ID',
    productName: row.product_name || 'Unknown product',
    sku: row.sku || 'No SKU',
    vendor: row.vendor || 'Unknown vendor',
    totalQuantitySold: numberFromPg(row.total_quantity_sold),
    grossRevenue: numberFromPg(row.gross_revenue),
    totalDiscount: numberFromPg(row.total_discount),
    netRevenue: numberFromPg(row.net_revenue),
    averageDiscountPerUnit: numberFromPg(row.average_discount_per_unit),
    discountRatePercentage: numberFromPg(row.discount_rate_percentage),
    freeQuantityEstimate: numberFromPg(row.free_quantity_estimate),
    paidQuantityEstimate: numberFromPg(row.paid_quantity_estimate),
    orderCount: numberFromPg(row.order_count),
    averageNetItemPrice: numberFromPg(row.average_net_item_price),
  };
}

export function mapStartupPackProductRow(row: StartupPackProductRowResult): StartupPackProductRow {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    quantity: numberFromPg(row.quantity),
    grossValue: numberFromPg(row.gross_value),
    discountValue: numberFromPg(row.discount_value),
    netRevenue: numberFromPg(row.net_revenue),
    orderCount: numberFromPg(row.order_count),
  };
}

export function mapStockMovementProductRow(row: StockMovementProductRow): StockMovementProduct {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    sku: row.sku || 'No SKU',
    totalQuantityMoved: numberFromPg(row.total_quantity_moved),
    paidQuantity: numberFromPg(row.paid_quantity),
    freeQuantity: numberFromPg(row.free_quantity),
    freeQuantityPercentage: row.free_quantity_percentage === null ? null : numberFromPg(row.free_quantity_percentage),
    grossValue: numberFromPg(row.gross_value),
    discountValue: numberFromPg(row.discount_value),
    netRevenue: numberFromPg(row.net_revenue),
    averageNetRevenuePerUnit: numberFromPg(row.average_net_revenue_per_unit),
    orderCount: numberFromPg(row.order_count),
  };
}

export function mapOrderBucketRow(row: OrderBucketRow): OrderBucket {
  return {
    bucket: row.bucket,
    customerCount: numberFromPg(row.customer_count),
    customerShare: row.customer_share === null ? null : numberFromPg(row.customer_share),
    orderCount: numberFromPg(row.order_count),
    revenue: numberFromPg(row.revenue),
    revenueShare: row.revenue_share === null ? null : numberFromPg(row.revenue_share),
  };
}

export function mapStartupPackRetentionCohortRow(
  row: StartupPackRetentionCohortRow,
): StartupPackRetentionCohort {
  return {
    cohort: row.cohort,
    customerCount: numberFromPg(row.customer_count),
    orders: numberFromPg(row.orders),
    revenue: numberFromPg(row.revenue),
    laterRevenue: numberFromPg(row.later_revenue),
    shareOfOrderingCustomers:
      row.share_of_ordering_customers === null ? null : numberFromPg(row.share_of_ordering_customers),
  };
}

export function mapProductRepeatSignalRow(row: ProductRepeatSignalRow): ProductRepeatSignal {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    sku: row.sku || 'No SKU',
    totalQuantityMoved: numberFromPg(row.total_quantity_moved),
    paidQuantity: numberFromPg(row.paid_quantity),
    freeQuantity: numberFromPg(row.free_quantity),
    grossRevenue: numberFromPg(row.gross_revenue),
    discount: numberFromPg(row.discount),
    netRevenue: numberFromPg(row.net_revenue),
    firstOrderQuantity: numberFromPg(row.first_order_quantity),
    laterOrderQuantity: numberFromPg(row.later_order_quantity),
    firstOrderRevenue: numberFromPg(row.first_order_revenue),
    laterOrderRevenue: numberFromPg(row.later_order_revenue),
    repeatRevenueShare: row.repeat_revenue_share === null ? null : numberFromPg(row.repeat_revenue_share),
    ordersContainingProduct: numberFromPg(row.orders_containing_product),
    repeatCustomerOrdersContainingProduct: numberFromPg(
      row.repeat_customer_orders_containing_product,
    ),
  };
}

export async function getShopifyLineItemsSample(): Promise<ShopifyLineItemsSampleResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<ShopifyOrderLineItemsSampleRow>(`
      SELECT id, created_at, line_items
      FROM shopify.orders
      WHERE line_items IS NOT NULL
      LIMIT 3
    `);
    const safeFieldsFound = new Set<ShopifyLineItemSafeField>();

    const orders = result.rows.map((row) => {
      const parsed = parseLineItems(row.line_items);
      const lineItemsType = getValueType(parsed.value);
      const lineItems = Array.isArray(parsed.value) ? parsed.value.map(sanitizeLineItem) : [];

      for (const lineItem of lineItems) {
        for (const field of Object.keys(lineItem) as ShopifyLineItemSafeField[]) {
          safeFieldsFound.add(field);
        }
      }

      return {
        orderId: String(row.id),
        createdAt:
          row.created_at instanceof Date
            ? row.created_at.toISOString()
            : row.created_at
              ? new Date(row.created_at).toISOString()
              : null,
        lineItemsType,
        lineItemCount: Array.isArray(parsed.value) ? parsed.value.length : null,
        parseError: parsed.parseError,
        lineItems,
      };
    });

    return {
      ok: true,
      orders,
      safeFieldsFound: shopifyLineItemSafeFields.filter((field) => safeFieldsFound.has(field)),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify line items sample failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

/**
 * Agregat des commandes Shopify : volumes, statuts et chiffre d affaires.
 *
 * Le corps de la requete a ete restaure depuis d510bda au Lot 3bis : deux blocs
 * de SQL Meta Ads y avaient ete colles par erreur, ecrasant les sommes de
 * total_price et subtotal_price et rendant la requete invalide.
 */
export async function getShopifyOrdersSummary(): Promise<ShopifyOrdersSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const summaryResult = await pool.query<ShopifyOrdersAggregateMetricsRow>(`
      SELECT
        COUNT(*)::text AS total_orders,
        COUNT(*) FILTER (WHERE lower(coalesce(financial_status::text, '')) = 'paid')::text AS paid_orders,
        COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL)::text AS cancelled_orders,
        COUNT(*) FILTER (WHERE lower(coalesce(fulfillment_status::text, '')) = 'fulfilled')::text AS fulfilled_orders,
        COUNT(*) FILTER (
          WHERE fulfillment_status IS NULL OR lower(coalesce(fulfillment_status::text, '')) <> 'fulfilled'
        )::text AS unfulfilled_orders,
        COALESCE(
          SUM(
            CASE
              WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
              ELSE NULL
            END
          ),
          0
        )::text AS total_revenue,
        COALESCE(
          SUM(
            CASE
              WHEN subtotal_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN subtotal_price::text::numeric
              ELSE NULL
            END
          ),
          0
        )::text AS subtotal_revenue,
        COALESCE(
          SUM(
            CASE
              WHEN total_tax::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_tax::text::numeric
              ELSE NULL
            END
          ),
          0
        )::text AS total_tax,
        COALESCE(
          AVG(
            CASE
              WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
              ELSE NULL
            END
          ),
          0
        )::text AS average_order_value,
        MIN(created_at) AS first_order_date,
        MAX(created_at) AS latest_order_date
      FROM shopify.orders
    `);
    const summary = summaryResult.rows[0];

    let totalLineItemsCount: number | null = null;
    let averageLineItemsPerOrder: number | null = null;
    let lineItemsCountWorked = false;

    try {
      const lineItemsResult = await pool.query<ShopifyOrdersLineItemsAggregateRow>(`
        SELECT
          COALESCE(
            SUM(
              CASE
                WHEN line_items IS NULL THEN 0
                WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN jsonb_array_length(line_items::jsonb)
                ELSE 0
              END
            ),
            0
          )::text AS total_line_items_count,
          COALESCE(
            AVG(
              CASE
                WHEN line_items IS NULL THEN 0
                WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN jsonb_array_length(line_items::jsonb)
                ELSE 0
              END
            ),
            0
          )::text AS average_line_items_per_order
        FROM shopify.orders
      `);
      const lineItemsSummary = lineItemsResult.rows[0];
      totalLineItemsCount = numberFromPg(lineItemsSummary?.total_line_items_count);
      averageLineItemsPerOrder = numberFromPg(lineItemsSummary?.average_line_items_per_order);
      lineItemsCountWorked = true;
    } catch (error) {
      const errorCode =
        typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

      console.error('Shopify line items aggregate failed', { code: errorCode });
    }

    return {
      ok: true,
      metrics: {
        totalOrders: numberFromPg(summary?.total_orders),
        paidOrders: numberFromPg(summary?.paid_orders),
        cancelledOrders: numberFromPg(summary?.cancelled_orders),
        fulfilledOrders: numberFromPg(summary?.fulfilled_orders),
        unfulfilledOrders: numberFromPg(summary?.unfulfilled_orders),
        totalRevenue: numberFromPg(summary?.total_revenue),
        subtotalRevenue: numberFromPg(summary?.subtotal_revenue),
        totalTax: numberFromPg(summary?.total_tax),
        averageOrderValue: numberFromPg(summary?.average_order_value),
        firstOrderDate: dateFromPg(summary?.first_order_date ?? null),
        latestOrderDate: dateFromPg(summary?.latest_order_date ?? null),
        totalLineItemsCount,
        averageLineItemsPerOrder,
        lineItemsCountWorked,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify orders summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}


export async function getShopifyProductsSummary(): Promise<ShopifyProductsSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const productsResult = await pool.query<ShopifyProductSummaryRow>(`
      WITH order_items AS (
        SELECT
          id AS order_id,
          item,
          CASE
            WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
            ELSE 0
          END AS quantity_value,
          CASE
            WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric
            ELSE 0
          END AS price_value,
          CASE
            WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
            WHEN jsonb_typeof(item->'discount_allocations') = 'array' THEN COALESCE(
              (
                SELECT SUM(
                  CASE
                    WHEN allocation->>'amount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (allocation->>'amount')::numeric
                    ELSE 0
                  END
                )
                FROM jsonb_array_elements(item->'discount_allocations') AS allocation
              ),
              0
            )
            ELSE 0
          END AS discount_value
        FROM shopify.orders
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
      ),
      enriched_items AS (
        SELECT
          order_id,
          item,
          quantity_value,
          price_value,
          discount_value,
          quantity_value * price_value AS gross_value,
          GREATEST(quantity_value * price_value - discount_value, 0) AS net_value,
          CASE
            WHEN quantity_value * price_value > 0
              AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
            THEN quantity_value
            ELSE 0
          END AS free_quantity,
          CASE
            WHEN quantity_value * price_value > 0
              AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
            THEN 0
            ELSE quantity_value
          END AS paid_quantity
        FROM order_items
      )
      SELECT
        NULLIF(item->>'product_id', '') AS product_id,
        NULLIF(item->>'variant_id', '') AS variant_id,
        COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
        COALESCE(NULLIF(item->>'sku', ''), 'No SKU') AS sku,
        COALESCE(NULLIF(item->>'vendor', ''), 'Unknown vendor') AS vendor,
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_sold,
        COALESCE(SUM(gross_value), 0)::text AS gross_revenue,
        COALESCE(SUM(discount_value), 0)::text AS total_discount,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COALESCE(SUM(discount_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_discount_per_unit,
        COALESCE((SUM(discount_value) / NULLIF(SUM(gross_value), 0)) * 100, 0)::text AS discount_rate_percentage,
        COALESCE(SUM(free_quantity), 0)::text AS free_quantity_estimate,
        COALESCE(SUM(paid_quantity), 0)::text AS paid_quantity_estimate,
        COUNT(DISTINCT order_id)::text AS order_count,
        COALESCE(SUM(net_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_net_item_price
      FROM enriched_items
      GROUP BY product_id, variant_id, product_name, sku, vendor
      ORDER BY SUM(net_value) DESC
      LIMIT 50
    `);
    const totalResult = await pool.query<ShopifyProductSummaryTotalRow>(`
      WITH order_items AS (
        SELECT
          CASE
            WHEN item->>'quantity' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'quantity')::numeric
            ELSE 0
          END AS quantity_value,
          CASE
            WHEN item->>'price' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'price')::numeric
            ELSE 0
          END AS price_value,
          CASE
            WHEN item->>'total_discount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (item->>'total_discount')::numeric
            WHEN jsonb_typeof(item->'discount_allocations') = 'array' THEN COALESCE(
              (
                SELECT SUM(
                  CASE
                    WHEN allocation->>'amount' ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN (allocation->>'amount')::numeric
                    ELSE 0
                  END
                )
                FROM jsonb_array_elements(item->'discount_allocations') AS allocation
              ),
              0
            )
            ELSE 0
          END AS discount_value
        FROM shopify.orders
        CROSS JOIN LATERAL jsonb_array_elements(
          CASE
            WHEN line_items IS NULL THEN '[]'::jsonb
            WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
            ELSE '[]'::jsonb
          END
        ) AS item
      )
      SELECT
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_sold,
        COALESCE(SUM(discount_value), 0)::text AS total_product_discounts,
        COALESCE(
          SUM(
            CASE
              WHEN quantity_value * price_value > 0
                AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
              THEN quantity_value
              ELSE 0
            END
          ),
          0
        )::text AS free_quantity_estimate
      FROM order_items
    `);
    const detectedFieldsResult = await pool.query<ShopifyLineItemFieldRow>(`
      SELECT DISTINCT field_name
      FROM shopify.orders
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN line_items IS NULL THEN '[]'::jsonb
          WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
          ELSE '[]'::jsonb
        END
      ) AS item
      CROSS JOIN LATERAL jsonb_object_keys(item) AS keys(field_name)
      WHERE field_name = ANY($1::text[])
      ORDER BY field_name
    `, [
      [
        'total_discount',
        'discount_allocations',
        'discounted_price',
        'discounted_total',
        'price',
        'quantity',
        'gift_card',
        'product_id',
        'variant_id',
        'title',
        'name',
        'sku',
        'vendor',
      ],
    ]);
    const totalSummary = totalResult.rows[0];

    return {
      ok: true,
      products: productsResult.rows.map(mapProductSummaryRow),
      totalQuantitySold: numberFromPg(totalSummary?.total_quantity_sold),
      totalProductDiscounts: numberFromPg(totalSummary?.total_product_discounts),
      freeQuantityEstimate: numberFromPg(totalSummary?.free_quantity_estimate),
      discountFieldsDetected: detectedFieldsResult.rows.map((row) => row.field_name),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify products summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getShopifyFunnelBasic(): Promise<ShopifyFunnelBasicResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<ShopifyFunnelBasicRow>(`
      WITH orders_summary AS (
        SELECT
          COUNT(*)::text AS order_count,
          COUNT(*) FILTER (WHERE lower(coalesce(financial_status::text, '')) = 'paid')::text AS paid_order_count,
          COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL)::text AS cancelled_order_count,
          COUNT(*) FILTER (WHERE lower(coalesce(fulfillment_status::text, '')) = 'fulfilled')::text AS fulfilled_order_count,
          COUNT(*) FILTER (
            WHERE fulfillment_status IS NULL OR lower(coalesce(fulfillment_status::text, '')) <> 'fulfilled'
          )::text AS unfulfilled_order_count,
          COALESCE(
            SUM(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )::text AS total_revenue,
          COALESCE(
            AVG(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )::text AS average_order_value
        FROM shopify.orders
      ),
      abandoned_summary AS (
        SELECT COUNT(*)::text AS abandoned_checkout_count
        FROM shopify.abandoned_checkouts
      )
      SELECT
        abandoned_summary.abandoned_checkout_count,
        orders_summary.order_count,
        orders_summary.paid_order_count,
        orders_summary.cancelled_order_count,
        orders_summary.fulfilled_order_count,
        orders_summary.unfulfilled_order_count,
        orders_summary.total_revenue,
        orders_summary.average_order_value
      FROM orders_summary
      CROSS JOIN abandoned_summary
    `);
    const row = result.rows[0];
    const abandonedCheckoutCount = numberFromPg(row?.abandoned_checkout_count);
    const orderCount = numberFromPg(row?.order_count);
    const paidOrderCount = numberFromPg(row?.paid_order_count);
    const cancelledOrderCount = numberFromPg(row?.cancelled_order_count);
    const fulfilledOrderCount = numberFromPg(row?.fulfilled_order_count);

    return {
      ok: true,
      metrics: {
        abandonedCheckoutCount,
        orderCount,
        paidOrderCount,
        cancelledOrderCount,
        fulfilledOrderCount,
        unfulfilledOrderCount: numberFromPg(row?.unfulfilled_order_count),
        abandonmentToOrderRatio: ratio(abandonedCheckoutCount, orderCount),
        paidOrderRate: rate(paidOrderCount, orderCount),
        cancelledOrderRate: rate(cancelledOrderCount, orderCount),
        fulfilledOrderRate: rate(fulfilledOrderCount, orderCount),
        totalRevenue: numberFromPg(row?.total_revenue),
        averageOrderValue: numberFromPg(row?.average_order_value),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify funnel basic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStartupPackAnalysis(): Promise<StartupPackAnalysisResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const metricsResult = await pool.query<StartupPackMetricsRow>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      ),
      startup_items AS (
        SELECT enriched_items.*
        FROM enriched_items
        INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      )
      SELECT
        (SELECT COUNT(*) FROM startup_orders)::text AS startup_pack_order_count,
        COALESCE(SUM(quantity_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_line_items_sold,
        COALESCE(SUM(gross_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_gross_revenue,
        COALESCE(SUM(net_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_net_revenue,
        COALESCE(
          SUM(net_value) FILTER (WHERE is_startup_pack) / NULLIF((SELECT COUNT(*) FROM startup_orders), 0),
          0
        )::text AS average_startup_pack_net_revenue_per_order,
        COUNT(*) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack)::text AS free_bottle_line_item_count,
        COALESCE(SUM(free_quantity) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_quantity,
        COALESCE(SUM(gross_value) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_gross_value,
        COALESCE(SUM(discount_value) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_discount_value,
        COALESCE(SUM(net_value) FILTER (WHERE free_quantity = 0), 0)::text AS paid_items_net_revenue_in_startup_pack_orders,
        COALESCE(
          SUM(free_quantity) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack)
          / NULLIF((SELECT COUNT(*) FROM startup_orders), 0),
          0
        )::text AS average_free_bottles_per_startup_pack_order
      FROM startup_items
    `);
    const freeByQuantityResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      )
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(free_quantity), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT enriched_items.order_id)::text AS order_count
      FROM enriched_items
      INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      WHERE free_quantity > 0 AND NOT is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(free_quantity) DESC
      LIMIT 10
    `);
    const freeByGrossValueResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      )
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(free_quantity), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT enriched_items.order_id)::text AS order_count
      FROM enriched_items
      INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      WHERE free_quantity > 0 AND NOT is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(gross_value) DESC
      LIMIT 10
    `);
    const paidPackProductsResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte}
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(quantity_value), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT order_id)::text AS order_count
      FROM enriched_items
      WHERE is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(net_value) DESC
      LIMIT 10
    `);
    const metrics = metricsResult.rows[0];

    return {
      ok: true,
      metrics: {
        startupPackOrderCount: numberFromPg(metrics?.startup_pack_order_count),
        startupPackLineItemsSold: numberFromPg(metrics?.startup_pack_line_items_sold),
        startupPackGrossRevenue: numberFromPg(metrics?.startup_pack_gross_revenue),
        startupPackNetRevenue: numberFromPg(metrics?.startup_pack_net_revenue),
        averageStartupPackNetRevenuePerOrder:
          metrics?.average_startup_pack_net_revenue_per_order === null
            ? null
            : numberFromPg(metrics?.average_startup_pack_net_revenue_per_order),
        freeBottleLineItemCount: numberFromPg(metrics?.free_bottle_line_item_count),
        freeBottleQuantity: numberFromPg(metrics?.free_bottle_quantity),
        freeBottleGrossValue: numberFromPg(metrics?.free_bottle_gross_value),
        freeBottleDiscountValue: numberFromPg(metrics?.free_bottle_discount_value),
        paidItemsNetRevenueInStartupPackOrders: numberFromPg(
          metrics?.paid_items_net_revenue_in_startup_pack_orders,
        ),
        averageFreeBottlesPerStartupPackOrder:
          metrics?.average_free_bottles_per_startup_pack_order === null
            ? null
            : numberFromPg(metrics?.average_free_bottles_per_startup_pack_order),
        topFreeWinesByQuantity: freeByQuantityResult.rows.map(mapStartupPackProductRow),
        topFreeWinesByGrossValue: freeByGrossValueResult.rows.map(mapStartupPackProductRow),
        topPaidPackProducts: paidPackProductsResult.rows.map(mapStartupPackProductRow),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Startup Pack analysis failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStockMovementSummary(): Promise<StockMovementSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const productsResult = await pool.query<StockMovementProductRow>(`
      ${lineItemsBaseCte}
      SELECT
        product_name,
        vendor,
        sku,
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(paid_quantity), 0)::text AS paid_quantity,
        COALESCE(SUM(free_quantity), 0)::text AS free_quantity,
        COALESCE((SUM(free_quantity) / NULLIF(SUM(quantity_value), 0)) * 100, 0)::text AS free_quantity_percentage,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COALESCE(SUM(net_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_net_revenue_per_unit,
        COUNT(DISTINCT order_id)::text AS order_count
      FROM enriched_items
      GROUP BY product_name, vendor, sku
      ORDER BY SUM(quantity_value) DESC
      LIMIT 100
    `);
    const globalResult = await pool.query<StockMovementGlobalRow>(`
      ${lineItemsBaseCte}
      SELECT
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(paid_quantity), 0)::text AS total_paid_quantity,
        COALESCE(SUM(free_quantity), 0)::text AS total_free_quantity,
        COALESCE((SUM(free_quantity) / NULLIF(SUM(quantity_value), 0)) * 100, 0)::text AS free_quantity_percentage,
        COALESCE(SUM(gross_value), 0)::text AS total_gross_product_value,
        COALESCE(SUM(discount_value), 0)::text AS total_discount_value,
        COALESCE(SUM(net_value), 0)::text AS total_net_product_revenue
      FROM enriched_items
    `);
    const global = globalResult.rows[0];

    return {
      ok: true,
      metrics: {
        totalQuantityMoved: numberFromPg(global?.total_quantity_moved),
        totalPaidQuantity: numberFromPg(global?.total_paid_quantity),
        totalFreeQuantity: numberFromPg(global?.total_free_quantity),
        freeQuantityPercentage:
          global?.free_quantity_percentage === null
            ? null
            : numberFromPg(global?.free_quantity_percentage),
        totalGrossProductValue: numberFromPg(global?.total_gross_product_value),
        totalDiscountValue: numberFromPg(global?.total_discount_value),
        totalNetProductRevenue: numberFromPg(global?.total_net_product_revenue),
        products: productsResult.rows.map(mapStockMovementProductRow),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Stock movement summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getRepeatCustomerMetrics(): Promise<RepeatCustomerMetricsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const metricsResult = await pool.query<RepeatCustomerMetricsRow>(`
      ${customerOrdersCte}
      SELECT
        COUNT(*)::text AS ordering_customers,
        COUNT(*) FILTER (WHERE order_count = 1)::text AS one_time_customers,
        COUNT(*) FILTER (WHERE order_count >= 2)::text AS repeat_customers,
        COUNT(*) FILTER (WHERE order_count = 2)::text AS customers_with_exactly_two_orders,
        COUNT(*) FILTER (WHERE order_count >= 3)::text AS customers_with_three_plus_orders,
        COALESCE(SUM(order_count), 0)::text AS total_non_cancelled_orders,
        COALESCE(SUM(first_order_revenue), 0)::text AS first_order_revenue,
        COALESCE(SUM(later_order_revenue), 0)::text AS later_order_revenue,
        COALESCE(SUM(revenue), 0)::text AS total_non_cancelled_revenue,
        MIN(first_order_date) AS first_order_date,
        MAX(latest_order_date) AS latest_order_date
      FROM customer_rollups
    `);
    const bucketsResult = await pool.query<OrderBucketRow>(`
      ${customerOrdersCte},
      bucketed AS (
        SELECT
          CASE
            WHEN order_count = 1 THEN '1 order'
            WHEN order_count = 2 THEN '2 orders'
            ELSE '3+ orders'
          END AS bucket,
          CASE
            WHEN order_count = 1 THEN 1
            WHEN order_count = 2 THEN 2
            ELSE 3
          END AS bucket_order,
          COUNT(*) AS customer_count,
          SUM(order_count) AS order_count,
          SUM(revenue) AS revenue
        FROM customer_rollups
        GROUP BY bucket, bucket_order
      ),
      totals AS (
        SELECT
          COALESCE(SUM(customer_count), 0) AS total_customers,
          COALESCE(SUM(revenue), 0) AS total_revenue
        FROM bucketed
      )
      SELECT
        bucket,
        customer_count::text,
        COALESCE((customer_count / NULLIF(total_customers, 0)) * 100, 0)::text AS customer_share,
        order_count::text,
        revenue::text,
        COALESCE((revenue / NULLIF(total_revenue, 0)) * 100, 0)::text AS revenue_share
      FROM bucketed
      CROSS JOIN totals
      ORDER BY bucket_order
    `);
    const row = metricsResult.rows[0];
    const orderingCustomers = numberFromPg(row?.ordering_customers);
    const oneTimeCustomers = numberFromPg(row?.one_time_customers);
    const repeatCustomers = numberFromPg(row?.repeat_customers);
    const totalNonCancelledOrders = numberFromPg(row?.total_non_cancelled_orders);
    const firstOrderRevenue = numberFromPg(row?.first_order_revenue);
    const laterOrderRevenue = numberFromPg(row?.later_order_revenue);
    const totalNonCancelledRevenue = numberFromPg(row?.total_non_cancelled_revenue);
    const potentialIssues: string[] = [];
    const reorderRate = rate(repeatCustomers, orderingCustomers);

    if ((reorderRate ?? 100) < 20) {
      potentialIssues.push(
        'Reorder rate is low. Startup Pack acquisition may not yet be converting into repeat orders.',
      );
    }

    if (laterOrderRevenue === 0 && orderingCustomers > 0) {
      potentialIssues.push('No later-order revenue detected yet.');
    }

    if (orderingCustomers > 0 && oneTimeCustomers / orderingCustomers > 0.8) {
      potentialIssues.push('Most customers have ordered only once.');
    }

    if (repeatCustomers > 0) {
      potentialIssues.push('Repeat customers detected. Analyze what they bought after the first order.');
    }

    return {
      ok: true,
      metrics: {
        orderingCustomers,
        oneTimeCustomers,
        repeatCustomers,
        reorderRate,
        customersWithExactlyTwoOrders: numberFromPg(row?.customers_with_exactly_two_orders),
        customersWithThreePlusOrders: numberFromPg(row?.customers_with_three_plus_orders),
        totalNonCancelledOrders,
        averageOrdersPerOrderingCustomer: ratio(totalNonCancelledOrders, orderingCustomers),
        firstOrderRevenue,
        laterOrderRevenue,
        totalNonCancelledRevenue,
        repeatRevenueShare: rate(laterOrderRevenue, totalNonCancelledRevenue),
        averageFirstOrderValue: ratio(firstOrderRevenue, orderingCustomers),
        averageLaterOrderValue: ratio(laterOrderRevenue, totalNonCancelledOrders - orderingCustomers),
        firstOrderDate: dateFromPg(row?.first_order_date ?? null),
        latestOrderDate: dateFromPg(row?.latest_order_date ?? null),
        distribution: bucketsResult.rows.map(mapOrderBucketRow),
        potentialIssues,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Repeat customer metrics failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStartupPackRetention(): Promise<StartupPackRetentionResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const metricsResult = await pool.query<StartupPackRetentionMetricsRow>(`
      ${lineItemsBaseCte}
      ${customerOrdersAfterLineItemsCtes},
      startup_customers AS (
        SELECT DISTINCT customer_key
        FROM order_flags
        WHERE has_startup_pack
      ),
      startup_first_order AS (
        SELECT customer_key, MIN(order_number) AS startup_order_number
        FROM order_flags
        WHERE has_startup_pack
        GROUP BY customer_key
      )
      SELECT
        (SELECT COUNT(*) FROM startup_customers)::text AS startup_pack_customers,
        (SELECT COUNT(*) FROM order_flags WHERE has_startup_pack)::text AS startup_pack_orders,
        (
          SELECT COUNT(DISTINCT order_flags.customer_key)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
        )::text AS startup_pack_customers_with_later_order,
        COALESCE(SUM(order_revenue) FILTER (WHERE has_startup_pack), 0)::text AS startup_pack_first_order_revenue,
        COALESCE(
          (
            SELECT SUM(order_flags.order_revenue)
            FROM order_flags
            INNER JOIN startup_first_order USING (customer_key)
            WHERE order_flags.order_number > startup_first_order.startup_order_number
          ),
          0
        )::text AS startup_pack_later_order_revenue,
        COALESCE(
          (
            SELECT COUNT(*)::numeric / NULLIF((SELECT COUNT(*) FROM startup_customers), 0)
            FROM order_flags
            INNER JOIN startup_first_order USING (customer_key)
            WHERE order_flags.order_number > startup_first_order.startup_order_number
          ),
          0
        )::text AS average_later_orders_per_startup_pack_customer,
        (
          SELECT COUNT(*)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
            AND order_flags.has_box
        )::text AS smart_box_later_orders_after_startup_pack,
        (
          SELECT COUNT(*)
          FROM startup_customers
          WHERE NOT EXISTS (
            SELECT 1
            FROM order_flags
            INNER JOIN startup_first_order USING (customer_key)
            WHERE order_flags.customer_key = startup_customers.customer_key
              AND order_flags.order_number > startup_first_order.startup_order_number
          )
        )::text AS customers_with_startup_pack_only,
        (
          SELECT COUNT(DISTINCT order_flags.customer_key)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
        )::text AS customers_with_startup_pack_and_later_order,
        (
          SELECT COUNT(DISTINCT order_flags.customer_key)
          FROM order_flags
          INNER JOIN startup_first_order USING (customer_key)
          WHERE order_flags.order_number > startup_first_order.startup_order_number
            AND order_flags.has_box
        )::text AS customers_with_startup_pack_and_smart_box
      FROM order_flags
    `);
    const cohortsResult = await pool.query<StartupPackRetentionCohortRow>(`
      ${lineItemsBaseCte}
      ${customerOrdersAfterLineItemsCtes},
      startup_first_order AS (
        SELECT customer_key, MIN(order_number) AS startup_order_number
        FROM order_flags
        WHERE has_startup_pack
        GROUP BY customer_key
      ),
      customer_cohorts AS (
        SELECT
          customer_rollups.customer_key,
          customer_rollups.order_count,
          customer_rollups.revenue,
          COALESCE(customer_rollups.later_order_revenue, 0) AS later_revenue,
          CASE
            WHEN startup_first_order.customer_key IS NULL THEN 'Non-Startup-Pack customers'
            WHEN EXISTS (
              SELECT 1 FROM order_flags
              WHERE order_flags.customer_key = customer_rollups.customer_key
                AND order_flags.order_number > startup_first_order.startup_order_number
                AND order_flags.has_box
            ) THEN 'Startup Pack + Smart Box/subscription'
            WHEN EXISTS (
              SELECT 1 FROM order_flags
              WHERE order_flags.customer_key = customer_rollups.customer_key
                AND order_flags.order_number > startup_first_order.startup_order_number
            ) THEN 'Startup Pack + any later order'
            ELSE 'Startup Pack only'
          END AS cohort
        FROM customer_rollups
        LEFT JOIN startup_first_order USING (customer_key)
      ),
      totals AS (
        SELECT COUNT(*) AS ordering_customers FROM customer_rollups
      )
      SELECT
        cohort,
        COUNT(*)::text AS customer_count,
        COALESCE(SUM(order_count), 0)::text AS orders,
        COALESCE(SUM(revenue), 0)::text AS revenue,
        COALESCE(SUM(later_revenue), 0)::text AS later_revenue,
        COALESCE((COUNT(*)::numeric / NULLIF(totals.ordering_customers, 0)) * 100, 0)::text AS share_of_ordering_customers
      FROM customer_cohorts
      CROSS JOIN totals
      GROUP BY cohort, totals.ordering_customers
      ORDER BY CASE cohort
        WHEN 'Startup Pack only' THEN 1
        WHEN 'Startup Pack + any later order' THEN 2
        WHEN 'Startup Pack + Smart Box/subscription' THEN 3
        ELSE 4
      END
    `);
    const startupPackResult = await getStartupPackAnalysis();

    if (!startupPackResult.ok) {
      return startupPackResult;
    }

    const row = metricsResult.rows[0];
    const startupPackCustomers = numberFromPg(row?.startup_pack_customers);
    const startupPackOrders = numberFromPg(row?.startup_pack_orders);
    const startupPackCustomersWithLaterOrder = numberFromPg(
      row?.startup_pack_customers_with_later_order,
    );
    const smartBoxLaterOrdersAfterStartupPack = numberFromPg(
      row?.smart_box_later_orders_after_startup_pack,
    );
    const startupPackReorderRate = rate(startupPackCustomersWithLaterOrder, startupPackCustomers);
    const potentialIssues: string[] = [];
    const averageFreeBottles =
      startupPackResult.metrics.averageFreeBottlesPerStartupPackOrder;

    if ((startupPackReorderRate ?? 100) < 20) {
      potentialIssues.push('Startup Pack customers are not yet reordering enough.');
    }

    if (startupPackOrders > 0 && smartBoxLaterOrdersAfterStartupPack === 0) {
      potentialIssues.push('Startup Pack customers may not yet be converting to Smart Box.');
    }

    if (startupPackOrders > 0 && (averageFreeBottles === null || averageFreeBottles < 3 || averageFreeBottles > 4)) {
      potentialIssues.push('Average free bottles per Startup Pack is outside the expected 3 to 4 range.');
    }

    return {
      ok: true,
      metrics: {
        startupPackCustomers,
        startupPackOrders,
        startupPackCustomersWithLaterOrder,
        startupPackReorderRate,
        startupPackFirstOrderRevenue: numberFromPg(row?.startup_pack_first_order_revenue),
        startupPackLaterOrderRevenue: numberFromPg(row?.startup_pack_later_order_revenue),
        averageLaterOrdersPerStartupPackCustomer:
          row?.average_later_orders_per_startup_pack_customer === null
            ? null
            : numberFromPg(row?.average_later_orders_per_startup_pack_customer),
        smartBoxLaterOrdersAfterStartupPack,
        customersWithStartupPackOnly: numberFromPg(row?.customers_with_startup_pack_only),
        customersWithStartupPackAndLaterOrder: numberFromPg(
          row?.customers_with_startup_pack_and_later_order,
        ),
        customersWithStartupPackAndSmartBox: numberFromPg(
          row?.customers_with_startup_pack_and_smart_box,
        ),
        averageFreeBottlesPerStartupPackOrder: averageFreeBottles,
        cohorts: cohortsResult.rows.map(mapStartupPackRetentionCohortRow),
        potentialIssues,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Startup Pack retention failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getProductRepeatSignals(): Promise<ProductRepeatSignalsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<ProductRepeatSignalRow>(`
      ${lineItemsBaseCte}
      ${customerOrdersAfterLineItemsCtes}
      SELECT
        enriched_items.product_name,
        enriched_items.vendor,
        enriched_items.sku,
        COALESCE(SUM(enriched_items.quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(enriched_items.paid_quantity), 0)::text AS paid_quantity,
        COALESCE(SUM(enriched_items.free_quantity), 0)::text AS free_quantity,
        COALESCE(SUM(enriched_items.gross_value), 0)::text AS gross_revenue,
        COALESCE(SUM(enriched_items.discount_value), 0)::text AS discount,
        COALESCE(SUM(enriched_items.net_value), 0)::text AS net_revenue,
        COALESCE(SUM(enriched_items.quantity_value) FILTER (WHERE order_flags.order_number = 1), 0)::text AS first_order_quantity,
        COALESCE(SUM(enriched_items.quantity_value) FILTER (WHERE order_flags.order_number > 1), 0)::text AS later_order_quantity,
        COALESCE(SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number = 1), 0)::text AS first_order_revenue,
        COALESCE(SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number > 1), 0)::text AS later_order_revenue,
        COALESCE(
          (SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number > 1)
          / NULLIF(SUM(enriched_items.net_value), 0)) * 100,
          0
        )::text AS repeat_revenue_share,
        COUNT(DISTINCT enriched_items.order_id)::text AS orders_containing_product,
        COUNT(DISTINCT enriched_items.order_id) FILTER (WHERE order_flags.customer_order_count >= 2)::text AS repeat_customer_orders_containing_product
      FROM enriched_items
      INNER JOIN order_flags ON order_flags.order_id = enriched_items.order_id
      GROUP BY enriched_items.product_name, enriched_items.vendor, enriched_items.sku
      ORDER BY SUM(enriched_items.net_value) FILTER (WHERE order_flags.order_number > 1) DESC NULLS LAST
      LIMIT 100
    `);
    const products = result.rows.map(mapProductRepeatSignalRow);
    const topRetentionProduct = products[0] ?? null;
    const potentialInsights: string[] = [];

    if (topRetentionProduct && topRetentionProduct.laterOrderRevenue > 0) {
      potentialInsights.push('Products with later-order revenue are appearing in repeat purchase behavior.');
    }

    if (products.some((product) => product.firstOrderQuantity > 0 && product.laterOrderQuantity === 0)) {
      potentialInsights.push('Some products currently look like acquisition-only products.');
    }

    return {
      ok: true,
      metrics: {
        products,
        topRetentionProduct,
        potentialInsights,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Product repeat signals failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export const majorNlBeCities = new Set([
  'amsterdam',
  'rotterdam',
  'den haag',
  'the hague',
  'utrecht',
  'eindhoven',
  'tilburg',
  'groningen',
  'almere',
  'breda',
  'nijmegen',
  'enschede',
  'haarlem',
  'arnhem',
  'amersfoort',
  'apeldoorn',
  'antwerpen',
  'brussel',
  'brussels',
  'gent',
  'ghent',
  'charleroi',
  'liege',
  'luik',
  'brugge',
  'leuven',
  'mechelen',
]);

export function classifyCity(city: string): GeoInsightCityRow['classification'] {
  return majorNlBeCities.has(city.trim().toLowerCase()) ? 'Big city' : 'Periphery / smaller city';
}

export type GeoCityRow = {
  city: string | null;
  region: string | null;
  customers: string | null;
  orders: string | null;
  revenue: string | null;
};

export async function getGeoInsights(): Promise<GeoInsightsResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    const [cityResult, missingResult] = await Promise.all([
      pool.query<GeoCityRow>(`
        WITH address_by_customer AS (
          SELECT DISTINCT ON (customer_id)
            customer_id::text AS customer_id,
            NULLIF(TRIM(city), '') AS city,
            NULLIF(TRIM(COALESCE(province, province_code, country_code)), '') AS region
          FROM shopify.customer_address
          WHERE customer_id IS NOT NULL
          ORDER BY customer_id, "default" DESC NULLS LAST, updated_at DESC NULLS LAST
        ),
        order_by_customer AS (
          SELECT
            COALESCE(customer->>'id', '') AS customer_id,
            COUNT(*) AS orders,
            COALESCE(SUM(total_price), 0) AS revenue
          FROM shopify.orders
          WHERE cancelled_at IS NULL
          GROUP BY COALESCE(customer->>'id', '')
        )
        SELECT
          address_by_customer.city,
          COALESCE(address_by_customer.region, 'Unknown region') AS region,
          COUNT(DISTINCT address_by_customer.customer_id)::text AS customers,
          COALESCE(SUM(order_by_customer.orders), 0)::text AS orders,
          COALESCE(SUM(order_by_customer.revenue), 0)::text AS revenue
        FROM address_by_customer
        LEFT JOIN order_by_customer ON order_by_customer.customer_id = address_by_customer.customer_id
        WHERE address_by_customer.city IS NOT NULL
        GROUP BY address_by_customer.city, address_by_customer.region
        ORDER BY COALESCE(SUM(order_by_customer.revenue), 0) DESC, COUNT(DISTINCT address_by_customer.customer_id) DESC
        LIMIT 50
      `),
      pool.query<{ with_city: string | null; missing_city: string | null }>(`
        SELECT
          COUNT(*) FILTER (WHERE NULLIF(TRIM(city), '') IS NOT NULL)::text AS with_city,
          COUNT(*) FILTER (WHERE NULLIF(TRIM(city), '') IS NULL)::text AS missing_city
        FROM shopify.customer_address
        WHERE customer_id IS NOT NULL
      `),
    ]);

    const topCities = cityResult.rows.map((row) => ({
      city: row.city || 'Unknown city',
      region: row.region || 'Unknown region',
      classification: classifyCity(row.city || ''),
      customers: numberFromPg(row.customers),
      orders: numberFromPg(row.orders),
      revenue: numberFromPg(row.revenue),
    }));
    const bigCityCustomers = topCities.filter((row) => row.classification === 'Big city').reduce((sum, row) => sum + row.customers, 0);
    const peripheryCustomers = topCities.filter((row) => row.classification !== 'Big city').reduce((sum, row) => sum + row.customers, 0);
    const bigCityRevenue = topCities.filter((row) => row.classification === 'Big city').reduce((sum, row) => sum + row.revenue, 0);
    const peripheryRevenue = topCities.filter((row) => row.classification !== 'Big city').reduce((sum, row) => sum + row.revenue, 0);
    const bigCityOrderCount = topCities.filter((row) => row.classification === 'Big city').reduce((sum, row) => sum + row.orders, 0);
    const peripheryOrderCount = topCities.filter((row) => row.classification !== 'Big city').reduce((sum, row) => sum + row.orders, 0);
    const buyersWithCityData = numberFromPg(missingResult.rows[0]?.with_city);
    const buyersMissingCityData = numberFromPg(missingResult.rows[0]?.missing_city);

    return {
      ok: true,
      metrics: {
        buyersWithCityData,
        buyersMissingCityData,
        bigCityCustomers,
        peripheryCustomers,
        bigCityCustomerShare: rate(bigCityCustomers, bigCityCustomers + peripheryCustomers),
        peripheryCustomerShare: rate(peripheryCustomers, bigCityCustomers + peripheryCustomers),
        bigCityRevenue,
        peripheryRevenue,
        bigCityOrderCount,
        peripheryOrderCount,
        topCities,
        recommendation: buyersWithCityData === 0
          ? 'Improve checkout/location capture or Shopify address sync.'
          : bigCityCustomers >= peripheryCustomers
            ? 'Prioritize big city targeting, then test periphery expansion.'
            : 'Test suburban/periphery targeting; current buyers skew outside major cities.',
        heuristicNote: 'City classification is a simple editable NL/BE major-city list, not population data.',
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Geo insights failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
