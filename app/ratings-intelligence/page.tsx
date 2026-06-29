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

export default async function RatingsIntelligencePage() {
  await connection();
  const result = await getRatingsIntelligence();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        ['Total ratings', formatNumber(metrics.totalRatings)],
        ['Unique rated wines', formatNumber(metrics.uniqueRatedWines)],
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
        ['Wines with Love', formatNumber(metrics.winesWithLove)],
        ['Wines with Dislike', formatNumber(metrics.winesWithDislike)],
        ['High satisfaction wines', formatNumber(metrics.winesWithHighSatisfaction)],
        ['High disappointment wines', formatNumber(metrics.winesWithHighDisappointment)],
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Ratings Intelligence" subtitle="Wine-level ratings for Smart Box and product decisions" />
      <PageSection>
        <SectionTitle sub="Aggregate wine ratings only">Ratings Intelligence</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Aggregate by wine only. No customer identities or individual ratings are displayed.
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
            <PageSection>
              <SectionTitle sub={`${metrics.firstRatingDate ?? 'Unavailable'} to ${metrics.latestRatingDate ?? 'Unavailable'}`}>What this means</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.interpretation.map((item) => (
                  <Card key={item}><p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 600 }}>{item}</p></Card>
                ))}
              </div>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Concrete next moves">Recommended actions</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.recommendedActions.map((item) => (
                  <Card key={item}><p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>{item}</p></Card>
                ))}
              </div>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Blocking better wine decisions">Missing data blocking better analysis</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.missingData.map((item) => (
                  <Card key={item}><p style={{ margin: 0, color: '#6B6B6B', fontSize: 13 }}>{item}</p></Card>
                ))}
              </div>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Top 100 rated wines">Wine Ratings</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                      {['Wine ID', 'Wine', 'Ratings', 'Love', 'Like', 'Dislike', 'Love %', 'Like %', 'Dislike %', 'Positive %', 'Label'].map((heading) => (
                        <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                      ))}
                    </tr></thead>
                    <tbody>
                      {metrics.wines.map((wine) => (
                        <tr key={wine.wineId} style={{ borderTop: '1px solid #E8E6E1' }}>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{wine.wineId}</td>
                          <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{wine.wineName}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(wine.totalRatings)}</td>
                          <td style={{ padding: '10px 14px', color: '#2D6A4F' }}>{formatNumber(wine.loveCount)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(wine.likeCount)}</td>
                          <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatNumber(wine.dislikeCount)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(wine.loveRate)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(wine.likeRate)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(wine.dislikeRate)}</td>
                          <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(wine.positiveRate)}</td>
                          <td style={{ padding: '10px 14px', color: wine.recommendationLabel === 'Risk' ? '#B45309' : '#2D6A4F', fontWeight: 600 }}>{wine.recommendationLabel}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
