import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { SortableDataTable, type SortableColumn } from '@/components/SortableDataTable';
import { TopBar } from '@/components/TopBar';
import { getFoodPairingIntelligence } from '@/lib/db';
import { formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

type PairingRow = Record<string, unknown> & {
  pairing: string;
  wines: number;
  ratings: number | null;
  love: number | null;
  like: number | null;
  dislike: number | null;
  positiveRate: number | null;
  action: string;
};

type WinePairingRow = Record<string, unknown> & {
  wine: string;
  vendor: string;
  pairings: string;
  ratings: number;
  positiveRate: number | null;
  dislikeRate: number | null;
  action: string;
};

const pairingColumns: SortableColumn<PairingRow>[] = [
  { key: 'pairing', label: 'Pairing', type: 'text' },
  { key: 'wines', label: 'Wines', type: 'number' },
  { key: 'ratings', label: 'Ratings', type: 'number' },
  { key: 'love', label: 'Love', type: 'number' },
  { key: 'like', label: 'Like', type: 'number' },
  { key: 'dislike', label: 'Dislike', type: 'number' },
  { key: 'positiveRate', label: 'Positive %', type: 'percent' },
  { key: 'action', label: 'Suggested action', type: 'text' },
];

const winePairingColumns: SortableColumn<WinePairingRow>[] = [
  { key: 'wine', label: 'Wine', type: 'text', width: 220 },
  { key: 'vendor', label: 'Vendor', type: 'text' },
  { key: 'pairings', label: 'Pairings', type: 'text' },
  { key: 'ratings', label: 'Ratings', type: 'number' },
  { key: 'positiveRate', label: 'Positive %', type: 'percent' },
  { key: 'dislikeRate', label: 'Dislike %', type: 'percent' },
  { key: 'action', label: 'Action', type: 'text' },
];

export default async function FoodPairingIntelligencePage() {
  await connection();
  const result = await getFoodPairingIntelligence();
  const metrics = result.ok ? result.metrics : null;
  const cards = metrics
    ? [
        ['Total wines', formatNumber(metrics.totalWines)],
        ['Wines with pairing data', formatNumber(metrics.winesWithPairingData)],
        ['Pairing coverage', formatPercent(metrics.pairingCoverageRate)],
        ['Red meat', formatNumber(metrics.redMeatWines)],
        ['White meat', formatNumber(metrics.whiteMeatWines)],
        ['Fish/seafood', formatNumber(metrics.fishSeafoodWines)],
        ['Cheese', formatNumber(metrics.cheeseWines)],
        ['Aperitif', formatNumber(metrics.aperitifWines)],
        ['Multiple pairings', formatNumber(metrics.winesWithMultiplePairings)],
        ['Without pairing', formatNumber(metrics.winesWithoutPairing)],
      ]
    : [];

  return (
    <DashboardLayout>
      <TopBar title="Food Pairing Intelligence" subtitle="Pairing coverage and wine fit signals" />
      <PageSection>
        <SectionTitle sub="Aggregate by wine and pairing only">Food Pairing Intelligence</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#1A1A1A', fontSize: 13, fontWeight: 700 }}>
            Food pairing and rating signals are aggregated by wine/pairing. No customer data is displayed.
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
              <SectionTitle sub="Why coverage may be low">Pairing Data Status</SectionTitle>
              <Card style={{ marginBottom: 12 }}>
                <BarChart
                  data={[
                    { label: 'With pairing data', value: metrics.winesWithPairingData, color: '#2D6A4F' },
                    { label: 'Without pairing data', value: metrics.winesWithoutPairing, color: '#B45309' },
                  ]}
                />
              </Card>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 12 }}>
                <Card>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>food_pairing rows</div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{formatNumber(metrics.foodPairingRows)}</div>
                </Card>
                <Card>
                  <div style={{ color: '#6B6B6B', fontSize: 12, marginBottom: 8 }}>Rows with pairing flags</div>
                  <div style={{ color: '#1A1A1A', fontSize: 22, fontWeight: 700 }}>{formatNumber(metrics.populatedPairingRows)}</div>
                </Card>
              </div>
              {metrics.coverageGapReason ? (
                <Card style={{ marginTop: 12 }}>
                  <p style={{ margin: 0, color: '#B45309', fontSize: 13, fontWeight: 600 }}>
                    {metrics.coverageGapReason}
                  </p>
                </Card>
              ) : null}
            </PageSection>
            <PageSection>
              <SectionTitle sub="Make pairings useful for Smart Box">Next data fix</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {metrics.nextDataFixes.map((item) => (
                  <Card key={item}>
                    <p style={{ margin: 0, color: '#2D6A4F', fontSize: 13, fontWeight: 600 }}>{item}</p>
                  </Card>
                ))}
              </div>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Pairing categories">Pairing Performance</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <SortableDataTable
                  columns={pairingColumns}
                  rows={metrics.pairings.map((pairing) => ({
                    pairing: pairing.pairingCategory,
                    wines: pairing.winesCount,
                    ratings: pairing.ratingsCount,
                    love: pairing.loveCount,
                    like: pairing.likeCount,
                    dislike: pairing.dislikeCount,
                    positiveRate: pairing.positiveRate,
                    action: pairing.suggestedAction,
                  }))}
                  initialSortKey="wines"
                />
              </Card>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Wine-level pairing tags">Wine Pairing Table</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <SortableDataTable
                  columns={winePairingColumns}
                  rows={metrics.wines.map((wine) => ({
                    wine: wine.wineName,
                    vendor: wine.vendor,
                    pairings: wine.pairingTags,
                    ratings: wine.totalRatings,
                    positiveRate: wine.positiveRate,
                    dislikeRate: wine.dislikeRate,
                    action: wine.actionLabel,
                  }))}
                  initialSortKey="wine"
                  searchPlaceholder="Search wine, vendor, pairing..."
                />
              </Card>
            </PageSection>
          </>
        ) : null}
      </PageSection>
    </DashboardLayout>
  );
}
