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

export type ShopifyProductSummary = {
  productId: string;
  variantId: string;
  productName: string;
  sku: string;
  vendor: string;
  totalQuantitySold: number;
  grossRevenue: number;
  totalDiscount: number;
  netRevenue: number;
  averageDiscountPerUnit: number;
  discountRatePercentage: number;
  freeQuantityEstimate: number;
  paidQuantityEstimate: number;
  orderCount: number;
  averageNetItemPrice: number;
};

export type ShopifyFunnelBasicMetrics = {
  abandonedCheckoutCount: number;
  orderCount: number;
  paidOrderCount: number;
  cancelledOrderCount: number;
  fulfilledOrderCount: number;
  unfulfilledOrderCount: number;
  abandonmentToOrderRatio: number | null;
  paidOrderRate: number | null;
  cancelledOrderRate: number | null;
  fulfilledOrderRate: number | null;
  totalRevenue: number;
  averageOrderValue: number;
};

export type BusinessOverviewMetrics = {
  totalRevenue: number;
  totalOrders: number;
  averageOrderValue: number;
  paidOrders: number;
  cancelledOrders: number;
  abandonedCheckoutCount: number;
  topProducts: ShopifyProductSummary[];
  totalQuantitySold: number;
  totalProductDiscounts: number;
  freeQuantityEstimate: number;
  totalLineItems: number | null;
  potentialIssues: string[];
  startupPackOrders: number;
  averageFreeBottlesPerStartupPackOrder: number | null;
  paidQuantityEstimate: number;
  freeQuantityPercentage: number | null;
};

export type StartupPackProductRow = {
  productName: string;
  vendor: string;
  quantity: number;
  grossValue: number;
  discountValue: number;
  netRevenue: number;
  orderCount: number;
};

export type StartupPackAnalysisMetrics = {
  startupPackOrderCount: number;
  startupPackLineItemsSold: number;
  startupPackGrossRevenue: number;
  startupPackNetRevenue: number;
  averageStartupPackNetRevenuePerOrder: number | null;
  freeBottleLineItemCount: number;
  freeBottleQuantity: number;
  freeBottleGrossValue: number;
  freeBottleDiscountValue: number;
  paidItemsNetRevenueInStartupPackOrders: number;
  averageFreeBottlesPerStartupPackOrder: number | null;
  topFreeWinesByQuantity: StartupPackProductRow[];
  topFreeWinesByGrossValue: StartupPackProductRow[];
  topPaidPackProducts: StartupPackProductRow[];
};

export type StockMovementProduct = {
  productName: string;
  vendor: string;
  sku: string;
  totalQuantityMoved: number;
  paidQuantity: number;
  freeQuantity: number;
  freeQuantityPercentage: number | null;
  grossValue: number;
  discountValue: number;
  netRevenue: number;
  averageNetRevenuePerUnit: number;
  orderCount: number;
};

export type StockMovementSummaryMetrics = {
  totalQuantityMoved: number;
  totalPaidQuantity: number;
  totalFreeQuantity: number;
  freeQuantityPercentage: number | null;
  totalGrossProductValue: number;
  totalDiscountValue: number;
  totalNetProductRevenue: number;
  products: StockMovementProduct[];
};

