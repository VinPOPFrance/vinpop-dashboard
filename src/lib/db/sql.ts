/**
 * Fragments SQL partages entre plusieurs modules.
 *
 * Ces CTE decoupent les lignes de commande Shopify et reconstituent l historique
 * par client. Elles sont utilisees par les modules `shopify` et `overview` :
 * les dupliquer ferait diverger les definitions de "commande payee" ou de
 * "coffret de decouverte" d un ecran a l autre.
 */



export const startupPackTitleCondition = `
  title_text ILIKE '%starter pack%'
  OR title_text ILIKE '%startup pack%'
  OR title_text ILIKE '%start up pack%'
  OR title_text ILIKE '%calibration kit%'
  OR title_text ILIKE '%taste kit%'
  OR title_text ILIKE '%tasting kit%'
`;

export const boxTitleCondition = `
  title_text ILIKE '%subscription%'
  OR title_text ILIKE '%smart box%'
  OR title_text ILIKE '%box%'
`;

export const lineItemsBaseCte = `
  WITH order_items AS (
    SELECT
      id AS order_id,
      item,
      COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), '') AS title_text,
      COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
      COALESCE(NULLIF(item->>'vendor', ''), 'Unknown vendor') AS vendor,
      COALESCE(NULLIF(item->>'sku', ''), 'No SKU') AS sku,
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
      *,
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
      END AS paid_quantity,
      CASE WHEN ${startupPackTitleCondition} THEN true ELSE false END AS is_startup_pack,
      CASE WHEN ${boxTitleCondition} THEN true ELSE false END AS is_box
    FROM order_items
  )
`;

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
  identified_non_cancelled_orders AS (
    SELECT *
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

export const customerOrdersAfterLineItemsCtes = `,
  orders_base AS (
    SELECT
      id AS order_id,
      created_at,
      cancelled_at,
      CASE
        WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
        ELSE 0
      END AS order_revenue,
      COALESCE(
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
  identified_non_cancelled_orders AS (
    SELECT *
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
      SUM(order_revenue) FILTER (WHERE order_number > 1) AS later_order_revenue
    FROM customer_order_positions
    GROUP BY customer_key
  ),
  order_flags AS (
    SELECT
      customer_order_positions.order_id,
      customer_order_positions.customer_key,
      customer_order_positions.order_number,
      customer_order_positions.customer_order_count,
      customer_order_positions.order_revenue,
      COALESCE(BOOL_OR(enriched_items.is_startup_pack), false) AS has_startup_pack,
      COALESCE(BOOL_OR(enriched_items.is_box), false) AS has_box
    FROM customer_order_positions
    LEFT JOIN enriched_items ON enriched_items.order_id = customer_order_positions.order_id
    GROUP BY
      customer_order_positions.order_id,
      customer_order_positions.customer_key,
      customer_order_positions.order_number,
      customer_order_positions.customer_order_count,
      customer_order_positions.order_revenue
  )
`;
