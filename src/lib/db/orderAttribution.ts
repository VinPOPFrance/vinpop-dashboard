/**
 * Attribution manuelle du canal d acquisition d une commande.
 *
 * Complement de `acquisitionOrders.ts` pour les commandes que l URL ne
 * permet pas de rattacher : une correction humaine, conservee dans
 * `dashboard.order_channel_overrides`, jamais dans les tables Airbyte.
 */

import 'server-only';
import { dateFromPg, getPool } from './client';
import type { ManualAttributionChannel, OrderChannelOverride, OrderChannelOverrideResult } from './types';

const MANUAL_CHANNELS: ManualAttributionChannel[] = ['meta', 'google-ads', 'organic'];

export function isManualAttributionChannel(value: string): value is ManualAttributionChannel {
  return (MANUAL_CHANNELS as string[]).includes(value);
}

/** Toutes les corrections manuelles enregistrees, indexees par commande. */
export async function getOrderChannelOverrides(): Promise<Map<string, OrderChannelOverride>> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return new Map();

  try {
    const pool = getPool(databaseUrl);
    const result = await pool.query<{
      order_id: string;
      channel: ManualAttributionChannel;
      note: string | null;
      updated_at: Date | string | null;
    }>(`SELECT order_id, channel, note, updated_at FROM dashboard.order_channel_overrides`);

    return new Map(
      result.rows.map((row) => [
        row.order_id,
        { orderId: row.order_id, channel: row.channel, note: row.note, updatedAt: dateFromPg(row.updated_at) },
      ]),
    );
  } catch {
    // Table pas encore creee ou base injoignable : on continue sans correction,
    // le classement automatique reste affiche.
    return new Map();
  }
}

export async function setOrderChannelOverride(
  orderId: string,
  channel: ManualAttributionChannel,
  note: string | null,
): Promise<OrderChannelOverrideResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };
  if (!isManualAttributionChannel(channel)) return { ok: false, reason: 'invalid-channel' };

  try {
    const pool = getPool(databaseUrl);
    const result = await pool.query<{
      order_id: string;
      channel: ManualAttributionChannel;
      note: string | null;
      updated_at: Date | string | null;
    }>(
      `INSERT INTO dashboard.order_channel_overrides (order_id, channel, note)
       VALUES ($1, $2, $3)
       ON CONFLICT (order_id) DO UPDATE
       SET channel = EXCLUDED.channel, note = EXCLUDED.note, updated_at = now()
       RETURNING order_id, channel, note, updated_at`,
      [orderId, channel, note],
    );
    const row = result.rows[0];
    return {
      ok: true,
      override: { orderId: row.order_id, channel: row.channel, note: row.note, updatedAt: dateFromPg(row.updated_at) },
    };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    return { ok: false, reason: errorCode === '42P01' ? 'schema-missing' : 'connection-failed' };
  }
}

export async function removeOrderChannelOverride(orderId: string): Promise<OrderChannelOverrideResult> {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) return { ok: false, reason: 'missing-url' };

  try {
    const pool = getPool(databaseUrl);
    await pool.query(`DELETE FROM dashboard.order_channel_overrides WHERE order_id = $1`, [orderId]);
    return { ok: true, override: null };
  } catch (error) {
    const errorCode = typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
    return { ok: false, reason: errorCode === '42P01' ? 'schema-missing' : 'connection-failed' };
  }
}
