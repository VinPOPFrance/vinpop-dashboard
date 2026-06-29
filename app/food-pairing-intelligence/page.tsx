import { connection } from 'next/server';
import { BarChart } from '@/components/BarChart';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { TopBar } from '@/components/TopBar';
import { getFoodPairingIntelligence } from '@/lib/db';
import { formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

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
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                    {['Pairing', 'Wines', 'Ratings', 'Love', 'Like', 'Dislike', 'Positive %', 'Suggested action'].map((heading) => (
                      <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                    ))}
                  </tr></thead>
                  <tbody>{metrics.pairings.map((pairing) => (
                    <tr key={pairing.pairingCategory} style={{ borderTop: '1px solid #E8E6E1' }}>
                      <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{pairing.pairingCategory}</td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(pairing.winesCount)}</td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(pairing.ratingsCount)}</td>
                      <td style={{ padding: '10px 14px', color: '#2D6A4F' }}>{formatNumber(pairing.loveCount)}</td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(pairing.likeCount)}</td>
                      <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatNumber(pairing.dislikeCount)}</td>
                      <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(pairing.positiveRate)}</td>
                      <td style={{ padding: '10px 14px', color: '#2D6A4F', fontWeight: 600 }}>{pairing.suggestedAction}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </Card>
            </PageSection>
            <PageSection>
              <SectionTitle sub="Wine-level pairing tags">Wine Pairing Table</SectionTitle>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                    <thead><tr style={{ background: '#F5F4F0', color: '#6B6B6B', textAlign: 'left' }}>
                      {['Wine', 'Vendor', 'Pairings', 'Ratings', 'Positive %', 'Dislike %', 'Action'].map((heading) => (
                        <th key={heading} style={{ padding: '10px 14px', fontWeight: 700 }}>{heading}</th>
                      ))}
                    </tr></thead>
                    <tbody>{metrics.wines.map((wine) => (
                      <tr key={`${wine.wineName}.${wine.vendor}`} style={{ borderTop: '1px solid #E8E6E1' }}>
                        <td style={{ padding: '10px 14px', color: '#1A1A1A', fontWeight: 600 }}>{wine.wineName}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{wine.vendor}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{wine.pairingTags}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatNumber(wine.totalRatings)}</td>
                        <td style={{ padding: '10px 14px', color: '#6B6B6B' }}>{formatPercent(wine.positiveRate)}</td>
                        <td style={{ padding: '10px 14px', color: '#B45309' }}>{formatPercent(wine.dislikeRate)}</td>
                        <td style={{ padding: '10px 14px', color: '#2D6A4F', fontWeight: 600 }}>{wine.actionLabel}</td>
                      </tr>
                    ))}</tbody>
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
