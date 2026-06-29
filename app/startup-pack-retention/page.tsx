import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getStartupPackRetention } from '@/lib/db';

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

export default async function StartupPackRetentionPage() {
  await connection();
  const result = await getStartupPackRetention();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        { label: 'Startup Pack customers', value: formatNumber(metrics.startupPackCustomers) },
        { label: 'Startup Pack orders', value: formatNumber(metrics.startupPackOrders) },
        { label: 'Customers with later order', value: formatNumber(metrics.startupPackCustomersWithLaterOrder) },
        { label: 'Startup Pack reorder rate', value: formatPercent(metrics.startupPackReorderRate) },
        { label: 'Startup Pack first-order revenue', value: formatMoney(metrics.startupPackFirstOrderRevenue) },
        { label: 'Startup Pack later revenue', value: formatMoney(metrics.startupPackLaterOrderRevenue) },
        { label: 'Avg later orders/customer', value: formatNumber(metrics.averageLaterOrdersPerStartupPackCustomer) },
        { label: 'Later Smart Box orders', value: formatNumber(metrics.smartBoxLaterOrdersAfterStartupPack) },
        { label: 'Startup Pack only customers', value: formatNumber(metrics.customersWithStartupPackOnly) },
        { label: 'Startup Pack + later order', value: formatNumber(metrics.customersWithStartupPackAndLaterOrder) },
        { label: 'Startup Pack + Smart Box', value: formatNumber(metrics.customersWithStartupPackAndSmartBox) },
        { label: 'Avg free bottles/pack', value: formatNumber(metrics.averageFreeBottlesPerStartupPackOrder) },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Startup Pack Retention" subtitle="Startup Pack customers and later-order conversion" />
      <PageSection>
        <SectionTitle sub="Aggregate cohorts only">Startup Pack Retention</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. No individual customers or orders are displayed.
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
              <SectionTitle sub="Anonymous customer cohorts">Cohorts</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                      {['Cohort', 'Customers', 'Orders', 'Revenue', 'Later revenue', 'Customer share'].map((heading) => (
                        <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.cohorts.map((cohort) => (
                      <tr key={cohort.cohort} style={{ borderTop: '1px solid #E8E6E1' }}>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{cohort.cohort}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(cohort.customerCount)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(cohort.orders)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(cohort.revenue)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatMoney(cohort.laterRevenue)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(cohort.shareOfOrderingCustomers)}</td>
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
                    <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>{issue}</p>
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
