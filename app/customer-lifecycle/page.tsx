import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getCustomerLifecycle } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatMoney(value: number | null): string {
  return value === null
    ? 'Unavailable'
    : value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  return value === null ? 'Unavailable' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export default async function CustomerLifecyclePage() {
  await connection();
  const result = await getCustomerLifecycle();
  const metrics = result.ok ? result.metrics : null;
  const sections = metrics
    ? [
        {
          title: 'Acquisition',
          cards: [
            ['Users', formatNumber(metrics.users)],
            ['Quizzes', formatNumber(metrics.quizzes)],
            ['Abandoned checkouts', formatNumber(metrics.abandonedCheckouts)],
            ['Orders', formatNumber(metrics.orders)],
            ['Quiz-to-order ratio', formatNumber(metrics.quizToOrderRatio)],
            ['Abandoned/order ratio', formatNumber(metrics.abandonedCheckoutToOrderRatio)],
          ],
        },
        {
          title: 'First Purchase',
          cards: [
            ['Ordering customers', formatNumber(metrics.orderingCustomers)],
            ['First-order revenue', formatMoney(metrics.firstOrderRevenue)],
            ['Avg first order value', formatMoney(metrics.averageFirstOrderValue)],
            ['Startup Pack customers', formatNumber(metrics.startupPackCustomers)],
            ['Startup Pack orders', formatNumber(metrics.startupPackOrders)],
          ],
        },
        {
          title: 'Engagement',
          cards: [
            ['Total ratings', formatNumber(metrics.totalRatings)],
            ['Users with ratings', formatNumber(metrics.usersWithRatings)],
            ['Users with 3+ ratings', formatNumber(metrics.usersWithThreePlusRatings)],
            ['Avg ratings/user', formatNumber(metrics.averageRatingsPerUser)],
          ],
        },
        {
          title: 'Retention',
          cards: [
            ['Repeat customers', formatNumber(metrics.repeatCustomers)],
            ['Reorder rate', formatPercent(metrics.reorderRate)],
            ['Later-order revenue', formatMoney(metrics.laterOrderRevenue)],
            ['Repeat revenue share', formatPercent(metrics.repeatRevenueShare)],
            ['Smart Box orders', formatNumber(metrics.smartBoxOrders)],
          ],
        },
        {
          title: 'Stock / Discount Impact',
          cards: [
            ['Total quantity moved', formatNumber(metrics.totalQuantityMoved)],
            ['Free quantity', formatNumber(metrics.freeQuantity)],
            ['Free quantity %', formatPercent(metrics.freeQuantityPercentage)],
            ['Product discounts', formatMoney(metrics.productDiscounts)],
            ['Avg free bottles/pack', formatNumber(metrics.averageFreeBottlesPerStartupPackOrder)],
          ],
        },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Customer Lifecycle" subtitle="High-level acquisition, engagement, retention, and stock health" />
      <PageSection>
        <SectionTitle sub="Aggregate lifecycle overview">Customer Lifecycle</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. No customer personal data or individual orders are displayed.
          </p>
        </Card>
        {metrics ? (
          <>
            {sections.map((section) => (
              <PageSection key={section.title}>
                <SectionTitle>{section.title}</SectionTitle>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
                  {section.cards.map(([label, value]) => (
                    <Card key={label}>
                      <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>{label}</div>
                      <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{value}</div>
                    </Card>
                  ))}
                </div>
              </PageSection>
            ))}

            <PageSection>
              <SectionTitle sub="Maximum 8 warnings">Potential Issues</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.potentialIssues.map((issue) => (
                  <Card key={issue}>
                    <p style={{ margin: 0, color: issue.startsWith('No major') ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 600 }}>{issue}</p>
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
