import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getAcquisitionEconomicsBasic } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  if (value === null) {
    return 'Unavailable';
  }

  return value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value: number): string {
  return value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default async function AcquisitionEconomicsBasicPage() {
  await connection();
  const result = await getAcquisitionEconomicsBasic();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        { label: 'Users', value: formatNumber(metrics.usersCount) },
        { label: 'Quizzes', value: formatNumber(metrics.quizCount) },
        { label: 'Ratings', value: formatNumber(metrics.ratingsCount) },
        { label: 'Shopify customers', value: formatNumber(metrics.shopifyCustomersCount) },
        { label: 'Orders', value: formatNumber(metrics.ordersCount) },
        { label: 'Paid orders', value: formatNumber(metrics.paidOrdersCount) },
        { label: 'Cancelled orders', value: formatNumber(metrics.cancelledOrdersCount) },
        { label: 'Abandoned checkouts', value: formatNumber(metrics.abandonedCheckoutCount) },
        { label: 'Startup Pack orders', value: formatNumber(metrics.startupPackOrdersCount) },
        { label: 'Smart Box / box orders', value: formatNumber(metrics.boxOrdersCount) },
        { label: 'Free bottle quantity', value: formatNumber(metrics.freeBottleQuantity) },
        { label: 'Product discount value', value: formatMoney(metrics.productDiscountValue) },
        { label: 'Total revenue', value: formatMoney(metrics.totalRevenue) },
        { label: 'Average order value', value: formatMoney(metrics.averageOrderValue) },
        { label: 'Ratings per user', value: formatNumber(metrics.ratingsPerUser) },
        { label: 'Ratings per order', value: formatNumber(metrics.ratingsPerOrder) },
        { label: 'Quiz-to-order ratio', value: formatNumber(metrics.quizToOrderRatio) },
        {
          label: 'Abandoned/order ratio',
          value: formatNumber(metrics.abandonedCheckoutToOrderRatio),
        },
        { label: 'Repeat customers', value: formatNumber(metrics.repeatCustomers) },
        { label: 'Reorder rate', value: formatNumber(metrics.reorderRate) },
        { label: 'Later-order revenue', value: formatMoney(metrics.laterOrderRevenue) },
        { label: 'Repeat revenue share', value: formatNumber(metrics.repeatRevenueShare) },
        { label: 'Startup Pack reorder rate', value: formatNumber(metrics.startupPackReorderRate) },
        { label: 'Users with ratings', value: formatNumber(metrics.usersWithRatings) },
        { label: 'Users with 3+ ratings', value: formatNumber(metrics.usersWithThreePlusRatings) },
        { label: 'Ratings engagement rate', value: formatNumber(metrics.ratingsEngagementRate) },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Acquisition Basic" subtitle="Rough aggregate acquisition economics" />

      <PageSection>
        <SectionTitle sub="Attribution is not final yet">Basic Acquisition Economics</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Basic acquisition economics. Attribution is not final yet. No customer data is displayed.
          </p>
        </Card>

        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {cards.map((card) => (
                <Card key={card.label}>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>{card.label}</div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{card.value}</div>
                </Card>
              ))}
            </div>

            <PageSection>
              <SectionTitle sub="Simple rule checks">Potential Issues</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.potentialIssues.map((issue) => (
                  <Card key={issue}>
                    <p style={{ margin: 0, color: issue.startsWith('No major') ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 600 }}>
                      {issue}
                    </p>
                  </Card>
                ))}
              </div>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
