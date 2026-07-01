import { connection } from 'next/server';
import { DashboardLayout } from '@/components/DashboardLayout';
import { Card, PageSection, SectionTitle } from '@/components/Layout';
import { MetricCard } from '@/components/MetricCard';
import { TopBar } from '@/components/TopBar';
import { getBusinessOverview, getFoodPairingIntelligence, getMetaAdsPerformance, getRatingsIntelligence, getTrackingReadiness } from '@/lib/db';
import { formatNumber, formatPercent } from '@/lib/format';

export const runtime = 'nodejs';

function statusColor(good: boolean) {
  return good ? '#2D6A4F' : '#B45309';
}

export default async function DataQualityPage() {
  await connection();
  const [trackingResult, metaResult, businessResult, ratingsResult, foodPairingResult] = await Promise.all([
    getTrackingReadiness(),
    getMetaAdsPerformance(),
    getBusinessOverview(),
    getRatingsIntelligence(),
    getFoodPairingIntelligence(),
  ]);
  const tracking = trackingResult.ok ? trackingResult.metrics : null;
  const meta = metaResult.ok ? metaResult.metrics : null;
  const business = businessResult.ok ? businessResult.metrics : null;
  const ratings = ratingsResult.ok ? ratingsResult.metrics : null;
  const foodPairing = foodPairingResult.ok ? foodPairingResult.metrics : null;
  const ga4Rows = tracking?.ga4TablesWithRows.length ?? 0;
  const ratingsMappingReady = Boolean(ratings?.wineLevelAnalysisAvailable);

  return (
    <DashboardLayout>
      <TopBar title="Data Quality" subtitle="One place for technical readiness checks" />
      <PageSection>
        <SectionTitle sub="Technical diagnostics. Aggregate counts and metadata only.">Dashboard Data Status</SectionTitle>
        <Card style={{ marginBottom: 16 }}>
          <p style={{ margin: 0, color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
            This page replaces the old daily-navigation diagnostic clutter. No phone numbers, addresses, raw payloads, or database credentials are displayed.
          </p>
        </Card>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12, marginBottom: 18 }}>
          <MetricCard label="GA4 tables with rows" value={formatNumber(ga4Rows)} tone={ga4Rows ? 'good' : 'warning'} />
          <MetricCard label="Session tracking" value={tracking?.capabilities.some((capability) => capability.label.toLowerCase().includes('session') && capability.available) ? 'Available' : 'Needs review'} tone="warning" />
          <MetricCard label="Meta attribution" value={meta?.attributionAvailable ? 'Available' : 'Unavailable'} tone={meta?.attributionAvailable ? 'good' : 'warning'} />
          <MetricCard label="Shopify orders" value={business ? formatNumber(business.totalOrders) : 'Unavailable'} tone={business ? 'good' : 'warning'} />
          <MetricCard label="Ratings mapping" value={ratingsMappingReady ? 'Available' : 'Needs review'} tone={ratingsMappingReady ? 'good' : 'warning'} />
          <MetricCard label="Food pairing coverage" value={foodPairing ? formatPercent(foodPairing.pairingCoverageRate) : 'Unavailable'} tone={(foodPairing?.pairingCoverageRate ?? 0) >= 80 ? 'good' : 'warning'} />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            ['GA4 data status', ga4Rows > 0, ga4Rows > 0 ? `${formatNumber(ga4Rows)} GA4 report tables have rows.` : 'GA4 tables need sync or date-range review.', '/acquisition-traffic'],
            ['Session / event tracking', Boolean(tracking?.ga4Connected), tracking?.ga4Connected ? 'GA4 acquisition reports are connected.' : 'Review session and event tracking setup.', '/tracking-readiness'],
            ['Meta attribution status', Boolean(meta?.attributionAvailable), meta?.attributionAvailable ? 'Meta reports include purchase attribution fields.' : 'True CAC/ROAS still unavailable until Meta → session → Shopify order link exists.', '/attribution-readiness'],
            ['Shopify data status', Boolean(business), business ? `${formatNumber(business.totalOrders)} orders and ${formatNumber(business.abandonedCheckoutCount)} abandoned checkouts loaded.` : 'Shopify aggregate data could not be loaded.', '/shopify-orders-summary'],
            ['Ratings mapping status', ratingsMappingReady, ratingsMappingReady ? `${formatNumber(ratings?.uniqueRatedWines)} rated wines mapped.` : ratings?.wineLevelUnavailableReason ?? 'Ratings mapping could not be loaded.', '/ratings'],
            ['Food pairing coverage', (foodPairing?.pairingCoverageRate ?? 0) >= 80, foodPairing ? `${formatPercent(foodPairing.pairingCoverageRate)} of wines have pairing coverage.` : 'Food pairing data could not be loaded.', '/food-pairing-intelligence'],
          ].map(([title, good, body, href]) => (
            <Card key={title as string}>
              <div style={{ color: statusColor(Boolean(good)), fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>
                {good ? 'OK' : 'Needs review'}
              </div>
              <div style={{ marginTop: 6, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>{title as string}</div>
              <p style={{ margin: '8px 0 10px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>{body as string}</p>
              <a href={href as string} style={{ color: '#722F37', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Open detail</a>
            </Card>
          ))}
          <Card>
            <div style={{ color: '#6B6B6B', fontSize: 12, fontWeight: 900, textTransform: 'uppercase' }}>Diagnostic link</div>
            <div style={{ marginTop: 6, color: '#1A1A1A', fontSize: 14, fontWeight: 800 }}>Performance Diagnostics</div>
            <p style={{ margin: '8px 0 10px', color: '#6B6B6B', fontSize: 13, lineHeight: 1.5 }}>
              Recent helper timings, likely bottlenecks, and cache notes.
            </p>
            <a href="/performance-diagnostics" style={{ color: '#722F37', fontSize: 12, fontWeight: 800, textDecoration: 'none' }}>Open performance</a>
          </Card>
        </div>
      </PageSection>
    </DashboardLayout>
  );
}
