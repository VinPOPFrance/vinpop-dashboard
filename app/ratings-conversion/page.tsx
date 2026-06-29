import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getRatingsConversion } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  return value === null ? 'Unavailable' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export default async function RatingsConversionPage() {
  await connection();
  const result = await getRatingsConversion();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        { label: 'Total users', value: formatNumber(metrics.totalUsers) },
        { label: 'Users with ratings', value: formatNumber(metrics.usersWithRatings) },
        { label: 'Users with 3+ ratings', value: formatNumber(metrics.usersWithThreePlusRatings) },
        { label: 'Total ratings', value: formatNumber(metrics.totalRatings) },
        { label: 'Avg ratings/user', value: formatNumber(metrics.averageRatingsPerUser) },
        { label: 'Ordering customers', value: formatNumber(metrics.orderingCustomers) },
        { label: 'Repeat customers', value: formatNumber(metrics.repeatCustomers) },
        { label: 'Rated ordering customers', value: formatNumber(metrics.ratedOrderingCustomers) },
        { label: 'Rated repeat customers', value: formatNumber(metrics.ratedRepeatCustomers) },
        { label: 'Rated reorder rate', value: formatPercent(metrics.ratedReorderRate) },
        { label: 'Unrated reorder rate', value: formatPercent(metrics.unratedReorderRate) },
        { label: 'Rated vs unrated difference', value: formatPercent(metrics.ratedVsUnratedReorderRateDifference) },
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Ratings Conversion" subtitle="Rating activity and repeat purchase matching" />
      <PageSection>
        <SectionTitle sub={metrics?.matchingAvailable ? 'Direct matching available' : 'Direct matching unavailable'}>
          Ratings Conversion
        </SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: '0 0 8px', color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate metrics only. Rating values and customer identities are not displayed.
          </p>
          {metrics?.matchingUnavailableReason ? (
            <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>{metrics.matchingUnavailableReason}</p>
          ) : null}
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
              <SectionTitle sub="Rating activity buckets">Activity Buckets</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                      {['Bucket', 'Users', 'Ratings', 'Avg ratings/user'].map((heading) => (
                        <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {metrics.buckets.map((bucket) => (
                      <tr key={bucket.bucket} style={{ borderTop: '1px solid #E8E6E1' }}>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{bucket.bucket}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(bucket.userCount)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(bucket.ratingCount)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(bucket.averageRatingsPerUser)}</td>
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
                    <p style={{ margin: 0, color: issue.startsWith('Ratings exist') ? '#6B6B6B' : '#B45309', fontSize: 13, fontWeight: 600 }}>{issue}</p>
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
