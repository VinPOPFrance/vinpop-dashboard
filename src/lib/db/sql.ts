/**
 * Fragment SQL partage.
 *
 * `customerOrdersCte` reconstitue l historique de commandes par client. Elle est
 * isolee ici plutot que recopiee dans chaque lecture : la dupliquer ferait
 * diverger la definition de "commande payee" d un ecran a l autre.
 */

export const customerOrdersCte = `
  WITH orders_base AS (
    SELECT
      id AS order_id,
      created_at,
      cancelled_at,
      CASE
        WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
        ELSE 0
      END AS order_revenue,
      COALESCE(
        NULLIF(customer::jsonb->>'id', ''),
        NULLIF(email::text, '')
      ) AS customer_key
    FROM shopify.orders
  ),
  identified_non_cancelled_orders AS (
    SELECT *
    FROM orders_base
    WHERE cancelled_at IS NULL AND customer_key IS NOT NULL
  ),
  customer_order_positions AS (
    SELECT
      *,
      ROW_NUMBER() OVER (PARTITION BY customer_key ORDER BY created_at, order_id) AS order_number,
      COUNT(*) OVER (PARTITION BY customer_key) AS customer_order_count
    FROM identified_non_cancelled_orders
  ),
  customer_rollups AS (
    SELECT
      customer_key,
      COUNT(*) AS order_count,
      SUM(order_revenue) AS revenue,
      SUM(order_revenue) FILTER (WHERE order_number = 1) AS first_order_revenue,
      SUM(order_revenue) FILTER (WHERE order_number > 1) AS later_order_revenue,
      MIN(created_at) AS first_order_date,
      MAX(created_at) AS latest_order_date
    FROM customer_order_positions
    GROUP BY customer_key
  )
`;

