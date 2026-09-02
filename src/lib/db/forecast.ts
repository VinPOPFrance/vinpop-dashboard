/**
 * Module financier : charges saisies et agregats reels.
 *
 * Seul module du dashboard qui ECRIT en base, et uniquement dans le schema
 * `dashboard` (voir `scripts/create-dashboard-schema.sql`). Les schemas
 * `public` et `shopify`, alimentes par Airbyte, restent en lecture seule.
 */

import 'server-only';
import { getPool, numberFromPg } from './client';
import type { CostItem } from '@/lib/forecast/breakEven';
import { dateToSql, type DateRange } from '@/lib/analytics/dateRanges';

/** Une hypothese scalaire du modele. */
export type ForecastAssumption = {
  key: string;
  label: string;
  value: number;
  unit: string;
};

export type ForecastSettings = {
  fixedCosts: CostItem[];
  variableCosts: CostItem[];
  assumptions: ForecastAssumption[];
};

export type ForecastSettingsResult =
  | { ok: true; settings: ForecastSettings }
  | { ok: false; reason: 'missing-url' | 'connection-failed' | 'schema-missing' };

/** Depenses et revenus mesures, ramenes a l echelle du mois. */
export type ForecastActuals = {
  periodLabel: string;
  /** Nombre de jours couverts par la periode selectionnee. */
  periodDays: number;
  metaSpend: number;
  googleSpend: number;
  totalAdSpend: number;
  revenue: number;
  ordersCount: number;
  bottlesSold: number;
  /** Les memes grandeurs ramenees a 30 jours, pretes pour le modele. */
  monthlyAdSpend: number;
  monthlyRevenue: number;
  monthlyBottlesSold: number;
  /** Prix de vente moyen observe, en euros par bouteille. */
  observedAveragePrice: number | null;
};

export type ForecastActualsResult =
  | { ok: true; actuals: ForecastActuals }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

type CostRow = {
  id: string;
  kind: string;
  label: string;
  amount: string | null;
  unit: string;
};

type AssumptionRow = {
  key: string;
  label: string;
  value: string | null;
  unit: string;
};

/**
 * Lit les charges et hypotheses saisies.
 *
 * Renvoie `schema-missing` si le schema `dashboard` n existe pas encore : c est
 * une situation attendue tant que le script de creation n a pas ete joue, et
 * l interface doit pouvoir le dire clairement plutot que d afficher une erreur
 * de connexion trompeuse.
 */
export async function getForecastSettings(): Promise<ForecastSettingsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);

    const schemaCheck = await pool.query<{ present: string }>(
      `SELECT COUNT(*)::text AS present
       FROM information_schema.tables
       WHERE table_schema = 'dashboard' AND table_name = 'cost_settings'`,
    );

    if (numberFromPg(schemaCheck.rows[0]?.present) === 0) {
      return { ok: false, reason: 'schema-missing' };
    }

    const [costsResult, assumptionsResult] = await Promise.all([
      pool.query<CostRow>(
        `SELECT id::text, kind, label, amount::text, unit
         FROM dashboard.cost_settings
         ORDER BY kind, sort_order, label`,
      ),
      pool.query<AssumptionRow>(
        `SELECT key, label, value::text, unit
         FROM dashboard.forecast_assumptions
         ORDER BY key`,
      ),
    ]);

    const costs: CostItem[] = costsResult.rows.map((row) => ({
      id: Number(row.id),
      kind: row.kind === 'variable' ? 'variable' : 'fixed',
      label: row.label,
      amount: numberFromPg(row.amount),
      unit: row.unit === 'per_bottle' ? 'per_bottle' : 'per_month',
    }));

    return {
      ok: true,
      settings: {
        fixedCosts: costs.filter((cost) => cost.kind === 'fixed'),
        variableCosts: costs.filter((cost) => cost.kind === 'variable'),
        assumptions: assumptionsResult.rows.map((row) => ({
          key: row.key,
          label: row.label,
          value: numberFromPg(row.value),
          unit: row.unit,
        })),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Forecast settings read failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export type ForecastUpdateInput = {
  /** Montants de charges a mettre a jour, par identifiant. */
  costs: { id: number; amount: number }[];
  /** Hypotheses a mettre a jour, par cle. */
  assumptions: { key: string; value: number }[];
};

export type ForecastUpdateResult =
  | { ok: true; updatedCosts: number; updatedAssumptions: number }
  | { ok: false; reason: 'missing-url' | 'connection-failed' | 'invalid-input' };

/**
 * Met a jour les montants saisis.
 *
 * Ecriture strictement bornee : seules les colonnes `amount` et `value` sont
 * modifiables, sur des lignes existantes designees par leur identifiant. Aucune
 * creation ni suppression de poste par cette voie, et aucun acces aux schemas
 * Airbyte. Tout passe dans une transaction : une saisie partiellement
 * enregistree donnerait un modele financier incoherent.
 */
export async function updateForecastSettings(
  input: ForecastUpdateInput,
): Promise<ForecastUpdateResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  // Un montant negatif ou non fini n a pas de sens et corromprait le calcul.
  const invalid =
    input.costs.some((cost) => !Number.isFinite(cost.amount) || cost.amount < 0) ||
    input.assumptions.some((item) => !Number.isFinite(item.value) || item.value < 0);

  if (invalid) {
    return { ok: false, reason: 'invalid-input' };
  }

  const pool = getPool(databaseUrl);
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    let updatedCosts = 0;
    for (const cost of input.costs) {
      const result = await client.query(
        `UPDATE dashboard.cost_settings
         SET amount = $1, updated_at = now()
         WHERE id = $2`,
        [cost.amount, cost.id],
      );
      updatedCosts += result.rowCount ?? 0;
    }

    let updatedAssumptions = 0;
    for (const assumption of input.assumptions) {
      const result = await client.query(
        `UPDATE dashboard.forecast_assumptions
         SET value = $1, updated_at = now()
         WHERE key = $2`,
        [assumption.value, assumption.key],
      );
      updatedAssumptions += result.rowCount ?? 0;
    }

    await client.query('COMMIT');
    return { ok: true, updatedCosts, updatedAssumptions };
  } catch (error) {
    await client.query('ROLLBACK');
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Forecast settings update failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  } finally {
    client.release();
  }
}