export type AcquisitionEconomicsBasicMetrics = {
  usersCount: number;
  quizCount: number;
  ratingsCount: number;
  shopifyCustomersCount: number | null;
  ordersCount: number;
  paidOrdersCount: number;
  cancelledOrdersCount: number;
  abandonedCheckoutCount: number;
  startupPackOrdersCount: number;
  boxOrdersCount: number;
  freeBottleQuantity: number;
  productDiscountValue: number;
  totalRevenue: number;
  averageOrderValue: number;
  ratingsPerUser: number | null;
  ratingsPerOrder: number | null;
  quizToOrderRatio: number | null;
  abandonedCheckoutToOrderRatio: number | null;
  potentialIssues: string[];
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

type ShopifyProductSummaryRow = {
  product_id: string | null;
  variant_id: string | null;
  product_name: string | null;
  sku: string | null;
  vendor: string | null;
  total_quantity_sold: string | null;
  gross_revenue: string | null;
  total_discount: string | null;
  net_revenue: string | null;
  average_discount_per_unit: string | null;
  discount_rate_percentage: string | null;
  free_quantity_estimate: string | null;
  paid_quantity_estimate: string | null;
  order_count: string;
  average_net_item_price: string | null;
};

type ShopifyProductSummaryTotalRow = {
  total_quantity_sold: string | null;
  total_product_discounts: string | null;
  free_quantity_estimate: string | null;
};

type ShopifyLineItemFieldRow = {
  field_name: string;
};

type ShopifyFunnelBasicRow = {
  abandoned_checkout_count: string;
  order_count: string;
  paid_order_count: string;
  cancelled_order_count: string;
  fulfilled_order_count: string;
  unfulfilled_order_count: string;
  total_revenue: string | null;
  average_order_value: string | null;
};

type StartupPackMetricsRow = {
  startup_pack_order_count: string | null;
  startup_pack_line_items_sold: string | null;
  startup_pack_gross_revenue: string | null;
  startup_pack_net_revenue: string | null;
  average_startup_pack_net_revenue_per_order: string | null;
  free_bottle_line_item_count: string | null;
  free_bottle_quantity: string | null;
  free_bottle_gross_value: string | null;
  free_bottle_discount_value: string | null;
  paid_items_net_revenue_in_startup_pack_orders: string | null;
  average_free_bottles_per_startup_pack_order: string | null;
};

type StartupPackProductRowResult = {
  product_name: string | null;
  vendor: string | null;
  quantity: string | null;
  gross_value: string | null;
  discount_value: string | null;
  net_revenue: string | null;
  order_count: string | null;
};

type StockMovementProductRow = {
  product_name: string | null;
  vendor: string | null;
  sku: string | null;
  total_quantity_moved: string | null;
  paid_quantity: string | null;
  free_quantity: string | null;
  free_quantity_percentage: string | null;
  gross_value: string | null;
  discount_value: string | null;
  net_revenue: string | null;
  average_net_revenue_per_unit: string | null;
  order_count: string | null;
};

type StockMovementGlobalRow = {
  total_quantity_moved: string | null;
  total_paid_quantity: string | null;
  total_free_quantity: string | null;
  free_quantity_percentage: string | null;
  total_gross_product_value: string | null;
  total_discount_value: string | null;
  total_net_product_revenue: string | null;
};

type AcquisitionEconomicsBasicRow = {
  users_count: string | null;
  quiz_count: string | null;
  ratings_count: string | null;
  shopify_customers_count: string | null;
  orders_count: string | null;
  paid_orders_count: string | null;
  cancelled_orders_count: string | null;
  abandoned_checkout_count: string | null;
  startup_pack_orders_count: string | null;
  box_orders_count: string | null;
  free_bottle_quantity: string | null;
  product_discount_value: string | null;
  total_revenue: string | null;
  average_order_value: string | null;
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

export type ShopifyProductsSummaryResult =
  | {
      ok: true;
      products: ShopifyProductSummary[];
      totalQuantitySold: number;
      totalProductDiscounts: number;
      freeQuantityEstimate: number;
      discountFieldsDetected: string[];
    }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type ShopifyFunnelBasicResult =
  | { ok: true; metrics: ShopifyFunnelBasicMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type BusinessOverviewResult =
  | { ok: true; metrics: BusinessOverviewMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type StartupPackAnalysisResult =
  | { ok: true; metrics: StartupPackAnalysisMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type StockMovementSummaryResult =
  | { ok: true; metrics: StockMovementSummaryMetrics }
  | { ok: false; reason: 'missing-url' | 'connection-failed' };

export type AcquisitionEconomicsBasicResult =
  | { ok: true; metrics: AcquisitionEconomicsBasicMetrics }
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

function rate(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return (numerator / denominator) * 100;
}

function ratio(numerator: number, denominator: number): number | null {
  if (denominator === 0) {
    return null;
  }

  return numerator / denominator;
}

function mapProductSummaryRow(row: ShopifyProductSummaryRow): ShopifyProductSummary {
  return {
    productId: row.product_id || 'Unknown product ID',
    variantId: row.variant_id || 'Unknown variant ID',
    productName: row.product_name || 'Unknown product',
    sku: row.sku || 'No SKU',
    vendor: row.vendor || 'Unknown vendor',
    totalQuantitySold: numberFromPg(row.total_quantity_sold),
    grossRevenue: numberFromPg(row.gross_revenue),
    totalDiscount: numberFromPg(row.total_discount),
    netRevenue: numberFromPg(row.net_revenue),
    averageDiscountPerUnit: numberFromPg(row.average_discount_per_unit),
    discountRatePercentage: numberFromPg(row.discount_rate_percentage),
    freeQuantityEstimate: numberFromPg(row.free_quantity_estimate),
    paidQuantityEstimate: numberFromPg(row.paid_quantity_estimate),
    orderCount: numberFromPg(row.order_count),
    averageNetItemPrice: numberFromPg(row.average_net_item_price),
  };
}

function mapStartupPackProductRow(row: StartupPackProductRowResult): StartupPackProductRow {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    quantity: numberFromPg(row.quantity),
    grossValue: numberFromPg(row.gross_value),
    discountValue: numberFromPg(row.discount_value),
    netRevenue: numberFromPg(row.net_revenue),
    orderCount: numberFromPg(row.order_count),
  };
}

function mapStockMovementProductRow(row: StockMovementProductRow): StockMovementProduct {
  return {
    productName: row.product_name || 'Unknown product',
    vendor: row.vendor || 'Unknown vendor',
    sku: row.sku || 'No SKU',
    totalQuantityMoved: numberFromPg(row.total_quantity_moved),
    paidQuantity: numberFromPg(row.paid_quantity),
    freeQuantity: numberFromPg(row.free_quantity),
    freeQuantityPercentage: row.free_quantity_percentage === null ? null : numberFromPg(row.free_quantity_percentage),
    grossValue: numberFromPg(row.gross_value),
    discountValue: numberFromPg(row.discount_value),
    netRevenue: numberFromPg(row.net_revenue),
    averageNetRevenuePerUnit: numberFromPg(row.average_net_revenue_per_unit),
    orderCount: numberFromPg(row.order_count),
  };
}

const startupPackTitleCondition = `
  title_text ILIKE '%starter pack%'
  OR title_text ILIKE '%startup pack%'
  OR title_text ILIKE '%start up pack%'
  OR title_text ILIKE '%calibration kit%'
  OR title_text ILIKE '%taste kit%'
  OR title_text ILIKE '%tasting kit%'
`;

const boxTitleCondition = `
  title_text ILIKE '%subscription%'
  OR title_text ILIKE '%smart box%'
  OR title_text ILIKE '%box%'
`;

const lineItemsBaseCte = `
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

export async function getShopifyProductsSummary(): Promise<ShopifyProductsSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const productsResult = await pool.query<ShopifyProductSummaryRow>(`
      WITH order_items AS (
        SELECT
          id AS order_id,
          item,
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
          order_id,
          item,
          quantity_value,
          price_value,
          discount_value,
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
          END AS paid_quantity
        FROM order_items
      )
      SELECT
        NULLIF(item->>'product_id', '') AS product_id,
        NULLIF(item->>'variant_id', '') AS variant_id,
        COALESCE(NULLIF(item->>'title', ''), NULLIF(item->>'name', ''), 'Unknown product') AS product_name,
        COALESCE(NULLIF(item->>'sku', ''), 'No SKU') AS sku,
        COALESCE(NULLIF(item->>'vendor', ''), 'Unknown vendor') AS vendor,
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_sold,
        COALESCE(SUM(gross_value), 0)::text AS gross_revenue,
        COALESCE(SUM(discount_value), 0)::text AS total_discount,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COALESCE(SUM(discount_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_discount_per_unit,
        COALESCE((SUM(discount_value) / NULLIF(SUM(gross_value), 0)) * 100, 0)::text AS discount_rate_percentage,
        COALESCE(SUM(free_quantity), 0)::text AS free_quantity_estimate,
        COALESCE(SUM(paid_quantity), 0)::text AS paid_quantity_estimate,
        COUNT(DISTINCT order_id)::text AS order_count,
        COALESCE(SUM(net_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_net_item_price
      FROM enriched_items
      GROUP BY product_id, variant_id, product_name, sku, vendor
      ORDER BY SUM(net_value) DESC
      LIMIT 50
    `);
    const totalResult = await pool.query<ShopifyProductSummaryTotalRow>(`
      WITH order_items AS (
        SELECT
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
      )
      SELECT
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_sold,
        COALESCE(SUM(discount_value), 0)::text AS total_product_discounts,
        COALESCE(
          SUM(
            CASE
              WHEN quantity_value * price_value > 0
                AND discount_value / NULLIF(quantity_value * price_value, 0) >= 0.999
              THEN quantity_value
              ELSE 0
            END
          ),
          0
        )::text AS free_quantity_estimate
      FROM order_items
    `);
    const detectedFieldsResult = await pool.query<ShopifyLineItemFieldRow>(`
      SELECT DISTINCT field_name
      FROM shopify.orders
      CROSS JOIN LATERAL jsonb_array_elements(
        CASE
          WHEN line_items IS NULL THEN '[]'::jsonb
          WHEN jsonb_typeof(line_items::jsonb) = 'array' THEN line_items::jsonb
          ELSE '[]'::jsonb
        END
      ) AS item
      CROSS JOIN LATERAL jsonb_object_keys(item) AS keys(field_name)
      WHERE field_name = ANY($1::text[])
      ORDER BY field_name
    `, [
      [
        'total_discount',
        'discount_allocations',
        'discounted_price',
        'discounted_total',
        'price',
        'quantity',
        'gift_card',
        'product_id',
        'variant_id',
        'title',
        'name',
        'sku',
        'vendor',
      ],
    ]);
    const totalSummary = totalResult.rows[0];

    return {
      ok: true,
      products: productsResult.rows.map(mapProductSummaryRow),
      totalQuantitySold: numberFromPg(totalSummary?.total_quantity_sold),
      totalProductDiscounts: numberFromPg(totalSummary?.total_product_discounts),
      freeQuantityEstimate: numberFromPg(totalSummary?.free_quantity_estimate),
      discountFieldsDetected: detectedFieldsResult.rows.map((row) => row.field_name),
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify products summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getShopifyFunnelBasic(): Promise<ShopifyFunnelBasicResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<ShopifyFunnelBasicRow>(`
      WITH orders_summary AS (
        SELECT
          COUNT(*)::text AS order_count,
          COUNT(*) FILTER (WHERE lower(coalesce(financial_status::text, '')) = 'paid')::text AS paid_order_count,
          COUNT(*) FILTER (WHERE cancelled_at IS NOT NULL)::text AS cancelled_order_count,
          COUNT(*) FILTER (WHERE lower(coalesce(fulfillment_status::text, '')) = 'fulfilled')::text AS fulfilled_order_count,
          COUNT(*) FILTER (
            WHERE fulfillment_status IS NULL OR lower(coalesce(fulfillment_status::text, '')) <> 'fulfilled'
          )::text AS unfulfilled_order_count,
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
            AVG(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )::text AS average_order_value
        FROM shopify.orders
      ),
      abandoned_summary AS (
        SELECT COUNT(*)::text AS abandoned_checkout_count
        FROM shopify.abandoned_checkouts
      )
      SELECT
        abandoned_summary.abandoned_checkout_count,
        orders_summary.order_count,
        orders_summary.paid_order_count,
        orders_summary.cancelled_order_count,
        orders_summary.fulfilled_order_count,
        orders_summary.unfulfilled_order_count,
        orders_summary.total_revenue,
        orders_summary.average_order_value
      FROM orders_summary
      CROSS JOIN abandoned_summary
    `);
    const row = result.rows[0];
    const abandonedCheckoutCount = numberFromPg(row?.abandoned_checkout_count);
    const orderCount = numberFromPg(row?.order_count);
    const paidOrderCount = numberFromPg(row?.paid_order_count);
    const cancelledOrderCount = numberFromPg(row?.cancelled_order_count);
    const fulfilledOrderCount = numberFromPg(row?.fulfilled_order_count);

    return {
      ok: true,
      metrics: {
        abandonedCheckoutCount,
        orderCount,
        paidOrderCount,
        cancelledOrderCount,
        fulfilledOrderCount,
        unfulfilledOrderCount: numberFromPg(row?.unfulfilled_order_count),
        abandonmentToOrderRatio: ratio(abandonedCheckoutCount, orderCount),
        paidOrderRate: rate(paidOrderCount, orderCount),
        cancelledOrderRate: rate(cancelledOrderCount, orderCount),
        fulfilledOrderRate: rate(fulfilledOrderCount, orderCount),
        totalRevenue: numberFromPg(row?.total_revenue),
        averageOrderValue: numberFromPg(row?.average_order_value),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Shopify funnel basic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStartupPackAnalysis(): Promise<StartupPackAnalysisResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const metricsResult = await pool.query<StartupPackMetricsRow>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      ),
      startup_items AS (
        SELECT enriched_items.*
        FROM enriched_items
        INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      )
      SELECT
        (SELECT COUNT(*) FROM startup_orders)::text AS startup_pack_order_count,
        COALESCE(SUM(quantity_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_line_items_sold,
        COALESCE(SUM(gross_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_gross_revenue,
        COALESCE(SUM(net_value) FILTER (WHERE is_startup_pack), 0)::text AS startup_pack_net_revenue,
        COALESCE(
          SUM(net_value) FILTER (WHERE is_startup_pack) / NULLIF((SELECT COUNT(*) FROM startup_orders), 0),
          0
        )::text AS average_startup_pack_net_revenue_per_order,
        COUNT(*) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack)::text AS free_bottle_line_item_count,
        COALESCE(SUM(free_quantity) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_quantity,
        COALESCE(SUM(gross_value) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_gross_value,
        COALESCE(SUM(discount_value) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack), 0)::text AS free_bottle_discount_value,
        COALESCE(SUM(net_value) FILTER (WHERE free_quantity = 0), 0)::text AS paid_items_net_revenue_in_startup_pack_orders,
        COALESCE(
          SUM(free_quantity) FILTER (WHERE free_quantity > 0 AND NOT is_startup_pack)
          / NULLIF((SELECT COUNT(*) FROM startup_orders), 0),
          0
        )::text AS average_free_bottles_per_startup_pack_order
      FROM startup_items
    `);
    const freeByQuantityResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      )
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(free_quantity), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT enriched_items.order_id)::text AS order_count
      FROM enriched_items
      INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      WHERE free_quantity > 0 AND NOT is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(free_quantity) DESC
      LIMIT 10
    `);
    const freeByGrossValueResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id
        FROM enriched_items
        WHERE is_startup_pack
      )
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(free_quantity), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT enriched_items.order_id)::text AS order_count
      FROM enriched_items
      INNER JOIN startup_orders ON startup_orders.order_id = enriched_items.order_id
      WHERE free_quantity > 0 AND NOT is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(gross_value) DESC
      LIMIT 10
    `);
    const paidPackProductsResult = await pool.query<StartupPackProductRowResult>(`
      ${lineItemsBaseCte}
      SELECT
        product_name,
        vendor,
        COALESCE(SUM(quantity_value), 0)::text AS quantity,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COUNT(DISTINCT order_id)::text AS order_count
      FROM enriched_items
      WHERE is_startup_pack
      GROUP BY product_name, vendor
      ORDER BY SUM(net_value) DESC
      LIMIT 10
    `);
    const metrics = metricsResult.rows[0];

    return {
      ok: true,
      metrics: {
        startupPackOrderCount: numberFromPg(metrics?.startup_pack_order_count),
        startupPackLineItemsSold: numberFromPg(metrics?.startup_pack_line_items_sold),
        startupPackGrossRevenue: numberFromPg(metrics?.startup_pack_gross_revenue),
        startupPackNetRevenue: numberFromPg(metrics?.startup_pack_net_revenue),
        averageStartupPackNetRevenuePerOrder:
          metrics?.average_startup_pack_net_revenue_per_order === null
            ? null
            : numberFromPg(metrics?.average_startup_pack_net_revenue_per_order),
        freeBottleLineItemCount: numberFromPg(metrics?.free_bottle_line_item_count),
        freeBottleQuantity: numberFromPg(metrics?.free_bottle_quantity),
        freeBottleGrossValue: numberFromPg(metrics?.free_bottle_gross_value),
        freeBottleDiscountValue: numberFromPg(metrics?.free_bottle_discount_value),
        paidItemsNetRevenueInStartupPackOrders: numberFromPg(
          metrics?.paid_items_net_revenue_in_startup_pack_orders,
        ),
        averageFreeBottlesPerStartupPackOrder:
          metrics?.average_free_bottles_per_startup_pack_order === null
            ? null
            : numberFromPg(metrics?.average_free_bottles_per_startup_pack_order),
        topFreeWinesByQuantity: freeByQuantityResult.rows.map(mapStartupPackProductRow),
        topFreeWinesByGrossValue: freeByGrossValueResult.rows.map(mapStartupPackProductRow),
        topPaidPackProducts: paidPackProductsResult.rows.map(mapStartupPackProductRow),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Startup Pack analysis failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getStockMovementSummary(): Promise<StockMovementSummaryResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const pool = getPool(databaseUrl);
    const productsResult = await pool.query<StockMovementProductRow>(`
      ${lineItemsBaseCte}
      SELECT
        product_name,
        vendor,
        sku,
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(paid_quantity), 0)::text AS paid_quantity,
        COALESCE(SUM(free_quantity), 0)::text AS free_quantity,
        COALESCE((SUM(free_quantity) / NULLIF(SUM(quantity_value), 0)) * 100, 0)::text AS free_quantity_percentage,
        COALESCE(SUM(gross_value), 0)::text AS gross_value,
        COALESCE(SUM(discount_value), 0)::text AS discount_value,
        COALESCE(SUM(net_value), 0)::text AS net_revenue,
        COALESCE(SUM(net_value) / NULLIF(SUM(quantity_value), 0), 0)::text AS average_net_revenue_per_unit,
        COUNT(DISTINCT order_id)::text AS order_count
      FROM enriched_items
      GROUP BY product_name, vendor, sku
      ORDER BY SUM(quantity_value) DESC
      LIMIT 100
    `);
    const globalResult = await pool.query<StockMovementGlobalRow>(`
      ${lineItemsBaseCte}
      SELECT
        COALESCE(SUM(quantity_value), 0)::text AS total_quantity_moved,
        COALESCE(SUM(paid_quantity), 0)::text AS total_paid_quantity,
        COALESCE(SUM(free_quantity), 0)::text AS total_free_quantity,
        COALESCE((SUM(free_quantity) / NULLIF(SUM(quantity_value), 0)) * 100, 0)::text AS free_quantity_percentage,
        COALESCE(SUM(gross_value), 0)::text AS total_gross_product_value,
        COALESCE(SUM(discount_value), 0)::text AS total_discount_value,
        COALESCE(SUM(net_value), 0)::text AS total_net_product_revenue
      FROM enriched_items
    `);
    const global = globalResult.rows[0];

    return {
      ok: true,
      metrics: {
        totalQuantityMoved: numberFromPg(global?.total_quantity_moved),
        totalPaidQuantity: numberFromPg(global?.total_paid_quantity),
        totalFreeQuantity: numberFromPg(global?.total_free_quantity),
        freeQuantityPercentage:
          global?.free_quantity_percentage === null
            ? null
            : numberFromPg(global?.free_quantity_percentage),
        totalGrossProductValue: numberFromPg(global?.total_gross_product_value),
        totalDiscountValue: numberFromPg(global?.total_discount_value),
        totalNetProductRevenue: numberFromPg(global?.total_net_product_revenue),
        products: productsResult.rows.map(mapStockMovementProductRow),
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Stock movement summary failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getAcquisitionEconomicsBasic(): Promise<AcquisitionEconomicsBasicResult> {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    return { ok: false, reason: 'missing-url' };
  }

  try {
    const result = await getPool(databaseUrl).query<AcquisitionEconomicsBasicRow>(`
      ${lineItemsBaseCte},
      startup_orders AS (
        SELECT DISTINCT order_id FROM enriched_items WHERE is_startup_pack
      ),
      box_orders AS (
        SELECT DISTINCT order_id FROM enriched_items WHERE is_box
      ),
      movement AS (
        SELECT
          COALESCE(SUM(free_quantity), 0)::text AS free_bottle_quantity,
          COALESCE(SUM(discount_value), 0)::text AS product_discount_value
        FROM enriched_items
      )
      SELECT
        (SELECT COUNT(*) FROM public.users)::text AS users_count,
        (SELECT COUNT(*) FROM public.quizz)::text AS quiz_count,
        (SELECT COUNT(*) FROM public.ratings)::text AS ratings_count,
        (SELECT COUNT(*) FROM shopify.customers)::text AS shopify_customers_count,
        (SELECT COUNT(*) FROM shopify.orders)::text AS orders_count,
        (
          SELECT COUNT(*)
          FROM shopify.orders
          WHERE lower(coalesce(financial_status::text, '')) = 'paid'
        )::text AS paid_orders_count,
        (SELECT COUNT(*) FROM shopify.orders WHERE cancelled_at IS NOT NULL)::text AS cancelled_orders_count,
        (SELECT COUNT(*) FROM shopify.abandoned_checkouts)::text AS abandoned_checkout_count,
        (SELECT COUNT(*) FROM startup_orders)::text AS startup_pack_orders_count,
        (SELECT COUNT(*) FROM box_orders)::text AS box_orders_count,
        movement.free_bottle_quantity,
        movement.product_discount_value,
        (
          SELECT COALESCE(
            SUM(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )
          FROM shopify.orders
        )::text AS total_revenue,
        (
          SELECT COALESCE(
            AVG(
              CASE
                WHEN total_price::text ~ '^-?[0-9]+(\\.[0-9]+)?$' THEN total_price::text::numeric
                ELSE NULL
              END
            ),
            0
          )
          FROM shopify.orders
        )::text AS average_order_value
      FROM movement
    `);
    const row = result.rows[0];
    const usersCount = numberFromPg(row?.users_count);
    const quizCount = numberFromPg(row?.quiz_count);
    const ratingsCount = numberFromPg(row?.ratings_count);
    const ordersCount = numberFromPg(row?.orders_count);
    const abandonedCheckoutCount = numberFromPg(row?.abandoned_checkout_count);
    const startupPackOrdersCount = numberFromPg(row?.startup_pack_orders_count);
    const boxOrdersCount = numberFromPg(row?.box_orders_count);
    const freeBottleQuantity = numberFromPg(row?.free_bottle_quantity);
    const potentialIssues: string[] = [];

    if (quizCount > 0 && ordersCount / quizCount < 0.2) {
      potentialIssues.push('Quiz-to-order conversion may need attention.');
    }

    if (abandonedCheckoutCount > ordersCount) {
      potentialIssues.push('Abandoned checkouts exceed completed orders.');
    }

    if (freeBottleQuantity > 0 && startupPackOrdersCount === 0) {
      potentialIssues.push('Free stock movement detected outside Startup Pack logic.');
    }

    if (usersCount > 0 && ratingsCount / usersCount < 1) {
      potentialIssues.push('Most users have not rated at least one wine yet.');
    }

    if (boxOrdersCount === 0 && ratingsCount > 0) {
      potentialIssues.push('Rated users may not yet be converting to Smart Box.');
    }

    return {
      ok: true,
      metrics: {
        usersCount,
        quizCount,
        ratingsCount,
        shopifyCustomersCount:
          row?.shopify_customers_count === null ? null : numberFromPg(row?.shopify_customers_count),
        ordersCount,
        paidOrdersCount: numberFromPg(row?.paid_orders_count),
        cancelledOrdersCount: numberFromPg(row?.cancelled_orders_count),
        abandonedCheckoutCount,
        startupPackOrdersCount,
        boxOrdersCount,
        freeBottleQuantity,
        productDiscountValue: numberFromPg(row?.product_discount_value),
        totalRevenue: numberFromPg(row?.total_revenue),
        averageOrderValue: numberFromPg(row?.average_order_value),
        ratingsPerUser: ratio(ratingsCount, usersCount),
        ratingsPerOrder: ratio(ratingsCount, ordersCount),
        quizToOrderRatio: ratio(ordersCount, quizCount),
        abandonedCheckoutToOrderRatio: ratio(abandonedCheckoutCount, ordersCount),
        potentialIssues:
          potentialIssues.length > 0 ? potentialIssues : ['No major acquisition issue detected.'],
      },
    };
  } catch (error) {
    const errorCode =
      typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;

    console.error('Acquisition economics basic failed', { code: errorCode });
    return { ok: false, reason: 'connection-failed' };
  }
}

export async function getBusinessOverview(): Promise<BusinessOverviewResult> {
  const [ordersResult, productsResult, funnelResult, startupPackResult, stockMovementResult] =
    await Promise.all([
      getShopifyOrdersSummary(),
      getShopifyProductsSummary(),
      getShopifyFunnelBasic(),
      getStartupPackAnalysis(),
      getStockMovementSummary(),
    ]);

  if (!ordersResult.ok) {
    return ordersResult;
  }

  if (!productsResult.ok) {
    return productsResult;
  }

  if (!funnelResult.ok) {
    return funnelResult;
  }

  if (!startupPackResult.ok) {
    return startupPackResult;
  }

  if (!stockMovementResult.ok) {
    return stockMovementResult;
  }

  const potentialIssues: string[] = [];

  if ((funnelResult.metrics.cancelledOrderRate ?? 0) > 10) {
    potentialIssues.push('Cancelled orders may be high.');
  }

  if (funnelResult.metrics.abandonedCheckoutCount > funnelResult.metrics.orderCount) {
    potentialIssues.push('Abandoned checkouts exceed completed orders.');
  }

  if ((funnelResult.metrics.paidOrderRate ?? 100) < 90) {
    potentialIssues.push('Paid order rate may need attention.');
  }

  if (productsResult.freeQuantityEstimate > 0) {
    potentialIssues.push(
      'Some products were included for free via discounts. Stock movement may exceed paid product sales.',
    );
  }

  const averageFreeBottles = startupPackResult.metrics.averageFreeBottlesPerStartupPackOrder;
  if (
    startupPackResult.metrics.startupPackOrderCount > 0 &&
    (averageFreeBottles === null || averageFreeBottles < 3 || averageFreeBottles > 4)
  ) {
    potentialIssues.push('Average free bottles per Startup Pack is outside the expected 3 to 4 range.');
  }

  if ((stockMovementResult.metrics.freeQuantityPercentage ?? 0) > 50) {
    potentialIssues.push(
      'A large share of stock movement is discounted/free. Check acquisition economics.',
    );
  }

  return {
    ok: true,
    metrics: {
      totalRevenue: ordersResult.metrics.totalRevenue,
      totalOrders: ordersResult.metrics.totalOrders,
      averageOrderValue: ordersResult.metrics.averageOrderValue,
      paidOrders: ordersResult.metrics.paidOrders,
      cancelledOrders: ordersResult.metrics.cancelledOrders,
      abandonedCheckoutCount: funnelResult.metrics.abandonedCheckoutCount,
      topProducts: productsResult.products.slice(0, 5),
      totalQuantitySold: productsResult.totalQuantitySold,
      totalProductDiscounts: productsResult.totalProductDiscounts,
      freeQuantityEstimate: productsResult.freeQuantityEstimate,
      totalLineItems: ordersResult.metrics.totalLineItemsCount,
      startupPackOrders: startupPackResult.metrics.startupPackOrderCount,
      averageFreeBottlesPerStartupPackOrder:
        startupPackResult.metrics.averageFreeBottlesPerStartupPackOrder,
      paidQuantityEstimate: stockMovementResult.metrics.totalPaidQuantity,
      freeQuantityPercentage: stockMovementResult.metrics.freeQuantityPercentage,
      potentialIssues:
        potentialIssues.length > 0 ? potentialIssues : ['No major Shopify issue detected.'],
    },
  };
}
