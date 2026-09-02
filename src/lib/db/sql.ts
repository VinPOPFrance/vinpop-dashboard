/**
 * Fragments SQL partages.
 *
 * `customerOrdersCte` reconstitue l historique de commandes par client. Elle est
 * isolee ici plutot que recopiee dans chaque lecture : la dupliquer ferait
 * diverger la definition de "commande payee" d un ecran a l autre.
 *
 * Les helpers de reconnaissance de ligne de commande suivent la meme logique :
 * l etape 5 (Taste Kit) et l etape 6 (Smart Box) doivent compter exactement les
 * memes commandes, sinon la conversion entre les deux n a aucun sens.
 */

/**
 * Identifiant Shopify du Taste Kit.
 *
 * Le produit s est appele "Starter Pack" jusqu au 13/07/2026 puis "Taste kit",
 * sans changer d identifiant. Une ligne de commande fige le titre du jour de l
 * achat : filtrer sur le titre perd les commandes passees sous l ancien nom et
 * casserait silencieusement l etape 5 au prochain renommage. L identifiant, lui,
 * ne bouge pas.
 *
 * Le catalogue contient un second produit "Taste kit" (`16209518526851`, handle
 * `taste-kit-1`) qui n a jamais ete commande. Il n est volontairement pas inclus
 * ici : l ajouter reviendrait a compter deux produits distincts comme un seul
 * sans savoir lequel fait foi.
 */
export const tasteKitProductId = '15885033767299';

/**
 * Marqueur pose par le theme sur chaque bouteille choisie dans le configurateur
 * Smart Wine Box.
 *
 * La Smart Wine Box n est pas un produit vendu, c est un outil de selection : la
 * commande ne contient que les bouteilles retenues, jamais une ligne intitulee
 * "Smart Wine Box". Chercher ce titre ne remonte donc rien, quel que soit le
 * volume reel de ventes. Le theme etiquette en revanche chaque ligne issue du
 * configurateur avec la propriete `_selection_source`.
 */
export const smartBoxSelectionSource = 'smart_box_builder';

/**
 * Vrai si la ligne de commande vient du configurateur Smart Wine Box.
 *
 * `lineItem` est le nom de l element jsonb de `line_items` dans la requete
 * appelante : il varie d un module a l autre, d ou le parametre.
 */
export function isSmartBoxLineItem(lineItem: string): string {
  return `EXISTS (
    SELECT 1
    FROM jsonb_array_elements(
      CASE
        WHEN jsonb_typeof(${lineItem}->'properties') = 'array' THEN ${lineItem}->'properties'
        ELSE '[]'::jsonb
      END
    ) AS line_item_property
    WHERE line_item_property->>'name' = '_selection_source'
      AND line_item_property->>'value' = '${smartBoxSelectionSource}'
  )`;
}

/** Vrai si la ligne de commande porte le Taste Kit. Voir `tasteKitProductId`. */
export function isTasteKitLineItem(lineItem: string): string {
  return `${lineItem}->>'product_id' = '${tasteKitProductId}'`;
}

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
    FROM public.orders
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

