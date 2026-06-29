import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getDatabaseTableSchemas, type DatabaseColumnInfo } from '@/lib/db';

export const runtime = 'nodejs';

const usefulColumnNames = [
  'id',
  'name',
  'email',
  'customer',
  'created_at',
  'processed_at',
  'cancelled_at',
  'financial_status',
  'fulfillment_status',
  'currency',
  'total_price',
  'subtotal_price',
  'total_tax',
  'line_items',
  'discount_codes',
  'shipping_lines',
  'tags',
];

const usefulColumnNameSet = new Set(usefulColumnNames);

function isUsefulColumn(column: DatabaseColumnInfo): boolean {
  return usefulColumnNameSet.has(column.columnName);
}

export default async function ShopifyOrdersSchemaPage() {
  await connection();
  const result = await getDatabaseTableSchemas([{ schemaName: 'shopify', tableName: 'orders' }]);
  const ordersTable = result.ok ? result.tables[0] : null;
  const usefulColumnsFound =
    ordersTable?.columns.filter((column) => isUsefulColumn(column)).map((column) => column.columnName) ??
    [];
  const usefulColumnsMissing = usefulColumnNames.filter(
    (columnName) => !usefulColumnsFound.includes(columnName),
  );
  const message = result.ok
    ? ordersTable?.status === 'found'
      ? `${ordersTable.columns.length} columns found in shopify.orders.`
      : 'shopify.orders was not found in information_schema.columns.'
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not inspect shopify.orders metadata. Check DATABASE_URL, database availability, SSL settings, and network access.';

  return (
    <DashboardLayout>
      <TopBar
        title="Shopify Orders Schema"
        subtitle="Metadata-only column inventory for shopify.orders"
      />

      <PageSection>
        <SectionTitle sub="Columns and types only">shopify.orders Structure</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Metadata only. No order rows or customer data are displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
          {ordersTable?.status === 'found' ? (
            <>
              <p style={{ margin: '8px 0 0', color: '#2D6A4F', fontSize: 13, lineHeight: 1.5 }}>
                Useful columns found: {usefulColumnsFound.join(', ') || 'none'}
              </p>
              <p style={{ margin: '8px 0 0', color: '#B45309', fontSize: 13, lineHeight: 1.5 }}>
                Useful columns missing: {usefulColumnsMissing.join(', ') || 'none'}
              </p>
            </>
          ) : null}
        </Card>

        {ordersTable?.status === 'found' ? (
          <Card style={{ padding: 0, overflow: 'hidden' }}>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Position</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Column</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Data type</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Nullable</th>
                    <th style={{ padding: '10px 14px', fontWeight: 700 }}>Marked</th>
                  </tr>
                </thead>
                <tbody>
                  {ordersTable.columns.map((column) => {
                    const useful = isUsefulColumn(column);

                    return (
                      <tr
                        key={column.columnName}
                        style={{
                          background: useful ? '#F8F0F1' : '#FFFFFF',
                          borderTop: '1px solid #E8E6E1',
                        }}
                      >
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                          {column.ordinalPosition}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>
                          {column.columnName}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                          {column.dataType}
                        </td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                          {column.isNullable}
                        </td>
                        <td style={{ padding: '10px 14px' }}>
                          {useful ? (
                            <span
                              style={{
                                background: '#EAF4EF',
                                borderRadius: 999,
                                color: '#2D6A4F',
                                display: 'inline-block',
                                fontSize: 11,
                                fontWeight: 700,
                                padding: '4px 9px',
                                textTransform: 'uppercase',
                              }}
                            >
                              useful
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
