import 'server-only';

import { Pool } from 'pg';

type DatabaseNowRow = {
  now: Date | string;
};

export type DatabaseNowResult =
  | { ok: true; now: string }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

declare global {
  var vinpopDashboardPgPool: Pool | undefined;
}

function getPool(databaseUrl: string): Pool {
  if (!globalThis.vinpopDashboardPgPool) {
    globalThis.vinpopDashboardPgPool = new Pool({
      connectionString: databaseUrl,
      max: 1,
    });
  }

  return globalThis.vinpopDashboardPgPool;
}

export async function getDatabaseNow(): Promise<DatabaseNowResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<DatabaseNowRow>('SELECT now() AS now');
    const now = result.rows[0]?.now;

    return {
      ok: true,
      now: now instanceof Date ? now.toISOString() : new Date(now).toISOString(),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database connection test failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}
