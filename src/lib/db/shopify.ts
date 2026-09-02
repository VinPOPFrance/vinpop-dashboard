/**
 * Donnees Shopify : commandes, produits, stock, coffrets et geographie.
 */

import 'server-only';
import { dateFromPg, getPool, numberFromPg, rate, ratio } from './client';
import { customerOrdersCte } from './sql';
import { type ChurnRiskRow, type RetentionResult, type ShopifyOrdersSummaryResult } from './types';
import { type DateRange } from '@/lib/analytics/dateRanges';

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
      FROM public.orders
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
        FROM public.orders
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

const CHURN_OVERDUE_FACTOR = 1.5;

type RetentionCustomerRow = {
  customer_key: string | null;
  customer_email: string | null;
  orders_count: string | null;
  revenue: string | null;
  first_order_date: Date | string | null;
  last_order_date: Date | string | null;
  average_interval_days: string | null;
  days_since_last_order: string | null;
};

type RetentionReferenceRow = {
  reference_date: Date | string | null;
};

/**
 * Etape 7 du funnel : recurrence, valeur vie client et detection de churn.
 *
 * La date de reference des calculs de retard est la commande la plus recente
 * presente dans l entrepot, PAS la date du jour. Les commandes Shopify arrivent
 * par synchronisation Airbyte : mesurer le retard depuis aujourd hui ferait
 * apparaitre tous les clients comme perdus des que la synchronisation prend du
 * retard. `dataLagDays` expose cet ecart pour que la page puisse le signaler.
 *
 * Le rythme d achat d un client se deduit de son propre historique :
 * (derniere commande - premiere commande) / (nombre de commandes - 1). Un client
 * est a risque quand son silence depasse ce rythme multiplie par
 * `CHURN_OVERDUE_FACTOR`. Un client a une seule commande n a pas de rythme : il
 * est exclu du calcul plutot que compte comme perdu.
 */
export async function getChurnRisk(range: DateRange): Promise<RetentionResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);

    const [referenceResult, customersResult] = await Promise.all([
      pool.query<RetentionReferenceRow>(
        `SELECT MAX(created_at) AS reference_date
         FROM public.orders
         WHERE cancelled_at IS NULL`,
      ),
      pool.query<RetentionCustomerRow>(
        `${customerOrdersCte},
         reference AS (
           SELECT MAX(created_at) AS reference_date
           FROM public.orders
           WHERE cancelled_at IS NULL
         )
         SELECT
           customer_rollups.customer_key,
           users.email AS customer_email,
           customer_rollups.order_count::text AS orders_count,
           customer_rollups.revenue::text AS revenue,
           customer_rollups.first_order_date,
           customer_rollups.latest_order_date AS last_order_date,
           -- Rythme propre au client : l intervalle moyen entre ses commandes.
           CASE
             WHEN customer_rollups.order_count > 1 THEN
               (EXTRACT(EPOCH FROM customer_rollups.latest_order_date - customer_rollups.first_order_date)
                 / 86400.0 / (customer_rollups.order_count - 1))
             ELSE NULL
           END::text AS average_interval_days,
           (EXTRACT(EPOCH FROM reference.reference_date - customer_rollups.latest_order_date) / 86400.0)::text
             AS days_since_last_order
         FROM customer_rollups
         CROSS JOIN reference
         LEFT JOIN public.users ON users.id = customer_rollups.customer_key
         ORDER BY customer_rollups.revenue DESC
         LIMIT 500`,
      ),
    ]);

    const referenceDate = dateFromPg(referenceResult.rows[0]?.reference_date ?? null);
    const dataLagDays = referenceDate
      ? Math.floor((Date.now() - new Date(referenceDate).getTime()) / (24 * 60 * 60 * 1000))
      : null;

    const customers: ChurnRiskRow[] = customersResult.rows.map((row) => {
      const ordersCount = numberFromPg(row.orders_count);
      const averageIntervalDays = row.average_interval_days ? numberFromPg(row.average_interval_days) : null;
      const daysSinceLastOrder = row.days_since_last_order ? numberFromPg(row.days_since_last_order) : null;
      const overdueRatio =
        averageIntervalDays !== null && averageIntervalDays > 0 && daysSinceLastOrder !== null
          ? daysSinceLastOrder / averageIntervalDays
          : null;

      return {
        customerKey: row.customer_key ?? '',
        customerEmail: row.customer_email,
        ordersCount,
        revenue: numberFromPg(row.revenue),
        firstOrderDate: dateFromPg(row.first_order_date),
        lastOrderDate: dateFromPg(row.last_order_date),
        averageIntervalDays,
        daysSinceLastOrder,
        overdueRatio,
        // Seul un client ayant deja un rythme peut en sortir.
        atRisk: ordersCount > 1 && overdueRatio !== null && overdueRatio > CHURN_OVERDUE_FACTOR,
      };
    });

    const orderingCustomers = customers.length;
    const repeatCustomersList = customers.filter((customer) => customer.ordersCount > 1);
    const totalRevenue = customers.reduce((sum, customer) => sum + customer.revenue, 0);
    const totalOrders = customers.reduce((sum, customer) => sum + customer.ordersCount, 0);

    const intervals = repeatCustomersList
      .map((customer) => customer.averageIntervalDays)
      .filter((value): value is number => value !== null && value > 0);

    const atRiskCustomers = customers
      .filter((customer) => customer.atRisk)
      .sort((a, b) => (b.overdueRatio ?? 0) - (a.overdueRatio ?? 0));

    return {
      ok: true,
      metrics: {
        periodLabel: range.label,
        referenceDate,
        dataLagDays,
        orderingCustomers,
        repeatCustomers: repeatCustomersList.length,
        repeatRate: rate(repeatCustomersList.length, orderingCustomers),
        averageOrdersPerCustomer: ratio(totalOrders, orderingCustomers),
        averagePurchaseIntervalDays: intervals.length
          ? intervals.reduce((sum, value) => sum + value, 0) / intervals.length
          : null,
        lifetimeValue: ratio(totalRevenue, orderingCustomers),
        repeatLifetimeValue: ratio(
          repeatCustomersList.reduce((sum, customer) => sum + customer.revenue, 0),
          repeatCustomersList.length,
        ),
        totalRevenue,
        churnOverdueFactor: CHURN_OVERDUE_FACTOR,
        customers,
        atRiskCustomers,
        revenueAtRisk: atRiskCustomers.reduce((sum, customer) => sum + customer.revenue, 0),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Churn risk lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
