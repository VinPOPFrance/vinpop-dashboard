import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getShopifyOrdersSummary } from '@/lib/db';

export const runtime = 'nodejs';

const diagnosticFields = [
  'shopify.orders.total_price',
  'shopify.orders.subtotal_price',
  'shopify.orders.total_tax',
  'shopify.orders.financial_status',
  'shopify.orders.fulfillment_status',
  'shopify.orders.cancelled_at',
  'shopify.orders.line_items',
];

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDecimal(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(value: string | null): string {
  if (!value) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeZone: 'UTC',
  }).format(new Date(value));
}

export default async function ShopifyOrdersSummaryPage() {
  await connection();
  const result = await getShopifyOrdersSummary();
  const metrics = result.ok ? result.metrics : null;
  const message = result.ok
    ? 'Aggregate Shopify order metrics loaded from shopify.orders.'
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not load Shopify order aggregates. Check DATABASE_URL, database availability, SSL settings, and network access.';
  const kpis = metrics
    ? [
        { label: 'Total orders', value: formatNumber(metrics.totalOrders) },
        { label: 'Paid orders', value: formatNumber(metrics.paidOrders) },
        { label: 'Cancelled orders', value: formatNumber(metrics.cancelledOrders) },
        { label: 'Fulfilled orders', value: formatNumber(metrics.fulfilledOrders) },
        { label: 'Unfulfilled orders', value: formatNumber(metrics.unfulfilledOrders) },
        { label: 'Total revenue', value: formatMoney(metrics.totalRevenue) },
        { label: 'Subtotal revenue', value: formatMoney(metrics.subtotalRevenue) },
        { label: 'Total tax', value: formatMoney(metrics.totalTax) },
        { label: 'Average order value', value: formatMoney(metrics.averageOrderValue) },
        {
          label: 'Total line items',
          value:
            metrics.totalLineItemsCount === null
              ? 'Unavailable'
              : formatNumber(metrics.totalLineItemsCount),
        },
        {
          label: 'Avg line items/order',
          value: formatDecimal(metrics.averageLineItemsPerOrder),
        },
        { label: 'First order date', value: formatDate(metrics.firstOrderDate) },
        { label: 'Latest order date', value: formatDate(metrics.latestOrderDate) },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar
        title="Shopify Orders Summary"
        subtitle="Aggregate order metrics from shopify.orders"
      />

      <PageSection>
        <SectionTitle sub="No row-level order data">Order Aggregate KPIs</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. No individual orders or customer data are displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
          {metrics && !metrics.lineItemsCountWorked ? (
            <p style={{ margin: '8px 0 0', color: '#B45309', fontSize: 13, lineHeight: 1.5 }}>
              Line items count could not be calculated safely. Other aggregate metrics are still
              shown.
            </p>
          ) : null}
        </Card>

        {metrics ? (
          <>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
                gap: 12,
              }}
            >
              {kpis.map((kpi) => (
                <Card key={kpi.label}>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>
                    {kpi.label}
                  </div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>
                    {kpi.value}
                  </div>
                </Card>
              ))}
            </div>

            <PageSection>
              <SectionTitle sub="Aggregate source fields">Diagnostics</SectionTitle>
              <Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {diagnosticFields.map((field) => (
                    <code
                      key={field}
                      style={{
                        background: '#F5F4F0',
                        border: '1px solid #E8E6E1',
                        borderRadius: 6,
                        color: '#1A1A1A',
                        display: 'inline-block',
                        fontSize: 12,
                        padding: '6px 8px',
                        width: 'fit-content',
                      }}
                    >
                      {field}
                    </code>
                  ))}
                </div>
              </Card>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
