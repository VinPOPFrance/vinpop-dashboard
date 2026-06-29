import 'server-only';

import { Pool } from 'pg';

type DatabaseNowRow = {
  now: Date | string;
};

export type DatabaseTableInfo = {
  schemaName: string;
  tableName: string;
  tableType: string;
};

export type DatabaseColumnInfo = {
  columnName: string;
  dataType: string;
  isNullable: string;
  ordinalPosition: number;
};

export type SelectedDatabaseTable = {
  schemaName: string;
  tableName: string;
};

export type DatabaseTableSchema = SelectedDatabaseTable & {
  status: 'found' | 'missing';
  columns: DatabaseColumnInfo[];
};

export type DatabaseTableCount = SelectedDatabaseTable & {
  status: 'counted' | 'missing' | 'error';
  rowCount: number | null;
};

export type ShopifyMetadataSearchTable = SelectedDatabaseTable & {
  columns: DatabaseColumnInfo[];
};

export type ShopifyLineItemSafeField =
  | 'product_id'
  | 'variant_id'
  | 'title'
  | 'name'
  | 'sku'
  | 'quantity'
  | 'price'
  | 'vendor'
  | 'product_exists'
  | 'grams'
  | 'taxable';

export type ShopifyLineItemSample = Partial<Record<ShopifyLineItemSafeField, string | number | boolean | null>>;

export type ShopifyOrderLineItemsSample = {
  orderId: string;
  createdAt: string | null;
  lineItemsType: string;
  lineItemCount: number | null;
  parseError: boolean;
  lineItems: ShopifyLineItemSample[];
};

export type ShopifyOrdersAggregateMetrics = {
  totalOrders: number;
  paidOrders: number;
  cancelledOrders: number;
  fulfilledOrders: number;
  unfulfilledOrders: number;
  totalRevenue: number;
  subtotalRevenue: number;
  totalTax: number;
  averageOrderValue: number;
  firstOrderDate: string | null;
  latestOrderDate: string | null;
  totalLineItemsCount: number | null;
  averageLineItemsPerOrder: number | null;
  lineItemsCountWorked: boolean;
};

type DatabaseTableInfoRow = {
  table_schema: string;
  table_name: string;
  table_type: string;
};

type DatabaseColumnInfoRow = {
  table_schema: string;
  table_name: string;
  column_name: string;
  data_type: string;
  is_nullable: string;
  ordinal_position: number;
};

type DatabaseTableExistsRow = {
  table_schema: string;
  table_name: string;
};

type DatabaseCountRow = {
  row_count: string;
};

type ShopifyOrderLineItemsSampleRow = {
  id: string | number;
  created_at: Date | string | null;
  line_items: unknown;
};

