import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getRepeatCustomerMetrics } from '@/lib/db';

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

export default async function RepeatCustomersPage() {
  await connection();
  const result = await getRepeatCustomerMetrics();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        { label: 'Ordering customers', value: formatNumber(metrics.orderingCustomers) },
        { label: 'One-time customers', value: formatNumber(metrics.oneTimeCustomers) },
        { label: 'Repeat customers', value: formatNumber(metrics.repeatCustomers) },
        { label: 'Reorder rate', value: formatPercent(metrics.reorderRate) },
        { label: 'Customers with 2 orders', value: formatNumber(metrics.customersWithExactlyTwoOrders) },
        { label: 'Customers with 3+ orders', value: formatNumber(metrics.customersWithThreePlusOrders) },
        { label: 'Non-cancelled orders', value: formatNumber(metrics.totalNonCancelledOrders) },
        { label: 'Avg orders/customer', value: formatNumber(metrics.averageOrdersPerOrderingCustomer) },
        { label: 'First-order revenue', value: formatMoney(metrics.firstOrderRevenue) },
        { label: 'Later-order revenue', value: formatMoney(metrics.laterOrderRevenue) },
        { label: 'Total non-cancelled revenue', value: formatMoney(metrics.totalNonCancelledRevenue) },
        { label: 'Repeat revenue share', value: formatPercent(metrics.repeatRevenueShare) },
        { label: 'Avg first order value', value: formatMoney(metrics.averageFirstOrderValue) },
        { label: 'Avg later order value', value: formatMoney(metrics.averageLaterOrderValue) },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Repeat Customers" subtitle="Customer reorder and later-order revenue signals" />
      <PageSection>
        <SectionTitle sub="Aggregate customer cohorts">Repeat Customer Health</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. Customer identifiers are used only internally and are not displayed.
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
              <SectionTitle sub={`${metrics.firstOrderDate ?? 'Unavailable'} to ${metrics.latestOrderDate ?? 'Unavailable'}`}>
                Order Count Distribution
              </SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                      {['Bucket', 'Customers', 'Customer share', 'Orders', 'Revenue', 'Revenue share'].map((heading) => (
                        <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.distribution.map((bucket) => (
                      <tr key={bucket.bucket} style={{ borderTop: '1px solid #E8E6E1' }}>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{bucket.bucket}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(bucket.customerCount)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(bucket.customerShare)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(bucket.orderCount)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(bucket.revenue)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(bucket.revenueShare)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            </PageSection>

            <PageSection>
              <SectionTitle sub="Simple rule checks">Potential Issues</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.potentialIssues.map((issue) => (
                  <Card key={issue}>
                    <p style={{ margin: 0, color: issue.startsWith('Repeat customers detected') ? '#2D6A4F' : '#B45309', fontSize: 13, fontWeight: 600 }}>
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
