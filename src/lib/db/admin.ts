/**
 * Inspection de la base : existence des tables, schemas, comptages.
 *
 * Sert aux pages d annexes et au controle qualite des donnees, pas aux KPI.
 */

import 'server-only';
import { getPool } from './client';
import { type ActivityTrackingTable, type CustomerActivityReadinessResult } from './types';

export async function getCustomerActivityReadiness(): Promise<CustomerActivityReadinessResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const result = await getPool(databaseUrl).query<Record<string, string>>(`
      SELECT table_schema, table_name, column_name
      FROM information_schema.columns
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
        AND (
          table_name ILIKE '%visitor%' OR table_name ILIKE '%session%' OR table_name ILIKE '%event%'
          OR table_name ILIKE '%activity%' OR table_name ILIKE '%pageview%' OR table_name ILIKE '%page_view%'
          OR table_name ILIKE '%login%' OR table_name ILIKE '%analytics%'
        )
      ORDER BY table_schema, table_name, ordinal_position
      LIMIT 500
    `);
    const grouped = new Map<string, ActivityTrackingTable>();
    for (const row of result.rows) {
      const key = `${row.table_schema}.${row.table_name}`;
      const current = grouped.get(key) ?? {
        schemaName: row.table_schema,
        tableName: row.table_name,
        columns: [],
      };
      current.columns.push(row.column_name);
      grouped.set(key, current);
    }
    const tablesFound = Array.from(grouped.values());

    return {
      ok: true,
      metrics: {
        tablesFound,
        hasTrackingTables: tablesFound.length > 0,
        readinessMessage:
          tablesFound.length > 0
            ? 'Potential tracking tables exist. Review metadata before calculating visit/session metrics.'
            : 'Current database does not yet contain visitor/session/event tracking needed to calculate last visit or sessions before purchase.',
        requiredFields: [
          'visitor_id',
          'session_id',
          'customer_id if known',
          'first_seen_at',
          'last_seen_at',
          'page_count',
          'landing_page',
          'utm_source',
          'utm_medium',
          'utm_campaign',
          'meta_click_id',
          'event_name',
          'event_time',
          'funnel_stage',
          'order_id after purchase if matchable',
        ],
        recommendedEvents: [
          'site_viewed',
          'landing_page_viewed',
          'quiz_started',
          'quiz_completed',
          'email_submitted',
          'taste_kit_viewed',
          'taste_kit_added_to_cart',
          'checkout_started',
          'purchase_completed',
          'wine_rated_love',
          'wine_rated_like',
          'wine_rated_dislike',
          'smart_box_viewed',
          'smart_box_customized',
          'smart_box_purchased',
          'subscription_viewed',
          'subscription_started',
        ],
      },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    console.error('Customer activity readiness failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
