/**
 * Connexion PostgreSQL et helpers de requete partages.
 *
 * Tout acces a la base passe par ici : un seul pool, reutilise entre les
 * rendus, et les conversions de types PostgreSQL vers JavaScript.
 */

import 'server-only';
import { Pool } from 'pg';

declare global {
  var vinpopDashboardPgPool: Pool | undefined;
}

export function getPool(databaseUrl: string): Pool {
  if (!globalThis.vinpopDashboardPgPool) {
    globalThis.vinpopDashboardPgPool = new Pool({
      connectionString: databaseUrl,
      max: 1,
    });
  }

  return globalThis.vinpopDashboardPgPool;
}

export function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error('Unsafe database identifier');
  }

  return `"${identifier}"`;
}

export function numberFromPg(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function dateFromPg(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
}

export function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

export function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

/** Fraicheur d une source : quand Airbyte y a ecrit pour la derniere fois. */
export type AirbyteSourceFreshness = {
  /** Nom lisible de la source, affiche dans l interface. */
  source: string;
  /** Table temoin interrogee pour cette source. */
  table: string;
  /** Date ISO de la derniere extraction, ou `null` si la table est vide. */
  lastSyncedAt: string | null;
};

export type AirbyteFreshnessResult =
  | { ok: true; oldestSyncedAt: string | null; sources: AirbyteSourceFreshness[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

/**
 * Tables temoins, une par source.
 *
 * Interroger une table par source suffit : Airbyte ecrit toutes les tables
 * d une meme connexion dans la meme fenetre de synchronisation. On choisit la
 * table la plus volumineuse de chaque source, celle qui bouge a chaque sync.
 */
const AIRBYTE_WATCHED_TABLES: { source: string; schema: string; table: string }[] = [
  { source: 'Shopify', schema: 'shopify', table: 'orders' },
  { source: 'Meta Ads', schema: 'public', table: 'ads_insights' },
  { source: 'Google Ads', schema: 'public', table: 'campaign' },
  { source: 'GA4', schema: 'public', table: 'traffic_acquisition_session_source_medium_report' },
  { source: 'VinPop', schema: 'public', table: 'wines' },
];

/**
 * Date de derniere synchronisation Airbyte, par source.
 *
 * L interface affichait jusqu ici une mention "Last sync" ecrite en dur qui ne
 * reflétait rien. Cette fonction lit `MAX(_airbyte_extracted_at)`, la colonne
 * technique qu Airbyte pose sur chaque ligne au moment de l extraction.
 *
 * Les tables sont d abord filtrees via `information_schema` : une source non
 * encore branchee ne doit pas faire echouer la lecture des autres.
 */
export async function getLastAirbyteSync(): Promise<AirbyteFreshnessResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);

    // Ne garder que les tables qui existent et portent la colonne Airbyte.
    const available = await pool.query<{ table_schema: string; table_name: string }>(
      `SELECT table_schema, table_name
       FROM information_schema.columns
       WHERE column_name = '_airbyte_extracted_at'
         AND (table_schema, table_name) IN (${AIRBYTE_WATCHED_TABLES.map(
           (_, index) => `($${index * 2 + 1}, $${index * 2 + 2})`,
         ).join(', ')})`,
      AIRBYTE_WATCHED_TABLES.flatMap((entry) => [entry.schema, entry.table]),
    );

    const existing = new Set(available.rows.map((row) => `${row.table_schema}.${row.table_name}`));
    const watched = AIRBYTE_WATCHED_TABLES.filter((entry) => existing.has(`${entry.schema}.${entry.table}`));

    if (!watched.length) {
      return { ok: true, oldestSyncedAt: null, sources: [] };
    }

    // Une seule requete : un MAX par table temoin, assembles en UNION ALL.
    // Les identifiants viennent de la constante ci-dessus et sont valides par
    // `quoteIdentifier`, jamais d une entree utilisateur.
    const unionSql = watched
      .map(
        (entry, index) =>
          `SELECT $${index + 1}::text AS source, MAX(_airbyte_extracted_at) AS last_synced_at ` +
          `FROM ${quoteIdentifier(entry.schema)}.${quoteIdentifier(entry.table)}`,
      )
      .join(' UNION ALL ');

    const result = await pool.query<{ source: string; last_synced_at: Date | string | null }>(
      unionSql,
      watched.map((entry) => entry.source),
    );

    const bySource = new Map(result.rows.map((row) => [row.source, dateFromPg(row.last_synced_at)]));
    const sources: AirbyteSourceFreshness[] = watched.map((entry) => ({
      source: entry.source,
      table: `${entry.schema}.${entry.table}`,
      lastSyncedAt: bySource.get(entry.source) ?? null,
    }));

    // La source la plus en retard determine la fraicheur reelle du dashboard :
    // afficher la plus recente donnerait une fausse impression d actualite.
    const timestamps = sources
      .map((entry) => entry.lastSyncedAt)
      .filter((value): value is string => value !== null);

    const oldestSyncedAt = timestamps.length
      ? timestamps.reduce((oldest, current) => (current < oldest ? current : oldest))
      : null;

    return { ok: true, oldestSyncedAt, sources };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Airbyte freshness lookup failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
