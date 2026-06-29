import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { searchShopifyTableMetadata, type ShopifyMetadataSearchTable } from '@/lib/db';

export const runtime = 'nodejs';

function getLikelyCandidates(tables: ShopifyMetadataSearchTable[]): ShopifyMetadataSearchTable[] {
  return tables.filter((table) => {
    const tableName = table.tableName.toLowerCase();
    const columnNames = table.columns.map((column) => column.columnName.toLowerCase());
    const hasOrderName = tableName.includes('order');
    const hasLineItemName =
      tableName.includes('line') || tableName.includes('item') || tableName.includes('variant');
    const hasProductColumns = columnNames.some(
      (columnName) =>
        columnName.includes('product') ||
        columnName.includes('variant') ||
        columnName.includes('line') ||
        columnName.includes('item'),
    );

    return hasOrderName && (hasLineItemName || hasProductColumns);
  });
}

export default async function ShopifyTableSearchPage() {
  await connection();
  const result = await searchShopifyTableMetadata();

  const candidates = result.ok ? getLikelyCandidates(result.tables) : [];
  const message = result.ok
    ? result.tables.length === 0
      ? 'No Shopify tables matched the metadata search keywords.'
      : `Found ${result.tables.length} Shopify table${result.tables.length === 1 ? '' : 's'} matching order, line, item, product, or variant.`
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not search Shopify metadata. Check DATABASE_URL, database availability, SSL settings, and network access.';

  return (
    <DashboardLayout>
      <TopBar
        title="Shopify Table Search"
        subtitle="Metadata-only search for possible order line item tables"
      />

      <PageSection>
        <SectionTitle sub="Shopify metadata only">Order Line Item Table Search</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Metadata search only. No table rows are queried.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
          {candidates.length > 0 ? (
            <p style={{ margin: '8px 0 0', color: '#2D6A4F', fontSize: 13, lineHeight: 1.5 }}>
              Likely candidates:{' '}
              {candidates.map((table) => `${table.schemaName}.${table.tableName}`).join(', ')}
            </p>
          ) : null}
        </Card>

        {result.ok && result.tables.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {result.tables.map((table) => (
              <Card key={`${table.schemaName}.${table.tableName}`} style={{ padding: 0 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 12,
                    padding: '16px 18px',
                    borderBottom: '1px solid #E8E6E1',
                  }}
                >
                  <div>
                    <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                      {table.schemaName}.{table.tableName}
                    </div>
                    <div style={{ color: '#9B9B9B', fontSize: 12, marginTop: 3 }}>
                      {table.columns.length} column{table.columns.length === 1 ? '' : 's'}
                    </div>
                  </div>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                    <thead>
                      <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Schema</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Table</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Column</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Data type</th>
                        <th style={{ padding: '10px 14px', fontWeight: 700 }}>Nullable</th>
                      </tr>
                    </thead>
                    <tbody>
                      {table.columns.map((column) => (
                        <tr key={column.columnName} style={{ borderTop: '1px solid #E8E6E1' }}>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                            {table.schemaName}
                          </td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                            {table.tableName}
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
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