type ShopifyOrdersAggregateMetricsRow = {
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

type ShopifyOrdersLineItemsAggregateRow = {
  total_line_items_count: string | null;
  average_line_items_per_order: string | null;
};

export type DatabaseNowResult =
  | { ok: true; now: string }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type DatabaseTablesResult =
  | { ok: true; tables: DatabaseTableInfo[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type DatabaseTableSchemasResult =
  | { ok: true; tables: DatabaseTableSchema[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type DatabaseTableCountsResult =
  | { ok: true; tables: DatabaseTableCount[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyMetadataSearchResult =
  | { ok: true; tables: ShopifyMetadataSearchTable[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyLineItemsSampleResult =
  | { ok: true; orders: ShopifyOrderLineItemsSample[]; safeFieldsFound: ShopifyLineItemSafeField[] }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyOrdersSummaryResult =
  | { ok: true; metrics: ShopifyOrdersAggregateMetrics }
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

function quoteIdentifier(identifier: string): string {
  if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(identifier)) {
    throw new Error('Unsafe database identifier');
  }

  return `"${identifier}"`;
}

function getValueType(value: unknown): string {
  if (Array.isArray(value)) {
    return 'array';
  }

  if (value === null) {
    return 'null';
  }

  return typeof value;
}

function parseLineItems(value: unknown): { value: unknown; parseError: boolean } {
  if (typeof value !== 'string') {
    return { value, parseError: false };
  }

  try {
    return { value: JSON.parse(value), parseError: false };
  } catch {
    return { value: null, parseError: true };
  }
}

const shopifyLineItemSafeFields: ShopifyLineItemSafeField[] = [
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

function sanitizeLineItem(lineItem: unknown): ShopifyLineItemSample {
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

function numberFromPg(value: string | null | undefined): number {
  if (!value) {
    return 0;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function dateFromPg(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  return value instanceof Date ? value.toISOString() : new Date(value).toISOString();
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

export async function getDatabaseTables(): Promise<DatabaseTablesResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<DatabaseTableInfoRow>(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema NOT IN ('pg_catalog', 'information_schema')
      ORDER BY table_schema, table_name
      LIMIT 200
    `);

    return {
      ok: true,
      tables: result.rows.map((row) => ({
        schemaName: row.table_schema,
        tableName: row.table_name,
        tableType: row.table_type,
      })),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database inspection failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getDatabaseTableSchemas(
  selectedTables: SelectedDatabaseTable[],
): Promise<DatabaseTableSchemasResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  if (selectedTables.length === 0) {
    return { ok: true, tables: [] };
  }

  try {
    const tableKeys = selectedTables.map((table) => `${table.schemaName}.${table.tableName}`);
    const result = await getPool(databaseUrl).query<DatabaseColumnInfoRow>(
      `
        SELECT table_schema, table_name, column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema || '.' || table_name = ANY($1::text[])
        ORDER BY table_schema, table_name, ordinal_position
      `,
      [tableKeys],
    );

    const columnsByTable = new Map<string, DatabaseColumnInfo[]>();
    for (const row of result.rows) {
      const tableKey = `${row.table_schema}.${row.table_name}`;
      const columns = columnsByTable.get(tableKey) ?? [];
      columns.push({
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        ordinalPosition: row.ordinal_position,
      });
      columnsByTable.set(tableKey, columns);
    }

    return {
      ok: true,
      tables: selectedTables.map((table) => {
        const tableKey = `${table.schemaName}.${table.tableName}`;
        const columns = columnsByTable.get(tableKey) ?? [];

        return {
          ...table,
          status: columns.length > 0 ? 'found' : 'missing',
          columns,
        };
      }),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database schema inspection failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getDatabaseTableCounts(
  selectedTables: SelectedDatabaseTable[],
): Promise<DatabaseTableCountsResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  if (selectedTables.length === 0) {
    return { ok: true, tables: [] };
  }

  try {
    const pool = getPool(databaseUrl);
    const tableKeys = selectedTables.map((table) => `${table.schemaName}.${table.tableName}`);
    const existingTablesResult = await pool.query<DatabaseTableExistsRow>(
      `
        SELECT table_schema, table_name
        FROM information_schema.tables
        WHERE table_schema || '.' || table_name = ANY($1::text[])
      `,
      [tableKeys],
    );
    const existingTableKeys = new Set(
      existingTablesResult.rows.map((row) => `${row.table_schema}.${row.table_name}`),
    );

    const tables: DatabaseTableCount[] = [];

    for (const table of selectedTables) {
      const tableKey = `${table.schemaName}.${table.tableName}`;

      if (!existingTableKeys.has(tableKey)) {
        tables.push({ ...table, status: 'missing', rowCount: null });
        continue;
      }

      try {
        const schemaName = quoteIdentifier(table.schemaName);
        const tableName = quoteIdentifier(table.tableName);
        const countResult = await pool.query<DatabaseCountRow>(
          `SELECT COUNT(*)::text AS row_count FROM ${schemaName}.${tableName}`,
        );
        const rowCount = Number(countResult.rows[0]?.row_count ?? 0);

        tables.push({ ...table, status: 'counted', rowCount });
      } catch (error) {
        const errorCode =
          typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

        console.error('Database table count failed', { table: tableKey, code: errorCode });
        tables.push({ ...table, status: 'error', rowCount: null });
      }
    }

    return { ok: true, tables };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Database table counts failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function searchShopifyTableMetadata(): Promise<ShopifyMetadataSearchResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const matchedTablesResult = await pool.query<DatabaseTableInfoRow>(`
      SELECT table_schema, table_name, table_type
      FROM information_schema.tables
      WHERE table_schema = 'shopify'
        AND (
          table_name ILIKE '%order%'
          OR table_name ILIKE '%line%'
          OR table_name ILIKE '%item%'
          OR table_name ILIKE '%product%'
          OR table_name ILIKE '%variant%'
        )
      ORDER BY table_name
      LIMIT 100
    `);

    if (matchedTablesResult.rows.length === 0) {
      return { ok: true, tables: [] };
    }

    const tableKeys = matchedTablesResult.rows.map((row) => `${row.table_schema}.${row.table_name}`);
    const columnsResult = await pool.query<DatabaseColumnInfoRow>(
      `
        SELECT table_schema, table_name, column_name, data_type, is_nullable, ordinal_position
        FROM information_schema.columns
        WHERE table_schema || '.' || table_name = ANY($1::text[])
        ORDER BY table_schema, table_name, ordinal_position
      `,
      [tableKeys],
    );

    const columnsByTable = new Map<string, DatabaseColumnInfo[]>();
    for (const row of columnsResult.rows) {
      const tableKey = `${row.table_schema}.${row.table_name}`;
      const columns = columnsByTable.get(tableKey) ?? [];
      columns.push({
        columnName: row.column_name,
        dataType: row.data_type,
        isNullable: row.is_nullable,
        ordinalPosition: row.ordinal_position,
      });
      columnsByTable.set(tableKey, columns);
    }

    return {
      ok: true,
      tables: matchedTablesResult.rows.map((row) => {
        const tableKey = `${row.table_schema}.${row.table_name}`;

        return {
          schemaName: row.table_schema,
          tableName: row.table_name,
          columns: columnsByTable.get(tableKey) ?? [],
        };
      }),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify metadata search failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
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
