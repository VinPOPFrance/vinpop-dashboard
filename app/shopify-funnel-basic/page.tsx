import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getShopifyFunnelBasic } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number): string {
  return value.toLocaleString('en-US', { maximumFractionDigits: 0 });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatPercent(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

function formatRatio(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return value.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default async function ShopifyFunnelBasicPage() {
  await connection();
  const result = await getShopifyFunnelBasic();
  const metrics = result.ok ? result.metrics : null;
  const message = result.ok
    ? 'Basic Shopify-only funnel metrics loaded from aggregate queries.'
    : result.reason === 'missing-url'
      ? 'DATABASE_URL is not configured on the server. Add it to .env.local locally and to Vercel environment variables in production.'
      : 'Could not load Shopify funnel aggregates. Check DATABASE_URL, database availability, SSL settings, and network access.';
  const cards = metrics
    ? [
        { label: 'Abandoned checkouts', value: formatNumber(metrics.abandonedCheckoutCount) },
        { label: 'Orders', value: formatNumber(metrics.orderCount) },
        { label: 'Paid orders', value: formatNumber(metrics.paidOrderCount) },
        { label: 'Cancelled orders', value: formatNumber(metrics.cancelledOrderCount) },
        { label: 'Fulfilled orders', value: formatNumber(metrics.fulfilledOrderCount) },
        { label: 'Unfulfilled orders', value: formatNumber(metrics.unfulfilledOrderCount) },
        { label: 'Abandonment/order ratio', value: formatRatio(metrics.abandonmentToOrderRatio) },
        { label: 'Paid order rate', value: formatPercent(metrics.paidOrderRate) },
        { label: 'Cancelled order rate', value: formatPercent(metrics.cancelledOrderRate) },
        { label: 'Fulfilled order rate', value: formatPercent(metrics.fulfilledOrderRate) },
        { label: 'Total revenue', value: formatMoney(metrics.totalRevenue) },
        { label: 'Average order value', value: formatMoney(metrics.averageOrderValue) },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar
        title="Shopify Funnel"
        subtitle="Basic Shopify-only funnel and order health metrics"
      />

      <PageSection>
        <SectionTitle sub="Basic Shopify-only funnel">Funnel Health</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. No individual checkouts, orders, or customer data are displayed.
          </p>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            {message}
          </p>
        </Card>

        {metrics ? (
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
              gap: 12,
            }}
          >
            {cards.map((card) => (
              <Card key={card.label}>
                <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>
                  {card.label}
                </div>
                <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>
                  {card.value}
                </div>
              </Card>
            ))}
          </div>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