type ActualsRow = {
  meta_spend: string | null;
  google_spend: string | null;
  revenue: string | null;
  orders_count: string | null;
  bottles_sold: string | null;
};

/**
 * Agrege les depenses publicitaires et le chiffre d affaires reels.
 *
 * Trois precisions sur les sources :
 *
 *  - Meta : `public.ads_insights.spend`, deja en euros.
 *  - Google : `public.campaign.metrics_cost_micros`, divise par 1 000 000. La
 *    table porte une ligne par campagne ET par heure ; ces lignes ne se
 *    recouvrent pas, la somme brute est donc le total exact (verifie : elle
 *    concorde au centime avec le total de `keyword_view`).
 *  - Shopify : `total_price` par commande, en dedoublonnant les commandes avant
 *    de sommer, sinon chaque ligne de commande multiplierait le chiffre
 *    d affaires. Les bouteilles excluent les coffrets et box, qui ne sont pas
 *    des unites de vin.
 */
export async function getForecastActuals(range: DateRange): Promise<ForecastActualsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  const startSql = dateToSql(range.start);
  const endSql = dateToSql(range.end);

  try {
    const pool = getPool(databaseUrl);

    const result = await pool.query<ActualsRow>(
      `WITH order_lines AS (
         SELECT
           orders.id AS order_id,
           orders.total_price,
           line_item->>'title' AS title,
           COALESCE(NULLIF(line_item->>'quantity', '')::numeric, 0) AS quantity
         FROM shopify.orders,
           LATERAL jsonb_array_elements(
             CASE
               WHEN jsonb_typeof(orders.line_items::jsonb) = 'array' THEN orders.line_items::jsonb
               ELSE '[]'::jsonb
             END
           ) AS line_item
         WHERE orders.cancelled_at IS NULL
           AND orders.created_at::date BETWEEN $1::date AND $2::date
       ),
       distinct_orders AS (
         SELECT DISTINCT order_id, total_price
         FROM order_lines
       )
       SELECT
         (
           SELECT COALESCE(SUM(spend::numeric), 0)::text
           FROM public.ads_insights
           WHERE date_start::date BETWEEN $1::date AND $2::date
         ) AS meta_spend,
         (
           SELECT COALESCE(SUM(metrics_cost_micros), 0)::numeric / 1000000
           FROM public.campaign
           WHERE segments_date BETWEEN $1::date AND $2::date
         )::text AS google_spend,
         (
           SELECT COALESCE(SUM(
             CASE
               WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
               ELSE 0
             END
           ), 0)::text
           FROM distinct_orders
         ) AS revenue,
         (SELECT COUNT(*)::text FROM distinct_orders) AS orders_count,
         (
           SELECT COALESCE(SUM(quantity), 0)::text
           FROM order_lines
           WHERE title NOT ILIKE '%kit%'
             AND title NOT ILIKE '%pack%'
             AND title NOT ILIKE '%box%'
         ) AS bottles_sold`,
      [startSql, endSql],
    );

    const row = result.rows[0];
    const metaSpend = numberFromPg(row?.meta_spend);
    const googleSpend = numberFromPg(row?.google_spend);
    const revenue = numberFromPg(row?.revenue);
    const bottlesSold = numberFromPg(row?.bottles_sold);

    // Nombre de jours reellement couverts, borne a 1 pour eviter une division
    // par zero sur une periode d un seul jour.
    const periodDays = Math.max(
      1,
      Math.round((range.end.getTime() - range.start.getTime()) / (24 * 60 * 60 * 1000)),
    );

    const toMonthlyValue = (value: number) => (value / periodDays) * 30;

    return {
      ok: true,
      actuals: {
        periodLabel: range.label,
        periodDays,
        metaSpend,
        googleSpend,
        totalAdSpend: metaSpend + googleSpend,
        revenue,
        ordersCount: numberFromPg(row?.orders_count),
        bottlesSold,
        monthlyAdSpend: toMonthlyValue(metaSpend + googleSpend),
        monthlyRevenue: toMonthlyValue(revenue),
        monthlyBottlesSold: toMonthlyValue(bottlesSold),
        observedAveragePrice: bottlesSold > 0 ? revenue / bottlesSold : null,
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Forecast actuals lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
