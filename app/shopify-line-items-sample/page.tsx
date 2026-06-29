import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getShopifyLineItemsSample, type ShopifyLineItemSafeField } from '@/lib/db';

export const runtime = 'nodejs';

const safeFields: ShopifyLineItemSafeField[] = [
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

function formatSafeValue(value: string | number | boolean | null | undefined): string {
  if (value === undefined) {
    return '—';
  }

  if (value === null) {
    return 'null';
  }

  return String(value);
}

export default async function ShopifyLineItemsSamplePage() {
  await connection();
  const result = await getShopifyLineItemsSample();
  const sampledOrderCount = result.ok ? result.orders.length : 0;
  const message = result.ok
    ? sampledOrderCount === 0
      ? 'No orders with line_items were found in the limited sample.'
      : `${sampledOrderCount} order sample${sampledOrderCount === 1 ? '' : 's'} loaded from shopify.orders.`
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not load the line_items sample. Check DATABASE_URL, database availability, SSL settings, and network access.';

  return (
    <DashboardLayout>
      <TopBar
        title="Shopify Line Items Sample"
        subtitle="Limited read-only sample of shopify.orders.line_items structure"
      />

      <PageSection>
        <SectionTitle sub="Safe product fields only">Line Items JSON Sample</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Limited sample. Customer personal data is not displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
          {result.ok && result.safeFieldsFound.length > 0 ? (
            <p style={{ margin: '8px 0 0', color: '#2D6A4F', fontSize: 13, lineHeight: 1.5 }}>
              Safe fields found: {result.safeFieldsFound.join(', ')}
            </p>
          ) : null}
        </Card>

        {result.ok && result.orders.length > 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {result.orders.map((order, index) => (
              <Card key={order.orderId} style={{ padding: 0, overflow: 'hidden' }}>
                <div
                  style={{
                    padding: '16px 18px',
                    borderBottom: '1px solid #E8E6E1',
                  }}
                >
                  <div style={{ color: '#1A1A1A', fontSize: 14, fontWeight: 700 }}>
                    Order sample {index + 1}
                  </div>
                  <div
                    style={{
                      color: '#6B6B6B',
                      display: 'grid',
                      gap: 6,
                      gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                      marginTop: 10,
                      fontSize: 12,
                    }}
                  >
                    <div>Order id: {order.orderId}</div>
                    <div>Created at: {order.createdAt ?? '—'}</div>
                    <div>line_items type: {order.lineItemsType}</div>
                    <div>
                      Line item count:{' '}
                      {order.lineItemCount === null ? 'not an array' : order.lineItemCount}
                    </div>
                  </div>
                  {order.parseError ? (
                    <p style={{ margin: '10px 0 0', color: '#C0392B', fontSize: 13 }}>
                      line_items is stored as a string, but parsing failed.
                    </p>
                  ) : null}
                </div>

                {order.lineItems.length > 0 ? (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                      <thead>
                        <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                          <th style={{ padding: '10px 14px', fontWeight: 700 }}>Item</th>
                          {safeFields.map((field) => (
                            <th key={field} style={{ padding: '10px 14px', fontWeight: 700 }}>
                              {field}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {order.lineItems.map((lineItem, lineItemIndex) => (
                          <tr key={lineItemIndex} style={{ borderTop: '1px solid #E8E6E1' }}>
                            <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>
                              {lineItemIndex + 1}
                            </td>
                            {safeFields.map((field) => (
                              <td
                                key={field}
                                style={{
                                  padding: '10px 14px',
                                  color: field === 'title' || field === 'name' ? '#1A1A1A' : '#6B6B6B',
                                  fontWeight: field === 'title' || field === 'name' ? 600 : 400,
                                }}
                              >
                                {formatSafeValue(lineItem[field])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ padding: '14px 18px', color: '#6B6B6B', fontSize: 13 }}>
                    No line items were available to display for this sample.
                  </div>
                )}
              </Card>
            ))}
          </div>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
