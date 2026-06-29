import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getRatingsIntelligence } from '@/lib/db';

export const runtime = 'nodejs';

function formatNumber(value: number | null): string {
  return value === null ? 'Unavailable' : value.toLocaleString('en-US', { maximumFractionDigits: 2 });
}

function formatPercent(value: number | null): string {
  return value === null ? 'Unavailable' : `${value.toLocaleString('en-US', { maximumFractionDigits: 1 })}%`;
}

export default async function RatingsPage() {
  await connection();
  const result = await getRatingsIntelligence();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        ['Total ratings', formatNumber(metrics.totalRatings)],
        ['Users with ratings', formatNumber(metrics.usersWithRatings)],
        ['Users with 3+ ratings', formatNumber(metrics.usersWithThreePlusRatings)],
        ['Avg ratings/rated user', formatNumber(metrics.averageRatingsPerRatedUser)],
        ['Love count', formatNumber(metrics.loveCount)],
        ['Like count', formatNumber(metrics.likeCount)],
        ['Dislike count', formatNumber(metrics.dislikeCount)],
        ['Love %', formatPercent(metrics.loveRate)],
        ['Like %', formatPercent(metrics.likeRate)],
        ['Dislike %', formatPercent(metrics.dislikeRate)],
        ['Positive rating rate', formatPercent(metrics.positiveRatingRate)],
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Ratings" subtitle="Real aggregate rating data and Smart Box readiness" />
      <PageSection>
        <SectionTitle sub="Aggregate ratings only">Ratings Overview</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            No individual customer ratings or customer identities are displayed.
          </p>
        </Card>

        {metrics ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: 12 }}>
              {cards.map(([label, value]) => (
                <Card key={label}>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>{label}</div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{value}</div>
                </Card>
              ))}
            </div>

            {!metrics.wineLevelAnalysisAvailable ? (
              <PageSection>
                <SectionTitle sub="Blocking wine-level analysis">Missing Data Needed</SectionTitle>
                <Card style={{ marginBottom: 12 }}>
                  <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
                    {metrics.wineLevelUnavailableReason}
                  </p>
                </Card>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                  {metrics.missingData.map((item) => (
                    <Card key={item}>
                      <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>{item}</p>
                    </Card>
                  ))}
                </div>
              </PageSection>
            ) : null}

            {metrics.wines.length > 0 ? (
              <PageSection>
                <SectionTitle sub="Wine-level aggregate ratings">Wine Performance</SectionTitle>
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead>
                      <tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                        {['Wine', 'Ratings', 'Love', 'Like', 'Dislike', 'Positive %', 'Dislike %', 'Action'].map((heading) => (
                          <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {metrics.wines.map((wine) => (
                        <tr key={wine.wineId} style={{ borderTop: '1px solid #E8E6E1' }}>
                          <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{wine.wineName}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(wine.totalRatings)}</td>
                          <td style={{ padding: '10px 14px', color: '#2D6A4F' }}>{formatNumber(wine.loveCount)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(wine.likeCount)}</td>
                          <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatNumber(wine.dislikeCount)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(wine.positiveRate)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(wine.dislikeRate)}</td>
                          <td style={{ padding: '10px 14px', color: '#2D6A4F', fontWeight: 600 }}>{wine.recommendationLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </PageSection>
            ) : null}
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
