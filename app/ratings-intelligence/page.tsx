import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { DonutChart } from '@/components/DonutChart';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { getRatingsIntelligence } from '@/lib/db';
import { formatDate, formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

type IntelligenceWineRow = Record<string, unknown> & {
  productId: string;
  wine: string;
  color: string;
  ratings: number;
  love: number;
  like: number;
  dislike: number;
  loveRate: number | null;
  likeRate: number | null;
  dislikeRate: number | null;
  positiveRate: number | null;
  label: string;
};

const wineColumns: SortableColumn<IntelligenceWineRow>[] = [
  { key: 'productId', label: 'Shopify product ID', type: 'text' },
  { key: 'wine', label: 'Wine', type: 'text', width: 220 },
  { key: 'color', label: 'Color', type: 'text' },
  { key: 'ratings', label: 'Ratings', type: 'number' },
  { key: 'love', label: 'Love', type: 'number' },
  { key: 'like', label: 'Like', type: 'number' },
  { key: 'dislike', label: 'Dislike', type: 'number' },
  { key: 'loveRate', label: 'Love %', type: 'percent' },
  { key: 'likeRate', label: 'Like %', type: 'percent' },
  { key: 'dislikeRate', label: 'Dislike %', type: 'percent' },
  { key: 'positiveRate', label: 'Positive %', type: 'percent' },
  { key: 'label', label: 'Label', type: 'text' },
];

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
              <SectionTitle sub={`${formatDate(metrics.firstRatingDate)} to ${formatDate(metrics.latestRatingDate)}`}>Smart Box Readiness</SectionTitle>
              <div style={{ display: 'grid', gridTemplateColumns: 'minmax(260px, 360px) 1fr', gap: 16, marginBottom: 16 }}>
                <Card>
                  <DonutChart
                    data={[
                      { label: 'Love', value: metrics.loveCount, color: '#2D6A4F' },
                      { label: 'Like', value: metrics.likeCount, color: '#A67C00' },
                      { label: 'Dislike', value: metrics.dislikeCount, color: '#B45309' },
                    ]}
                  />
                </Card>
                <Card>
                  <BarChart
                    data={metrics.wines.slice(0, 8).map((wine) => ({
                      label: wine.wineName,
                      value: wine.totalRatings,
                      color: '#722F37',
                    }))}
                  />
                </Card>
              </div>
              <SectionTitle sub="What this means">Decision Notes</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.interpretation.map((item) => (
                  <Card key={item}><p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 600 }}>{item}</p></Card>
                ))}
                {(metrics.positiveRatingRate ?? 0) >= 99 ? (
                  <Card><p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>Positive rating rate is near 100%; audit whether Dislike is being captured reliably.</p></Card>
                ) : null}
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
                <SortableDataTable
                  columns={wineColumns}
                  rows={metrics.wines.map((wine) => ({
                    productId: wine.shopifyProductId,
                    wine: wine.wineName,
                    color: wine.color,
                    ratings: wine.totalRatings,
                    love: wine.loveCount,
                    like: wine.likeCount,
                    dislike: wine.dislikeCount,
                    loveRate: wine.loveRate,
                    likeRate: wine.likeRate,
                    dislikeRate: wine.dislikeRate,
                    positiveRate: wine.positiveRate,
                    label: wine.recommendationLabel,
                  }))}
                  initialSortKey="ratings"
                  searchPlaceholder="Search wine, product ID, color..."
                />
              </Card>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
